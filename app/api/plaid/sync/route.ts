import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { plaidClient } from '@/lib/plaid'
import { format, subDays } from 'date-fns'

export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: items } = await supabase
    .from('plaid_items')
    .select('*')
    .eq('user_id', user.id)

  if (!items || items.length === 0) {
    return NextResponse.json({ message: 'No linked accounts', synced: 0 })
  }

  const results = await Promise.allSettled(items.map(item => syncItem(supabase, user.id, item)))

  const errors = results
    .filter(r => r.status === 'rejected')
    .map(r => (r as PromiseRejectedResult).reason?.message)

  // Update last_synced_at for all items
  await supabase
    .from('plaid_items')
    .update({ last_synced_at: new Date().toISOString() })
    .eq('user_id', user.id)

  return NextResponse.json({
    synced: results.filter(r => r.status === 'fulfilled').length,
    failed: errors.length,
    errors: errors.length > 0 ? errors : undefined,
  })
}

async function syncItem(supabase: Awaited<ReturnType<typeof createClient>>, userId: string, item: Record<string, string>) {
  const accessToken = item.access_token

  // ── Accounts ────────────────────────────────────────────────────────────────
  const accountsRes = await plaidClient.accountsGet({ access_token: accessToken })
  const accounts = accountsRes.data.accounts

  await supabase.from('accounts').upsert(
    accounts.map(a => ({
      user_id: userId,
      plaid_item_id: item.id,
      plaid_account_id: a.account_id,
      name: a.name,
      official_name: a.official_name ?? null,
      type: a.type,
      subtype: a.subtype ?? null,
      balance_current: a.balances.current ?? 0,
      balance_available: a.balances.available ?? null,
      currency: a.balances.iso_currency_code ?? 'USD',
      last_updated: new Date().toISOString(),
    })),
    { onConflict: 'plaid_account_id' }
  )

  // Build a map of plaid_account_id → internal account id
  const { data: dbAccounts } = await supabase
    .from('accounts')
    .select('id, plaid_account_id')
    .eq('user_id', userId)

  const accountIdMap = Object.fromEntries(
    (dbAccounts ?? []).map(a => [a.plaid_account_id, a.id])
  )

  // ── Transactions (last 90 days) ───────────────────────────────────────────
  const startDate = format(subDays(new Date(), 90), 'yyyy-MM-dd')
  const endDate = format(new Date(), 'yyyy-MM-dd')

  try {
    const txnRes = await plaidClient.transactionsGet({
      access_token: accessToken,
      start_date: startDate,
      end_date: endDate,
    })

    const txns = txnRes.data.transactions
    if (txns.length > 0) {
      await supabase.from('transactions').upsert(
        txns.map(t => ({
          account_id: accountIdMap[t.account_id],
          user_id: userId,
          plaid_transaction_id: t.transaction_id,
          amount: t.amount,
          date: t.date,
          name: t.name,
          merchant_name: t.merchant_name ?? null,
          category: t.personal_finance_category
            ? [t.personal_finance_category.primary, t.personal_finance_category.detailed]
            : (t.category ?? []),
          pending: t.pending,
        })).filter(t => t.account_id), // skip if account not yet mapped
        { onConflict: 'plaid_transaction_id' }
      )
    }
  } catch {
    // Transactions endpoint not available for all account types — skip silently
  }

  // ── Investments ───────────────────────────────────────────────────────────
  try {
    const invRes = await plaidClient.investmentsHoldingsGet({ access_token: accessToken })
    const { holdings, securities } = invRes.data

    const secMap = Object.fromEntries(
      securities.map(s => [s.security_id, s])
    )

    if (holdings.length > 0) {
      // Delete stale holdings for this item's accounts and re-insert
      const itemAccountIds = accounts.map(a => accountIdMap[a.account_id]).filter(Boolean)
      if (itemAccountIds.length > 0) {
        await supabase.from('holdings').delete().in('account_id', itemAccountIds)
      }

      await supabase.from('holdings').insert(
        holdings
          .filter(h => accountIdMap[h.account_id])
          .map(h => {
            const sec = secMap[h.security_id]
            return {
              account_id: accountIdMap[h.account_id],
              user_id: userId,
              ticker: sec?.ticker_symbol ?? sec?.name ?? 'UNKNOWN',
              name: sec?.name ?? '',
              quantity: h.quantity,
              cost_basis: h.cost_basis ?? 0,
              current_price: h.institution_price ?? 0,
              current_value: h.institution_value ?? 0,
              unrealized_gain_loss: h.institution_value - (h.cost_basis ?? 0),
              purchase_date: h.institution_price_as_of ?? new Date().toISOString().split('T')[0],
              last_updated: new Date().toISOString(),
            }
          })
      )
    }
  } catch {
    // Investments not available for this item
  }

  // ── Liabilities ───────────────────────────────────────────────────────────
  try {
    const liabRes = await plaidClient.liabilitiesGet({ access_token: accessToken })
    const { credit, mortgage, student } = liabRes.data.liabilities

    const debtRows: Record<string, unknown>[] = []

    ;(credit ?? []).forEach(c => {
      if (!accountIdMap[c.account_id]) return
      debtRows.push({
        account_id: accountIdMap[c.account_id],
        user_id: userId,
        name: accounts.find(a => a.account_id === c.account_id)?.name ?? 'Credit Card',
        balance: Math.abs(c.last_statement_balance ?? 0),
        apr: (c.aprs?.[0]?.apr_percentage ?? 24),
        minimum_payment: c.minimum_payment_amount ?? 25,
      })
    })

    ;(mortgage ?? []).forEach(m => {
      if (!accountIdMap[m.account_id]) return
      debtRows.push({
        account_id: accountIdMap[m.account_id],
        user_id: userId,
        name: accounts.find(a => a.account_id === m.account_id)?.name ?? 'Mortgage',
        balance: m.outstanding_principal_balance ?? 0,
        apr: m.interest_rate?.percentage ?? 6.5,
        minimum_payment: m.next_monthly_payment ?? 0,
        payoff_date_estimated: m.maturity_date ?? null,
      })
    })

    ;(student ?? []).forEach(s => {
      s.loan_details?.forEach(loan => {
        if (!accountIdMap[s.account_id]) return
        debtRows.push({
          account_id: accountIdMap[s.account_id],
          user_id: userId,
          name: loan.loan_name ?? 'Student Loan',
          balance: loan.outstanding_interest_amount
            ? (loan.origination_principal_amount ?? 0)
            : 0,
          apr: loan.interest_rate_percentage ?? 5,
          minimum_payment: s.minimum_payment_amount ?? 0,
          payoff_date_estimated: loan.expected_payoff_date ?? null,
        })
      })
    })

    if (debtRows.length > 0) {
      const itemAccountIds = accounts.map(a => accountIdMap[a.account_id]).filter(Boolean)
      await supabase.from('debts').delete().in('account_id', itemAccountIds)
      await supabase.from('debts').insert(debtRows)
    }
  } catch {
    // Liabilities not available for this item
  }
}

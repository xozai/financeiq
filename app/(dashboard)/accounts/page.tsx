'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { PlaidLinkButton } from '@/components/PlaidLinkButton'
import { RefreshCw, Trash2, Building2, CheckCircle2, AlertCircle } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

interface PlaidItem {
  id: string
  institution_name: string | null
  last_synced_at: string | null
  created_at: string
}

interface Account {
  id: string
  name: string
  official_name: string | null
  type: string
  subtype: string | null
  balance_current: number
  currency: string
  plaid_item_id: string
}

const TYPE_LABELS: Record<string, string> = {
  depository: 'Bank',
  investment: 'Investment',
  credit: 'Credit',
  loan: 'Loan',
  mortgage: 'Mortgage',
  brokerage: 'Brokerage',
  retirement: 'Retirement',
  other: 'Other',
}

export default function AccountsPage() {
  const supabase = createClient()
  const [items, setItems] = useState<PlaidItem[]>([])
  const [accounts, setAccounts] = useState<Account[]>([])
  const [syncing, setSyncing] = useState(false)
  const [syncResult, setSyncResult] = useState<{ synced: number; failed: number } | null>(null)
  const [loading, setLoading] = useState(true)
  const [removing, setRemoving] = useState<string | null>(null)

  const load = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const [{ data: itemsData }, { data: accountsData }] = await Promise.all([
      supabase.from('plaid_items').select('*').eq('user_id', user.id).order('created_at'),
      supabase.from('accounts').select('*').eq('user_id', user.id).order('type'),
    ])

    setItems(itemsData ?? [])
    setAccounts(accountsData ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  async function sync() {
    setSyncing(true)
    setSyncResult(null)
    const res = await fetch('/api/plaid/sync', { method: 'POST' })
    const data = await res.json()

    // Also take a net worth snapshot after sync
    await fetch('/api/snapshot', { method: 'POST' })

    setSyncResult({ synced: data.synced ?? 0, failed: data.failed ?? 0 })
    setSyncing(false)
    load()
  }

  async function removeItem(itemId: string) {
    setRemoving(itemId)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    // Delete accounts and item (cascade handles related records via FK)
    await supabase.from('accounts').delete().eq('plaid_item_id', itemId)
    await supabase.from('plaid_items').delete().eq('id', itemId).eq('user_id', user.id)

    setRemoving(null)
    load()
  }

  const totalBalance = accounts
    .filter(a => !['credit_card', 'loan', 'mortgage'].includes(a.type))
    .reduce((s, a) => s + Number(a.balance_current), 0)

  const totalDebt = accounts
    .filter(a => ['credit_card', 'loan', 'mortgage'].includes(a.type))
    .reduce((s, a) => s + Math.abs(Number(a.balance_current)), 0)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Linked Accounts</h2>
        <div className="flex items-center gap-3">
          {items.length > 0 && (
            <button
              onClick={sync}
              disabled={syncing}
              className="flex items-center gap-2 border border-gray-300 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 disabled:opacity-50 transition-colors"
            >
              <RefreshCw className={`h-4 w-4 ${syncing ? 'animate-spin' : ''}`} />
              {syncing ? 'Syncing…' : 'Sync All'}
            </button>
          )}
          <PlaidLinkButton onSuccess={() => { load(); sync() }} />
        </div>
      </div>

      {/* Sync result banner */}
      {syncResult && (
        <div className={`flex items-center gap-2 p-3 rounded-lg text-sm ${syncResult.failed === 0 ? 'bg-green-50 text-green-700' : 'bg-yellow-50 text-yellow-700'}`}>
          {syncResult.failed === 0
            ? <CheckCircle2 className="h-4 w-4" />
            : <AlertCircle className="h-4 w-4" />}
          {syncResult.failed === 0
            ? `${syncResult.synced} institution${syncResult.synced !== 1 ? 's' : ''} synced successfully.`
            : `${syncResult.synced} synced, ${syncResult.failed} failed.`}
        </div>
      )}

      {/* KPI row */}
      {accounts.length > 0 && (
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <p className="text-sm text-gray-500">Accounts Linked</p>
            <p className="text-2xl font-bold text-gray-900">{accounts.length}</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <p className="text-sm text-gray-500">Total Balance</p>
            <p className="text-2xl font-bold text-gray-900">${totalBalance.toLocaleString()}</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <p className="text-sm text-gray-500">Total Debt</p>
            <p className="text-2xl font-bold text-red-600">${totalDebt.toLocaleString()}</p>
          </div>
        </div>
      )}

      {loading ? (
        <div className="space-y-3">
          {[1, 2].map(i => <div key={i} className="h-32 bg-gray-100 rounded-xl animate-pulse" />)}
        </div>
      ) : items.length === 0 ? (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-10 text-center">
          <Building2 className="h-10 w-10 text-blue-400 mx-auto mb-3" />
          <h3 className="font-semibold text-blue-900 text-lg">No accounts linked yet</h3>
          <p className="text-blue-700 text-sm mt-2 mb-5">
            Connect your bank, brokerage, and credit accounts to get started.
          </p>
          <PlaidLinkButton onSuccess={() => { load(); sync() }} />
        </div>
      ) : (
        <div className="space-y-4">
          {items.map(item => {
            const itemAccounts = accounts.filter(a => a.plaid_item_id === item.id)
            return (
              <div key={item.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                {/* Institution header */}
                <div className="flex items-center justify-between px-5 py-4 bg-gray-50 border-b border-gray-200">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-blue-100 flex items-center justify-center">
                      <Building2 className="h-4 w-4 text-blue-600" />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">{item.institution_name ?? 'Connected Institution'}</p>
                      <p className="text-xs text-gray-400">
                        {item.last_synced_at
                          ? `Synced ${formatDistanceToNow(new Date(item.last_synced_at))} ago`
                          : `Added ${formatDistanceToNow(new Date(item.created_at))} ago`}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => removeItem(item.id)}
                    disabled={removing === item.id}
                    className="text-gray-400 hover:text-red-500 transition-colors p-1"
                    title="Remove institution"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>

                {/* Accounts list */}
                <table className="w-full text-sm">
                  <tbody className="divide-y divide-gray-100">
                    {itemAccounts.map(acct => (
                      <tr key={acct.id} className="hover:bg-gray-50">
                        <td className="px-5 py-3">
                          <p className="font-medium text-gray-900">{acct.name}</p>
                          {acct.official_name && acct.official_name !== acct.name && (
                            <p className="text-xs text-gray-400">{acct.official_name}</p>
                          )}
                        </td>
                        <td className="px-5 py-3">
                          <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full capitalize">
                            {TYPE_LABELS[acct.type] ?? acct.type}
                            {acct.subtype ? ` · ${acct.subtype}` : ''}
                          </span>
                        </td>
                        <td className="px-5 py-3 text-right font-medium text-gray-900">
                          ${Number(acct.balance_current).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                    ))}
                    {itemAccounts.length === 0 && (
                      <tr>
                        <td colSpan={3} className="px-5 py-4 text-sm text-gray-400 text-center">
                          No accounts found — try syncing.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

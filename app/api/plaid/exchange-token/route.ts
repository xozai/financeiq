import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { exchangePublicToken, getAccounts } from '@/lib/plaid'
import { z } from 'zod'

const Body = z.object({ public_token: z.string(), institution_name: z.string().optional() })

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const parsed = Body.safeParse(await req.json())
  if (!parsed.success) return NextResponse.json({ error: 'Invalid body' }, { status: 400 })

  const { public_token, institution_name } = parsed.data
  const { access_token, item_id } = await exchangePublicToken(public_token)

  // Persist Plaid item
  const { data: item } = await supabase.from('plaid_items').insert({
    user_id: user.id,
    plaid_item_id: item_id,
    access_token,
    institution_name,
    last_synced_at: new Date().toISOString(),
  }).select().single()

  // Sync accounts
  const plaidAccounts = await getAccounts(access_token)
  await supabase.from('accounts').upsert(
    plaidAccounts.map(a => ({
      user_id: user.id,
      plaid_item_id: item!.id,
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

  // Kick off full sync in the background (non-blocking)
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3010'
  fetch(`${baseUrl}/api/plaid/sync`, { method: 'POST', headers: { cookie: req.headers.get('cookie') ?? '' } })
    .catch(() => {}) // best-effort

  return NextResponse.json({ success: true })
}

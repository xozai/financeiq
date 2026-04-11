import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { format } from 'date-fns'

export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: accounts } = await supabase
    .from('accounts')
    .select('type, balance_current')
    .eq('user_id', user.id)

  if (!accounts || accounts.length === 0) {
    return NextResponse.json({ message: 'No accounts to snapshot' })
  }

  const totalAssets = accounts
    .filter(a => !['credit_card', 'loan', 'mortgage'].includes(a.type))
    .reduce((s, a) => s + Number(a.balance_current), 0)

  const totalLiabilities = accounts
    .filter(a => ['credit_card', 'loan', 'mortgage'].includes(a.type))
    .reduce((s, a) => s + Math.abs(Number(a.balance_current)), 0)

  const today = format(new Date(), 'yyyy-MM-dd')

  await supabase.from('net_worth_snapshots').upsert(
    {
      user_id: user.id,
      snapshot_date: today,
      total_assets: totalAssets,
      total_liabilities: totalLiabilities,
      net_worth: totalAssets - totalLiabilities,
    },
    { onConflict: 'user_id,snapshot_date' }
  )

  return NextResponse.json({
    snapshot_date: today,
    total_assets: totalAssets,
    total_liabilities: totalLiabilities,
    net_worth: totalAssets - totalLiabilities,
  })
}

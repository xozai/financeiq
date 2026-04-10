import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateRecommendations } from '@/lib/claude'
import { getMarketNews } from '@/lib/market'
import type { NewsArticle } from '@/lib/types'

export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Fetch all required data in parallel
  const [accountsRes, holdingsRes, debtsRes, snapshotsRes, rawNews] = await Promise.all([
    supabase.from('accounts').select('*').eq('user_id', user.id),
    supabase.from('holdings').select('*').eq('user_id', user.id),
    supabase.from('debts').select('*').eq('user_id', user.id),
    supabase.from('net_worth_snapshots').select('*').eq('user_id', user.id)
      .order('snapshot_date', { ascending: false }).limit(2),
    getMarketNews('general').catch(() => []),
  ])

  const accounts = accountsRes.data ?? []
  const holdings = holdingsRes.data ?? []
  const debts = debtsRes.data ?? []
  const snapshots = snapshotsRes.data ?? []

  // Compute net worth
  const assets = accounts
    .filter(a => !['credit_card', 'loan', 'mortgage'].includes(a.type))
    .reduce((s, a) => s + Number(a.balance_current), 0)
  const liabilities = accounts
    .filter(a => ['credit_card', 'loan', 'mortgage'].includes(a.type))
    .reduce((s, a) => s + Math.abs(Number(a.balance_current)), 0)

  const latest = snapshots[0]
  const previous = snapshots[1]
  const change30d = latest && previous ? latest.net_worth - previous.net_worth : 0
  const change30dPct = previous?.net_worth ? (change30d / previous.net_worth) * 100 : 0

  // Rough cash flow from transactions (last 30 days)
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  const { data: txns } = await supabase
    .from('transactions')
    .select('amount')
    .eq('user_id', user.id)
    .gte('date', thirtyDaysAgo)

  const income = (txns ?? []).filter(t => t.amount < 0).reduce((s, t) => s + Math.abs(t.amount), 0)
  const expenses = (txns ?? []).filter(t => t.amount > 0).reduce((s, t) => s + t.amount, 0)

  // Convert raw news to NewsArticle shape (sentiment tagging handled by Claude in production)
  const news: NewsArticle[] = rawNews.slice(0, 10).map((n, i) => ({
    id: String(n.id ?? i),
    headline: n.headline,
    summary: n.summary,
    source: n.source,
    url: n.url,
    published_at: new Date(n.datetime * 1000).toISOString(),
    sentiment: 'neutral',
    impact_tags: [],
    related_tickers: n.related ? n.related.split(',').filter(Boolean) : [],
  }))

  const recommendations = await generateRecommendations({
    netWorth: { total_assets: assets, total_liabilities: liabilities, net_worth: assets - liabilities, change_30d: change30d, change_30d_pct: change30dPct },
    holdings,
    debts,
    tax: {
      estimated_bracket: 22, // TODO: derive from income
      ytd_short_term_gains: 0,
      ytd_long_term_gains: 0,
      ira_contribution_remaining: 7000,
      k401_contribution_remaining: 23500,
      hsa_contribution_remaining: 4300,
      harvesting_opportunities: holdings.filter(h => h.unrealized_gain_loss < -500).length,
    },
    cashFlow: { monthly_income: income, monthly_expenses: expenses, monthly_surplus: income - expenses },
    recentNews: news,
  })

  // Persist to Supabase (replace previous batch)
  await supabase.from('recommendations').delete().eq('user_id', user.id)
  await supabase.from('recommendations').insert(
    recommendations.map(r => ({ ...r, user_id: user.id }))
  )

  return NextResponse.json({ recommendations })
}

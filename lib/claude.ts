import Anthropic from '@anthropic-ai/sdk'
import type { NetWorthSummary, Holding, Debt, TaxSummary, NewsArticle, Recommendation } from './types'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const SYSTEM_PROMPT = `You are a personal financial advisor assistant integrated into FinanceIQ.

You have access to the user's real-time financial data including:
- Net worth, account balances, and 30-day cash flow
- Investment portfolio with cost basis and holding periods
- All outstanding debts with APR and balances
- Current estimated tax bracket and YTD retirement contributions
- Recent economic news and market sentiment

Your job is to surface actionable, prioritized recommendations to:
1. Maximize long-term wealth — optimize investment allocation, fill tax-advantaged contribution room
2. Minimize debt — recommend payoff order, flag refinancing opportunities
3. Minimize tax burden — tax-loss harvesting, bracket management, contribution maximization

Response format: Return a JSON array of recommendations. Each recommendation must have:
{
  "category": "invest" | "debt" | "tax" | "rebalance" | "contribution",
  "priority": "high" | "medium" | "low",
  "title": "short action title",
  "description": "2-3 sentence explanation with reasoning",
  "action": "specific step the user should take",
  "estimated_impact": "quantified impact if possible (e.g. '$1,200/yr in tax savings')"
}

Rules:
- Never recommend specific individual securities or individual stocks
- Always explain your reasoning clearly
- Flag when a decision requires a licensed financial advisor (CFP) or CPA
- Prioritize high-impact, low-effort actions first
- Limit response to 5-7 recommendations`

interface FinancialContext {
  netWorth: NetWorthSummary
  holdings: Holding[]
  debts: Debt[]
  tax: TaxSummary
  cashFlow: { monthly_income: number; monthly_expenses: number; monthly_surplus: number }
  recentNews: NewsArticle[]
}

export async function generateRecommendations(ctx: FinancialContext): Promise<Recommendation[]> {
  const userMessage = `
Here is the user's current financial snapshot:

NET WORTH
- Total assets: $${ctx.netWorth.total_assets.toLocaleString()}
- Total liabilities: $${ctx.netWorth.total_liabilities.toLocaleString()}
- Net worth: $${ctx.netWorth.net_worth.toLocaleString()}
- 30-day change: ${ctx.netWorth.change_30d_pct > 0 ? '+' : ''}${ctx.netWorth.change_30d_pct.toFixed(1)}%

CASH FLOW (monthly)
- Income: $${ctx.cashFlow.monthly_income.toLocaleString()}
- Expenses: $${ctx.cashFlow.monthly_expenses.toLocaleString()}
- Surplus: $${ctx.cashFlow.monthly_surplus.toLocaleString()}

PORTFOLIO (top holdings)
${ctx.holdings.slice(0, 10).map(h =>
  `- ${h.ticker}: $${h.current_value.toLocaleString()} | ${h.unrealized_gain_loss >= 0 ? '+' : ''}$${h.unrealized_gain_loss.toLocaleString()} unrealized | held since ${h.purchase_date}`
).join('\n')}

DEBTS
${ctx.debts.map(d =>
  `- ${d.name}: $${d.balance.toLocaleString()} @ ${d.apr}% APR | min payment $${d.minimum_payment}/mo`
).join('\n')}

TAX SITUATION
- Estimated marginal bracket: ${ctx.tax.estimated_bracket}%
- YTD short-term gains: $${ctx.tax.ytd_short_term_gains.toLocaleString()}
- YTD long-term gains: $${ctx.tax.ytd_long_term_gains.toLocaleString()}
- 401k room remaining: $${ctx.tax.k401_contribution_remaining.toLocaleString()}
- IRA room remaining: $${ctx.tax.ira_contribution_remaining.toLocaleString()}
- HSA room remaining: $${ctx.tax.hsa_contribution_remaining.toLocaleString()}
- Tax-loss harvesting opportunities: ${ctx.tax.harvesting_opportunities} positions

RECENT ECONOMIC NEWS
${ctx.recentNews.slice(0, 5).map(n =>
  `- [${n.sentiment.toUpperCase()}] ${n.headline}`
).join('\n')}

Please generate prioritized recommendations.`

  const message = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 2048,
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: userMessage }],
  })

  const text = message.content[0].type === 'text' ? message.content[0].text : ''
  const jsonMatch = text.match(/\[[\s\S]*\]/)
  if (!jsonMatch) throw new Error('Claude returned unexpected format')

  const raw = JSON.parse(jsonMatch[0])
  return raw.map((r: Omit<Recommendation, 'id' | 'created_at'>, i: number) => ({
    ...r,
    id: `rec-${Date.now()}-${i}`,
    created_at: new Date().toISOString(),
  }))
}

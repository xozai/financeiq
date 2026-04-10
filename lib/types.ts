// ── Accounts ──────────────────────────────────────────────────────────────────

export type AccountType = 'checking' | 'savings' | 'brokerage' | 'retirement' | 'credit_card' | 'loan' | 'mortgage'

export interface Account {
  id: string
  user_id: string
  plaid_account_id: string
  plaid_item_id: string
  name: string
  official_name: string | null
  type: AccountType
  subtype: string | null
  balance_current: number
  balance_available: number | null
  currency: string
  last_updated: string
}

// ── Transactions ───────────────────────────────────────────────────────────────

export interface Transaction {
  id: string
  account_id: string
  plaid_transaction_id: string
  amount: number
  date: string
  name: string
  merchant_name: string | null
  category: string[]
  pending: boolean
}

// ── Holdings / Portfolio ───────────────────────────────────────────────────────

export interface Holding {
  id: string
  account_id: string
  ticker: string
  name: string
  quantity: number
  cost_basis: number
  current_price: number
  current_value: number
  unrealized_gain_loss: number
  purchase_date: string
}

// ── Debts ──────────────────────────────────────────────────────────────────────

export interface Debt {
  id: string
  account_id: string
  name: string
  balance: number
  apr: number
  minimum_payment: number
  payoff_date_estimated: string | null
}

// ── News ───────────────────────────────────────────────────────────────────────

export type NewsSentiment = 'bullish' | 'bearish' | 'neutral'
export type NewsImpactTag = 'inflation_risk' | 'sector_opportunity' | 'rate_change' | 'earnings' | 'geopolitical' | 'fed_policy'

export interface NewsArticle {
  id: string
  headline: string
  summary: string
  source: string
  url: string
  published_at: string
  sentiment: NewsSentiment
  impact_tags: NewsImpactTag[]
  related_tickers: string[]
}

// ── Recommendations ────────────────────────────────────────────────────────────

export type RecommendationCategory = 'invest' | 'debt' | 'tax' | 'rebalance' | 'contribution'
export type RecommendationPriority = 'high' | 'medium' | 'low'

export interface Recommendation {
  id: string
  category: RecommendationCategory
  priority: RecommendationPriority
  title: string
  description: string
  action: string
  estimated_impact: string
  created_at: string
}

// ── Dashboard Summary ──────────────────────────────────────────────────────────

export interface NetWorthSummary {
  total_assets: number
  total_liabilities: number
  net_worth: number
  change_30d: number
  change_30d_pct: number
}

export interface TaxSummary {
  estimated_bracket: number
  ytd_short_term_gains: number
  ytd_long_term_gains: number
  ira_contribution_remaining: number
  k401_contribution_remaining: number
  hsa_contribution_remaining: number
  harvesting_opportunities: number
}

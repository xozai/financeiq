const POLYGON_BASE = 'https://api.polygon.io/v2'
const FINNHUB_BASE = 'https://finnhub.io/api/v1'

// ── Market Quotes (Polygon.io) ─────────────────────────────────────────────────

export async function getQuote(ticker: string) {
  const res = await fetch(
    `${POLYGON_BASE}/last/trade/${ticker}?apiKey=${process.env.POLYGON_API_KEY}`,
    { next: { revalidate: 60 } }
  )
  if (!res.ok) throw new Error(`Failed to fetch quote for ${ticker}`)
  return res.json()
}

export async function getBatchQuotes(tickers: string[]) {
  return Promise.allSettled(tickers.map(getQuote))
}

// ── Economic News (Finnhub) ────────────────────────────────────────────────────

export interface RawNewsItem {
  id: number
  headline: string
  summary: string
  source: string
  url: string
  datetime: number
  related: string
}

export async function getMarketNews(category: 'general' | 'forex' | 'crypto' | 'merger' = 'general'): Promise<RawNewsItem[]> {
  const res = await fetch(
    `${FINNHUB_BASE}/news?category=${category}&token=${process.env.FINNHUB_API_KEY}`,
    { next: { revalidate: 900 } } // 15-min cache
  )
  if (!res.ok) throw new Error('Failed to fetch market news')
  return res.json()
}

export async function getCompanyNews(ticker: string, from: string, to: string): Promise<RawNewsItem[]> {
  const res = await fetch(
    `${FINNHUB_BASE}/company-news?symbol=${ticker}&from=${from}&to=${to}&token=${process.env.FINNHUB_API_KEY}`,
    { next: { revalidate: 900 } }
  )
  if (!res.ok) throw new Error(`Failed to fetch news for ${ticker}`)
  return res.json()
}

// ── Economic Indicators ────────────────────────────────────────────────────────

export async function getTreasuryRates() {
  // Polygon Treasury rates endpoint
  const res = await fetch(
    `https://api.polygon.io/v2/aggs/ticker/TNX/range/1/day/2024-01-01/${new Date().toISOString().split('T')[0]}?limit=30&apiKey=${process.env.POLYGON_API_KEY}`,
    { next: { revalidate: 3600 } }
  )
  if (!res.ok) throw new Error('Failed to fetch treasury rates')
  return res.json()
}

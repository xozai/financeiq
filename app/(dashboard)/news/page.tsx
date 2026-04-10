'use client'

import { useEffect, useState } from 'react'
import { format } from 'date-fns'
import type { RawNewsItem } from '@/lib/market'

const SENTIMENT_COLORS = {
  bullish: 'bg-green-100 text-green-700',
  bearish: 'bg-red-100 text-red-700',
  neutral: 'bg-gray-100 text-gray-600',
}

// Simple heuristic sentiment tagger (client-side; replace with Claude API call for production)
function tagSentiment(headline: string): keyof typeof SENTIMENT_COLORS {
  const lower = headline.toLowerCase()
  const bullishWords = ['surge', 'rally', 'gain', 'rise', 'beat', 'record', 'growth', 'strong', 'up', 'profit', 'boost']
  const bearishWords = ['fall', 'drop', 'decline', 'crash', 'loss', 'miss', 'recession', 'inflation', 'slump', 'cut', 'down']
  const bullScore = bullishWords.filter(w => lower.includes(w)).length
  const bearScore = bearishWords.filter(w => lower.includes(w)).length
  if (bullScore > bearScore) return 'bullish'
  if (bearScore > bullScore) return 'bearish'
  return 'neutral'
}

const IMPACT_KEYWORDS: Record<string, string> = {
  'fed|federal reserve|fomc|rate': 'Fed Policy',
  'inflation|cpi|pce': 'Inflation',
  'earnings|revenue|profit': 'Earnings',
  'geopolit|war|sanction|tariff': 'Geopolitical',
  'treasury|bond|yield': 'Rates',
  'gdp|recession|growth': 'GDP/Growth',
}

function tagImpacts(text: string): string[] {
  const lower = text.toLowerCase()
  return Object.entries(IMPACT_KEYWORDS)
    .filter(([pattern]) => new RegExp(pattern).test(lower))
    .map(([, label]) => label)
}

export default function NewsPage() {
  const [news, setNews] = useState<RawNewsItem[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'bullish' | 'bearish'>('all')

  useEffect(() => {
    fetch('/api/news')
      .then(r => r.json())
      .then(d => { setNews(d.news ?? []); setLoading(false) })
  }, [])

  const tagged = news.map(n => ({
    ...n,
    sentiment: tagSentiment(n.headline),
    impacts: tagImpacts(n.headline + ' ' + n.summary),
  }))

  const filtered = filter === 'all' ? tagged : tagged.filter(n => n.sentiment === filter)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Market News</h2>
        <div className="flex gap-2">
          {(['all', 'bullish', 'bearish'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium capitalize transition-colors ${filter === f ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Sentiment summary */}
      {!loading && (
        <div className="grid grid-cols-3 gap-4">
          {(['bullish', 'bearish', 'neutral'] as const).map(s => {
            const count = tagged.filter(n => n.sentiment === s).length
            const pct = tagged.length > 0 ? Math.round((count / tagged.length) * 100) : 0
            return (
              <div key={s} className="bg-white rounded-xl border border-gray-200 p-4 text-center">
                <p className={`text-2xl font-bold ${s === 'bullish' ? 'text-green-600' : s === 'bearish' ? 'text-red-600' : 'text-gray-500'}`}>
                  {pct}%
                </p>
                <p className="text-xs text-gray-500 capitalize mt-1">{s} ({count} articles)</p>
              </div>
            )
          })}
        </div>
      )}

      {/* News feed */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="bg-white rounded-xl border border-gray-200 p-5 animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-2" />
              <div className="h-3 bg-gray-100 rounded w-full mb-1" />
              <div className="h-3 bg-gray-100 rounded w-2/3" />
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(n => (
            <a
              key={n.id}
              href={n.url}
              target="_blank"
              rel="noopener noreferrer"
              className="block bg-white rounded-xl border border-gray-200 p-5 hover:border-gray-300 hover:shadow-sm transition-all"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${SENTIMENT_COLORS[n.sentiment]}`}>
                      {n.sentiment}
                    </span>
                    {n.impacts.map(tag => (
                      <span key={tag} className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full">{tag}</span>
                    ))}
                  </div>
                  <h3 className="text-sm font-semibold text-gray-900 leading-snug">{n.headline}</h3>
                  {n.summary && (
                    <p className="text-xs text-gray-500 mt-1 line-clamp-2">{n.summary}</p>
                  )}
                  <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
                    <span>{n.source}</span>
                    <span>·</span>
                    <span>{format(new Date(n.datetime * 1000), 'MMM d, h:mm a')}</span>
                  </div>
                </div>
              </div>
            </a>
          ))}
          {filtered.length === 0 && (
            <p className="text-center text-gray-400 text-sm py-10">No {filter} articles found.</p>
          )}
        </div>
      )}
    </div>
  )
}

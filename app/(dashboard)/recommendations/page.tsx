'use client'

import { useEffect, useState } from 'react'
import type { Recommendation } from '@/lib/types'
import { Lightbulb, TrendingUp, CreditCard, Receipt, RefreshCw, Check, X } from 'lucide-react'

const CATEGORY_CONFIG = {
  invest:       { label: 'Invest',      icon: TrendingUp,  color: 'text-blue-600',   bg: 'bg-blue-50',   border: 'border-blue-200' },
  debt:         { label: 'Debt',        icon: CreditCard,  color: 'text-red-600',    bg: 'bg-red-50',    border: 'border-red-200' },
  tax:          { label: 'Tax',         icon: Receipt,     color: 'text-purple-600', bg: 'bg-purple-50', border: 'border-purple-200' },
  rebalance:    { label: 'Rebalance',   icon: TrendingUp,  color: 'text-orange-600', bg: 'bg-orange-50', border: 'border-orange-200' },
  contribution: { label: 'Contribute',  icon: Lightbulb,   color: 'text-green-600',  bg: 'bg-green-50',  border: 'border-green-200' },
}

const PRIORITY_BADGE = {
  high:   'bg-red-100 text-red-700',
  medium: 'bg-yellow-100 text-yellow-700',
  low:    'bg-green-100 text-green-700',
}

export default function RecommendationsPage() {
  const [recs, setRecs] = useState<Recommendation[]>([])
  const [dismissed, setDismissed] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(false)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [activeFilter, setActiveFilter] = useState<string>('all')

  async function refresh() {
    setLoading(true)
    const res = await fetch('/api/recommendations', { method: 'POST' })
    const data = await res.json()
    setRecs(data.recommendations ?? [])
    setLastUpdated(new Date())
    setLoading(false)
  }

  useEffect(() => { refresh() }, [])

  function dismiss(id: string) {
    setDismissed(prev => new Set([...prev, id]))
  }

  const categories = ['all', ...Array.from(new Set(recs.map(r => r.category)))]
  const visible = recs
    .filter(r => !dismissed.has(r.id))
    .filter(r => activeFilter === 'all' || r.category === activeFilter)
    .sort((a, b) => {
      const order = { high: 0, medium: 1, low: 2 }
      return order[a.priority] - order[b.priority]
    })

  const highCount = visible.filter(r => r.priority === 'high').length

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">AI Financial Advisor</h2>
          {lastUpdated && (
            <p className="text-xs text-gray-400 mt-0.5">
              Last updated {lastUpdated.toLocaleTimeString()}
            </p>
          )}
        </div>
        <button
          onClick={refresh}
          disabled={loading}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          {loading ? 'Analyzing…' : 'Refresh'}
        </button>
      </div>

      {/* Stats banner */}
      {!loading && recs.length > 0 && (
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-xl p-5 text-white">
          <div className="flex items-center gap-3 mb-1">
            <Lightbulb className="h-5 w-5 text-yellow-300" />
            <span className="font-semibold">
              {visible.length} active recommendations
              {highCount > 0 && ` — ${highCount} high priority`}
            </span>
          </div>
          <p className="text-blue-100 text-sm">
            Based on your current accounts, portfolio, and market conditions.
            Always verify with a licensed CFP or CPA before acting.
          </p>
        </div>
      )}

      {/* Category filters */}
      {recs.length > 0 && (
        <div className="flex gap-2 flex-wrap">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setActiveFilter(cat)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium capitalize transition-colors ${
                activeFilter === cat ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {cat === 'all' ? `All (${recs.filter(r => !dismissed.has(r.id)).length})` : (CATEGORY_CONFIG[cat as keyof typeof CATEGORY_CONFIG]?.label ?? cat)}
            </button>
          ))}
        </div>
      )}

      {/* Loading skeleton */}
      {loading && (
        <div className="space-y-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="bg-white rounded-xl border border-gray-200 p-6 animate-pulse">
              <div className="flex gap-4">
                <div className="w-10 h-10 bg-gray-200 rounded-xl" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-1/3" />
                  <div className="h-3 bg-gray-100 rounded w-full" />
                  <div className="h-3 bg-gray-100 rounded w-3/4" />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Recommendation cards */}
      {!loading && (
        <div className="space-y-4">
          {visible.map(rec => {
            const config = CATEGORY_CONFIG[rec.category as keyof typeof CATEGORY_CONFIG]
            const Icon = config?.icon ?? Lightbulb
            return (
              <div
                key={rec.id}
                className={`bg-white rounded-xl border p-6 transition-all ${config?.border ?? 'border-gray-200'}`}
              >
                <div className="flex gap-4">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${config?.bg ?? 'bg-gray-50'}`}>
                    <Icon className={`h-5 w-5 ${config?.color ?? 'text-gray-600'}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${PRIORITY_BADGE[rec.priority]}`}>
                          {rec.priority} priority
                        </span>
                        <span className={`text-xs font-medium ${config?.color ?? 'text-gray-500'}`}>
                          {config?.label ?? rec.category}
                        </span>
                      </div>
                      <button
                        onClick={() => dismiss(rec.id)}
                        className="text-gray-300 hover:text-gray-500 transition-colors flex-shrink-0"
                        title="Dismiss"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>

                    <h3 className="font-semibold text-gray-900 mt-2">{rec.title}</h3>
                    <p className="text-sm text-gray-600 mt-1 leading-relaxed">{rec.description}</p>

                    <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                      <p className="text-xs font-semibold text-gray-700 mb-1">Recommended action</p>
                      <p className="text-sm text-gray-800">{rec.action}</p>
                    </div>

                    {rec.estimated_impact && (
                      <div className="flex items-center gap-1.5 mt-3">
                        <Check className="h-4 w-4 text-green-500" />
                        <p className="text-sm font-medium text-green-700">{rec.estimated_impact}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )
          })}

          {visible.length === 0 && !loading && (
            <div className="text-center py-16 text-gray-400">
              <Lightbulb className="h-10 w-10 mx-auto mb-3 opacity-40" />
              <p className="text-sm">
                {recs.length === 0
                  ? 'Connect your accounts and click Refresh to get personalized recommendations.'
                  : 'All recommendations dismissed. Click Refresh to get new ones.'}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

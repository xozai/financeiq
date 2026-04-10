'use client'

import { useEffect, useState } from 'react'
import type { Recommendation } from '@/lib/types'
import { Lightbulb, ArrowRight, RefreshCw } from 'lucide-react'

const PRIORITY_COLORS = {
  high: 'bg-red-100 text-red-700',
  medium: 'bg-yellow-100 text-yellow-700',
  low: 'bg-green-100 text-green-700',
}

const CATEGORY_LABELS: Record<string, string> = {
  invest: 'Invest',
  debt: 'Debt',
  tax: 'Tax',
  rebalance: 'Rebalance',
  contribution: 'Contribute',
}

interface Props { userId: string }

export function QuickActions({ userId }: Props) {
  const [recs, setRecs] = useState<Recommendation[]>([])
  const [loading, setLoading] = useState(false)

  async function fetchRecs() {
    setLoading(true)
    const res = await fetch('/api/recommendations', { method: 'POST' })
    const data = await res.json()
    setRecs(data.recommendations ?? [])
    setLoading(false)
  }

  useEffect(() => { fetchRecs() }, [])

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Lightbulb className="h-4 w-4 text-yellow-500" />
          <h3 className="text-sm font-medium text-gray-900">AI Advisor</h3>
        </div>
        <button
          onClick={fetchRecs}
          className="text-gray-400 hover:text-gray-600 transition-colors"
          disabled={loading}
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {loading && (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-16 bg-gray-100 rounded-lg animate-pulse" />
          ))}
        </div>
      )}

      {!loading && recs.slice(0, 3).map(rec => (
        <div key={rec.id} className="mb-3 p-3 rounded-lg border border-gray-100 hover:border-gray-200 transition-colors">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${PRIORITY_COLORS[rec.priority]}`}>
                  {rec.priority}
                </span>
                <span className="text-xs text-gray-500">{CATEGORY_LABELS[rec.category]}</span>
              </div>
              <p className="text-sm font-medium text-gray-900">{rec.title}</p>
              {rec.estimated_impact && (
                <p className="text-xs text-green-600 mt-0.5">{rec.estimated_impact}</p>
              )}
            </div>
            <ArrowRight className="h-4 w-4 text-gray-400 mt-1 flex-shrink-0" />
          </div>
        </div>
      ))}

      {!loading && recs.length === 0 && (
        <p className="text-sm text-gray-400 text-center py-6">
          Connect your accounts to get personalized advice.
        </p>
      )}

      {recs.length > 3 && (
        <a href="/dashboard/recommendations" className="text-xs text-blue-600 hover:underline">
          View all {recs.length} recommendations →
        </a>
      )}
    </div>
  )
}

'use client'

import type { NetWorthSummary } from '@/lib/types'
import { TrendingUp, TrendingDown } from 'lucide-react'

interface Props { netWorth: NetWorthSummary }

export function NetWorthCard({ netWorth }: Props) {
  const isPositive = netWorth.change_30d >= 0

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <p className="text-sm text-gray-500">Net Worth</p>
      <p className="text-3xl font-bold text-gray-900 mt-1">
        ${netWorth.net_worth.toLocaleString('en-US', { minimumFractionDigits: 0 })}
      </p>
      <div className={`flex items-center gap-1 mt-2 text-sm ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
        {isPositive ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
        <span>
          {isPositive ? '+' : ''}{netWorth.change_30d_pct.toFixed(1)}% (30d)
        </span>
      </div>
    </div>
  )
}

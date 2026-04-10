'use client'

import type { Debt } from '@/lib/types'

interface Props { debts: Debt[] }

export function DebtWaterfall({ debts }: Props) {
  const sorted = [...debts].sort((a, b) => b.apr - a.apr)
  const total = sorted.reduce((s, d) => s + d.balance, 0)

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-gray-900">Debt Waterfall (Avalanche Order)</h3>
        <span className="text-sm text-gray-500">
          Total: ${total.toLocaleString('en-US', { minimumFractionDigits: 0 })}
        </span>
      </div>
      <div className="space-y-3">
        {sorted.map((debt, i) => (
          <div key={debt.id}>
            <div className="flex items-center justify-between text-sm mb-1">
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 text-xs font-bold flex items-center justify-center">
                  {i + 1}
                </span>
                <span className="font-medium text-gray-800">{debt.name}</span>
                <span className="text-red-500 text-xs font-semibold">{debt.apr}% APR</span>
              </div>
              <span className="text-gray-700">${debt.balance.toLocaleString()}</span>
            </div>
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-red-400 to-orange-300 rounded-full"
                style={{ width: `${Math.min((debt.balance / total) * 100, 100)}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

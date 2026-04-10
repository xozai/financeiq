'use client'

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { TrendingUp, TrendingDown } from 'lucide-react'
import type { Holding, Account } from '@/lib/types'
import { PlaidLinkButton } from '@/components/PlaidLinkButton'

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16']

interface Props { holdings: Holding[]; accounts: Account[] }

export function PortfolioClient({ holdings, accounts }: Props) {
  const totalValue = holdings.reduce((s, h) => s + h.current_value, 0)
  const totalGainLoss = holdings.reduce((s, h) => s + h.unrealized_gain_loss, 0)
  const totalCostBasis = holdings.reduce((s, h) => s + h.cost_basis * h.quantity, 0)
  const totalReturnPct = totalCostBasis > 0 ? (totalGainLoss / totalCostBasis) * 100 : 0

  // Allocation pie data (group small positions into "Other")
  const sorted = [...holdings].sort((a, b) => b.current_value - a.current_value)
  const top7 = sorted.slice(0, 7)
  const rest = sorted.slice(7).reduce((s, h) => s + h.current_value, 0)
  const pieData = [
    ...top7.map(h => ({ name: h.ticker, value: h.current_value })),
    ...(rest > 0 ? [{ name: 'Other', value: rest }] : []),
  ]

  // Flag harvesting candidates (unrealized loss > $500 and held < 1 year)
  const now = new Date()
  const harvestCandidates = holdings.filter(h => {
    const held = (now.getTime() - new Date(h.purchase_date).getTime()) / (1000 * 60 * 60 * 24)
    return h.unrealized_gain_loss < -500 && held < 365
  })

  if (holdings.length === 0) {
    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold text-gray-900">Portfolio</h2>
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-8 text-center">
          <h3 className="font-semibold text-blue-900 text-lg">No investment accounts linked</h3>
          <p className="text-blue-700 text-sm mt-2 mb-4">Connect a brokerage or retirement account to see your portfolio.</p>
          <PlaidLinkButton onSuccess={() => window.location.reload()} />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Portfolio</h2>
        <PlaidLinkButton onSuccess={() => window.location.reload()} />
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <p className="text-sm text-gray-500">Total Value</p>
          <p className="text-2xl font-bold text-gray-900">${totalValue.toLocaleString()}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <p className="text-sm text-gray-500">Unrealized Gain / Loss</p>
          <div className={`flex items-center gap-1 mt-1 ${totalGainLoss >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {totalGainLoss >= 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
            <p className="text-2xl font-bold">${Math.abs(totalGainLoss).toLocaleString()}</p>
          </div>
          <p className={`text-sm ${totalGainLoss >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {totalReturnPct >= 0 ? '+' : ''}{totalReturnPct.toFixed(1)}% total return
          </p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <p className="text-sm text-gray-500">Harvest Candidates</p>
          <p className="text-2xl font-bold text-gray-900">{harvestCandidates.length}</p>
          <p className="text-sm text-yellow-600">positions with losses &gt;$500</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Allocation pie */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="text-sm font-medium text-gray-900 mb-4">Allocation</h3>
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} dataKey="value" paddingAngle={2}>
                {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip formatter={(v: number) => [`$${v.toLocaleString()}`, '']} contentStyle={{ fontSize: 12, borderRadius: 8 }} />
              <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Tax-loss harvesting panel */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="text-sm font-medium text-gray-900 mb-1">Tax-Loss Harvesting</h3>
          <p className="text-xs text-gray-500 mb-4">Short-term positions with unrealized losses &gt;$500</p>
          {harvestCandidates.length === 0 ? (
            <p className="text-sm text-gray-400 py-8 text-center">No harvesting opportunities right now.</p>
          ) : (
            <div className="space-y-2">
              {harvestCandidates.map(h => (
                <div key={h.id} className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{h.ticker}</p>
                    <p className="text-xs text-gray-500">{h.quantity} shares · since {h.purchase_date}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-red-600">${h.unrealized_gain_loss.toLocaleString()}</p>
                    <p className="text-xs text-gray-500">potential deduction</p>
                  </div>
                </div>
              ))}
              <p className="text-xs text-gray-400 mt-2">⚠️ Consult a CPA before harvesting. Watch-out for wash-sale rules.</p>
            </div>
          )}
        </div>
      </div>

      {/* Holdings table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="p-5 border-b border-gray-100">
          <h3 className="text-sm font-medium text-gray-900">Holdings ({holdings.length})</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-left">
                {['Ticker', 'Name', 'Qty', 'Price', 'Value', 'Cost Basis', 'Gain/Loss', 'Return', 'Holding Period'].map(h => (
                  <th key={h} className="px-4 py-3 text-xs font-medium text-gray-500 whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {holdings.map(h => {
                const held = Math.floor((Date.now() - new Date(h.purchase_date).getTime()) / (1000 * 60 * 60 * 24))
                const basis = h.cost_basis * h.quantity
                const ret = basis > 0 ? (h.unrealized_gain_loss / basis) * 100 : 0
                const isLong = held >= 365
                return (
                  <tr key={h.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-semibold text-blue-700">{h.ticker}</td>
                    <td className="px-4 py-3 text-gray-600 max-w-[160px] truncate">{h.name}</td>
                    <td className="px-4 py-3 text-gray-700">{h.quantity.toLocaleString()}</td>
                    <td className="px-4 py-3 text-gray-700">${h.current_price?.toFixed(2)}</td>
                    <td className="px-4 py-3 font-medium">${h.current_value.toLocaleString()}</td>
                    <td className="px-4 py-3 text-gray-500">${basis.toLocaleString()}</td>
                    <td className={`px-4 py-3 font-medium ${h.unrealized_gain_loss >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {h.unrealized_gain_loss >= 0 ? '+' : ''}${h.unrealized_gain_loss.toLocaleString()}
                    </td>
                    <td className={`px-4 py-3 font-medium ${ret >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {ret >= 0 ? '+' : ''}{ret.toFixed(1)}%
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${isLong ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                        {isLong ? 'Long-term' : `${held}d`}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

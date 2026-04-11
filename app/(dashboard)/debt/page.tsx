'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Debt } from '@/lib/types'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'

import { buildPayoffSchedule } from '@/lib/payoff'
type Method = 'avalanche' | 'snowball'

export default function DebtPage() {
  const supabase = createClient()
  const [debts, setDebts] = useState<Debt[]>([])
  const [extra, setExtra] = useState(200)
  const [method, setMethod] = useState<Method>('avalanche')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return
      supabase.from('debts').select('*').eq('user_id', user.id).order('apr', { ascending: false })
        .then(({ data }) => { setDebts(data ?? []); setLoading(false) })
    })
  }, [])

  if (loading) return <div className="animate-pulse text-gray-400 text-sm">Loading debts…</div>

  const avalanche = buildPayoffSchedule(debts, extra, 'avalanche')
  const snowball = buildPayoffSchedule(debts, extra, 'snowball')
  const current = method === 'avalanche' ? avalanche : snowball

  const totalDebt = debts.reduce((s, d) => s + d.balance, 0)
  const totalMinPayment = debts.reduce((s, d) => s + d.minimum_payment, 0)
  const totalInterestSaved = Math.round((avalanche.months - snowball.months) * totalMinPayment * 0.08)

  const payoffDate = new Date()
  payoffDate.setMonth(payoffDate.getMonth() + current.months)

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">Debt Payoff Planner</h2>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <p className="text-sm text-gray-500">Total Debt</p>
          <p className="text-2xl font-bold text-red-600">${totalDebt.toLocaleString()}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <p className="text-sm text-gray-500">Payoff Date ({method})</p>
          <p className="text-2xl font-bold text-gray-900">
            {current.months < 600 ? payoffDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : '50+ years'}
          </p>
          <p className="text-sm text-gray-500">{current.months} months</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <p className="text-sm text-gray-500">Avalanche vs Snowball</p>
          <p className="text-2xl font-bold text-green-600">
            {Math.abs(avalanche.months - snowball.months)} mo faster
          </p>
          <p className="text-sm text-gray-500">w/ avalanche method</p>
        </div>
      </div>

      {/* Controls */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <div className="flex flex-wrap items-center gap-6">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Extra Monthly Payment</label>
            <div className="flex items-center gap-2">
              <span className="text-gray-500 text-sm">$</span>
              <input
                type="number"
                value={extra}
                onChange={e => setExtra(Number(e.target.value))}
                className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm w-28 focus:outline-none focus:ring-2 focus:ring-blue-500"
                min={0}
                step={50}
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Method</label>
            <div className="flex gap-2">
              {(['avalanche', 'snowball'] as Method[]).map(m => (
                <button
                  key={m}
                  onClick={() => setMethod(m)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium capitalize transition-colors ${method === m ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>
          <div className="text-xs text-gray-400 max-w-xs">
            <strong>Avalanche</strong>: highest APR first — saves the most interest.<br />
            <strong>Snowball</strong>: smallest balance first — builds momentum.
          </div>
        </div>
      </div>

      {/* Payoff chart */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h3 className="text-sm font-medium text-gray-900 mb-4">Debt Payoff Trajectory</h3>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={current.snapshots}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="month" tick={{ fontSize: 11 }} tickFormatter={v => `Mo ${v}`} />
            <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `$${(v / 1000).toFixed(0)}k`} />
            <Tooltip formatter={(v: number) => [`$${v.toLocaleString()}`, 'Remaining Debt']} contentStyle={{ fontSize: 12, borderRadius: 8 }} />
            <Bar dataKey="totalDebt" fill="#ef4444" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Debt table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="p-5 border-b border-gray-100">
          <h3 className="text-sm font-medium text-gray-900">
            Debts — {method === 'avalanche' ? 'Highest APR First' : 'Smallest Balance First'}
          </h3>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 text-left">
              {['#', 'Name', 'Balance', 'APR', 'Min Payment', 'Est. Payoff'].map(h => (
                <th key={h} className="px-4 py-3 text-xs font-medium text-gray-500">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {(method === 'avalanche'
              ? [...debts].sort((a, b) => b.apr - a.apr)
              : [...debts].sort((a, b) => a.balance - b.balance)
            ).map((d, i) => (
              <tr key={d.id} className="hover:bg-gray-50">
                <td className="px-4 py-3">
                  <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 text-xs font-bold flex items-center justify-center">{i + 1}</span>
                </td>
                <td className="px-4 py-3 font-medium text-gray-900">{d.name}</td>
                <td className="px-4 py-3 text-red-600 font-medium">${d.balance.toLocaleString()}</td>
                <td className="px-4 py-3">
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${d.apr > 15 ? 'bg-red-100 text-red-700' : d.apr > 7 ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700'}`}>
                    {d.apr}%
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-700">${d.minimum_payment}/mo</td>
                <td className="px-4 py-3 text-gray-500">{d.payoff_date_estimated ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

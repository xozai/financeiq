'use client'

import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { format } from 'date-fns'

interface Snapshot {
  snapshot_date: string
  net_worth: number
}

interface Props { snapshots: Snapshot[] }

export function CashFlowChart({ snapshots }: Props) {
  const data = [...snapshots]
    .reverse()
    .map(s => ({
      date: format(new Date(s.snapshot_date), 'MMM d'),
      value: s.net_worth,
    }))

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <h3 className="text-sm font-medium text-gray-900 mb-4">Net Worth Trend</h3>
      {data.length === 0 ? (
        <div className="h-48 flex items-center justify-center text-gray-400 text-sm">
          No history yet — connect accounts to start tracking
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={200}>
          <AreaChart data={data}>
            <defs>
              <linearGradient id="nwGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.15} />
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis dataKey="date" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
            <YAxis
              tick={{ fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              tickFormatter={v => `$${(v / 1000).toFixed(0)}k`}
            />
            <Tooltip
              formatter={(v: number) => [`$${v.toLocaleString()}`, 'Net Worth']}
              contentStyle={{ fontSize: 12, borderRadius: 8 }}
            />
            <Area
              type="monotone"
              dataKey="value"
              stroke="#3b82f6"
              strokeWidth={2}
              fill="url(#nwGradient)"
            />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </div>
  )
}

import type { Debt } from './types'

export type PayoffMethod = 'avalanche' | 'snowball'

export interface PayoffMonth {
  month: number
  totalDebt: number
}

export interface PayoffResult {
  months: number
  snapshots: PayoffMonth[]
  totalInterestPaid: number
}

export function buildPayoffSchedule(
  debts: Debt[],
  extraMonthly: number,
  method: PayoffMethod
): PayoffResult {
  if (debts.length === 0) return { months: 0, snapshots: [], totalInterestPaid: 0 }

  const remaining = debts.map(d => ({ ...d, balance: d.balance }))

  const sorted =
    method === 'avalanche'
      ? [...remaining].sort((a, b) => b.apr - a.apr)
      : [...remaining].sort((a, b) => a.balance - b.balance)

  const snapshots: PayoffMonth[] = []
  let month = 0
  let totalInterestPaid = 0
  let total = remaining.reduce((s, d) => s + d.balance, 0)

  while (total > 0 && month < 600) {
    month++
    let extra = extraMonthly

    for (const debt of sorted) {
      const d = remaining.find(r => r.id === debt.id)!
      if (d.balance <= 0) continue

      const interest = (d.balance * (d.apr / 100)) / 12
      totalInterestPaid += interest

      const payment = Math.min(
        d.balance + interest,
        d.minimum_payment + (extra > 0 ? extra : 0)
      )
      extra = Math.max(0, extra - Math.max(0, payment - d.minimum_payment))
      d.balance = Math.max(0, d.balance + interest - payment)
    }

    total = remaining.reduce((s, d) => s + d.balance, 0)
    if (month % 3 === 0 || total <= 0) {
      snapshots.push({ month, totalDebt: Math.max(0, total) })
    }
  }

  return { months: month, snapshots, totalInterestPaid }
}

export function payoffDateFromMonths(months: number): Date {
  const d = new Date()
  d.setMonth(d.getMonth() + months)
  return d
}

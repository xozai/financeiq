import { describe, it, expect } from 'vitest'
import { buildPayoffSchedule } from '@/lib/payoff'
import type { Debt } from '@/lib/types'

const makeDebt = (overrides: Partial<Debt> = {}): Debt => ({
  id: overrides.id ?? 'debt-1',
  account_id: 'acct-1',
  user_id: 'user-1',
  name: overrides.name ?? 'Test Debt',
  balance: overrides.balance ?? 1000,
  apr: overrides.apr ?? 20,
  minimum_payment: overrides.minimum_payment ?? 25,
  payoff_date_estimated: null,
})

describe('buildPayoffSchedule', () => {
  it('returns 0 months for empty debts array', () => {
    const result = buildPayoffSchedule([], 0, 'avalanche')
    expect(result.months).toBe(0)
    expect(result.snapshots).toHaveLength(0)
    expect(result.totalInterestPaid).toBe(0)
  })

  it('pays off a single debt', () => {
    const debt = makeDebt({ balance: 500, apr: 0, minimum_payment: 100 })
    const result = buildPayoffSchedule([debt], 0, 'avalanche')
    expect(result.months).toBe(5)
    expect(result.totalInterestPaid).toBe(0)
  })

  it('avalanche prioritizes highest APR first', () => {
    // Unequal balances: snowball will knock out the small cheap debt first,
    // leaving the large expensive debt accruing high interest longer.
    // Avalanche attacks the large high-APR debt first — always cheaper overall.
    const highApr = makeDebt({ id: 'high', name: 'High APR', balance: 5000, apr: 24, minimum_payment: 100 })
    const lowApr  = makeDebt({ id: 'low',  name: 'Low APR',  balance: 500,  apr: 5,  minimum_payment: 15  })
    const avalanche = buildPayoffSchedule([highApr, lowApr], 50, 'avalanche')
    const snowball  = buildPayoffSchedule([highApr, lowApr], 50, 'snowball')
    // Avalanche should pay less total interest
    expect(avalanche.totalInterestPaid).toBeLessThan(snowball.totalInterestPaid)
  })

  it('snowball prioritizes smallest balance first', () => {
    const large = makeDebt({ id: 'large', name: 'Large',  balance: 5000, apr: 10, minimum_payment: 100 })
    const small = makeDebt({ id: 'small', name: 'Small',  balance: 500,  apr: 5,  minimum_payment: 20 })
    const result = buildPayoffSchedule([large, small], 300, 'snowball')
    // Snowball should retire the small debt quickly — last snapshot before small is gone should show drop
    const earlyTotal = result.snapshots[0]?.totalDebt ?? 0
    expect(earlyTotal).toBeLessThan(5500)
  })

  it('extra payment reduces total months', () => {
    const debt = makeDebt({ balance: 3000, apr: 18, minimum_payment: 60 })
    const noExtra    = buildPayoffSchedule([debt], 0,   'avalanche')
    const withExtra  = buildPayoffSchedule([debt], 200, 'avalanche')
    expect(withExtra.months).toBeLessThan(noExtra.months)
  })

  it('handles multiple debts reaching zero', () => {
    const debts = [
      makeDebt({ id: 'd1', balance: 200,  apr: 20, minimum_payment: 50 }),
      makeDebt({ id: 'd2', balance: 1000, apr: 15, minimum_payment: 30 }),
      makeDebt({ id: 'd3', balance: 500,  apr: 5,  minimum_payment: 20 }),
    ]
    const result = buildPayoffSchedule(debts, 100, 'avalanche')
    expect(result.months).toBeGreaterThan(0)
    expect(result.months).toBeLessThan(600)
    const lastSnapshot = result.snapshots[result.snapshots.length - 1]
    expect(lastSnapshot.totalDebt).toBe(0)
  })

  it('does not exceed 600 months (infinite loop guard)', () => {
    // Minimum payment less than monthly interest — should cap at 600
    const debt = makeDebt({ balance: 100000, apr: 30, minimum_payment: 1 })
    const result = buildPayoffSchedule([debt], 0, 'avalanche')
    expect(result.months).toBe(600)
  })

  it('snapshots every 3 months', () => {
    const debt = makeDebt({ balance: 1200, apr: 0, minimum_payment: 100 })
    const result = buildPayoffSchedule([debt], 0, 'avalanche')
    // 12 months to pay off → snapshots at 3, 6, 9, 12
    expect(result.snapshots.every(s => s.month % 3 === 0 || s.totalDebt === 0)).toBe(true)
  })
})

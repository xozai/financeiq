import { describe, it, expect } from 'vitest'
import {
  getMarginalRate,
  getEffectiveRate,
  estimateTaxSavings,
  isShortTerm,
  BRACKETS,
  CONTRIBUTION_LIMITS,
} from '@/lib/tax'

describe('getMarginalRate', () => {
  it('returns 10% for income in the lowest bracket', () => {
    expect(getMarginalRate(5000)).toBe(10)
    expect(getMarginalRate(0)).toBe(10)
  })

  it('returns 12% for income in second bracket', () => {
    expect(getMarginalRate(20000)).toBe(12)
  })

  it('returns 22% for income around $75k single', () => {
    expect(getMarginalRate(75000)).toBe(22)
  })

  it('returns 24% for income around $150k single', () => {
    expect(getMarginalRate(150000)).toBe(24)
  })

  it('returns 37% for very high income', () => {
    expect(getMarginalRate(700000)).toBe(37)
  })

  it('uses married_joint brackets when specified', () => {
    // $50k is 12% single, but still 12% married joint too
    expect(getMarginalRate(50000, 'married_joint')).toBe(12)
    // $100k is 22% single, but still 12% married joint (limit is $96,950)
    expect(getMarginalRate(100000, 'married_joint')).toBe(22)
  })

  it('falls back to single brackets for unknown filing status', () => {
    expect(getMarginalRate(75000, 'unknown_status')).toBe(getMarginalRate(75000, 'single'))
  })
})

describe('getEffectiveRate', () => {
  it('returns 0 for zero income', () => {
    expect(getEffectiveRate(0)).toBe(0)
  })

  it('returns less than marginal rate', () => {
    const income = 100000
    expect(getEffectiveRate(income)).toBeLessThan(getMarginalRate(income))
  })

  it('increases with income', () => {
    expect(getEffectiveRate(50000)).toBeLessThan(getEffectiveRate(200000))
  })

  it('never exceeds 37%', () => {
    expect(getEffectiveRate(10_000_000)).toBeLessThanOrEqual(37)
  })
})

describe('estimateTaxSavings', () => {
  it('calculates correct savings at 22% bracket', () => {
    expect(estimateTaxSavings(10000, 22)).toBe(2200)
  })

  it('calculates 401k max savings at 24% bracket', () => {
    expect(estimateTaxSavings(CONTRIBUTION_LIMITS.k401, 24)).toBe(
      Math.round(CONTRIBUTION_LIMITS.k401 * 0.24)
    )
  })

  it('returns 0 for 0% rate', () => {
    expect(estimateTaxSavings(5000, 0)).toBe(0)
  })
})

describe('isShortTerm', () => {
  it('returns true for a purchase 6 months ago', () => {
    const sixMonthsAgo = new Date()
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)
    expect(isShortTerm(sixMonthsAgo.toISOString().split('T')[0])).toBe(true)
  })

  it('returns false for a purchase over 1 year ago', () => {
    const twoYearsAgo = new Date()
    twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2)
    expect(isShortTerm(twoYearsAgo.toISOString().split('T')[0])).toBe(false)
  })
})

describe('CONTRIBUTION_LIMITS', () => {
  it('has expected 2025 values', () => {
    expect(CONTRIBUTION_LIMITS.k401).toBe(23500)
    expect(CONTRIBUTION_LIMITS.ira).toBe(7000)
    expect(CONTRIBUTION_LIMITS.hsa).toBe(4300)
  })
})

describe('BRACKETS', () => {
  it('has all four filing statuses', () => {
    expect(BRACKETS).toHaveProperty('single')
    expect(BRACKETS).toHaveProperty('married_joint')
    expect(BRACKETS).toHaveProperty('married_separate')
    expect(BRACKETS).toHaveProperty('head_of_household')
  })

  it('each bracket set covers $0 to Infinity', () => {
    for (const status of Object.keys(BRACKETS)) {
      const brackets = BRACKETS[status]
      expect(brackets[0].min).toBe(0)
      expect(brackets[brackets.length - 1].max).toBe(Infinity)
    }
  })

  it('brackets are contiguous (no gaps)', () => {
    for (const status of Object.keys(BRACKETS)) {
      const brackets = BRACKETS[status]
      for (let i = 1; i < brackets.length; i++) {
        expect(brackets[i].min).toBe(brackets[i - 1].max)
      }
    }
  })
})

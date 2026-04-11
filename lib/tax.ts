export interface TaxBracket {
  min: number
  max: number
  rate: number
}

// 2025 federal income tax brackets
export const BRACKETS: Record<string, TaxBracket[]> = {
  single: [
    { min: 0,       max: 11925,    rate: 10 },
    { min: 11925,   max: 48475,    rate: 12 },
    { min: 48475,   max: 103350,   rate: 22 },
    { min: 103350,  max: 197300,   rate: 24 },
    { min: 197300,  max: 250525,   rate: 32 },
    { min: 250525,  max: 626350,   rate: 35 },
    { min: 626350,  max: Infinity, rate: 37 },
  ],
  married_joint: [
    { min: 0,       max: 23850,    rate: 10 },
    { min: 23850,   max: 96950,    rate: 12 },
    { min: 96950,   max: 206700,   rate: 22 },
    { min: 206700,  max: 394600,   rate: 24 },
    { min: 394600,  max: 501050,   rate: 32 },
    { min: 501050,  max: 751600,   rate: 35 },
    { min: 751600,  max: Infinity, rate: 37 },
  ],
  married_separate: [
    { min: 0,       max: 11925,    rate: 10 },
    { min: 11925,   max: 48475,    rate: 12 },
    { min: 48475,   max: 103350,   rate: 22 },
    { min: 103350,  max: 197300,   rate: 24 },
    { min: 197300,  max: 250525,   rate: 32 },
    { min: 250525,  max: 375800,   rate: 35 },
    { min: 375800,  max: Infinity, rate: 37 },
  ],
  head_of_household: [
    { min: 0,       max: 17000,    rate: 10 },
    { min: 17000,   max: 64850,    rate: 12 },
    { min: 64850,   max: 103350,   rate: 22 },
    { min: 103350,  max: 197300,   rate: 24 },
    { min: 197300,  max: 250500,   rate: 32 },
    { min: 250500,  max: 626350,   rate: 35 },
    { min: 626350,  max: Infinity, rate: 37 },
  ],
}

// 2025 contribution limits
export const CONTRIBUTION_LIMITS = {
  k401: 23500,
  ira: 7000,
  hsa: 4300,
  k401_catchup: 31000,  // age 50+
  ira_catchup: 8000,    // age 50+
}

export function getMarginalRate(income: number, filingStatus = 'single'): number {
  const brackets = BRACKETS[filingStatus] ?? BRACKETS.single
  return brackets.find(b => income >= b.min && income < b.max)?.rate ?? 37
}

export function getEffectiveRate(income: number, filingStatus = 'single'): number {
  if (income <= 0) return 0
  const brackets = BRACKETS[filingStatus] ?? BRACKETS.single
  let totalTax = 0

  for (const bracket of brackets) {
    if (income <= bracket.min) break
    const taxableInBracket = Math.min(income, bracket.max) - bracket.min
    totalTax += taxableInBracket * (bracket.rate / 100)
  }

  return (totalTax / income) * 100
}

export function estimateTaxSavings(
  contributionAmount: number,
  marginalRate: number
): number {
  return Math.round(contributionAmount * (marginalRate / 100))
}

export function isShortTerm(purchaseDate: string): boolean {
  const held = (Date.now() - new Date(purchaseDate).getTime()) / (1000 * 60 * 60 * 24)
  return held < 365
}

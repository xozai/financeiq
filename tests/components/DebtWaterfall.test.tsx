import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { DebtWaterfall } from '@/components/dashboard/DebtWaterfall'
import type { Debt } from '@/lib/types'

const makeDebt = (overrides: Partial<Debt> = {}): Debt => ({
  id: overrides.id ?? 'debt-1',
  account_id: 'acct-1',
  user_id: 'user-1',
  name: overrides.name ?? 'Credit Card',
  balance: overrides.balance ?? 5000,
  apr: overrides.apr ?? 22,
  minimum_payment: overrides.minimum_payment ?? 100,
  payoff_date_estimated: null,
})

describe('DebtWaterfall', () => {
  it('renders all debt names', () => {
    const debts = [
      makeDebt({ id: 'd1', name: 'Visa', apr: 22, balance: 3000 }),
      makeDebt({ id: 'd2', name: 'Car Loan', apr: 6, balance: 10000 }),
      makeDebt({ id: 'd3', name: 'Student Loan', apr: 4, balance: 20000 }),
    ]
    render(<DebtWaterfall debts={debts} />)
    expect(screen.getByText('Visa')).toBeInTheDocument()
    expect(screen.getByText('Car Loan')).toBeInTheDocument()
    expect(screen.getByText('Student Loan')).toBeInTheDocument()
  })

  it('sorts debts by APR descending (avalanche order)', () => {
    const debts = [
      makeDebt({ id: 'd1', name: 'Low APR',  apr: 4 }),
      makeDebt({ id: 'd2', name: 'High APR', apr: 24 }),
      makeDebt({ id: 'd3', name: 'Mid APR',  apr: 12 }),
    ]
    render(<DebtWaterfall debts={debts} />)
    const items = screen.getAllByText(/APR/)
    // The first rank badge (#1) should be next to the highest APR
    const firstItem = screen.getByText('1', { selector: 'span' })
    expect(firstItem.closest('div')).toBeInTheDocument()
    // High APR should appear before Low APR in the document
    const allText = document.body.textContent ?? ''
    expect(allText.indexOf('High APR')).toBeLessThan(allText.indexOf('Low APR'))
  })

  it('shows total debt amount', () => {
    const debts = [
      makeDebt({ id: 'd1', balance: 3000 }),
      makeDebt({ id: 'd2', balance: 7000 }),
    ]
    render(<DebtWaterfall debts={debts} />)
    expect(screen.getByText(/10,000/)).toBeInTheDocument()
  })

  it('displays APR percentage for each debt', () => {
    const debts = [makeDebt({ apr: 19.99 })]
    render(<DebtWaterfall debts={debts} />)
    expect(screen.getByText(/19\.99% APR/)).toBeInTheDocument()
  })

  it('renders rank numbers starting from 1', () => {
    const debts = [
      makeDebt({ id: 'd1', name: 'A', apr: 20 }),
      makeDebt({ id: 'd2', name: 'B', apr: 15 }),
    ]
    render(<DebtWaterfall debts={debts} />)
    expect(screen.getByText('1')).toBeInTheDocument()
    expect(screen.getByText('2')).toBeInTheDocument()
  })

  it('renders empty state gracefully with no debts', () => {
    const { container } = render(<DebtWaterfall debts={[]} />)
    // Should render without crashing — total shows $0
    expect(container).toBeTruthy()
  })
})

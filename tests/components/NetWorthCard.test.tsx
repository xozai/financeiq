import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { NetWorthCard } from '@/components/dashboard/NetWorthCard'
import type { NetWorthSummary } from '@/lib/types'

const base: NetWorthSummary = {
  total_assets: 150000,
  total_liabilities: 50000,
  net_worth: 100000,
  change_30d: 2000,
  change_30d_pct: 2.0,
}

describe('NetWorthCard', () => {
  it('renders net worth value', () => {
    render(<NetWorthCard netWorth={base} />)
    expect(screen.getByText(/\$100,000/)).toBeInTheDocument()
  })

  it('shows positive trend with + sign and green color class', () => {
    render(<NetWorthCard netWorth={base} />)
    const trend = screen.getByText(/\+2\.0%/)
    expect(trend).toBeInTheDocument()
    expect(trend.closest('div')).toHaveClass('text-green-600')
  })

  it('shows negative trend with red color class', () => {
    render(<NetWorthCard netWorth={{ ...base, change_30d: -1000, change_30d_pct: -1.0 }} />)
    const trend = screen.getByText(/-1\.0%/)
    expect(trend).toBeInTheDocument()
    expect(trend.closest('div')).toHaveClass('text-red-600')
  })

  it('shows zero change as positive', () => {
    render(<NetWorthCard netWorth={{ ...base, change_30d: 0, change_30d_pct: 0 }} />)
    expect(screen.getByText(/0\.0%/)).toBeInTheDocument()
  })

  it('formats large net worth with commas', () => {
    render(<NetWorthCard netWorth={{ ...base, net_worth: 1234567 }} />)
    expect(screen.getByText(/\$1,234,567/)).toBeInTheDocument()
  })

  it('renders the label "Net Worth"', () => {
    render(<NetWorthCard netWorth={base} />)
    expect(screen.getByText('Net Worth')).toBeInTheDocument()
  })
})

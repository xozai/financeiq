import { describe, it, expect, vi, beforeEach } from 'vitest'

// Stable chainable mock — eq() is awaitable (thenable), upsert is awaitable
const mockEq     = vi.fn()
const mockSelect = vi.fn(() => ({ eq: mockEq }))
const mockUpsert = vi.fn()
const mockFrom   = vi.fn(() => ({ select: mockSelect, upsert: mockUpsert }))
const mockGetUser = vi.fn()

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn().mockResolvedValue({
    auth: { getUser: mockGetUser },
    from: mockFrom,
  }),
}))

vi.mock('date-fns', async (importOriginal) => {
  const actual = await importOriginal<typeof import('date-fns')>()
  return { ...actual, format: vi.fn(() => '2026-04-11') }
})

describe('POST /api/snapshot', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-123' } } })
    // Reset chainable mock — re-wire after clearAllMocks
    mockFrom.mockReturnValue({ select: mockSelect, upsert: mockUpsert })
    mockSelect.mockReturnValue({ eq: mockEq })
    mockUpsert.mockResolvedValue({ error: null })
  })

  it('returns 401 when user is not authenticated', async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: null } })
    const { POST } = await import('@/app/api/snapshot/route')
    const res = await POST()
    expect(res.status).toBe(401)
  })

  it('returns message when no accounts exist', async () => {
    mockEq.mockResolvedValueOnce({ data: [], error: null })
    const { POST } = await import('@/app/api/snapshot/route')
    const res = await POST()
    const body = await res.json()
    expect(body.message).toBe('No accounts to snapshot')
  })

  it('correctly separates assets from liabilities', async () => {
    const accounts = [
      { type: 'checking',    balance_current: 5000  },
      { type: 'savings',     balance_current: 10000 },
      { type: 'brokerage',   balance_current: 25000 },
      { type: 'credit_card', balance_current: -2000 },
      { type: 'loan',        balance_current: -8000 },
    ]
    mockEq.mockResolvedValueOnce({ data: accounts, error: null })

    const { POST } = await import('@/app/api/snapshot/route')
    const res = await POST()
    const body = await res.json()

    expect(body.total_assets).toBe(40000)
    expect(body.total_liabilities).toBe(10000)
    expect(body.net_worth).toBe(30000)
    expect(body.snapshot_date).toBe('2026-04-11')
  })

  it('calls upsert with correct conflict target', async () => {
    mockEq.mockResolvedValueOnce({ data: [{ type: 'checking', balance_current: 1000 }], error: null })

    const { POST } = await import('@/app/api/snapshot/route')
    await POST()

    expect(mockUpsert).toHaveBeenCalledWith(
      expect.objectContaining({ user_id: 'user-123', snapshot_date: '2026-04-11' }),
      { onConflict: 'user_id,snapshot_date' }
    )
  })
})

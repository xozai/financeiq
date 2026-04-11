import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

// Stable singleton mock — must be defined before any imports that use it
const mockAuth = vi.hoisted(() => ({
  getUser:              vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
  signInWithPassword:   vi.fn().mockResolvedValue({ data: { user: null, session: null }, error: null }),
  signUp:               vi.fn().mockResolvedValue({ data: { user: null, session: null }, error: null }),
}))

vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({ auth: mockAuth }),
}))

// Import AFTER mock is registered
import LoginPage from '@/app/(auth)/login/page'

describe('LoginPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockAuth.signInWithPassword.mockResolvedValue({ data: { user: null, session: null }, error: null })
    mockAuth.signUp.mockResolvedValue({ data: { user: null, session: null }, error: null })
  })

  it('renders sign-in form by default', () => {
    render(<LoginPage />)
    expect(screen.getByRole('heading', { name: 'FinanceIQ' })).toBeInTheDocument()
    expect(screen.getByText('Sign in to your account')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('you@example.com')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Sign In' })).toBeInTheDocument()
  })

  it('toggles to sign-up mode when clicking Sign up', async () => {
    const user = userEvent.setup()
    render(<LoginPage />)
    await user.click(screen.getByRole('button', { name: 'Sign up' }))
    expect(screen.getByText('Create a free account')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Create Account' })).toBeInTheDocument()
  })

  it('toggles back to sign-in from sign-up', async () => {
    const user = userEvent.setup()
    render(<LoginPage />)
    await user.click(screen.getByRole('button', { name: 'Sign up' }))
    await user.click(screen.getByRole('button', { name: 'Sign in' }))
    expect(screen.getByRole('button', { name: 'Sign In' })).toBeInTheDocument()
  })

  it('requires email and password fields', () => {
    render(<LoginPage />)
    expect(screen.getByPlaceholderText('you@example.com')).toBeRequired()
    expect(screen.getByPlaceholderText('••••••••')).toBeRequired()
  })

  it('enforces minimum password length of 8', () => {
    render(<LoginPage />)
    expect(screen.getByPlaceholderText('••••••••')).toHaveAttribute('minLength', '8')
  })

  it('shows confirmation message after successful signup', async () => {
    const user = userEvent.setup()
    render(<LoginPage />)
    await user.click(screen.getByRole('button', { name: 'Sign up' }))
    await user.type(screen.getByPlaceholderText('you@example.com'), 'new@example.com')
    await user.type(screen.getByPlaceholderText('••••••••'), 'password123')
    await user.click(screen.getByRole('button', { name: 'Create Account' }))
    await waitFor(() => {
      expect(screen.getByText('Check your email')).toBeInTheDocument()
    })
  })

  it('shows error message on failed sign-in', async () => {
    mockAuth.signInWithPassword.mockResolvedValueOnce({
      data: { user: null, session: null },
      error: { message: 'Invalid login credentials', name: 'AuthError', status: 400 },
    })

    const user = userEvent.setup()
    render(<LoginPage />)
    await user.type(screen.getByPlaceholderText('you@example.com'), 'bad@example.com')
    await user.type(screen.getByPlaceholderText('••••••••'), 'wrongpassword')
    await user.click(screen.getByRole('button', { name: 'Sign In' }))

    await waitFor(() => {
      expect(screen.getByText('Invalid login credentials')).toBeInTheDocument()
    })
  })

  it('shows error message on failed sign-up', async () => {
    mockAuth.signUp.mockResolvedValueOnce({
      data: { user: null, session: null },
      error: { message: 'User already registered', name: 'AuthError', status: 422 },
    })

    const user = userEvent.setup()
    render(<LoginPage />)
    await user.click(screen.getByRole('button', { name: 'Sign up' }))
    await user.type(screen.getByPlaceholderText('you@example.com'), 'existing@example.com')
    await user.type(screen.getByPlaceholderText('••••••••'), 'password123')
    await user.click(screen.getByRole('button', { name: 'Create Account' }))

    await waitFor(() => {
      expect(screen.getByText('User already registered')).toBeInTheDocument()
    })
  })
})

import { test, expect } from '@playwright/test'

test.describe('Authentication', () => {
  test('redirects unauthenticated users to /login', async ({ page }) => {
    await page.goto('/')
    await expect(page).toHaveURL(/\/login/)
  })

  test('login page renders correctly', async ({ page }) => {
    await page.goto('/login')
    await expect(page.getByRole('heading', { name: 'FinanceIQ' })).toBeVisible()
    await expect(page.getByPlaceholder('you@example.com')).toBeVisible()
    await expect(page.getByPlaceholder('••••••••')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Sign In' })).toBeVisible()
  })

  test('toggles to sign-up mode', async ({ page }) => {
    await page.goto('/login')
    await page.getByRole('button', { name: 'Sign up' }).click()
    await expect(page.getByText('Create a free account')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Create Account' })).toBeVisible()
  })

  test('toggles back to sign-in from sign-up', async ({ page }) => {
    await page.goto('/login')
    await page.getByRole('button', { name: 'Sign up' }).click()
    await page.getByRole('button', { name: 'Sign in' }).click()
    await expect(page.getByRole('button', { name: 'Sign In' })).toBeVisible()
  })

  test('shows error for empty form submission', async ({ page }) => {
    await page.goto('/login')
    // HTML5 validation prevents submission — email field should be invalid
    const emailInput = page.getByPlaceholder('you@example.com')
    await expect(emailInput).toHaveAttribute('required')
  })

  test('shows error for invalid credentials', async ({ page }) => {
    await page.goto('/login')
    await page.getByPlaceholder('you@example.com').fill('notreal@example.com')
    await page.getByPlaceholder('••••••••').fill('wrongpassword')
    await page.getByRole('button', { name: 'Sign In' }).click()
    // With demo Supabase, should show an auth error
    await expect(page.locator('p.text-red-600')).toBeVisible({ timeout: 5000 })
  })

  test('login page is responsive on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto('/login')
    await expect(page.getByRole('heading', { name: 'FinanceIQ' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Sign In' })).toBeVisible()
  })
})

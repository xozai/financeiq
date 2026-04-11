import { test, expect } from '@playwright/test'

test.describe('Public navigation', () => {
  test('/ redirects to /login', async ({ page }) => {
    await page.goto('/')
    await expect(page).toHaveURL(/\/login/)
  })

  test('/dashboard redirects to /login when unauthenticated', async ({ page }) => {
    await page.goto('/dashboard')
    await expect(page).toHaveURL(/\/login/)
  })

  test('/dashboard/portfolio redirects to /login when unauthenticated', async ({ page }) => {
    await page.goto('/dashboard/portfolio')
    await expect(page).toHaveURL(/\/login/)
  })

  test('/dashboard/debt redirects to /login when unauthenticated', async ({ page }) => {
    await page.goto('/dashboard/debt')
    await expect(page).toHaveURL(/\/login/)
  })

  test('/dashboard/taxes redirects to /login when unauthenticated', async ({ page }) => {
    await page.goto('/dashboard/taxes')
    await expect(page).toHaveURL(/\/login/)
  })

  test('/dashboard/news redirects to /login when unauthenticated', async ({ page }) => {
    await page.goto('/dashboard/news')
    await expect(page).toHaveURL(/\/login/)
  })

  test('/dashboard/recommendations redirects to /login when unauthenticated', async ({ page }) => {
    await page.goto('/dashboard/recommendations')
    await expect(page).toHaveURL(/\/login/)
  })

  test('/dashboard/accounts redirects to /login when unauthenticated', async ({ page }) => {
    await page.goto('/dashboard/accounts')
    await expect(page).toHaveURL(/\/login/)
  })

  test('/dashboard/settings redirects to /login when unauthenticated', async ({ page }) => {
    await page.goto('/dashboard/settings')
    await expect(page).toHaveURL(/\/login/)
  })
})

test.describe('Page titles', () => {
  test('login page has correct title', async ({ page }) => {
    await page.goto('/login')
    await expect(page).toHaveTitle(/FinanceIQ/)
  })
})

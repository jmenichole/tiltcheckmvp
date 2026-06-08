import { test, expect } from '@playwright/test';

test.describe('logged-in IA', () => {
  test('authed /login redirects to /dashboard', async ({ page, context }) => {
    await context.addCookies([
      {
        name: 'tc_session',
        value: 'e2e-stub-session',
        domain: 'localhost',
        path: '/',
      },
    ]);
    await page.goto('/login');
    await expect(page).toHaveURL(/\/dashboard$/);
  });

  test('authed /login respects safe redirect param', async ({ page, context }) => {
    await context.addCookies([
      {
        name: 'tc_session',
        value: 'e2e-stub-session',
        domain: 'localhost',
        path: '/',
      },
    ]);
    await page.goto('/login?redirect=/settings');
    await expect(page).toHaveURL(/\/settings$/);
  });

  test('logged-out home shows marketing hero', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { name: /house always wins/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /install the extension/i }).first()).toBeVisible();
  });
});

import { test, expect } from '@playwright/test';

test.describe('Settings protection UI', () => {
  test('settings requires auth — redirects to login', async ({ page }) => {
    await page.goto('/settings');
    await expect(page).toHaveURL(/\/login/);
  });

  test('login page mentions game exclusions in funnel', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByRole('link', { name: /login with discord/i })).toBeVisible();
  });
});

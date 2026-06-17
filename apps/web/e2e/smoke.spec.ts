import { test, expect } from '@playwright/test';

const apiUrl = (process.env.API_URL ?? 'http://localhost:3001').replace(/\/$/, '');

test.describe('smoke', () => {
  test('API health', async ({ request }) => {
    const res = await request.get(`${apiUrl}/health`);
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.ok).toBe(true);
  });

  test('casino-scores returns casinos array', async ({ request }) => {
    const res = await request.get(`${apiUrl}/rgaas/casino-scores`);
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(Array.isArray(body.casinos)).toBe(true);
    expect(body.casinos.length).toBeGreaterThan(0);
  });

  test('home page loads', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { name: /house always wins/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /install the extension/i }).first()).toBeVisible();
  });

  test('casinos directory loads', async ({ page }) => {
    await page.goto('/casinos');
    await expect(page.getByRole('heading', { name: /look up the casino/i })).toBeVisible();
  });

  test('login redirects unauthenticated users toward Discord OAuth', async ({ page }) => {
    await page.goto('/login');
    const loginLink = page.getByRole('link', { name: /login with discord/i });
    await expect(loginLink).toBeVisible();
    const href = await loginLink.getAttribute('href');
    expect(href).toMatch(/\/auth\/discord\/login/);
    expect(href).toMatch(new RegExp(`^${apiUrl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`));
  });

  test('vault API requires auth', async ({ request }) => {
    const res = await request.get(`${apiUrl}/vault`);
    expect(res.status()).toBe(401);
  });

  test('vault POST requires auth', async ({ request }) => {
    const res = await request.post(`${apiUrl}/vault`, {
      data: { ruleType: 'session_cap', config: { maxSessionMinutes: 30 } },
    });
    expect(res.status()).toBe(401);
  });

  test('Discord OAuth flow', async ({ page }) => {
    test.skip(process.env.E2E_DISCORD !== '1', 'Set E2E_DISCORD=1 to run live Discord login');
    await page.goto('/login');
  });
});

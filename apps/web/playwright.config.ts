import { defineConfig, devices } from '@playwright/test';

const webUrl = process.env.WEB_URL ?? 'http://localhost:3000';
const apiUrl = process.env.API_URL ?? 'http://localhost:3001';

export default defineConfig({
  testDir: './e2e',
  timeout: 60_000,
  retries: process.env.CI ? 1 : 0,
  use: {
    baseURL: webUrl,
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        ...(process.env.CI ? {} : { channel: 'chrome' }),
      },
    },
  ],
  webServer: process.env.CI
    ? [
        {
          command: 'node ../api/dist/index.js',
          url: `${apiUrl}/health`,
          cwd: '.',
          reuseExistingServer: false,
          timeout: 120_000,
          env: { ...process.env, PORT: '3001', API_URL: apiUrl, WEB_URL: webUrl },
        },
        {
          command: 'pnpm start',
          url: webUrl,
          cwd: '.',
          reuseExistingServer: false,
          timeout: 120_000,
          env: {
            ...process.env,
            NEXT_PUBLIC_WEB_URL: webUrl,
            NEXT_PUBLIC_API_URL: apiUrl,
          },
        },
      ]
    : undefined,
});

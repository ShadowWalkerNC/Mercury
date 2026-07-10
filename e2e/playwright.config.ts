import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  fullyParallel: false,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL:     process.env.BASE_URL ?? 'http://localhost:5173',
    trace:       'on-first-retry',
    screenshot:  'only-on-failure',
    video:       'retain-on-failure',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
  webServer: process.env.CI ? undefined : {
    command: 'pnpm --filter @mercury/web dev',
    url:     'http://localhost:5173',
    reuseExistingServer: true,
    timeout: 60_000,
  },
});

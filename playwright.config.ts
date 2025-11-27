import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 30_000,
  retries: process.env.CI ? 1 : 0,
  use: {
    baseURL: 'http://localhost:4155',
    headless: true,
    trace: 'retain-on-failure'
  },
  webServer: {
    command: 'npm run dev',
    port: 4155,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000
  }
});

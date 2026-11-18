import { defineConfig } from '@playwright/test';

const baseURL = 'http://127.0.0.1:4174/workbase/';

export default defineConfig({
  testDir: './tests/e2e',
  use: { baseURL, browserName: 'chromium', trace: 'retain-on-failure' },
  webServer: {
    command: 'node scripts/serve-e2e-build.mjs',
    url: baseURL,
    reuseExistingServer: false,
  },
});

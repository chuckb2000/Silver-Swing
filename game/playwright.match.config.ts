import { defineConfig } from '@playwright/test';

// Live match play end to end: two browsers against the match Worker and the
// site's Pages Functions under wrangler (scripts/match-dev.sh). Build first:
//   npm run build && npx playwright test -c playwright.match.config.ts
export default defineConfig({
  testDir: 'tests/e2e',
  testMatch: ['**/match.spec.ts', '**/match_flows.spec.ts', '**/match_clock.spec.ts', '**/match_chat.spec.ts', '**/match_challenge.spec.ts'],
  timeout: 600_000,
  use: {
    baseURL: 'http://localhost:8788',
    launchOptions: { args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] },
  },
  webServer: {
    command: 'bash scripts/match-dev.sh',
    port: 8788,
    reuseExistingServer: true,
    timeout: 120_000,
  },
});

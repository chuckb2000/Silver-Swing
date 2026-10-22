import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: 'tests/e2e',
  // live match play needs the match server under wrangler: playwright.match.config.ts
  testIgnore: ['**/match.spec.ts', '**/match_flows.spec.ts', '**/match_clock.spec.ts', '**/match_chat.spec.ts', '**/match_card.spec.ts'],
  timeout: 120_000,
  use: {
    baseURL: 'http://localhost:4173',
    launchOptions: { args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] },
  },
  webServer: {
    command: 'npx vite preview --port 4173 --strictPort',
    port: 4173,
    reuseExistingServer: true,
  },
});

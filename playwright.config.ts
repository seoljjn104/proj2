import { defineConfig, devices } from "@playwright/test";

const APP_URL = process.env.APP_URL ?? "http://localhost:3000";
const STORAGE_STATE = ".playwright/user.json";

/**
 * Browser smoke tests. Runs the dev server automatically (reusing one that is
 * already up) and signs in once via tests/e2e/auth.setup.ts.
 *
 * Password comes from E2E_PASSWORD (env) or the gitignored .env.local.
 */
export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: [["list"], ["html", { open: "never" }]],
  outputDir: "test-results",
  timeout: 60_000,
  expect: { timeout: 10_000 },
  use: {
    baseURL: APP_URL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  projects: [
    { name: "setup", testMatch: /auth\.setup\.ts/ },
    {
      name: "chromium",
      testMatch: /.*\.spec\.ts/,
      use: { ...devices["Desktop Chrome"], storageState: STORAGE_STATE },
      dependencies: ["setup"],
    },
  ],
  webServer: {
    command: "npm run dev",
    url: APP_URL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});

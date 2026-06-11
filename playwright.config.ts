import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 30000,
  retries: 1,
  projects: [
    {
      name: "auth-setup",
      testMatch: /(^|\/)auth\.setup\.ts$/,
    },
    {
      name: "default",
      testIgnore: [
        /(^|\/)auth\.setup\.ts$/,
        /(^|\/)auth\.spec\.ts$/,
        /(^|\/)landing\.spec\.ts$/,
      ],
      dependencies: ["auth-setup"],
      use: {
        storageState: "tests/e2e/.auth/user.json",
      },
    },
    {
      name: "unauthenticated",
      // Public pages (auth screens, landing page) run without a session.
      testMatch: [/(^|\/)auth\.spec\.ts$/, /(^|\/)landing\.spec\.ts$/],
    },
  ],
  use: {
    baseURL: "http://localhost:3015",
    headless: true,
    screenshot: "only-on-failure",
  },
  webServer: {
    command: "PLAYWRIGHT_TEST=true npm run dev",
    port: 3015,
    // Avoid reusing a normal local dev server that does not expose the
    // test-only auth bootstrap route required by authenticated E2E specs.
    reuseExistingServer:
      !process.env.CI && process.env.PLAYWRIGHT_TEST === "true",
  },
});

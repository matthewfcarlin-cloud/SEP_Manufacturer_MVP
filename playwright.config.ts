import { defineConfig } from "@playwright/test";

// E2E tests drive the installed Google Chrome (no bundled browser download).
// They reuse a running dev server if there is one, otherwise start one.
// Seeded demo projects are installed in globalSetup; no API key is needed,
// because the tests never call the AI analysis.
const PORT = Number(process.env.E2E_PORT ?? 3200);

export default defineConfig({
  testDir: "e2e",
  timeout: 60_000,
  fullyParallel: false,
  retries: 0,
  reporter: [["list"]],
  globalSetup: "./e2e/global-setup.ts",
  use: {
    baseURL: `http://localhost:${PORT}`,
    channel: "chrome",
    viewport: { width: 1280, height: 900 },
    screenshot: "only-on-failure",
  },
  webServer: {
    command: `npx next dev --port ${PORT}`,
    url: `http://localhost:${PORT}/shops`,
    reuseExistingServer: true,
    timeout: 120_000,
  },
});

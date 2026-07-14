import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "tests/pdf",
  fullyParallel: false,
  retries: 0,
  use: {
    baseURL: "http://127.0.0.1:4321",
    ...devices["Desktop Chrome"],
  },
  webServer: {
    command: "npm run dev -- --host 127.0.0.1",
    url: "http://127.0.0.1:4321",
    reuseExistingServer: false,
  },
  reporter: [["list"]],
});

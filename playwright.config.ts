import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "tests",
  fullyParallel: false,
  retries: 0,
  use: {
    baseURL: "http://127.0.0.1:4321/json-cv/",
    ...devices["Desktop Chrome"],
  },
  webServer: {
    command: "npm run build && npm run preview -- --host 127.0.0.1",
    url: "http://127.0.0.1:4321/json-cv/",
    reuseExistingServer: false,
  },
  reporter: [["list"]],
});

import { defineConfig } from "@playwright/test";

const port = process.env.ENTERPRISEBRAIN_TEST_PORT ?? "3000";
const url = `http://127.0.0.1:${port}`;

export default defineConfig({
  testDir: "./e2e",
  use: {
    baseURL: url,
    reducedMotion: "reduce",
    launchOptions: {
      args: ["--enable-unsafe-swiftshader"],
      executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH,
    },
  },
  webServer: {
    command: `pnpm dev --hostname 127.0.0.1 --port ${port}`,
    url,
    reuseExistingServer: !process.env.CI,
  },
});

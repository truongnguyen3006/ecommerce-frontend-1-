import { defineConfig } from '@playwright/test';
const executablePath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH;
export default defineConfig({
  testDir: './tests', fullyParallel: false, workers: 2, timeout: 30_000,
  expect: { timeout: 8_000 }, reporter: [['list']],
  use: {
    baseURL: 'http://localhost:3001', trace: 'retain-on-failure', screenshot: 'only-on-failure',
    launchOptions: executablePath ? { executablePath, args: ['--no-sandbox', '--disable-dev-shm-usage', '--no-zygote', '--disable-gpu', '--use-gl=angle', '--use-angle=swiftshader'] } : {},
  },
  projects: [
    { name: 'unit', testMatch: /unit\.spec\.ts/ },
    { name: 'desktop', testMatch: /flows\.spec\.ts/, use: { viewport: { width: 1440, height: 1000 } } },
    { name: 'mobile', testMatch: /flows\.spec\.ts/, use: { viewport: { width: 390, height: 844 } } },
    { name: 'responsive', testMatch: /responsive\.spec\.ts/ },
  ],
  webServer: { command: 'npm run start -- --hostname 127.0.0.1', url: 'http://localhost:3001', reuseExistingServer: !process.env.CI, timeout: 60_000 },
});

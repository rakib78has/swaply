import { defineConfig, devices } from '@playwright/test';
import path from 'node:path';

/**
 * Industry-Standard Playwright Configuration for Chrome Extension Testing (Manifest V3)
 * @see https://playwright.dev/docs/chrome-extensions
 */
export default defineConfig({
  testDir: './tests/e2e/specs',
  testMatch: /.*\.pom\.spec\.ts/,
  timeout: 45 * 1000,
  expect: {
    timeout: 7 * 1000
  },
  fullyParallel: false, // Extension tests share persistent browser contexts
  retries: process.env.CI ? 2 : 0,
  workers: 1, // Single worker prevents browser profile lock collisions
  reporter: [
    ['list'],
    ['html', { open: 'never', outputFolder: 'playwright-report' }]
  ],
  use: {
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure'
  },
  projects: [
    {
      name: 'chromium-extension',
      use: {
        ...devices['Desktop Chrome'],
        channel: 'chromium'
      }
    }
  ],
  // Automatically spin up the test playground server during E2E runs
  webServer: {
    command: 'node -e "const http=require(\'http\'),fs=require(\'fs\'),path=require(\'path\');http.createServer((q,s)=>{const p=path.join(process.cwd(),q.url===\'/\'?\'playground.html\':q.url);if(fs.existsSync(p)&&fs.statSync(p).isFile()){s.writeHead(200,{\'Content-Type\':p.endsWith(\'.html\')?\'text/html\':\'text/plain\'});fs.createReadStream(p).pipe(s);}else{s.writeHead(404);s.end(\'404\');}}).listen(4173,\'127.0.0.1\');"',
    port: 4173,
    reuseExistingServer: !process.env.CI,
    timeout: 10 * 1000
  }
});

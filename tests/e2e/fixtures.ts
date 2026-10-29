/**
 * Custom Playwright Fixtures for Manifest V3 Chrome Extension Testing
 * Automates browser launch, service worker discovery, and popup page instantiation.
 */

import { test as base, chromium, type BrowserContext, type Page } from '@playwright/test';
import path from 'node:path';
import os from 'node:os';
import fs from 'node:fs';

export interface ExtensionFixtures {
  context: BrowserContext;
  extensionId: string;
  createPopupPage: () => Promise<Page>;
  playgroundPage: Page;
}

export const test = base.extend<ExtensionFixtures>({
  context: async ({}, use) => {
    const pathToExtension = path.resolve(__dirname, '../..');
    const userDataDir = path.join(os.tmpdir(), `pw-qaswitch-profile-${Date.now()}`);

    // Chromium requires persistent context to load extensions
    const context = await chromium.launchPersistentContext(userDataDir, {
      headless: false, // Chrome extensions are only supported in non-headless Chromium or new headless mode
      args: [
        `--disable-extensions-except=${pathToExtension}`,
        `--load-extension=${pathToExtension}`,
        '--no-first-run',
        '--no-default-browser-check'
      ]
    });

    await use(context);
    await context.close();

    // Clean up temporary user data directory
    try {
      fs.rmSync(userDataDir, { recursive: true, force: true });
    } catch {}
  },

  extensionId: async ({ context }, use) => {
    // In Manifest V3, wait for background service worker to obtain the extension ID
    let [background] = context.serviceWorkers();
    if (!background) {
      background = await context.waitForEvent('serviceworker');
    }

    const extensionId = background.url().split('/')[2];
    await use(extensionId);
  },

  createPopupPage: async ({ context, extensionId }, use) => {
    await use(async () => {
      const page = await context.newPage();
      await page.goto(`chrome-extension://${extensionId}/popup.html`);
      await page.waitForLoadState('domcontentloaded');
      return page;
    });
  },

  playgroundPage: async ({ context }, use) => {
    const page = await context.newPage();
    await page.goto('http://localhost:4173/playground.html');
    await page.waitForLoadState('domcontentloaded');
    await use(page);
  }
});

export { expect } from '@playwright/test';

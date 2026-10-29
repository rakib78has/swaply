/**
 * Base Page Object Model
 * Shared foundations, wait utilities, toasts, and dialog handlers.
 */

import { type Page, type Locator, expect } from '@playwright/test';

export abstract class BasePage {
  readonly page: Page;
  readonly toastMessage: Locator;

  constructor(page: Page) {
    this.page = page;
    this.toastMessage = page.locator('#toastMessage');
  }

  /**
   * Waits for a toast notification containing the expected message.
   */
  async expectToast(messageSubstring: string): Promise<void> {
    await expect(this.toastMessage).toContainText(messageSubstring);
  }

  /**
   * Accepts the next browser window confirmation dialog (e.g. for session reset).
   */
  async autoAcceptDialog(): Promise<void> {
    this.page.once('dialog', async (dialog) => {
      await dialog.accept();
    });
  }

  /**
   * Waits for all network connections and DOM mutations to stabilize.
   */
  async waitForReady(): Promise<void> {
    await this.page.waitForLoadState('domcontentloaded');
  }
}

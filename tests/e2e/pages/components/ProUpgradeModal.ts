/**
 * Component Object Model: Pro License Upgrade Modal
 */

import { type Page, type Locator, expect } from '@playwright/test';

export class ProUpgradeModal {
  readonly page: Page;
  readonly modal: Locator;
  readonly licenseKeyInput: Locator;
  readonly activateBtn: Locator;
  readonly demoKeyPill: Locator;
  readonly closeBtn: Locator;

  constructor(page: Page) {
    this.page = page;
    this.modal = page.locator('#proModal');
    this.licenseKeyInput = page.locator('#licenseKeyInput');
    this.activateBtn = page.locator('#activateLicenseBtn');
    this.demoKeyPill = page.locator('#demoKeyPill');
    this.closeBtn = page.locator('#closeModalBtn');
  }

  async activateWithDemoKey(): Promise<void> {
    await this.demoKeyPill.click();
    await this.activateBtn.click();
    await expect(this.modal).toBeHidden();
  }

  async activateWithKey(key: string): Promise<void> {
    await this.licenseKeyInput.fill(key);
    await this.activateBtn.click();
    await expect(this.modal).toBeHidden();
  }

  async close(): Promise<void> {
    await this.closeBtn.click();
    await expect(this.modal).toBeHidden();
  }
}

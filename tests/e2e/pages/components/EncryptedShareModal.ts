/**
 * Component Object Model: AES-GCM Encrypted Sharing Modal
 */

import { type Page, type Locator, expect } from '@playwright/test';

export class EncryptedShareModal {
  readonly page: Page;
  readonly modal: Locator;
  readonly passphraseInput: Locator;
  readonly generateBtn: Locator;
  readonly outputSnippet: Locator;
  readonly closeBtn: Locator;

  constructor(page: Page) {
    this.page = page;
    this.modal = page.locator('#shareModal');
    this.passphraseInput = page.locator('#sharePassphraseInput');
    this.generateBtn = page.locator('#generateEncryptedShareBtn');
    this.outputSnippet = page.locator('#encryptedOutputSnippet');
    this.closeBtn = page.locator('#closeShareModalBtn');
  }

  async generateSnippet(passphrase: string): Promise<string> {
    await this.passphraseInput.fill(passphrase);
    await this.generateBtn.click();
    await expect(this.outputSnippet).toBeVisible();
    return await this.outputSnippet.inputValue();
  }

  async expectSnippetFormat(): Promise<void> {
    await expect(this.outputSnippet).toHaveValue(/^qas_enc_[A-Za-z0-9+/=]+\.[A-Za-z0-9+/=]+\.[A-Za-z0-9+/=]+$/);
  }

  async close(): Promise<void> {
    await this.closeBtn.click();
    await expect(this.modal).toBeHidden();
  }
}

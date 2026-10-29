/**
 * Page Object Model for QASwitch Chrome DevTools Panel
 */

import { type Page, type Locator, expect } from '@playwright/test';
import { BasePage } from './BasePage.ts';

export class DevToolsPanelPage extends BasePage {
  readonly inspectedDomain: Locator;
  readonly roleItems: Locator;
  readonly panelNukeBtn: Locator;
  readonly refreshBtn: Locator;

  // Tabs
  readonly navTabs: Locator;
  readonly jwtList: Locator;
  readonly activeHeadersOutput: Locator;
  readonly curlOutput: Locator;
  readonly copyCurlBtn: Locator;
  readonly rawCookiesDump: Locator;
  readonly rawStorageDump: Locator;

  constructor(page: Page) {
    super(page);
    this.inspectedDomain = page.locator('#inspectedDomain');
    this.roleItems = page.locator('.role-item');
    this.panelNukeBtn = page.locator('#panelNukeBtn');
    this.refreshBtn = page.locator('#panelRefreshBtn');

    this.navTabs = page.locator('.nav-tab');
    this.jwtList = page.locator('#jwtListContainer');
    this.activeHeadersOutput = page.locator('#activeHeadersOutput');
    this.curlOutput = page.locator('#curlOutput');
    this.copyCurlBtn = page.locator('#copyCurlBtn');
    this.rawCookiesDump = page.locator('#rawCookiesDump');
    this.rawStorageDump = page.locator('#rawStorageDump');
  }

  async goto(extensionId: string): Promise<void> {
    await this.page.goto(`chrome-extension://${extensionId}/panel.html`);
    await this.waitForReady();
  }

  async selectTab(tab: 'jwt' | 'headers' | 'curl' | 'storage'): Promise<void> {
    await this.navTabs.filter({ hasText: new RegExp(tab, 'i') }).first().click();
  }

  async switchRole(profileName: string): Promise<void> {
    const item = this.roleItems.filter({ hasText: profileName }).first();
    await item.locator('button').click();
  }

  async expectRoleItemCount(count: number): Promise<void> {
    await expect(this.roleItems).toHaveCount(count);
  }

  async expectJWTDetected(tokenName: string): Promise<void> {
    await this.selectTab('jwt');
    await expect(this.jwtList).toContainText(tokenName);
  }

  async expectCurlContains(substring: string): Promise<void> {
    await this.selectTab('curl');
    await expect(this.curlOutput).toContainText(substring);
  }
}

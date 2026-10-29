/**
 * Page Object Model for the Multi-Role Test Playground Web App
 */

import { type Page, type Locator, expect } from '@playwright/test';
import { BasePage } from './BasePage.ts';

export type UserRole = 'ADMIN' | 'REGULAR' | 'VIP MEMBER' | 'GUEST';

export class PlaygroundPage extends BasePage {
  readonly roleTitle: Locator;
  readonly rolePill: Locator;
  readonly cookieDump: Locator;
  readonly storageDump: Locator;
  readonly loginAdminBtn: Locator;
  readonly loginUserBtn: Locator;
  readonly loginVipBtn: Locator;
  readonly logoutBtn: Locator;

  constructor(page: Page) {
    super(page);
    this.roleTitle = page.locator('#roleTitle');
    this.rolePill = page.locator('#rolePill');
    this.cookieDump = page.locator('#cookieDump');
    this.storageDump = page.locator('#storageDump');
    this.loginAdminBtn = page.locator('#loginAdminBtn');
    this.loginUserBtn = page.locator('#loginUserBtn');
    this.loginVipBtn = page.locator('#loginVipBtn');
    this.logoutBtn = page.locator('#logoutBtn');
  }

  async goto(): Promise<void> {
    await this.page.goto('http://localhost:4173/playground.html');
    await this.waitForReady();
  }

  async loginAsAdmin(): Promise<void> {
    await this.loginAdminBtn.click();
    await this.expectRole('ADMIN');
  }

  async loginAsRegularUser(): Promise<void> {
    await this.loginUserBtn.click();
    await this.expectRole('REGULAR');
  }

  async loginAsVip(): Promise<void> {
    await this.loginVipBtn.click();
    await this.expectRole('VIP MEMBER');
  }

  async logout(): Promise<void> {
    await this.logoutBtn.click();
    await this.expectRole('GUEST');
  }

  async expectRole(expected: UserRole): Promise<void> {
    await expect(this.rolePill).toHaveText(expected);
  }

  async expectCookieContains(cookieSubstring: string): Promise<void> {
    await expect(this.cookieDump).toContainText(cookieSubstring);
  }

  async expectStorageContains(keySubstring: string): Promise<void> {
    await expect(this.storageDump).toContainText(keySubstring);
  }
}

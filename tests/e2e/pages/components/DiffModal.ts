/**
 * Component Object Model: Role Diff & Inspection Modal
 */

import { type Page, type Locator, expect } from '@playwright/test';

export class DiffModal {
  readonly page: Page;
  readonly modal: Locator;
  readonly roleASelect: Locator;
  readonly roleBSelect: Locator;
  readonly diffContainer: Locator;
  readonly closeBtn: Locator;

  constructor(page: Page) {
    this.page = page;
    this.modal = page.locator('#diffModal');
    this.roleASelect = page.locator('#diffRoleA');
    this.roleBSelect = page.locator('#diffRoleB');
    this.diffContainer = page.locator('#diffResultsContainer');
    this.closeBtn = page.locator('#closeDiffModalBtn');
  }

  async selectRoles(roleAName: string, roleBName: string): Promise<void> {
    await this.roleASelect.selectOption({ label: roleAName });
    await this.roleBSelect.selectOption({ label: roleBName });
  }

  async expectDiffContains(text: string): Promise<void> {
    await expect(this.diffContainer).toContainText(text);
  }

  async close(): Promise<void> {
    await this.closeBtn.click();
    await expect(this.modal).toBeHidden();
  }
}

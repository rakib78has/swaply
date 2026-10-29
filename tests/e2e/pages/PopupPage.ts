/**
 * Page Object Model for QASwitch Extension Popup
 * Encapsulates UI actions, role cards, custom headers, and modal sub-components.
 */

import { type Page, type Locator, expect } from '@playwright/test';
import { BasePage } from './BasePage.ts';
import { DiffModal } from './components/DiffModal.ts';
import { EncryptedShareModal } from './components/EncryptedShareModal.ts';
import { ProUpgradeModal } from './components/ProUpgradeModal.ts';

export class PopupPage extends BasePage {
  // Modal Sub-Components
  readonly diffModal: DiffModal;
  readonly shareModal: EncryptedShareModal;
  readonly proModal: ProUpgradeModal;

  // Header Elements
  readonly domainText: Locator;
  readonly tierBadge: Locator;
  readonly tierCount: Locator;
  readonly nukeSessionBtn: Locator;

  // Save Session Form
  readonly profileNameInput: Locator;
  readonly saveBtn: Locator;
  readonly toggleHeadersBtn: Locator;
  readonly headersInputArea: Locator;
  readonly customHeadersInput: Locator;

  // Profiles List & Tools
  readonly profileCards: Locator;
  readonly proBanner: Locator;
  readonly compareRolesBtn: Locator;
  readonly exportAllBtn: Locator;
  readonly importBtn: Locator;

  constructor(page: Page) {
    super(page);

    this.diffModal = new DiffModal(page);
    this.shareModal = new EncryptedShareModal(page);
    this.proModal = new ProUpgradeModal(page);

    this.domainText = page.locator('#domainText');
    this.tierBadge = page.locator('#tierBadge');
    this.tierCount = page.locator('#tierCount');
    this.nukeSessionBtn = page.locator('#nukeSessionBtn');

    this.profileNameInput = page.locator('#profileNameInput');
    this.saveBtn = page.locator('#saveBtn');
    this.toggleHeadersBtn = page.locator('#toggleHeadersBtn');
    this.headersInputArea = page.locator('#headersInputArea');
    this.customHeadersInput = page.locator('#customHeadersInput');

    this.profileCards = page.locator('.profile-card');
    this.proBanner = page.locator('#proBanner');
    this.compareRolesBtn = page.locator('#compareRolesBtn');
    this.exportAllBtn = page.locator('#exportAllJsonBtn');
    this.importBtn = page.locator('#importJsonBtn');
  }

  /**
   * Snapshots the active session as a new named role.
   */
  async saveSession(name: string, customHeaders?: string): Promise<void> {
    await this.profileNameInput.fill(name);

    if (customHeaders) {
      if (await this.headersInputArea.isHidden()) {
        await this.toggleHeadersBtn.click();
      }
      await this.customHeadersInput.fill(customHeaders);
    }

    await this.saveBtn.click();
    await this.expectToast(`Saved session "${name}"`);
  }

  /**
   * Switches to an existing profile by clicking its Switch button.
   */
  async switchRole(profileName: string): Promise<void> {
    const card = this.getCard(profileName);
    const switchBtn = card.locator('button[data-action="apply"]');
    await switchBtn.click();
  }

  /**
   * Deletes a profile card.
   */
  async deleteRole(profileName: string): Promise<void> {
    const card = this.getCard(profileName);
    const deleteBtn = card.locator('button[data-action="delete"]');
    await deleteBtn.click();
    await this.expectToast(`Deleted "${profileName}"`);
  }

  /**
   * Triggers the Clean Slate / Reset button (with auto-confirm dialog).
   */
  async triggerCleanSlateReset(): Promise<void> {
    await this.autoAcceptDialog();
    await this.nukeSessionBtn.click();
    await this.expectToast('Session reset to anonymous guest state');
  }

  /**
   * Opens the Pro Upgrade modal and activates with demo key.
   */
  async activateProTier(key = 'QAPRO-DEV'): Promise<void> {
    await this.tierBadge.click();
    await this.proModal.activateWithKey(key);
    await this.expectToast('QASwitch Pro activated');
    await expect(this.tierBadge).toContainText('PRO 👑');
  }

  /**
   * Opens the Role Diff comparison modal.
   */
  async openDiffModal(): Promise<DiffModal> {
    await this.compareRolesBtn.click();
    await expect(this.diffModal.modal).toBeVisible();
    return this.diffModal;
  }

  /**
   * Opens the AES-GCM Encrypted Sharing modal for a profile.
   */
  async openEncryptedShareModal(profileName: string): Promise<EncryptedShareModal> {
    const card = this.getCard(profileName);
    await card.locator('button[data-action="share-enc"]').click();
    await expect(this.shareModal.modal).toBeVisible();
    return this.shareModal;
  }

  /**
   * Assertions
   */
  async expectSavedProfilesCount(count: number): Promise<void> {
    await expect(this.profileCards).toHaveCount(count);
  }

  async expectActiveRoleBadge(profileName: string): Promise<void> {
    const card = this.getCard(profileName);
    await expect(card.locator('.active-pill')).toHaveText('ACTIVE');
    await expect(card).toHaveClass(/active-profile/);
  }

  async expectFreemiumLimitReached(): Promise<void> {
    await expect(this.proBanner).toBeVisible();
    await expect(this.saveBtn).toBeDisabled();
    await expect(this.profileNameInput).toBeDisabled();
  }

  async expectFreemiumLimitNotReached(): Promise<void> {
    await expect(this.proBanner).toBeHidden();
    await expect(this.saveBtn).toBeEnabled();
    await expect(this.profileNameInput).toBeEnabled();
  }

  async expectHeaderBadge(profileName: string, count: number): Promise<void> {
    const card = this.getCard(profileName);
    const badge = card.locator('.badge', { hasText: `${count} header` });
    await expect(badge).toBeVisible();
  }

  async expectProfileExists(profileName: string): Promise<void> {
    await expect(this.getCard(profileName)).toBeVisible();
  }

  async expectProfileNotExists(profileName: string): Promise<void> {
    await expect(this.getCard(profileName)).toHaveCount(0);
  }

  private getCard(profileName: string): Locator {
    return this.profileCards.filter({ hasText: profileName }).first();
  }
}

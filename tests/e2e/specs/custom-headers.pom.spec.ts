/**
 * Page Object Model (POM) Test: Dynamic HTTP Headers & DNR Injection
 * Verifies custom request header definition, profile badge, and switching.
 */

import { test, expect } from '../fixtures.ts';
import { PlaygroundPage } from '../pages/PlaygroundPage.ts';
import { PopupPage } from '../pages/PopupPage.ts';

test.describe('POM: Dynamic HTTP Headers (Declarative Net Request)', () => {
  test('should attach custom headers to saved profile and display header indicators', async ({
    playgroundPage: rawPlayground,
    createPopupPage
  }) => {
    const playground = new PlaygroundPage(rawPlayground);
    await playground.goto();

    await playground.loginAsAdmin();

    const popupRaw = await createPopupPage();
    const popup = new PopupPage(popupRaw);

    const headersString = [
      'Authorization: Bearer mock_playwright_admin_jwt',
      'X-QA-Persona: LeadTester',
      'X-Mock-Tenant: EnterpriseOrg'
    ].join('\n');

    // Save session with 3 custom headers
    await popup.saveSession('Admin with Headers', headersString);

    // Verify 3 custom headers badge appears on the profile card
    await popup.expectHeaderBadge('Admin with Headers', 3);
    await popup.expectActiveRoleBadge('Admin with Headers');

    // Switch to another role or re-apply and verify stability
    await popup.switchRole('Admin with Headers');
    await popup.expectActiveRoleBadge('Admin with Headers');
  });
});

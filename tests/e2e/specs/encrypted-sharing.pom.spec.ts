/**
 * Page Object Model (POM) Test: AES-GCM Encrypted Sharing
 * Validates team passphrase encryption and portable snippet generation.
 */

import { test, expect } from '../fixtures.ts';
import { PlaygroundPage } from '../pages/PlaygroundPage.ts';
import { PopupPage } from '../pages/PopupPage.ts';

test.describe('POM: AES-GCM 256-bit Encrypted Session Sharing', () => {
  test('should generate secure encrypted snippet with team passphrase', async ({
    playgroundPage: rawPlayground,
    createPopupPage
  }) => {
    const playground = new PlaygroundPage(rawPlayground);
    await playground.goto();

    await playground.loginAsAdmin();

    const popupRaw = await createPopupPage();
    const popup = new PopupPage(popupRaw);
    await popup.saveSession('Admin Role');

    // Open Encrypted Sharing modal via POM
    const shareModal = await popup.openEncryptedShareModal('Admin Role');

    // Generate snippet with passphrase
    const snippet = await shareModal.generateSnippet('SuperSecretPlaywrightKey!');

    // Assert format starts with qas_enc_ and has 3 dot-delimited segments
    await shareModal.expectSnippetFormat();
    expect(snippet).toContain('qas_enc_');

    // Close modal
    await shareModal.close();
  });
});

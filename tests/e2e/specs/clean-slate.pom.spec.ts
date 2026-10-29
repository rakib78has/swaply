/**
 * Page Object Model (POM) Test: Clean Slate / Session Reset
 * Tests wiping all session data and restoring anonymous guest state.
 */

import { test, expect } from '../fixtures.ts';
import { PlaygroundPage } from '../pages/PlaygroundPage.ts';
import { PopupPage } from '../pages/PopupPage.ts';

test.describe('POM: Clean Slate / Session Reset', () => {
  test('should completely wipe cookies and storage and restore app to Guest state', async ({
    playgroundPage: rawPlayground,
    createPopupPage
  }) => {
    const playground = new PlaygroundPage(rawPlayground);
    await playground.goto();

    // 1. Log in as VIP Member in playground
    await playground.loginAsVip();
    await playground.expectRole('VIP MEMBER');
    await playground.expectCookieContains('jwt_token_vip_subscriber');

    // 2. Open QASwitch Popup and trigger Clean Slate Reset
    const popupRaw = await createPopupPage();
    const popup = new PopupPage(popupRaw);
    await popup.triggerCleanSlateReset();

    // 3. Verify Playground reloaded into clean Guest state
    await rawPlayground.bringToFront();
    await playground.expectRole('GUEST');
    await playground.expectCookieContains('(No cookies found on domain)');
  });
});

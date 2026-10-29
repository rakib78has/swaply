/**
 * Page Object Model (POM) Test: DevTools Panel Inspection & Tooling
 * Validates deep inspection tabs, JWT decode, cURL generator, and live storage view.
 */

import { test, expect } from '../fixtures.ts';
import { PlaygroundPage } from '../pages/PlaygroundPage.ts';
import { PopupPage } from '../pages/PopupPage.ts';
import { DevToolsPanelPage } from '../pages/DevToolsPanelPage.ts';

test.describe('POM: Chrome DevTools Panel Deep Inspection', () => {
  test('should inspect active JWT tokens, generate cURL command, and view live storage', async ({
    context,
    extensionId,
    playgroundPage: rawPlayground,
    createPopupPage
  }) => {
    const playground = new PlaygroundPage(rawPlayground);
    await playground.goto();

    // 1. Log in as Admin to establish active cookies and JWT in playground
    await playground.loginAsAdmin();

    // 2. Open popup and save as "Admin Role"
    const popupRaw = await createPopupPage();
    const popup = new PopupPage(popupRaw);
    await popup.saveSession('Admin Role');
    await popupRaw.close();

    // 3. Open DevTools Panel via POM
    const panelPage = await context.newPage();
    const devtools = new DevToolsPanelPage(panelPage);
    await devtools.goto(extensionId);

    // 4. Verify saved role appears in sidebar
    await devtools.expectRoleItemCount(1);

    // 5. Inspect JWT Tab
    await devtools.selectTab('jwt');
    await devtools.expectJWTDetected('app_session');

    // 6. Inspect cURL Generator Tab
    await devtools.selectTab('curl');
    await devtools.expectCurlContains('curl');
    await devtools.expectCurlContains('app_session=');

    // 7. Inspect Live Storage Tab
    await devtools.selectTab('storage');
    await expect(devtools.rawCookiesDump).toContainText('app_session');

    await panelPage.close();
  });
});

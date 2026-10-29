/**
 * Page Object Model (POM) Test: Freemium Quota & Pro Licensing
 */

import { test, expect } from '../fixtures.ts';
import { PlaygroundPage } from '../pages/PlaygroundPage.ts';
import { PopupPage } from '../pages/PopupPage.ts';

test.describe('POM: Freemium 2-Profile Quota & Pro Upgrade', () => {
  test('should enforce 2-profile free limit and unlock unlimited profiles after Pro upgrade', async ({
    playgroundPage: rawPlayground,
    createPopupPage
  }) => {
    const playground = new PlaygroundPage(rawPlayground);
    await playground.goto();

    const popupRaw = await createPopupPage();
    const popup = new PopupPage(popupRaw);

    // Initial state: free quota available
    await popup.expectFreemiumLimitNotReached();

    // 1. Save Profile 1
    await popup.saveSession('Role 1 (Free)');
    await popup.expectSavedProfilesCount(1);
    await popup.expectFreemiumLimitNotReached();

    // 2. Save Profile 2 (hits quota ceiling)
    await popup.saveSession('Role 2 (Free)');
    await popup.expectSavedProfilesCount(2);

    // 3. Verify Free limit reached: UI disabled, banner displayed
    await popup.expectFreemiumLimitReached();

    // 4. Upgrade to Pro using demo key via the POM
    await popup.activateProTier('QAPRO-DEV');

    // 5. Verify Pro tier unlocked: Save button re-enabled
    await popup.expectFreemiumLimitNotReached();

    // 6. Save Profile 3 (now permitted under Pro tier)
    await popup.saveSession('Role 3 (Pro Tier)');
    await popup.expectSavedProfilesCount(3);
  });
});

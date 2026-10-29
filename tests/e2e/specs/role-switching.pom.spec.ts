/**
 * Page Object Model (POM) Test: Multi-Role Session Capture & Switching
 */

import { test, expect } from '../fixtures.ts';
import { PlaygroundPage } from '../pages/PlaygroundPage.ts';
import { PopupPage } from '../pages/PopupPage.ts';

test.describe('POM: Multi-Role Authentication Switching', () => {
  test('should capture Admin and Regular User sessions and switch between them seamlessly', async ({
    playgroundPage: rawPlayground,
    createPopupPage
  }) => {
    const playground = new PlaygroundPage(rawPlayground);
    await playground.goto();

    // 1. Verify initially logged out in playground
    await playground.expectRole('GUEST');

    // 2. Log in as Administrator in playground
    await playground.loginAsAdmin();
    await playground.expectRole('ADMIN');
    await playground.expectCookieContains('jwt_token_admin_super_secret');

    // 3. Open QASwitch popup and snapshot "Admin Role"
    const popupRaw = await createPopupPage();
    const popup = new PopupPage(popupRaw);
    await popup.saveSession('Admin Role');
    await popup.expectSavedProfilesCount(1);
    await popup.expectActiveRoleBadge('Admin Role');
    await popupRaw.close();

    // 4. In playground, switch to Regular User
    await playground.loginAsRegularUser();
    await playground.expectRole('REGULAR');
    await playground.expectCookieContains('jwt_token_regular_user_abc123');

    // 5. Open QASwitch popup and snapshot "Regular User"
    const popupRaw2 = await createPopupPage();
    const popup2 = new PopupPage(popupRaw2);
    await popup2.saveSession('Regular User');
    await popup2.expectSavedProfilesCount(2);
    await popup2.expectActiveRoleBadge('Regular User');

    // 6. Switch back to "Admin Role" through the Page Object
    await popup2.switchRole('Admin Role');

    // 7. Bring playground back to front and verify live reload as Admin
    await rawPlayground.bringToFront();
    await playground.expectRole('ADMIN');
    await playground.expectCookieContains('jwt_token_admin_super_secret');
  });
});

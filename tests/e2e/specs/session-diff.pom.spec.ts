/**
 * Page Object Model (POM) Test: Session Diff & Side-by-Side Comparison
 * Inspects differences in cookies and localStorage between multiple roles.
 */

import { test, expect } from '../fixtures.ts';
import { PlaygroundPage } from '../pages/PlaygroundPage.ts';
import { PopupPage } from '../pages/PopupPage.ts';

test.describe('POM: Side-by-Side Session Diff Inspector', () => {
  test('should compare cookies and storage keys between Admin and Regular User', async ({
    playgroundPage: rawPlayground,
    createPopupPage
  }) => {
    const playground = new PlaygroundPage(rawPlayground);
    await playground.goto();

    const popupRaw = await createPopupPage();
    const popup = new PopupPage(popupRaw);

    // 1. Snapshot Admin Role
    await playground.loginAsAdmin();
    await popup.saveSession('Admin Role');

    // 2. Snapshot Regular User Role
    await playground.loginAsRegularUser();
    await popup.saveSession('Regular User');

    // 3. Open Diff Modal via POM
    const diffModal = await popup.openDiffModal();

    // 4. Select both roles and verify diff inspection
    await diffModal.selectRoles('Admin Role', 'Regular User');
    await diffModal.expectDiffContains('app_session');

    // 5. Close Diff modal
    await diffModal.close();
  });
});

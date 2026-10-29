import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createChromeCookiesMock, createChromeStorageMock } from './chromeMock.ts';
import {
  canCreateProfile,
  createNewProfile,
  validateLicenseKey,
  buildExportPayload,
  parseAndValidateImportJSON
} from '../src/core/profileService.ts';
import {
  removeCookieBatch,
  restoreCookieBatch
} from '../src/core/cookieManager.ts';
import type { ProfileRecord, SessionCookie } from '../src/types/index.ts';

describe('Full End-to-End Regression Workflow', () => {
  it('should execute full lifecycle: snapshot -> enforce quota -> upgrade -> switch -> reset', async () => {
    const storageMock = createChromeStorageMock();
    const cookiesMock = createChromeCookiesMock();
    const domain = 'my-saas-platform.com';
    const storageKey = `qaswitch_domain_${domain}`;

    // 1. Initial State: User is logged in as "Regular User"
    const userCookies: SessionCookie[] = [
      { name: 'session_id', value: 'usr_token_999', domain, path: '/', secure: true, httpOnly: true },
      { name: 'role', value: 'regular', domain, path: '/' }
    ];
    for (const c of userCookies) {
      await cookiesMock.set({
        url: `https://${domain}${c.path}`,
        name: c.name,
        value: c.value,
        domain: c.domain,
        path: c.path,
        secure: Boolean(c.secure),
        httpOnly: Boolean(c.httpOnly)
      });
    }

    assert.equal(cookiesMock.cookieStore.length, 2);

    // 2. Snapshot & Save Profile 1: "Regular User"
    const profile1 = createNewProfile(
      'Regular User',
      domain,
      `https://${domain}/dashboard`,
      [...cookiesMock.cookieStore],
      { local: { userId: 'user-1' }, session: {} }
    );
    let savedProfiles: ProfileRecord[] = [profile1];
    await storageMock.set({ [storageKey]: savedProfiles });

    assert.equal(canCreateProfile(savedProfiles.length, false), true);

    // 3. User logs in as "Admin" (cookies change in browser)
    await cookiesMock.remove({ url: `https://${domain}/`, name: 'session_id' });
    await cookiesMock.remove({ url: `https://${domain}/`, name: 'role' });

    const adminCookies: SessionCookie[] = [
      { name: 'session_id', value: 'adm_token_001', domain, path: '/', secure: true, httpOnly: true },
      { name: 'role', value: 'superadmin', domain, path: '/' }
    ];
    for (const c of adminCookies) {
      await cookiesMock.set({
        url: `https://${domain}${c.path}`,
        name: c.name,
        value: c.value,
        domain: c.domain,
        path: c.path,
        secure: Boolean(c.secure),
        httpOnly: Boolean(c.httpOnly)
      });
    }

    // 4. Snapshot & Save Profile 2: "Admin"
    const profile2 = createNewProfile(
      'Admin',
      domain,
      `https://${domain}/admin`,
      [...cookiesMock.cookieStore],
      { local: { userId: 'admin-001' }, session: {} }
    );
    savedProfiles.unshift(profile2);
    await storageMock.set({ [storageKey]: savedProfiles });

    assert.equal(savedProfiles.length, 2);

    // 5. Verify Free Quota blocks 3rd profile
    const isPro = false;
    assert.equal(canCreateProfile(savedProfiles.length, isPro), false, 'Free tier must block 3rd profile');

    // 6. Activate Pro Tier
    const enteredKey = 'QAPRO-DEV';
    assert.equal(validateLicenseKey(enteredKey), true);
    await storageMock.set({ qaswitch_is_pro_user: true });
    const upgradedPro = true;

    // 7. Save 3rd Profile: "Guest/Buyer" under Pro tier
    assert.equal(canCreateProfile(savedProfiles.length, upgradedPro), true, 'Pro tier allows 3rd profile');
    const profile3 = createNewProfile('Guest Buyer', domain, `https://${domain}`, [], { local: {}, session: {} });
    savedProfiles.unshift(profile3);
    await storageMock.set({ [storageKey]: savedProfiles });
    assert.equal(savedProfiles.length, 3);

    // 8. Execute "Switch": Switch back to "Regular User" (profile1)
    // A) Clear active cookies in browser
    await removeCookieBatch(cookiesMock.cookieStore, async (details) => {
      await cookiesMock.remove(details);
    });
    assert.equal(cookiesMock.cookieStore.length, 0, 'Active cookies must be emptied prior to restore');

    // B) Restore saved cookies from profile1
    await restoreCookieBatch(profile1.cookies, async (details) => {
      await cookiesMock.set(details);
    });

    assert.equal(cookiesMock.cookieStore.length, 2);
    const restoredToken = cookiesMock.cookieStore.find((c) => c.name === 'session_id');
    assert.equal(restoredToken?.value, 'usr_token_999', 'Should be authenticated as Regular User');

    // 9. Execute "Reset / Clean Slate"
    await removeCookieBatch(cookiesMock.cookieStore, async (details) => {
      await cookiesMock.remove(details);
    });
    assert.equal(cookiesMock.cookieStore.length, 0, 'Reset should leave zero cookies for domain');

    // 10. Export to JSON & Import Roundtrip
    const exportData = buildExportPayload(domain, savedProfiles);
    const jsonStr = JSON.stringify(exportData);

    const imported = parseAndValidateImportJSON(jsonStr);
    assert.ok(imported);
    assert.equal(imported.length, 3);
    assert.equal(imported[0].name.includes('(Imported)'), true);
  });
});


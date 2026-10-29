import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildCookieUrl,
  deduplicateCookies,
  prepareCookieSetDetails,
  removeCookieBatch,
  restoreCookieBatch
} from '../src/core/cookieManager.ts';
import type { SessionCookie } from '../src/types/index.ts';

describe('Cookie Manager Regression Tests', () => {
  it('should strip leading dot from domains when constructing removal/set URL', () => {
    const cookie: Partial<SessionCookie> = {
      domain: '.github.com',
      path: '/auth',
      secure: true
    };
    assert.equal(buildCookieUrl(cookie), 'https://github.com/auth');
  });

  it('should assign http:// for non-secure cookies and https:// for secure cookies', () => {
    const insecure: Partial<SessionCookie> = {
      domain: 'localhost',
      path: '/',
      secure: false
    };
    const secure: Partial<SessionCookie> = {
      domain: 'localhost',
      path: '/',
      secure: true
    };
    assert.equal(buildCookieUrl(insecure), 'http://localhost/');
    assert.equal(buildCookieUrl(secure), 'https://localhost/');
  });

  it('should ensure path begins with a leading forward slash', () => {
    const cookie: Partial<SessionCookie> = {
      domain: 'app.dev',
      path: 'dashboard',
      secure: false
    };
    assert.equal(buildCookieUrl(cookie), 'http://app.dev/dashboard');
  });

  it('should deduplicate cookie records based on store, domain, path, and name', () => {
    const cookies: SessionCookie[] = [
      { name: 'session_token', value: '111', domain: 'example.com', path: '/' },
      { name: 'session_token', value: '222', domain: 'example.com', path: '/' }, // duplicate key
      { name: 'csrf_token', value: '333', domain: 'example.com', path: '/' }
    ];

    const deduplicated = deduplicateCookies(cookies);
    assert.equal(deduplicated.length, 2);
    // Last occurrence or map preservation
    assert.equal(deduplicated.find((c) => c.name === 'session_token')?.value, '222');
  });

  it('should NOT include domain property for host-only cookies (Chrome MV3 requirement)', () => {
    const hostOnlyCookie: SessionCookie = {
      name: 'host_id',
      value: 'abc',
      domain: 'sub.example.com',
      path: '/',
      hostOnly: true
    };

    const details = prepareCookieSetDetails(hostOnlyCookie);
    assert.equal('domain' in details, false, 'Domain property must not exist for host-only cookies');
  });

  it('should include domain property for domain-scoped cookies', () => {
    const domainCookie: SessionCookie = {
      name: 'domain_id',
      value: 'xyz',
      domain: '.example.com',
      path: '/',
      hostOnly: false
    };

    const details = prepareCookieSetDetails(domainCookie);
    assert.equal(details.domain, '.example.com');
  });

  it('should NOT include expirationDate for session cookies', () => {
    const sessionCookie: SessionCookie = {
      name: 'sess',
      value: 'active',
      domain: 'example.com',
      path: '/',
      session: true,
      expirationDate: 1799999999
    };

    const details = prepareCookieSetDetails(sessionCookie);
    assert.equal('expirationDate' in details, false, 'Expiration must be omitted for session cookies');
  });

  it('should enforce secure: true when sameSite is no_restriction (Chrome SameSite=None requirement)', () => {
    const cookie: SessionCookie = {
      name: 'cross_site_cookie',
      value: 'token',
      domain: 'example.com',
      path: '/',
      secure: false, // Insecure flag with SameSite=None
      sameSite: 'no_restriction'
    };

    const details = prepareCookieSetDetails(cookie);
    assert.equal(details.sameSite, 'no_restriction');
    assert.equal(details.secure, true, 'Chrome mandates secure=true when sameSite is no_restriction');
  });

  it('should execute cookie batch deletion and restoration accurately', async () => {
    const testCookies: SessionCookie[] = [
      { name: 'c1', value: 'v1', domain: 'app.io', path: '/' },
      { name: 'c2', value: 'v2', domain: 'app.io', path: '/' }
    ];

    const deletedNames: string[] = [];
    const restoredNames: string[] = [];

    const removeRes = await removeCookieBatch(testCookies, async (details) => {
      deletedNames.push(details.name);
    });
    assert.equal(removeRes.deleted, 2);
    assert.deepEqual(deletedNames, ['c1', 'c2']);

    const restoreRes = await restoreCookieBatch(testCookies, async (details) => {
      restoredNames.push(details.name);
    });
    assert.equal(restoreRes.restored, 2);
    assert.deepEqual(restoredNames, ['c1', 'c2']);
  });
});


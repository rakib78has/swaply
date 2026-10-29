import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { cloneProfileToDomain, portCookieToDomain } from '../src/core/domainCloner.ts';
import type { ProfileRecord, SessionCookie } from '../src/types/index.ts';

describe('Domain Cloner & Cross-Environment Porting Tests', () => {
  it('should adjust cookie security flags when porting from HTTPS staging to HTTP localhost', () => {
    const secureCookie: SessionCookie = {
      name: 'auth_jwt',
      value: 'jwt_val_777',
      domain: '.staging.myapp.com',
      path: '/',
      secure: true,
      sameSite: 'no_restriction'
    };

    const ported = portCookieToDomain(secureCookie, 'localhost');
    assert.equal(ported.domain, 'localhost');
    assert.equal(ported.secure, false, 'Localhost HTTP should not mandate secure flag');
    assert.equal(ported.sameSite, 'lax', 'Relax SameSite to lax when unsecure on localhost');
  });

  it('should preserve secure flag when porting to another HTTPS domain', () => {
    const secureCookie: SessionCookie = {
      name: 'auth_jwt',
      value: 'jwt_val_777',
      domain: '.staging.myapp.com',
      path: '/',
      secure: true,
      sameSite: 'lax'
    };

    const ported = portCookieToDomain(secureCookie, 'preview-pr-42.myapp.com');
    assert.equal(ported.domain, '.preview-pr-42.myapp.com');
    assert.equal(ported.secure, true);
    assert.equal(ported.sameSite, 'lax');
  });

  it('should clone entire profile with new unique ID and rewritten domain', () => {
    const original: ProfileRecord = {
      id: 'prof_original_123',
      name: 'Admin Staging',
      createdAt: 1000,
      domain: 'staging.company.io',
      url: 'https://staging.company.io/dashboard',
      cookies: [
        { name: 'session', value: 'secret', domain: '.staging.company.io', path: '/', secure: true }
      ],
      storage: {
        local: { theme: 'dark', role: 'admin' },
        session: {}
      }
    };

    const cloned = cloneProfileToDomain(original, {
      targetDomain: 'localhost',
      targetUrl: 'http://localhost:3000/app',
      newName: 'Admin Localhost'
    });

    assert.notEqual(cloned.id, original.id);
    assert.equal(cloned.name, 'Admin Localhost');
    assert.equal(cloned.domain, 'localhost');
    assert.equal(cloned.url, 'http://localhost:3000/app');
    assert.equal(cloned.cookies[0].domain, 'localhost');
    assert.equal(cloned.storage.local.role, 'admin');
  });
});


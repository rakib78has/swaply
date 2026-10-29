import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  canCreateProfile,
  createNewProfile,
  validateLicenseKey,
  buildExportPayload,
  parseAndValidateImportJSON
} from '../src/core/profileService.ts';
import type { ProfileRecord } from '../src/types/index.ts';

describe('Profile Service & Freemium Logic Tests', () => {
  it('should enforce the 2-profile free limit', () => {
    // Free user
    assert.equal(canCreateProfile(0, false), true);
    assert.equal(canCreateProfile(1, false), true);
    assert.equal(canCreateProfile(2, false), false, '3rd profile must be blocked for free users');
    assert.equal(canCreateProfile(5, false), false);

    // Pro user
    assert.equal(canCreateProfile(0, true), true);
    assert.equal(canCreateProfile(2, true), true, 'Pro users must be allowed beyond 2 profiles');
    assert.equal(canCreateProfile(100, true), true);
  });

  it('should create valid, typed ProfileRecord instances', () => {
    const profile = createNewProfile(
      '  Admin User  ',
      'github.com',
      'https://github.com/login',
      [{ name: 'user_session', value: 'sess123', domain: 'github.com', path: '/' }],
      { local: { key: 'val' }, session: {} }
    );

    assert.equal(profile.name, 'Admin User', 'Profile name should be trimmed');
    assert.equal(profile.domain, 'github.com');
    assert.equal(profile.cookies.length, 1);
    assert.equal(profile.storage.local.key, 'val');
    assert.match(profile.id, /^prof_\d+_[a-z0-9]+$/);
  });

  it('should validate license keys accurately', () => {
    assert.equal(validateLicenseKey('QAPRO-DEV'), true);
    assert.equal(validateLicenseKey('qapro-dev'), true, 'Case insensitive');
    assert.equal(validateLicenseKey('PRO-ENTERPRISE-2026'), true);
    assert.equal(validateLicenseKey('PRO-TEAM-10'), true);

    assert.equal(validateLicenseKey('INVALID-KEY'), false);
    assert.equal(validateLicenseKey(''), false);
    assert.equal(validateLicenseKey(null), false);
    assert.equal(validateLicenseKey(undefined), false);
  });

  it('should generate valid export payloads', () => {
    const dummyProfiles: ProfileRecord[] = [
      {
        id: 'p1',
        name: 'Admin',
        createdAt: 1000,
        domain: 'example.com',
        url: 'https://example.com',
        cookies: [],
        storage: { local: {}, session: {} }
      }
    ];

    const payload = buildExportPayload('example.com', dummyProfiles);
    assert.equal(payload.version, '1.0');
    assert.equal(payload.domain, 'example.com');
    assert.equal(payload.profiles.length, 1);
    assert.ok(payload.exportedAt);
  });

  it('should parse and sanitize imported JSON', () => {
    const validJson = JSON.stringify({
      version: '1.0',
      domain: 'staging.app',
      profiles: [
        {
          id: 'old-id-collision',
          name: 'QA Staging Role',
          cookies: [{ name: 'auth', value: 'secret', domain: 'staging.app', path: '/' }],
          storage: { local: { key1: 'val1' }, session: {} }
        }
      ]
    });

    const result = parseAndValidateImportJSON(validJson);
    assert.ok(result);
    assert.equal(result.length, 1);
    assert.equal(result[0].name, 'QA Staging Role (Imported)');
    assert.notEqual(result[0].id, 'old-id-collision', 'Imported profiles must receive fresh IDs');
    assert.equal(result[0].cookies.length, 1);
  });

  it('should reject invalid or malformed JSON payloads gracefully', () => {
    assert.equal(parseAndValidateImportJSON('invalid-json'), null);
    assert.equal(parseAndValidateImportJSON('{}'), null);
    assert.equal(parseAndValidateImportJSON(JSON.stringify({ profiles: [] })), null);
    assert.equal(parseAndValidateImportJSON(JSON.stringify([{ invalid: true }])), null);
  });
});


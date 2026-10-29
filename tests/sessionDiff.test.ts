import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { compareProfiles, compareKeyValues, compareCookieLists } from '../src/core/sessionDiff.ts';
import type { ProfileRecord } from '../src/types/index.ts';

describe('Session Diff Engine Tests', () => {
  it('should detect added, removed, modified, and identical keys correctly', () => {
    const dictA = {
      sharedSame: 'val1',
      sharedDiff: 'admin',
      onlyA: 'a_val'
    };
    const dictB = {
      sharedSame: 'val1',
      sharedDiff: 'user',
      onlyB: 'b_val'
    };

    const diffs = compareKeyValues(dictA, dictB);

    assert.equal(diffs.find((d) => d.key === 'sharedSame')?.status, 'identical');
    assert.equal(diffs.find((d) => d.key === 'sharedDiff')?.status, 'modified');
    assert.equal(diffs.find((d) => d.key === 'onlyA')?.status, 'removed');
    assert.equal(diffs.find((d) => d.key === 'onlyB')?.status, 'added');
  });

  it('should compare cookie lists accurately', () => {
    const cookiesA = [
      { name: 'auth_jwt', value: 'jwt_admin', domain: 'app.io', path: '/' },
      { name: 'analytics', value: 'on', domain: 'app.io', path: '/' }
    ];
    const cookiesB = [
      { name: 'auth_jwt', value: 'jwt_regular', domain: 'app.io', path: '/' },
      { name: 'user_pref', value: 'compact', domain: 'app.io', path: '/' }
    ];

    const diffs = compareCookieLists(cookiesA, cookiesB);
    assert.equal(diffs.find((d) => d.key === 'auth_jwt')?.status, 'modified');
    assert.equal(diffs.find((d) => d.key === 'analytics')?.status, 'removed');
    assert.equal(diffs.find((d) => d.key === 'user_pref')?.status, 'added');
  });

  it('should generate a full comparison summary between two profiles', () => {
    const admin: ProfileRecord = {
      id: 'p1',
      name: 'Admin',
      createdAt: 1000,
      domain: 'myapp.com',
      url: 'https://myapp.com',
      cookies: [{ name: 'role', value: 'admin', domain: 'myapp.com', path: '/' }],
      storage: {
        local: { permissions: 'all' },
        session: {}
      }
    };

    const user: ProfileRecord = {
      id: 'p2',
      name: 'User',
      createdAt: 2000,
      domain: 'myapp.com',
      url: 'https://myapp.com',
      cookies: [{ name: 'role', value: 'user', domain: 'myapp.com', path: '/' }],
      storage: {
        local: { permissions: 'read_only' },
        session: {}
      }
    };

    const result = compareProfiles(admin, user);
    assert.equal(result.profileAName, 'Admin');
    assert.equal(result.profileBName, 'User');
    assert.equal(result.totalDifferences, 2); // role cookie modified + permissions storage modified
  });
});


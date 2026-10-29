import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { filterRolesForOmnibox, resolveOmniboxSelection } from '../src/core/omniboxEngine.ts';
import type { ProfileRecord } from '../src/types/index.ts';

const testProfiles: ProfileRecord[] = [
  {
    id: 'p1',
    name: 'Admin Role',
    createdAt: 1000,
    domain: 'localhost',
    url: 'http://localhost/',
    cookies: [{ name: 'c1', value: 'v1', domain: 'localhost', path: '/' }],
    storage: { local: {}, session: {} }
  },
  {
    id: 'p2',
    name: 'Regular User',
    createdAt: 2000,
    domain: 'localhost',
    url: 'http://localhost/',
    cookies: [],
    storage: { local: {}, session: {} }
  },
  {
    id: 'p3',
    name: 'VIP Member',
    createdAt: 3000,
    domain: 'localhost',
    url: 'http://localhost/',
    cookies: [],
    storage: { local: {}, session: {} }
  }
];

describe('Omnibox Engine Tests', () => {
  test('should return all profiles when query is empty', () => {
    const suggestions = filterRolesForOmnibox(testProfiles, '');
    assert.equal(suggestions.length, 3);
    assert.equal(suggestions[0].content, 'Admin Role');
  });

  test('should filter profiles based on partial case-insensitive query', () => {
    const suggestions = filterRolesForOmnibox(testProfiles, 'reg');
    assert.equal(suggestions.length, 1);
    assert.equal(suggestions[0].content, 'Regular User');
  });

  test('should return graceful notice when no matching roles are found', () => {
    const suggestions = filterRolesForOmnibox(testProfiles, 'nonexistent');
    assert.equal(suggestions.length, 1);
    assert.equal(suggestions[0].content, 'none');
  });

  test('should resolve omnibox selection by exact or substring match', () => {
    const resolvedExact = resolveOmniboxSelection(testProfiles, 'Admin Role');
    assert.equal(resolvedExact?.id, 'p1');

    const resolvedPartial = resolveOmniboxSelection(testProfiles, 'vip');
    assert.equal(resolvedPartial?.id, 'p3');

    const notFound = resolveOmniboxSelection(testProfiles, 'unknown');
    assert.equal(notFound, null);
  });
});

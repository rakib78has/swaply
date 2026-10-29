import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateExpiration,
  isProfileExpired,
  formatRemainingTTL
} from '../src/core/ttlEngine.ts';

describe('Session TTL & Expiry Tests', () => {
  test('should calculate accurate expiration timestamps based on TTL minutes', () => {
    const base = 1000000;
    assert.equal(calculateExpiration(base, 30), base + 30 * 60 * 1000);
    assert.equal(calculateExpiration(base, null), null);
    assert.equal(calculateExpiration(base, 0), null);
  });

  test('should detect expired profiles accurately', () => {
    const now = 2000000;
    assert.equal(isProfileExpired(now - 100, now), true);
    assert.equal(isProfileExpired(now + 100, now), false);
    assert.equal(isProfileExpired(null, now), false);
  });

  test('should format human-readable TTL notices', () => {
    const now = 2000000;
    assert.equal(formatRemainingTTL(null, now), 'Permanent (No Expiry)');

    // 45 minutes in future
    const in45m = now + 45 * 60 * 1000;
    assert.equal(formatRemainingTTL(in45m, now), 'Expires in 45m');

    // 2 hours 10 mins in future
    const in2h10m = now + (2 * 60 + 10) * 60 * 1000;
    assert.equal(formatRemainingTTL(in2h10m, now), 'Expires in 2h 10m');

    // 5 minutes ago
    const ago5m = now - 5 * 60 * 1000;
    assert.equal(formatRemainingTTL(ago5m, now), 'Expired 5m ago');
  });
});

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { sanitizeStorageSnapshot } from '../src/core/storageManager.ts';

describe('Storage Manager Regression Tests', () => {
  it('should sanitize valid storage structures correctly', () => {
    const raw = {
      local: {
        authToken: 'jwt.123.456',
        theme: 'dark'
      },
      session: {
        currentStep: 'checkout'
      }
    };

    const sanitized = sanitizeStorageSnapshot(raw);
    assert.deepEqual(sanitized, raw);
  });

  it('should safely filter out non-string keys and non-string values', () => {
    const raw = {
      local: {
        validKey: 'validValue',
        numKey: 12345 as unknown as string,
        nullKey: null as unknown as string,
        objKey: { nested: true } as unknown as string
      },
      session: {
        sessionStr: 'ok'
      }
    };

    const sanitized = sanitizeStorageSnapshot(raw);
    assert.equal(sanitized.local.validKey, 'validValue');
    assert.equal('numKey' in sanitized.local, false);
    assert.equal('nullKey' in sanitized.local, false);
    assert.equal('objKey' in sanitized.local, false);
    assert.equal(sanitized.session.sessionStr, 'ok');
  });

  it('should handle null, undefined, and non-object inputs without throwing', () => {
    assert.deepEqual(sanitizeStorageSnapshot(null), { local: {}, session: {} });
    assert.deepEqual(sanitizeStorageSnapshot(undefined), { local: {}, session: {} });
    assert.deepEqual(sanitizeStorageSnapshot('string-value'), { local: {}, session: {} });
    assert.deepEqual(sanitizeStorageSnapshot([]), { local: {}, session: {} });
  });
});


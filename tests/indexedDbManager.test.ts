import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { sanitizeIDBSnapshot } from '../src/core/indexedDbManager.ts';

describe('IndexedDB Manager Regression Tests', () => {
  it('should sanitize valid IndexedDB snapshot structures', () => {
    const raw = [
      {
        dbName: 'firebaseLocalStorageDb',
        version: 1,
        stores: [
          {
            storeName: 'firebaseLocalStorage',
            records: [
              {
                key: 'firebase:authUser:apiKey:[DEFAULT]',
                value: { uid: 'usr_123', email: 'test@example.com' }
              }
            ]
          }
        ]
      }
    ];

    const sanitized = sanitizeIDBSnapshot(raw);
    assert.equal(sanitized.length, 1);
    assert.equal(sanitized[0].dbName, 'firebaseLocalStorageDb');
    assert.equal(sanitized[0].stores[0].storeName, 'firebaseLocalStorage');
    assert.equal(sanitized[0].stores[0].records.length, 1);
  });

  it('should discard records with missing or invalid db names', () => {
    const raw = [
      { version: 1 }, // missing dbName
      { dbName: '', version: 1 }, // empty dbName
      null,
      undefined
    ];

    const sanitized = sanitizeIDBSnapshot(raw);
    assert.equal(sanitized.length, 0);
  });

  it('should handle non-array inputs safely', () => {
    assert.deepEqual(sanitizeIDBSnapshot(null), []);
    assert.deepEqual(sanitizeIDBSnapshot(undefined), []);
    assert.deepEqual(sanitizeIDBSnapshot('string'), []);
    assert.deepEqual(sanitizeIDBSnapshot({}), []);
  });
});


import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  createMutationRecord,
  filterMutations,
  reconstructStateAt,
  buildStorageInterceptorScript,
  buildStorageRollbackScript,
} from '../src/core/storageTimeMachine.ts';
import type { StorageMutationRecord } from '../src/types/index.ts';

describe('DOM Storage Time Machine & Changelog Tests', () => {
  test('should create typed storage mutation records', () => {
    const record = createMutationRecord(
      'SET_LOCAL',
      'auth_token',
      null,
      'token_123',
      'login.js:45',
      1700000000000
    );

    assert.equal(record.type, 'SET_LOCAL');
    assert.equal(record.key, 'auth_token');
    assert.equal(record.oldValue, null);
    assert.equal(record.newValue, 'token_123');
    assert.equal(record.caller, 'login.js:45');
    assert.equal(record.timestamp, 1700000000000);
  });

  test('should filter mutation records by key and operation type', () => {
    const records: StorageMutationRecord[] = [
      createMutationRecord('SET_LOCAL', 'cart_items', null, '["item1"]', '', 1),
      createMutationRecord('SET_SESSION', 'temp_id', null, 'sess_1', '', 2),
      createMutationRecord('REMOVE_LOCAL', 'cart_items', '["item1"]', null, '', 3),
    ];

    const cartOnly = filterMutations(records, { key: 'cart' });
    assert.equal(cartOnly.length, 2);

    const sessionOnly = filterMutations(records, { type: 'SET_SESSION' });
    assert.equal(sessionOnly.length, 1);
  });

  test('should reconstruct state at any point in time by chronological replay', () => {
    const records: StorageMutationRecord[] = [
      createMutationRecord('SET_LOCAL', 'user', null, 'Alice', '', 10),
      createMutationRecord('SET_LOCAL', 'theme', null, 'dark', '', 20),
      createMutationRecord('SET_LOCAL', 'user', 'Alice', 'Bob', '', 30),
      createMutationRecord('REMOVE_LOCAL', 'theme', 'dark', null, '', 40),
    ];

    // At t = 25 (before Bob and before theme was removed)
    const stateAt25 = reconstructStateAt(records, 25);
    assert.equal(stateAt25.local['user'], 'Alice');
    assert.equal(stateAt25.local['theme'], 'dark');

    // At t = 50 (after Bob and theme removed)
    const stateAt50 = reconstructStateAt(records, 50);
    assert.equal(stateAt50.local['user'], 'Bob');
    assert.equal(stateAt50.local['theme'], undefined);
  });

  test('should generate in-page interceptor and state rollback scripts', () => {
    const interceptor = buildStorageInterceptorScript();
    assert.ok(interceptor.includes('__QASWITCH_STORAGE_CHANGELOG__'));
    assert.ok(interceptor.includes('window.localStorage.setItem'));
    assert.ok(interceptor.includes('window.sessionStorage.setItem'));

    const rollback = buildStorageRollbackScript({
      local: { key1: 'val1' },
      session: { sKey: 'sVal' },
    });
    assert.ok(rollback.includes('window.localStorage.clear()'));
    assert.ok(rollback.includes('window.localStorage.setItem'));
  });
});

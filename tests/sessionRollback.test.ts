import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  createRollbackSnapshot,
  isRollbackAvailable,
  formatRollbackLabel
} from '../src/core/sessionRollback.ts';

describe('Session Rollback / Undo Tests', () => {
  test('should create valid rollback snapshot structure', () => {
    const snapshot = createRollbackSnapshot(
      'example.com',
      [{ name: 'session_id', value: '123', domain: 'example.com', path: '/' }],
      { local: { user: 'lead' }, session: {} },
      'Manager Profile'
    );

    assert.ok(snapshot.id.startsWith('rb_'));
    assert.equal(snapshot.domain, 'example.com');
    assert.equal(snapshot.previousProfileName, 'Manager Profile');
    assert.equal(snapshot.cookies.length, 1);
  });

  test('should validate rollback availability within max age window', () => {
    const freshSnapshot = createRollbackSnapshot('example.com', [], { local: {}, session: {} });
    assert.equal(isRollbackAvailable(freshSnapshot, 60000), true);

    const oldSnapshot = {
      ...freshSnapshot,
      timestamp: Date.now() - 3600000 // 1 hour ago
    };
    assert.equal(isRollbackAvailable(oldSnapshot, 60000), false);
    assert.equal(isRollbackAvailable(null), false);
  });

  test('should format informative rollback summary label', () => {
    const snapshot = createRollbackSnapshot(
      'example.com',
      [{ name: 'a', value: '1', domain: 'example.com', path: '/' }],
      { local: {}, session: {} },
      'Dev Admin'
    );

    const label = formatRollbackLabel(snapshot);
    assert.match(label, /Undo switch to "Dev Admin"/);
    assert.match(label, /1 cookies/);
  });
});

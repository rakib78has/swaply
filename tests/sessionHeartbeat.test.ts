import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  isUnauthorizedStatusCode,
  formatSessionExpiredBadge,
  createInitialHeartbeatStatus,
  evaluateSessionStatus,
  buildHeartbeatScript
} from '../src/core/sessionHeartbeat.ts';

describe('Live Session Heartbeat Monitor Tests', () => {
  test('should detect unauthorized 401 and 403 status codes', () => {
    assert.equal(isUnauthorizedStatusCode(401), true);
    assert.equal(isUnauthorizedStatusCode(403), true);
    assert.equal(isUnauthorizedStatusCode(200), false);
    assert.equal(isUnauthorizedStatusCode(404), false);
    assert.equal(isUnauthorizedStatusCode(500), false);
  });

  test('should format session expired badge correctly', () => {
    const badge = formatSessionExpiredBadge(401);
    assert.equal(badge.text, '⚠️EXP');
    assert.equal(badge.color, '#ef4444');
    assert.ok(badge.title.includes('HTTP 401'));
  });

  test('should update heartbeat status state accurately', () => {
    const initial = createInitialHeartbeatStatus('portal.test.com');
    assert.equal(initial.isExpired, false);
    assert.equal(initial.unauthorizedCount, 0);

    const okUpdate = evaluateSessionStatus(initial, 200);
    assert.equal(okUpdate.isExpired, false);
    assert.equal(okUpdate.unauthorizedCount, 0);

    const revokedUpdate = evaluateSessionStatus(okUpdate, 401);
    assert.equal(revokedUpdate.isExpired, true);
    assert.equal(revokedUpdate.statusCode, 401);
    assert.equal(revokedUpdate.unauthorizedCount, 1);
  });

  test('should build interceptor script intercepting fetch and XHR', () => {
    const script = buildHeartbeatScript();
    assert.ok(script.includes('window.fetch'));
    assert.ok(script.includes('XMLHttpRequest.prototype.open'));
    assert.ok(script.includes('qaswitch:heartbeat_status'));
    assert.ok(script.includes('401'));
    assert.ok(script.includes('403'));
  });
});

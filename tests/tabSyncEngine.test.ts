import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildTabSyncConfig,
  createSyncMessage,
  buildTabSyncScript,
  buildTabSyncCleanupScript,
} from '../src/core/tabSyncEngine.ts';

describe('Real-Time Multi-Tab Action Synchronizer Tests', () => {
  test('should build tab sync configuration with defaults and custom options', () => {
    const config = buildTabSyncConfig('qa_room_1', {
      syncScroll: true,
      syncInputs: false,
      syncNav: true,
    });

    assert.equal(config.channel, 'qa_room_1');
    assert.equal(config.syncScroll, true);
    assert.equal(config.syncInputs, false);
    assert.equal(config.syncNav, true);
    assert.equal(config.enabled, true);
  });

  test('should create valid sync broadcast message', () => {
    const msg = createSyncMessage('SCROLL', 'test_room', 101, { x: 0, y: 450 });
    assert.equal(msg.type, 'SCROLL');
    assert.equal(msg.channel, 'test_room');
    assert.equal(msg.senderTabId, 101);
    assert.deepEqual(msg.payload, { x: 0, y: 450 });
    assert.ok(msg.timestamp > 0);
  });

  test('should generate in-page BroadcastChannel synchronization script', () => {
    const config = buildTabSyncConfig('sync_team_a');
    const script = buildTabSyncScript(config, 42);

    assert.ok(script.includes('new BroadcastChannel'));
    assert.ok(script.includes('qaswitch_tab_sync_sync_team_a'));
    assert.ok(script.includes('window.scrollTo'));
    assert.ok(script.includes('bc.postMessage'));
  });

  test('should generate channel cleanup script', () => {
    const cleanup = buildTabSyncCleanupScript('sync_team_a');
    assert.ok(cleanup.includes('window.__QASWITCH_BC__.close()'));
  });
});

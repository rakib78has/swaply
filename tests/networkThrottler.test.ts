import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  getNetworkProfiles,
  getNetworkProfile,
  buildNetworkSimulationScript
} from '../src/core/networkThrottler.ts';

describe('Role-Linked Network Throttler Tests', () => {
  test('should return all standard network profiles including 3G, 4G, and Offline', () => {
    const profiles = getNetworkProfiles();
    assert.ok(profiles.BROADBAND);
    assert.ok(profiles.FAST_4G);
    assert.ok(profiles.SLOW_3G);
    assert.ok(profiles.OFFLINE);

    assert.equal(profiles.SLOW_3G.latencyMs, 400);
    assert.equal(profiles.OFFLINE.offline, true);
  });

  test('should fallback to Broadband profile when unknown profile ID requested', () => {
    // @ts-expect-error Testing fallback
    const fallback = getNetworkProfile('UNKNOWN_PROFILE');
    assert.equal(fallback.id, 'BROADBAND');
  });

  test('should generate fetch latency delay wrapper script for Slow 3G', () => {
    const script = buildNetworkSimulationScript('SLOW_3G');
    assert.match(script, /setTimeout\(resolve, 400\)/);
    assert.match(script, /__qaswitch_original_fetch__/);
  });

  test('should generate fetch rejection script for Offline mode', () => {
    const script = buildNetworkSimulationScript('OFFLINE');
    assert.match(script, /Failed to fetch: QASwitch Offline Simulation Active/);
  });

  test('should generate cleanup script when switching back to Broadband', () => {
    const script = buildNetworkSimulationScript('BROADBAND');
    assert.match(script, /window\.fetch = window\.__qaswitch_original_fetch__;/);
  });
});

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  evaluateChaosDrop,
  buildChaosInjectionScript,
  buildChaosCleanupScript
} from '../src/core/chaosEngine.ts';

describe('Chaos Engineering & Flaky Network Tests', () => {
  test('should evaluate chaos drop probability correctly', () => {
    assert.equal(evaluateChaosDrop(0), false);
    assert.equal(evaluateChaosDrop(100), true);
    // Deterministic mock: 15% random roll vs 20% rate -> should drop
    assert.equal(evaluateChaosDrop(20, () => 0.15), true);
    // 25% random roll vs 20% rate -> should pass
    assert.equal(evaluateChaosDrop(20, () => 0.25), false);
  });

  test('should generate fetch interceptor script for packet loss mode', () => {
    const script = buildChaosInjectionScript({ mode: 'PACKET_LOSS', ratePercent: 20 });
    assert.ok(script.includes('PACKET_LOSS'));
    assert.ok(script.includes('Packet Dropped'));
    assert.ok(script.includes('window.fetch'));
  });

  test('should generate fetch interceptor script for random 500 error mode', () => {
    const script = buildChaosInjectionScript({ mode: 'RANDOM_500', ratePercent: 15 });
    assert.ok(script.includes('RANDOM_500'));
    assert.ok(script.includes('status: 500'));
  });

  test('should generate cleanup script when chaos is disabled', () => {
    const cleanup = buildChaosCleanupScript();
    assert.ok(cleanup.includes('window.__QASWITCH_CHAOS_ACTIVE__ = false'));
  });
});

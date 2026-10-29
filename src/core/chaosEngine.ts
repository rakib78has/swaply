/**
 * Chaos Engineering & Flaky Network Simulator
 * Injects synthetic faults, dropped requests, random 500 errors, and high latency jitter to test frontend resilience.
 */

import type { ChaosConfig } from '../types/index.ts';

export function evaluateChaosDrop(ratePercent: number, randomFn = Math.random): boolean {
  if (ratePercent <= 0) return false;
  if (ratePercent >= 100) return true;
  return randomFn() * 100 < ratePercent;
}

export function buildChaosInjectionScript(config: ChaosConfig): string {
  if (config.mode === 'DISABLED' || config.ratePercent <= 0) {
    return buildChaosCleanupScript();
  }

  const rate = config.ratePercent;
  const delay = config.delayMs || 1500;

  return `
    (() => {
      if (window.__QASWITCH_CHAOS_ACTIVE__) return;
      window.__QASWITCH_CHAOS_ACTIVE__ = true;

      const origFetch = window.fetch;
      window.fetch = async function(...args) {
        const rand = Math.random() * 100;
        const mode = ${JSON.stringify(config.mode)};
        const rate = ${rate};

        if (rand < rate) {
          if (mode === 'PACKET_LOSS') {
            throw new TypeError('Failed to fetch (QASwitch Chaos: Packet Dropped)');
          } else if (mode === 'RANDOM_500') {
            return new Response(JSON.stringify({ error: 'Internal Server Error (Simulated by QASwitch Chaos)' }), {
              status: 500,
              statusText: 'Internal Server Error',
              headers: { 'Content-Type': 'application/json' }
            });
          } else if (mode === 'HIGH_JITTER') {
            await new Promise((r) => setTimeout(r, ${delay} + Math.random() * 1000));
          }
        }

        return origFetch.apply(this, args);
      };
    })();
  `;
}

export function buildChaosCleanupScript(): string {
  return `
    (() => {
      window.__QASWITCH_CHAOS_ACTIVE__ = false;
    })();
  `;
}

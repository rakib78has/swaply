/**
 * Role-Linked Network Throttler & Latency Simulator
 * Attaches real-world network conditions (Slow 3G, Offline, 1s Satellite latency) to QA roles.
 */

import type { NetworkProfile, NetworkProfileId } from '../types/index.ts';

export const NETWORK_PROFILES: Record<NetworkProfileId, NetworkProfile> = {
  BROADBAND: {
    id: 'BROADBAND',
    name: 'Broadband / WiFi (No Throttling)',
    latencyMs: 0,
    downloadKbps: 0,
    uploadKbps: 0,
    offline: false,
    icon: '🚀'
  },
  FAST_4G: {
    id: 'FAST_4G',
    name: 'Fast 4G Mobile',
    latencyMs: 25,
    downloadKbps: 4000,
    uploadKbps: 1500,
    offline: false,
    icon: '📶'
  },
  SLOW_3G: {
    id: 'SLOW_3G',
    name: 'Slow 3G Mobile (Field Testing)',
    latencyMs: 400,
    downloadKbps: 400,
    uploadKbps: 400,
    offline: false,
    icon: '🐢'
  },
  HIGH_LATENCY: {
    id: 'HIGH_LATENCY',
    name: 'High Latency / Satellite (1000ms)',
    latencyMs: 1000,
    downloadKbps: 1000,
    uploadKbps: 500,
    offline: false,
    icon: '🛰️'
  },
  OFFLINE: {
    id: 'OFFLINE',
    name: 'Airplane / Disconnected State',
    latencyMs: 0,
    downloadKbps: 0,
    uploadKbps: 0,
    offline: true,
    icon: '✈️'
  }
};

export function getNetworkProfiles(): Record<NetworkProfileId, NetworkProfile> {
  return NETWORK_PROFILES;
}

export function getNetworkProfile(id: NetworkProfileId = 'BROADBAND'): NetworkProfile {
  return NETWORK_PROFILES[id] || NETWORK_PROFILES.BROADBAND;
}

/**
 * Builds in-page JavaScript to throttle fetch & XHR requests according to active role network settings
 */
export function buildNetworkSimulationScript(conditionId: NetworkProfileId): string {
  const profile = getNetworkProfile(conditionId);

  if (profile.id === 'BROADBAND' && !profile.offline) {
    return `
      (() => {
        // Remove network throttle proxy if active
        if (window.__qaswitch_original_fetch__) {
          window.fetch = window.__qaswitch_original_fetch__;
          delete window.__qaswitch_original_fetch__;
        }
      })();
    `;
  }

  return `
    (() => {
      // 1. Simulate Offline Airplane Mode
      ${profile.offline ? `
        if (!window.__qaswitch_original_fetch__) {
          window.__qaswitch_original_fetch__ = window.fetch;
        }
        window.fetch = () => Promise.reject(new TypeError('Failed to fetch: QASwitch Offline Simulation Active'));
        return;
      ` : ''}

      // 2. Simulate Latency on Outbound fetch calls (${profile.latencyMs}ms)
      if (!window.__qaswitch_original_fetch__) {
        window.__qaswitch_original_fetch__ = window.fetch;
      }

      window.fetch = async (...args) => {
        await new Promise((resolve) => setTimeout(resolve, ${profile.latencyMs}));
        return window.__qaswitch_original_fetch__(...args);
      };
    })();
  `;
}

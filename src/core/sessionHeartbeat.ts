/**
 * Live 401/403 Session Heartbeat & Auto-Expiry Monitor
 * Detects session invalidation or token revocation immediately across background and content scripts.
 */

import type { HeartbeatStatus } from '../types/index.ts';

export function isUnauthorizedStatusCode(status: number): boolean {
  return status === 401 || status === 403;
}

export function formatSessionExpiredBadge(statusCode?: number): { text: string; color: string; title: string } {
  return {
    text: '⚠️EXP',
    color: '#ef4444',
    title: statusCode ? `Session Expired / Revoked (HTTP ${statusCode})` : 'Session Expired or Revoked'
  };
}

export function createInitialHeartbeatStatus(domain: string): HeartbeatStatus {
  return {
    domain,
    lastChecked: Date.now(),
    isExpired: false,
    unauthorizedCount: 0
  };
}

export function evaluateSessionStatus(
  current: HeartbeatStatus,
  statusCode: number
): HeartbeatStatus {
  const isUnauthorized = isUnauthorizedStatusCode(statusCode);
  return {
    ...current,
    lastChecked: Date.now(),
    statusCode,
    isExpired: isUnauthorized,
    unauthorizedCount: isUnauthorized ? current.unauthorizedCount + 1 : current.unauthorizedCount
  };
}

export function buildHeartbeatScript(): string {
  return `
    (() => {
      if (window.__QASWITCH_HEARTBEAT_ATTACHED__) return;
      window.__QASWITCH_HEARTBEAT_ATTACHED__ = true;

      // 1. Intercept window.fetch
      const origFetch = window.fetch;
      window.fetch = async function(...args) {
        try {
          const response = await origFetch.apply(this, args);
          if (response.status === 401 || response.status === 403) {
            window.dispatchEvent(new CustomEvent('qaswitch:heartbeat_status', {
              detail: { status: response.status, url: response.url, timestamp: Date.now() }
            }));
          }
          return response;
        } catch (err) {
          throw err;
        }
      };

      // 2. Intercept XMLHttpRequest
      const origOpen = XMLHttpRequest.prototype.open;
      const origSend = XMLHttpRequest.prototype.send;
      XMLHttpRequest.prototype.open = function(method, url) {
        this.__qaswitch_url = url;
        return origOpen.apply(this, arguments);
      };
      XMLHttpRequest.prototype.send = function() {
        this.addEventListener('load', function() {
          if (this.status === 401 || this.status === 403) {
            window.dispatchEvent(new CustomEvent('qaswitch:heartbeat_status', {
              detail: { status: this.status, url: this.__qaswitch_url, timestamp: Date.now() }
            }));
          }
        });
        return origSend.apply(this, arguments);
      };
    })();
  `;
}

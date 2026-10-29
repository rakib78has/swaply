/**
 * Service Worker & PWA Cache Inspector Engine
 * Inspects active Service Worker registrations, CacheStorage buckets, and provides 1-click cache purges.
 */

import type {
  ServiceWorkerInfo,
  CacheBucketInfo,
  PwaAuditReport,
} from '../types/index.ts';

/**
 * Normalizes raw worker list into ServiceWorkerInfo objects.
 */
export function parseServiceWorkerRegistration(rawList: unknown[]): ServiceWorkerInfo[] {
  if (!Array.isArray(rawList)) return [];

  const results: ServiceWorkerInfo[] = [];
  for (const item of rawList) {
    if (!item || typeof item !== 'object') continue;
    const obj = item as Record<string, unknown>;

    results.push({
      scope: String(obj.scope || '/'),
      scriptURL: String(obj.scriptURL || ''),
      state: ['installing', 'waiting', 'active', 'redundant'].includes(obj.state as string)
        ? (obj.state as ServiceWorkerInfo['state'])
        : 'active',
    });
  }

  return results;
}

/**
 * Formats PWA audit report into markdown.
 */
export function formatPwaReportMarkdown(report: PwaAuditReport): string {
  const lines = [
    `# ⚡ QASwitch PWA & Service Worker Audit`,
    `**Timestamp:** ${new Date(report.timestamp).toISOString()}`,
    `**Service Worker Active:** ${report.hasServiceWorker ? '🟢 YES' : '⚪ NO'}`,
    `**CacheStorage Buckets:** ${report.caches.length}`,
    '',
    '### Active Service Workers',
  ];

  if (report.workers.length === 0) {
    lines.push('_No service workers registered for current origin._');
  } else {
    lines.push('| Scope | Script URL | State |', '| --- | --- | --- |');
    for (const w of report.workers) {
      lines.push(`| \`${w.scope}\` | \`${w.scriptURL}\` | **${w.state.toUpperCase()}** |`);
    }
  }

  lines.push('', '### CacheStorage Buckets');
  if (report.caches.length === 0) {
    lines.push('_No caches found in CacheStorage._');
  } else {
    lines.push('| Cache Bucket Name | Cached Entries |', '| --- | --- |');
    for (const c of report.caches) {
      lines.push(`| \`${c.name}\` | ${c.itemCount} |`);
    }
  }

  return lines.join('\n');
}

/**
 * Builds the in-page client script that inspects ServiceWorker and CacheStorage.
 */
export function buildPwaInspectorScript(): string {
  return `
    (async () => {
      const workers = [];
      const cachesList = [];

      // 1. Inspect Service Workers
      if ('serviceWorker' in navigator) {
        try {
          const regs = await navigator.serviceWorker.getRegistrations();
          for (const r of regs) {
            const sw = r.active || r.waiting || r.installing;
            if (sw) {
              workers.push({
                scope: r.scope,
                scriptURL: sw.scriptURL,
                state: sw.state
              });
            }
          }
        } catch(e) {}
      }

      // 2. Inspect CacheStorage
      if ('caches' in window) {
        try {
          const keys = await caches.keys();
          for (const k of keys) {
            const cache = await caches.open(k);
            const reqs = await cache.keys();
            cachesList.push({
              name: k,
              itemCount: reqs.length
            });
          }
        } catch(e) {}
      }

      return {
        hasServiceWorker: workers.length > 0,
        workers: workers,
        caches: cachesList,
        timestamp: Date.now()
      };
    })();
  `;
}

/**
 * Builds script to clear all CacheStorage buckets.
 */
export function buildPwaClearCachesScript(): string {
  return `
    (async () => {
      let count = 0;
      if ('caches' in window) {
        const keys = await caches.keys();
        for (const k of keys) {
          await caches.delete(k);
          count++;
        }
      }
      return count;
    })();
  `;
}

/**
 * Builds script to unregister all service workers.
 */
export function buildPwaUnregisterWorkerScript(): string {
  return `
    (async () => {
      let count = 0;
      if ('serviceWorker' in navigator) {
        const regs = await navigator.serviceWorker.getRegistrations();
        for (const r of regs) {
          await r.unregister();
          count++;
        }
      }
      return count;
    })();
  `;
}

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  parseServiceWorkerRegistration,
  formatPwaReportMarkdown,
  buildPwaInspectorScript,
  buildPwaClearCachesScript,
  buildPwaUnregisterWorkerScript,
} from '../src/core/serviceWorkerEngine.ts';
import type { PwaAuditReport } from '../src/types/index.ts';

describe('Service Worker & PWA Cache Inspector Engine Tests', () => {
  test('should parse and normalize raw service worker registrations', () => {
    const raw = [
      { scope: '/app/', scriptURL: 'https://example.com/sw.js', state: 'active' },
      { scope: '/admin/', scriptURL: 'https://example.com/admin-sw.js', state: 'waiting' },
      { invalid: true },
      null,
    ];

    const parsed = parseServiceWorkerRegistration(raw);
    assert.equal(parsed.length, 3);
    assert.equal(parsed[0].scope, '/app/');
    assert.equal(parsed[0].state, 'active');
    assert.equal(parsed[1].state, 'waiting');
    assert.equal(parsed[2].scope, '/');
  });

  test('should handle empty or malformed inputs gracefully in parser', () => {
    assert.deepEqual(parseServiceWorkerRegistration([]), []);
    assert.deepEqual(parseServiceWorkerRegistration(null as unknown as unknown[]), []);
  });

  test('should format markdown report with worker states and cache bucket counts', () => {
    const report: PwaAuditReport = {
      hasServiceWorker: true,
      timestamp: 1700000000000,
      workers: [
        { scope: 'https://example.com/', scriptURL: 'https://example.com/worker.js', state: 'active' },
      ],
      caches: [
        { name: 'v1-assets', itemCount: 42 },
        { name: 'api-cache', itemCount: 15 },
      ],
    };

    const md = formatPwaReportMarkdown(report);
    assert.ok(md.includes('🟢 YES'));
    assert.ok(md.includes('ACTIVE'));
    assert.ok(md.includes('v1-assets'));
    assert.ok(md.includes('42'));
    assert.ok(md.includes('api-cache'));
  });

  test('should format markdown correctly when no workers or caches exist', () => {
    const emptyReport: PwaAuditReport = {
      hasServiceWorker: false,
      timestamp: 1700000000000,
      workers: [],
      caches: [],
    };

    const md = formatPwaReportMarkdown(emptyReport);
    assert.ok(md.includes('⚪ NO'));
    assert.ok(md.includes('No service workers registered'));
    assert.ok(md.includes('No caches found'));
  });

  test('should generate client inspection, clear caches, and unregister scripts', () => {
    const inspectScript = buildPwaInspectorScript();
    assert.ok(inspectScript.includes('navigator.serviceWorker.getRegistrations'));
    assert.ok(inspectScript.includes('caches.keys'));

    const clearScript = buildPwaClearCachesScript();
    assert.ok(clearScript.includes('caches.delete'));

    const unregScript = buildPwaUnregisterWorkerScript();
    assert.ok(unregScript.includes('.unregister()'));
  });
});

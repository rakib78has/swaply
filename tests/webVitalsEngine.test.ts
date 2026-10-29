import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  rateMetric,
  calculatePerformanceScore,
  formatPerformanceReportMarkdown,
  buildWebVitalsCollectorScript,
} from '../src/core/webVitalsEngine.ts';
import type { PerformanceBudgetReport, WebVitalMetric } from '../src/types/index.ts';

describe('Core Web Vitals & Performance Budget Tests', () => {
  test('should rate LCP, CLS, INP, and TTFB accurately against Google thresholds', () => {
    // LCP
    assert.equal(rateMetric('LCP', 1800), 'good');
    assert.equal(rateMetric('LCP', 3200), 'needs-improvement');
    assert.equal(rateMetric('LCP', 4500), 'poor');

    // CLS
    assert.equal(rateMetric('CLS', 0.05), 'good');
    assert.equal(rateMetric('CLS', 0.15), 'needs-improvement');
    assert.equal(rateMetric('CLS', 0.35), 'poor');

    // TTFB
    assert.equal(rateMetric('TTFB', 400), 'good');
    assert.equal(rateMetric('TTFB', 1200), 'needs-improvement');
    assert.equal(rateMetric('TTFB', 2200), 'poor');
  });

  test('should calculate weighted performance score', () => {
    const perfectMetrics: WebVitalMetric[] = [
      { name: 'LCP', value: 1200, unit: 'ms', rating: 'good' },
      { name: 'CLS', value: 0.01, unit: '', rating: 'good' },
      { name: 'TTFB', value: 200, unit: 'ms', rating: 'good' },
    ];
    assert.equal(calculatePerformanceScore(perfectMetrics), 100);

    const mixedMetrics: WebVitalMetric[] = [
      { name: 'LCP', value: 4500, unit: 'ms', rating: 'poor' }, // 25
      { name: 'CLS', value: 0.01, unit: '', rating: 'good' }, // 100
    ];
    // (25 + 100) / 2 = 62.5 -> 63
    assert.equal(calculatePerformanceScore(mixedMetrics), 63);
  });

  test('should format structured markdown performance report', () => {
    const report: PerformanceBudgetReport = {
      timestamp: 1700000000000,
      url: 'https://staging.app.io/dashboard',
      roleName: 'Tenant Super Admin',
      score: 85,
      metrics: [
        { name: 'LCP', value: 1800, unit: 'ms', rating: 'good' },
        { name: 'CLS', value: 0.15, unit: '', rating: 'needs-improvement' },
      ],
      memoryHeapMB: 34.5,
    };

    const md = formatPerformanceReportMarkdown(report);
    assert.ok(md.includes('Performance & Web Vitals Audit'));
    assert.ok(md.includes('Tenant Super Admin'));
    assert.ok(md.includes('34.5 MB'));
    assert.ok(md.includes('🟢 Good'));
    assert.ok(md.includes('🟡 Needs Improvement'));
  });

  test('should generate in-page performance observer script', () => {
    const script = buildWebVitalsCollectorScript();
    assert.ok(script.includes("performance.getEntriesByType('navigation')"));
    assert.ok(script.includes('TTFB'));
    assert.ok(script.includes('FCP'));
  });
});

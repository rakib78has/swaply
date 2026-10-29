/**
 * Core Web Vitals & Performance Budget Profiler Engine
 * Collects LCP, INP, CLS, TTFB, and memory metrics according to Google Web Vitals specifications.
 */

import type {
  WebVitalMetric,
  MetricRating,
  PerformanceBudgetReport,
} from '../types/index.ts';

/**
 * Rates a Web Vital metric according to official thresholds.
 */
export function rateMetric(
  name: 'LCP' | 'INP' | 'CLS' | 'FID' | 'TTFB' | 'FCP',
  value: number
): MetricRating {
  switch (name) {
    case 'LCP': // ms
      if (value <= 2500) return 'good';
      if (value <= 4000) return 'needs-improvement';
      return 'poor';
    case 'CLS': // unitless ratio
      if (value <= 0.1) return 'good';
      if (value <= 0.25) return 'needs-improvement';
      return 'poor';
    case 'INP': // ms
      if (value <= 200) return 'good';
      if (value <= 500) return 'needs-improvement';
      return 'poor';
    case 'FID': // ms
      if (value <= 100) return 'good';
      if (value <= 300) return 'needs-improvement';
      return 'poor';
    case 'TTFB': // ms
      if (value <= 800) return 'good';
      if (value <= 1800) return 'needs-improvement';
      return 'poor';
    case 'FCP': // ms
      if (value <= 1800) return 'good';
      if (value <= 3000) return 'needs-improvement';
      return 'poor';
    default:
      return 'good';
  }
}

/**
 * Calculates a weighted performance score (0 - 100).
 */
export function calculatePerformanceScore(metrics: WebVitalMetric[]): number {
  if (!metrics || metrics.length === 0) return 100;

  let totalPoints = 0;
  for (const m of metrics) {
    if (m.rating === 'good') totalPoints += 100;
    else if (m.rating === 'needs-improvement') totalPoints += 60;
    else totalPoints += 25;
  }

  return Math.round(totalPoints / metrics.length);
}

/**
 * Formats a performance audit into markdown table format.
 */
export function formatPerformanceReportMarkdown(report: PerformanceBudgetReport): string {
  const lines = [
    `# ⚡ QASwitch Performance & Web Vitals Audit`,
    `**URL:** ${report.url}`,
    `**Role Profile:** ${report.roleName || 'Active Session'}`,
    `**Score:** ${report.score} / 100`,
    `**Timestamp:** ${new Date(report.timestamp).toISOString()}`,
    report.memoryHeapMB ? `**Memory Heap:** ${report.memoryHeapMB} MB` : '',
    '',
    '| Metric | Value | Threshold Rating |',
    '| --- | --- | --- |',
  ];

  for (const m of report.metrics) {
    const icon = m.rating === 'good' ? '🟢 Good' : m.rating === 'needs-improvement' ? '🟡 Needs Improvement' : '🔴 Poor';
    lines.push(`| **${m.name}** | ${m.value}${m.unit} | ${icon} |`);
  }

  return lines.filter(Boolean).join('\n');
}

/**
 * Builds the in-page performance data collector script.
 */
export function buildWebVitalsCollectorScript(): string {
  return `
    (() => {
      const metrics = [];
      const navEntry = performance.getEntriesByType('navigation')[0];
      const paintEntries = performance.getEntriesByType('paint');

      // 1. TTFB (Time to First Byte)
      if (navEntry) {
        const ttfb = Math.round(navEntry.responseStart - navEntry.requestStart);
        metrics.push({
          name: 'TTFB',
          value: Math.max(0, ttfb),
          unit: 'ms',
          rating: ttfb <= 800 ? 'good' : (ttfb <= 1800 ? 'needs-improvement' : 'poor')
        });
      }

      // 2. FCP (First Contentful Paint)
      const fcpEntry = paintEntries.find(p => p.name === 'first-contentful-paint');
      if (fcpEntry) {
        const fcp = Math.round(fcpEntry.startTime);
        metrics.push({
          name: 'FCP',
          value: fcp,
          unit: 'ms',
          rating: fcp <= 1800 ? 'good' : (fcp <= 3000 ? 'needs-improvement' : 'poor')
        });
      }

      // 3. Memory Heap (Chrome only)
      let memoryHeapMB = undefined;
      if (performance.memory) {
        memoryHeapMB = Math.round((performance.memory.usedJSHeapSize / (1024 * 1024)) * 100) / 100;
      }

      return {
        url: window.location.href,
        timestamp: Date.now(),
        metrics,
        memoryHeapMB
      };
    })();
  `;
}

/**
 * Network Waterfall & Heavy Asset Heatmap Engine
 * Analyzes in-page resource timing entries, flags bottlenecks (heavy JS, uncompressed images, slow TTFB), and scores performance.
 */

import type {
  ResourceCategory,
  WaterfallItem,
  WaterfallReport,
} from '../types/index.ts';

export function categorizeResource(initiatorType = '', url = ''): ResourceCategory {
  const init = initiatorType.toLowerCase();
  const u = url.toLowerCase();

  if (init === 'script' || u.endsWith('.js') || u.includes('.js?')) {
    return 'script';
  }
  if (init === 'css' || init === 'link' || u.endsWith('.css') || u.includes('.css?')) {
    return 'stylesheet';
  }
  if (
    init === 'img' ||
    init === 'image' ||
    /\.(png|jpe?g|gif|webp|svg|avif|ico)(\?.*)?$/i.test(u)
  ) {
    return 'image';
  }
  if (u.endsWith('.woff') || u.endsWith('.woff2') || u.endsWith('.ttf') || u.endsWith('.otf')) {
    return 'font';
  }
  if (init === 'fetch' || init === 'xmlhttprequest') {
    return 'fetch';
  }

  return 'other';
}

export function identifyBottlenecks(
  durationMs: number,
  transferBytes: number,
  ttfbMs: number,
  category: ResourceCategory
): { isBottleneck: boolean; reason?: string } {
  // 1. Heavy uncompressed image > 1MB
  if (category === 'image' && transferBytes > 1024 * 1024) {
    return {
      isBottleneck: true,
      reason: `Heavy uncompressed image (${Math.round(transferBytes / 1024)} KB > 1000 KB)`,
    };
  }

  // 2. Large JS script bundle > 500KB
  if (category === 'script' && transferBytes > 500 * 1024) {
    return {
      isBottleneck: true,
      reason: `Large script bundle (${Math.round(transferBytes / 1024)} KB > 500 KB)`,
    };
  }

  // 3. Excessive response delay / slow TTFB > 1000ms
  if (ttfbMs > 1000) {
    return {
      isBottleneck: true,
      reason: `Slow backend TTFB (${Math.round(ttfbMs)}ms > 1000ms)`,
    };
  }

  // 4. Very high overall latency > 2500ms
  if (durationMs > 2500) {
    return {
      isBottleneck: true,
      reason: `High request latency (${Math.round(durationMs)}ms > 2500ms)`,
    };
  }

  return { isBottleneck: false };
}

export function calculateOptimizationScore(totalBytes: number, bottleneckCount: number): number {
  let score = 100;

  // Deduct for bottlenecks
  score -= bottleneckCount * 12;

  // Deduct for excessive overall payload
  if (totalBytes > 5 * 1024 * 1024) {
    score -= 25; // > 5MB
  } else if (totalBytes > 2 * 1024 * 1024) {
    score -= 10; // > 2MB
  }

  return Math.max(0, Math.min(100, score));
}

export function formatWaterfallReportMarkdown(report: WaterfallReport): string {
  const lines = [
    `# 📊 QASwitch Network Waterfall & Asset Heatmap`,
    `**URL:** ${report.url}`,
    `**Score:** ${report.score} / 100`,
    `**Total Transferred:** ${Math.round((report.totalTransferBytes / 1024) * 10) / 10} KB`,
    `**Bottlenecks Flagged:** ${report.bottleneckCount}`,
    '',
    '| Resource URL | Category | Duration | Size | Bottleneck Status |',
    '| --- | --- | --- | --- | --- |',
  ];

  for (const item of report.items) {
    const status = item.isBottleneck
      ? `🔴 ${item.bottleneckReason || 'Bottleneck'}`
      : '🟢 Optimal';
    const displaySize = item.transferSizeBytes > 0
      ? `${Math.round(item.transferSizeBytes / 1024)} KB`
      : 'Cached';

    // Shorten URL for display
    const shortUrl = item.name.length > 50 ? item.name.slice(0, 47) + '...' : item.name;
    lines.push(`| \`${shortUrl}\` | ${item.category} | ${Math.round(item.durationMs)}ms | ${displaySize} | ${status} |`);
  }

  return lines.join('\n');
}

export function buildWaterfallCollectorScript(): string {
  return `
    (() => {
      const entries = performance.getEntriesByType('resource');
      const items = [];
      let totalBytes = 0;
      let maxDuration = 0;
      let bottlenecks = 0;

      function getCategory(init, url) {
        const u = url.toLowerCase();
        if (init === 'script' || u.includes('.js')) return 'script';
        if (init === 'css' || init === 'link' || u.includes('.css')) return 'stylesheet';
        if (init === 'img' || /\\.(png|jpe?g|gif|webp|svg|ico)/i.test(u)) return 'image';
        if (u.includes('.woff') || u.includes('.ttf')) return 'font';
        if (init === 'fetch' || init === 'xmlhttprequest') return 'fetch';
        return 'other';
      }

      function checkBottleneck(dur, bytes, ttfb, cat) {
        if (cat === 'image' && bytes > 1024 * 1024) return { isBottleneck: true, reason: 'Image > 1MB' };
        if (cat === 'script' && bytes > 500 * 1024) return { isBottleneck: true, reason: 'Script > 500KB' };
        if (ttfb > 1000) return { isBottleneck: true, reason: 'TTFB > 1000ms' };
        if (dur > 2500) return { isBottleneck: true, reason: 'Duration > 2.5s' };
        return { isBottleneck: false };
      }

      for (const e of entries) {
        const cat = getCategory(e.initiatorType, e.name);
        const bytes = e.transferSize || 0;
        const dur = Math.round(e.duration);
        const ttfb = Math.round(e.responseStart ? (e.responseStart - e.requestStart) : 0);

        totalBytes += bytes;
        if (dur > maxDuration) maxDuration = dur;

        const bCheck = checkBottleneck(dur, bytes, ttfb, cat);
        if (bCheck.isBottleneck) bottlenecks++;

        items.push({
          name: e.name,
          category: cat,
          durationMs: dur,
          transferSizeBytes: bytes,
          ttfbMs: ttfb,
          isBottleneck: bCheck.isBottleneck,
          bottleneckReason: bCheck.reason
        });
      }

      let score = 100 - (bottlenecks * 12);
      if (totalBytes > 5 * 1024 * 1024) score -= 25;
      else if (totalBytes > 2 * 1024 * 1024) score -= 10;
      score = Math.max(0, Math.min(100, score));

      return {
        timestamp: Date.now(),
        url: window.location.href,
        totalTransferBytes: totalBytes,
        totalDurationMs: maxDuration,
        bottleneckCount: bottlenecks,
        score: score,
        items: items.slice(-50)
      };
    })();
  `;
}

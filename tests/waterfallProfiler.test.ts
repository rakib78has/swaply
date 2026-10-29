import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  categorizeResource,
  identifyBottlenecks,
  calculateOptimizationScore,
  formatWaterfallReportMarkdown,
  buildWaterfallCollectorScript,
} from '../src/core/waterfallProfiler.ts';
import type { WaterfallReport } from '../src/types/index.ts';

describe('Network Waterfall & Heavy Asset Heatmap Tests', () => {
  test('should categorize network resources correctly based on initiator and extension', () => {
    assert.equal(categorizeResource('script', 'https://example.com/bundle.js'), 'script');
    assert.equal(categorizeResource('link', 'https://example.com/styles.css'), 'stylesheet');
    assert.equal(categorizeResource('img', 'https://example.com/hero.png'), 'image');
    assert.equal(categorizeResource('', 'https://example.com/photo.webp'), 'image');
    assert.equal(categorizeResource('', 'https://example.com/font.woff2'), 'font');
    assert.equal(categorizeResource('fetch', 'https://example.com/api/users'), 'fetch');
    assert.equal(categorizeResource('other', 'https://example.com/unknown.bin'), 'other');
  });

  test('should flag bottlenecks for heavy images, oversized JS bundles, and slow TTFB', () => {
    // Heavy image (>1MB)
    const heavyImg = identifyBottlenecks(500, 1.5 * 1024 * 1024, 100, 'image');
    assert.equal(heavyImg.isBottleneck, true);
    assert.ok(heavyImg.reason?.includes('Heavy uncompressed image'));

    // Oversized script (>500KB)
    const heavyJs = identifyBottlenecks(400, 600 * 1024, 80, 'script');
    assert.equal(heavyJs.isBottleneck, true);
    assert.ok(heavyJs.reason?.includes('Large script bundle'));

    // Slow TTFB (>1000ms)
    const slowTtfb = identifyBottlenecks(1200, 20 * 1024, 1100, 'fetch');
    assert.equal(slowTtfb.isBottleneck, true);
    assert.ok(slowTtfb.reason?.includes('Slow backend TTFB'));

    // Optimal asset
    const optimal = identifyBottlenecks(150, 40 * 1024, 50, 'script');
    assert.equal(optimal.isBottleneck, false);
  });

  test('should calculate optimization score penalized by bottlenecks and total payload', () => {
    // Clean, small site
    const perfectScore = calculateOptimizationScore(500 * 1024, 0);
    assert.equal(perfectScore, 100);

    // 2 bottlenecks
    const penalScore = calculateOptimizationScore(1024 * 1024, 2);
    assert.equal(penalScore, 76); // 100 - (2 * 12) = 76

    // Heavy payload > 5MB + 3 bottlenecks
    const heavyScore = calculateOptimizationScore(6 * 1024 * 1024, 3);
    assert.equal(heavyScore, 39); // 100 - (3 * 12) - 25 = 39
  });

  test('should format structured waterfall markdown report', () => {
    const report: WaterfallReport = {
      timestamp: 1700000000000,
      url: 'https://example.com',
      totalTransferBytes: 1500 * 1024,
      totalDurationMs: 800,
      bottleneckCount: 1,
      score: 88,
      items: [
        {
          name: 'https://example.com/app.js',
          category: 'script',
          durationMs: 450,
          transferSizeBytes: 200 * 1024,
          ttfbMs: 60,
          isBottleneck: false,
        },
        {
          name: 'https://example.com/hero-huge.png',
          category: 'image',
          durationMs: 800,
          transferSizeBytes: 1300 * 1024,
          ttfbMs: 80,
          isBottleneck: true,
          bottleneckReason: 'Heavy image > 1MB',
        },
      ],
    };

    const md = formatWaterfallReportMarkdown(report);
    assert.ok(md.includes('Score:** 88 / 100'));
    assert.ok(md.includes('Bottlenecks Flagged:** 1'));
    assert.ok(md.includes('app.js'));
    assert.ok(md.includes('hero-huge.png'));
    assert.ok(md.includes('Heavy image > 1MB'));
  });

  test('should generate valid performance collector script', () => {
    const script = buildWaterfallCollectorScript();
    assert.ok(script.includes("performance.getEntriesByType('resource')"));
    assert.ok(script.includes('bottleneckCount'));
    assert.ok(script.includes('transferSizeBytes'));
  });
});

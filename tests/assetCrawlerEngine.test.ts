import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  isMixedContent,
  validateAssetUrl,
  formatCrawlReportMarkdown,
  buildAssetCrawlerScript,
  buildAssetCrawlerCleanupScript,
} from '../src/core/assetCrawlerEngine.ts';
import type { AssetCrawlReport } from '../src/types/index.ts';

describe('Dead Links & Broken Asset Crawler Engine Tests', () => {
  test('should detect insecure HTTP mixed content on HTTPS pages', () => {
    assert.equal(isMixedContent('https://app.example.com', 'http://cdn.example.com/logo.png'), true);
    assert.equal(isMixedContent('https://app.example.com', 'https://cdn.example.com/logo.png'), false);
    assert.equal(isMixedContent('http://app.example.com', 'http://cdn.example.com/logo.png'), false);
    assert.equal(isMixedContent('invalid-url', 'http://cdn.example.com'), false);
  });

  test('should validate and resolve relative asset URLs safely', () => {
    const base = 'https://app.example.com/dashboard/home';
    assert.equal(validateAssetUrl('/static/bundle.js', base), 'https://app.example.com/static/bundle.js');
    assert.equal(validateAssetUrl('../images/logo.png', base), 'https://app.example.com/images/logo.png');
    assert.equal(validateAssetUrl('https://external.com/style.css', base), 'https://external.com/style.css');

    // Should ignore non-navigable protocols and fragments
    assert.equal(validateAssetUrl('javascript:void(0)', base), null);
    assert.equal(validateAssetUrl('data:image/png;base64,123', base), null);
    assert.equal(validateAssetUrl('blob:https://app.example.com/123', base), null);
    assert.equal(validateAssetUrl('#section2', base), null);
    assert.equal(validateAssetUrl('mailto:qa@example.com', base), null);
    assert.equal(validateAssetUrl('', base), null);
  });

  test('should format markdown crawl report for clean and broken assets', () => {
    const cleanReport: AssetCrawlReport = {
      timestamp: 1700000000000,
      url: 'https://example.com',
      totalScanned: 12,
      brokenCount: 0,
      mixedContentCount: 0,
      assets: [],
    };
    const cleanMd = formatCrawlReportMarkdown(cleanReport);
    assert.ok(cleanMd.includes('🟢 All Clear'));
    assert.ok(cleanMd.includes('Total Scanned:** 12'));

    const brokenReport: AssetCrawlReport = {
      timestamp: 1700000000000,
      url: 'https://example.com',
      totalScanned: 5,
      brokenCount: 1,
      mixedContentCount: 1,
      assets: [
        {
          url: 'http://example.com/insecure.png',
          type: 'IMAGE',
          elementSelector: '#hero-img',
          status: 404,
          isBroken: true,
          isMixedContent: true,
        },
      ],
    };
    const brokenMd = formatCrawlReportMarkdown(brokenReport);
    assert.ok(brokenMd.includes('🔴 BROKEN (404)'));
    assert.ok(brokenMd.includes('⚠️ INSECURE HTTP'));
    assert.ok(brokenMd.includes('#hero-img'));
  });

  test('should generate client-side crawler and cleanup scripts', () => {
    const crawlerScript = buildAssetCrawlerScript();
    assert.ok(crawlerScript.includes('querySelectorAll'));
    assert.ok(crawlerScript.includes('HTMLImageElement'));
    assert.ok(crawlerScript.includes('naturalWidth'));

    const cleanupScript = buildAssetCrawlerCleanupScript();
    assert.ok(cleanupScript.includes('__qaswitch_broken_asset__'));
  });
});

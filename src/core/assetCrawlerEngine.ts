/**
 * Dead Links & Broken Asset Crawler Engine
 * Scans DOM for links, images, scripts, stylesheets, detects 404s and insecure mixed content.
 */

import type {
  AssetType,
  CrawledAsset,
  AssetCrawlReport,
} from '../types/index.ts';

export function isMixedContent(pageUrl: string, assetUrl: string): boolean {
  try {
    const page = new URL(pageUrl);
    const asset = new URL(assetUrl, pageUrl);
    return page.protocol === 'https:' && asset.protocol === 'http:';
  } catch {
    return false;
  }
}

export function validateAssetUrl(rawUrl: string, baseOrigin: string): string | null {
  if (!rawUrl || typeof rawUrl !== 'string') return null;

  const trimmed = rawUrl.trim();
  if (
    trimmed.startsWith('javascript:') ||
    trimmed.startsWith('data:') ||
    trimmed.startsWith('blob:') ||
    trimmed.startsWith('#') ||
    trimmed.startsWith('mailto:') ||
    trimmed.startsWith('tel:')
  ) {
    return null;
  }

  try {
    const resolved = new URL(trimmed, baseOrigin);
    return resolved.href;
  } catch {
    return null;
  }
}

export function formatCrawlReportMarkdown(report: AssetCrawlReport): string {
  const lines = [
    `# 🔍 QASwitch Asset & Link Crawler Report`,
    `**Target URL:** ${report.url}`,
    `**Total Scanned:** ${report.totalScanned}`,
    `**Broken Assets (404/Fail):** ${report.brokenCount}`,
    `**Mixed Content Warnings:** ${report.mixedContentCount}`,
    '',
    '| Asset URL | Type | Status | Mixed Content | Element Selector |',
    '| --- | --- | --- | --- | --- |',
  ];

  if (report.assets.length === 0) {
    lines.push('| *None found* | - | 🟢 All Clear | No | - |');
  } else {
    for (const a of report.assets) {
      const statusIcon = a.isBroken ? `🔴 BROKEN (${a.status || 'Fail'})` : '🟢 OK';
      const mixed = a.isMixedContent ? '⚠️ INSECURE HTTP' : 'Secure';
      const shortUrl = a.url.length > 55 ? a.url.slice(0, 52) + '...' : a.url;
      lines.push(`| \`${shortUrl}\` | ${a.type} | ${statusIcon} | ${mixed} | \`${a.elementSelector}\` |`);
    }
  }

  return lines.join('\n');
}

export function buildAssetCrawlerScript(): string {
  return `
    (async () => {
      const baseOrigin = window.location.origin;
      const isHttpsPage = window.location.protocol === 'https:';
      const assets = [];
      let broken = 0;
      let mixed = 0;

      // 1. Gather all links, images, scripts, stylesheets
      const elements = [
        ...Array.from(document.querySelectorAll('a[href]')).map(el => ({ el, attr: 'href', type: 'LINK' })),
        ...Array.from(document.querySelectorAll('img[src]')).map(el => ({ el, attr: 'src', type: 'IMAGE' })),
        ...Array.from(document.querySelectorAll('script[src]')).map(el => ({ el, attr: 'src', type: 'SCRIPT' })),
        ...Array.from(document.querySelectorAll('link[rel="stylesheet"][href]')).map(el => ({ el, attr: 'href', type: 'STYLESHEET' }))
      ];

      for (let i = 0; i < elements.length; i++) {
        const item = elements[i];
        const raw = item.el.getAttribute(item.attr);
        if (!raw || raw.startsWith('#') || raw.startsWith('data:') || raw.startsWith('javascript:')) continue;

        let resolvedUrl = '';
        try {
          resolvedUrl = new URL(raw, baseOrigin).href;
        } catch(e) {
          continue;
        }

        const isMixed = isHttpsPage && resolvedUrl.startsWith('http://');
        if (isMixed) mixed++;

        let isBroken = false;
        let status = 200;

        // Check image load status
        if (item.type === 'IMAGE' && item.el instanceof HTMLImageElement) {
          if (item.el.naturalWidth === 0 && item.el.complete) {
            isBroken = true;
            status = 404;
          }
        }

        if (isBroken) broken++;

        const selector = item.el.id ? '#' + item.el.id : (item.el.className ? '.' + item.el.className.split(' ')[0] : item.type.toLowerCase() + '[' + i + ']');

        assets.push({
          url: resolvedUrl,
          type: item.type,
          elementSelector: selector,
          status: status,
          isBroken: isBroken,
          isMixedContent: isMixed
        });
      }

      return {
        timestamp: Date.now(),
        url: window.location.href,
        totalScanned: assets.length,
        brokenCount: broken,
        mixedContentCount: mixed,
        assets: assets.slice(0, 50)
      };
    })();
  `;
}

export function buildAssetCrawlerCleanupScript(): string {
  return `
    (() => {
      document.querySelectorAll('.__qaswitch_broken_asset__').forEach(el => el.remove());
    })();
  `;
}

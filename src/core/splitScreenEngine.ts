/**
 * Multi-Role Split-Screen Dual Role Runner Engine
 * Coordinates side-by-side or stacked multi-role live viewport sessions with synchronized scrolling & navigation.
 */

import type { SplitScreenConfig, SplitScreenOrientation } from '../types/index.ts';

export function buildSplitScreenConfig(
  leftProfileId: string,
  rightProfileId: string,
  options?: Partial<SplitScreenConfig>
): SplitScreenConfig {
  return {
    leftProfileId,
    rightProfileId,
    orientation: options?.orientation || 'side-by-side',
    targetUrl: options?.targetUrl || 'about:blank',
    syncScroll: options?.syncScroll ?? false,
    syncNavigation: options?.syncNavigation ?? false,
  };
}

export function buildSplitRunnerUrl(
  leftProfileId: string,
  rightProfileId: string,
  targetUrl: string,
  orientation: SplitScreenOrientation = 'side-by-side',
  syncScroll = false
): string {
  const params = new URLSearchParams({
    left: leftProfileId,
    right: rightProfileId,
    url: targetUrl,
    orientation,
    syncScroll: String(syncScroll),
  });

  return `split-runner.html?${params.toString()}`;
}

export function parseSplitRunnerParams(searchQuery: string): Partial<SplitScreenConfig> {
  const q = searchQuery.startsWith('?') ? searchQuery.slice(1) : searchQuery;
  const params = new URLSearchParams(q);

  return {
    leftProfileId: params.get('left') || '',
    rightProfileId: params.get('right') || '',
    targetUrl: params.get('url') || '',
    orientation: (params.get('orientation') as SplitScreenOrientation) || 'side-by-side',
    syncScroll: params.get('syncScroll') === 'true',
  };
}

export function generateSplitScreenHtml(
  config: SplitScreenConfig,
  leftProfileName: string,
  rightProfileName: string
): string {
  const isStacked = config.orientation === 'stacked';
  const flexDir = isStacked ? 'column' : 'row';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>QASwitch Split-Screen Dual Role Runner</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      background: #0f172a;
      color: #f8fafc;
      height: 100vh;
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }
    header {
      background: #1e293b;
      padding: 8px 16px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-bottom: 1px solid #334155;
      gap: 12px;
    }
    .brand {
      display: flex;
      align-items: center;
      gap: 8px;
      font-weight: 700;
      font-size: 14px;
      color: #38bdf8;
    }
    .controls {
      display: flex;
      align-items: center;
      gap: 8px;
      flex: 1;
      max-width: 600px;
    }
    .url-input {
      flex: 1;
      background: #0f172a;
      border: 1px solid #475569;
      color: #f8fafc;
      padding: 6px 12px;
      border-radius: 6px;
      font-size: 13px;
    }
    .btn {
      background: #3b82f6;
      color: #fff;
      border: none;
      padding: 6px 12px;
      border-radius: 6px;
      cursor: pointer;
      font-weight: 600;
      font-size: 12px;
    }
    .btn:hover { background: #2563eb; }
    .btn-secondary {
      background: #334155;
    }
    .btn-secondary:hover { background: #475569; }
    .split-container {
      display: flex;
      flex-direction: ${flexDir};
      flex: 1;
      overflow: hidden;
      position: relative;
    }
    .pane {
      flex: 1;
      display: flex;
      flex-direction: column;
      border-right: 1px solid #334155;
      border-bottom: 1px solid #334155;
      overflow: hidden;
      position: relative;
    }
    .pane:last-child {
      border-right: none;
      border-bottom: none;
    }
    .pane-header {
      background: #1e293b;
      padding: 6px 12px;
      font-size: 12px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-bottom: 1px solid #334155;
    }
    .role-badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 2px 8px;
      border-radius: 12px;
      font-size: 11px;
      font-weight: 700;
    }
    .badge-left { background: #1e3a8a; color: #93c5fd; }
    .badge-right { background: #581c87; color: #d8b4fe; }
    iframe {
      flex: 1;
      border: none;
      width: 100%;
      height: 100%;
      background: #ffffff;
    }
  </style>
</head>
<body>
  <header>
    <div class="brand">
      <span>⚡ QASwitch Dual Runner</span>
    </div>
    <div class="controls">
      <input type="text" id="commonUrl" class="url-input" value="${escapeHtml(config.targetUrl)}" placeholder="https://example.com" />
      <button id="btnNavigate" class="btn">Navigate Both</button>
      <button id="btnReload" class="btn btn-secondary">Reload</button>
      <button id="btnToggleSync" class="btn btn-secondary">Scroll Sync: OFF</button>
    </div>
  </header>
  <main class="split-container" id="splitContainer">
    <section class="pane" id="paneLeft">
      <div class="pane-header">
        <span class="role-badge badge-left">Role A: ${escapeHtml(leftProfileName)}</span>
        <span class="pane-status" id="leftStatus">Ready</span>
      </div>
      <iframe id="frameLeft" src="${escapeHtml(config.targetUrl)}"></iframe>
    </section>
    <section class="pane" id="paneRight">
      <div class="pane-header">
        <span class="role-badge badge-right">Role B: ${escapeHtml(rightProfileName)}</span>
        <span class="pane-status" id="rightStatus">Ready</span>
      </div>
      <iframe id="frameRight" src="${escapeHtml(config.targetUrl)}"></iframe>
    </section>
  </main>
</body>
</html>`;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

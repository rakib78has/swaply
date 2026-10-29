/**
 * Automated Post-Switch Flow & Action Macro Engine
 * Executes automated page redirections, form fillings, and button clicks immediately after role switching.
 */

import type { ProfileMacro } from '../types/index.ts';

export function resolveTargetUrl(currentUrl: string, autoNavigateUrl?: string): string {
  if (!autoNavigateUrl || typeof autoNavigateUrl !== 'string' || !autoNavigateUrl.trim()) {
    return currentUrl;
  }

  const cleanNav = autoNavigateUrl.trim();

  // If already absolute URL
  if (cleanNav.startsWith('http://') || cleanNav.startsWith('https://')) {
    return cleanNav;
  }

  try {
    const parsed = new URL(currentUrl);
    const path = cleanNav.startsWith('/') ? cleanNav : `/${cleanNav}`;
    return `${parsed.origin}${path}`;
  } catch {
    return currentUrl;
  }
}

export function buildMacroExecutionScript(macro?: ProfileMacro): string {
  if (!macro) return '';

  const delay = typeof macro.delayMs === 'number' && macro.delayMs > 0 ? macro.delayMs : 300;
  const autoFillEntries = macro.autoFillSelectors ? Object.entries(macro.autoFillSelectors) : [];
  const autoClick = macro.autoClickSelector ? JSON.stringify(macro.autoClickSelector) : null;

  return `
    (() => {
      setTimeout(() => {
        // 1. Execute Auto-Fill Selectors
        const entries = ${JSON.stringify(autoFillEntries)};
        for (const [selector, value] of entries) {
          try {
            const input = document.querySelector(selector);
            if (input) {
              input.value = value;
              input.dispatchEvent(new Event('input', { bubbles: true }));
              input.dispatchEvent(new Event('change', { bubbles: true }));
            }
          } catch (e) {}
        }

        // 2. Execute Auto-Click Selector
        const clickTarget = ${autoClick};
        if (clickTarget) {
          try {
            const btn = document.querySelector(clickTarget);
            if (btn) btn.click();
          } catch (e) {}
        }
      }, ${delay});
    })();
  `;
}

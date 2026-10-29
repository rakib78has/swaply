/**
 * CSS Media & a11y Preferences Spoofer Engine
 * Simulates system-level OS preferences in-page (dark mode, reduced motion, high contrast)
 * by intercepting window.matchMedia and applying appropriate DOM/CSS class overrides.
 */

import type { CssPreferenceOverrides } from '../types/index.ts';

export function validateCssPreferences(raw: unknown): CssPreferenceOverrides {
  const defaultPrefs: CssPreferenceOverrides = {
    colorScheme: 'system',
    reducedMotion: 'system',
    contrast: 'system',
    forcedColors: 'system',
    enabled: false,
  };

  if (!raw || typeof raw !== 'object') return defaultPrefs;
  const p = raw as Partial<CssPreferenceOverrides>;

  return {
    colorScheme: ['system', 'light', 'dark'].includes(p.colorScheme as string)
      ? (p.colorScheme as CssPreferenceOverrides['colorScheme'])
      : 'system',
    reducedMotion: ['system', 'reduce', 'no-preference'].includes(p.reducedMotion as string)
      ? (p.reducedMotion as CssPreferenceOverrides['reducedMotion'])
      : 'system',
    contrast: ['system', 'more', 'less', 'no-preference'].includes(p.contrast as string)
      ? (p.contrast as CssPreferenceOverrides['contrast'])
      : 'system',
    forcedColors: ['system', 'active', 'none'].includes(p.forcedColors as string)
      ? (p.forcedColors as CssPreferenceOverrides['forcedColors'])
      : 'system',
    enabled: Boolean(p.enabled),
  };
}

/**
 * Pure evaluation function testing whether a media query matches given preference overrides.
 */
export function evaluateMediaQueryMatch(query: string, prefs: CssPreferenceOverrides): boolean | null {
  const normalized = query.toLowerCase().replace(/\s+/g, ' ');

  const csMatch = normalized.match(/prefers-color-scheme\s*:\s*([a-z-]+)/);
  if (csMatch && prefs.colorScheme && prefs.colorScheme !== 'system') {
    return prefs.colorScheme === csMatch[1];
  }

  const rmMatch = normalized.match(/prefers-reduced-motion\s*:\s*([a-z-]+)/);
  if (rmMatch && prefs.reducedMotion && prefs.reducedMotion !== 'system') {
    return prefs.reducedMotion === rmMatch[1];
  }

  const cMatch = normalized.match(/prefers-contrast\s*:\s*([a-z-]+)/);
  if (cMatch && prefs.contrast && prefs.contrast !== 'system') {
    return prefs.contrast === cMatch[1];
  }

  const fcMatch = normalized.match(/forced-colors\s*:\s*([a-z-]+)/);
  if (fcMatch && prefs.forcedColors && prefs.forcedColors !== 'system') {
    return prefs.forcedColors === fcMatch[1];
  }

  // Not intercepted
  return null;
}

/**
 * Builds the in-page client script that monkey-patches window.matchMedia.
 */
export function buildCssMediaSpoofScript(prefs: CssPreferenceOverrides): string {
  if (!prefs.enabled) {
    return buildCssMediaCleanupScript();
  }

  const serializedPrefs = JSON.stringify(prefs);

  return `
    (() => {
      const prefs = ${serializedPrefs};
      window.__QASWITCH_CSS_PREFS__ = prefs;

      // 1. Update document root attributes & classes for popular frameworks (Tailwind, Radix, MUI)
      if (prefs.colorScheme && prefs.colorScheme !== 'system') {
        document.documentElement.setAttribute('data-color-mode', prefs.colorScheme);
        document.documentElement.setAttribute('data-theme', prefs.colorScheme);
        if (prefs.colorScheme === 'dark') {
          document.documentElement.classList.add('dark');
          document.documentElement.classList.remove('light');
        } else {
          document.documentElement.classList.add('light');
          document.documentElement.classList.remove('dark');
        }
      }

      // 2. Monkey-patch matchMedia
      if (!window.__ORIG_MATCH_MEDIA__) {
        window.__ORIG_MATCH_MEDIA__ = window.matchMedia;
      }

      window.matchMedia = function(query) {
        const originalMql = window.__ORIG_MATCH_MEDIA__.call(window, query);
        const norm = String(query).toLowerCase();

        let overrideMatch = null;
        const cs = norm.match(/prefers-color-scheme\s*:\s*([a-z-]+)/);
        if (cs && prefs.colorScheme && prefs.colorScheme !== 'system') {
          overrideMatch = prefs.colorScheme === cs[1];
        }

        const rm = norm.match(/prefers-reduced-motion\s*:\s*([a-z-]+)/);
        if (rm && prefs.reducedMotion && prefs.reducedMotion !== 'system') {
          overrideMatch = prefs.reducedMotion === rm[1];
        }

        const ct = norm.match(/prefers-contrast\s*:\s*([a-z-]+)/);
        if (ct && prefs.contrast && prefs.contrast !== 'system') {
          overrideMatch = prefs.contrast === ct[1];
        }

        const fc = norm.match(/forced-colors\s*:\s*([a-z-]+)/);
        if (fc && prefs.forcedColors && prefs.forcedColors !== 'system') {
          overrideMatch = prefs.forcedColors === fc[1];
        }

        if (overrideMatch !== null) {
          const proxied = Object.create(originalMql);
          Object.defineProperty(proxied, 'matches', {
            get: () => overrideMatch,
            configurable: true
          });
          return proxied;
        }

        return originalMql;
      };

      // 3. Dispatch preferences change notification
      window.dispatchEvent(new CustomEvent('qaswitch:css_prefs_updated', { detail: prefs }));
    })();
  `;
}

/**
 * Builds cleanup script restoring default matchMedia behavior.
 */
export function buildCssMediaCleanupScript(): string {
  return `
    (() => {
      if (window.__ORIG_MATCH_MEDIA__) {
        window.matchMedia = window.__ORIG_MATCH_MEDIA__;
        delete window.__ORIG_MATCH_MEDIA__;
      }
      delete window.__QASWITCH_CSS_PREFS__;
    })();
  `;
}

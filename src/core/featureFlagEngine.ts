/**
 * Feature Flag & Experiment Override Engine
 * Manages client-side feature flag and A/B test variant overrides without backend redeployments.
 */

import type { FeatureFlagOverride } from '../types/index.ts';

export function parseFeatureFlagOverrides(raw: string): FeatureFlagOverride[] {
  if (!raw || typeof raw !== 'string') return [];

  const lines = raw.split('\n');
  const overrides: FeatureFlagOverride[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    const eqIdx = trimmed.indexOf('=');
    if (eqIdx > 0) {
      const key = trimmed.slice(0, eqIdx).trim();
      const rawVal = trimmed.slice(eqIdx + 1).trim();

      let value: boolean | string | number = rawVal;
      if (rawVal.toLowerCase() === 'true') value = true;
      else if (rawVal.toLowerCase() === 'false') value = false;
      else if (!isNaN(Number(rawVal)) && rawVal !== '') value = Number(rawVal);

      overrides.push({ key, value, enabled: true });
    }
  }

  return overrides;
}

export function formatFeatureFlagOverrides(flags: FeatureFlagOverride[]): string {
  return flags.map((f) => `${f.key}=${f.value}`).join('\n');
}

export function buildFeatureFlagInjectionScript(flags: FeatureFlagOverride[]): string {
  const activeFlags = flags.filter((f) => f.enabled);
  if (activeFlags.length === 0) return '';

  const flagMap: Record<string, unknown> = {};
  for (const f of activeFlags) {
    flagMap[f.key] = f.value;
  }

  return `
    (() => {
      const overrides = ${JSON.stringify(flagMap)};
      
      // 1. Expose to standard global window contexts
      window.__QASWITCH_FLAGS__ = overrides;
      window.__FEATURE_FLAGS__ = Object.assign(window.__FEATURE_FLAGS__ || {}, overrides);

      // 2. Override common local storage flag caches (Statsig / LaunchDarkly)
      try {
        for (const [k, v] of Object.entries(overrides)) {
          window.localStorage.setItem('qaswitch_flag_' + k, JSON.stringify(v));
          window.localStorage.setItem('flag:' + k, String(v));
        }
      } catch (e) {}

      // 3. Dispatch flag change event for reactive single page applications
      window.dispatchEvent(new CustomEvent('qaswitch:flags_updated', { detail: overrides }));
    })();
  `;
}

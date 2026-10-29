import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  validateCssPreferences,
  evaluateMediaQueryMatch,
  buildCssMediaSpoofScript,
  buildCssMediaCleanupScript,
} from '../src/core/cssMediaEngine.ts';

describe('CSS Media & a11y Preferences Spoofer Tests', () => {
  test('should validate and sanitize CSS preferences', () => {
    const raw = {
      colorScheme: 'dark',
      reducedMotion: 'reduce',
      contrast: 'more',
      forcedColors: 'active',
      enabled: true,
    };
    const prefs = validateCssPreferences(raw);
    assert.equal(prefs.colorScheme, 'dark');
    assert.equal(prefs.reducedMotion, 'reduce');
    assert.equal(prefs.contrast, 'more');
    assert.equal(prefs.forcedColors, 'active');
    assert.equal(prefs.enabled, true);

    // Invalid fallback
    const invalid = validateCssPreferences({ colorScheme: 'invalid-val' });
    assert.equal(invalid.colorScheme, 'system');
    assert.equal(invalid.enabled, false);
  });

  test('should evaluate media query matches for preferences accurately', () => {
    const darkPrefs = validateCssPreferences({
      colorScheme: 'dark',
      reducedMotion: 'reduce',
      contrast: 'more',
      forcedColors: 'active',
      enabled: true,
    });

    // Dark scheme
    assert.equal(evaluateMediaQueryMatch('(prefers-color-scheme: dark)', darkPrefs), true);
    assert.equal(evaluateMediaQueryMatch('(prefers-color-scheme: light)', darkPrefs), false);

    // Reduced motion
    assert.equal(evaluateMediaQueryMatch('(prefers-reduced-motion: reduce)', darkPrefs), true);
    assert.equal(evaluateMediaQueryMatch('(prefers-reduced-motion: no-preference)', darkPrefs), false);

    // Contrast
    assert.equal(evaluateMediaQueryMatch('(prefers-contrast: more)', darkPrefs), true);
    assert.equal(evaluateMediaQueryMatch('(prefers-contrast: less)', darkPrefs), false);

    // Forced colors
    assert.equal(evaluateMediaQueryMatch('(forced-colors: active)', darkPrefs), true);
  });

  test('should generate in-page script overriding matchMedia and applying root theme classes', () => {
    const prefs = validateCssPreferences({ colorScheme: 'dark', enabled: true });
    const script = buildCssMediaSpoofScript(prefs);

    assert.ok(script.includes('window.matchMedia = function'));
    assert.ok(script.includes("document.documentElement.classList.add('dark')"));
    assert.ok(script.includes('qaswitch:css_prefs_updated'));
  });

  test('should generate cleanup script restoring original matchMedia', () => {
    const cleanup = buildCssMediaCleanupScript();
    assert.ok(cleanup.includes('window.matchMedia = window.__ORIG_MATCH_MEDIA__'));
  });
});

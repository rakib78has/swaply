import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  parseFeatureFlagOverrides,
  formatFeatureFlagOverrides,
  buildFeatureFlagInjectionScript
} from '../src/core/featureFlagEngine.ts';

describe('Feature Flag Override Engine Tests', () => {
  test('should parse multiline key-value feature flag definitions', () => {
    const raw = `
      # Comment line
      newCheckoutFlow=true
      maxCartItems=25
      themeVariant=dark
      legacyMode=false
    `;

    const flags = parseFeatureFlagOverrides(raw);
    assert.equal(flags.length, 4);

    assert.equal(flags[0].key, 'newCheckoutFlow');
    assert.equal(flags[0].value, true);

    assert.equal(flags[1].key, 'maxCartItems');
    assert.equal(flags[1].value, 25);

    assert.equal(flags[2].key, 'themeVariant');
    assert.equal(flags[2].value, 'dark');

    assert.equal(flags[3].key, 'legacyMode');
    assert.equal(flags[3].value, false);
  });

  test('should format feature flags back to string format', () => {
    const flags = [
      { key: 'betaBanner', value: true, enabled: true },
      { key: 'discountRate', value: 0.15, enabled: true }
    ];
    const formatted = formatFeatureFlagOverrides(flags);
    assert.ok(formatted.includes('betaBanner=true'));
    assert.ok(formatted.includes('discountRate=0.15'));
  });

  test('should generate in-page window and localStorage injection script', () => {
    const flags = [{ key: 'darkMode', value: true, enabled: true }];
    const script = buildFeatureFlagInjectionScript(flags);
    assert.ok(script.includes('window.__FEATURE_FLAGS__'));
    assert.ok(script.includes('darkMode'));
    assert.ok(script.includes('qaswitch:flags_updated'));
  });

  test('should return empty string if no flags are enabled', () => {
    const script = buildFeatureFlagInjectionScript([]);
    assert.equal(script, '');
  });
});

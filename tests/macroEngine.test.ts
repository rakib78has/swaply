import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { resolveTargetUrl, buildMacroExecutionScript } from '../src/core/macroEngine.ts';

describe('Post-Switch Macro Engine Tests', () => {
  test('should resolve target URL with relative and absolute paths', () => {
    const current = 'https://portal.enterprise.io/login';

    // Same URL if no navigate URL specified
    assert.equal(resolveTargetUrl(current), current);
    assert.equal(resolveTargetUrl(current, ''), current);
    assert.equal(resolveTargetUrl(current, '   '), current);

    // Relative path with leading slash
    assert.equal(resolveTargetUrl(current, '/dashboard'), 'https://portal.enterprise.io/dashboard');

    // Relative path without leading slash
    assert.equal(resolveTargetUrl(current, 'settings/billing'), 'https://portal.enterprise.io/settings/billing');

    // Absolute URL
    assert.equal(resolveTargetUrl(current, 'https://admin.enterprise.io/overview'), 'https://admin.enterprise.io/overview');
    assert.equal(resolveTargetUrl(current, 'http://localhost:3000/app'), 'http://localhost:3000/app');
  });

  test('should safely handle invalid current URLs', () => {
    assert.equal(resolveTargetUrl('not-a-valid-url', '/test'), 'not-a-valid-url');
  });

  test('should generate runnable auto-fill and auto-click client scripts', () => {
    const script = buildMacroExecutionScript({
      autoNavigateUrl: '/dashboard',
      delayMs: 500,
      autoFillSelectors: {
        '#tenant-code': 'ACME_CORP',
        'input[name="locale"]': 'en-US'
      },
      autoClickSelector: '#accept-terms-btn'
    });

    assert.ok(script.includes('#tenant-code'));
    assert.ok(script.includes('ACME_CORP'));
    assert.ok(script.includes('locale'));
    assert.ok(script.includes('#accept-terms-btn'));
    assert.ok(script.includes('500'));
  });

  test('should return empty string if no macro is defined', () => {
    assert.equal(buildMacroExecutionScript(), '');
  });
});

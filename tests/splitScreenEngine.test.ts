import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildSplitScreenConfig,
  buildSplitRunnerUrl,
  parseSplitRunnerParams,
  generateSplitScreenHtml,
} from '../src/core/splitScreenEngine.ts';

describe('Multi-Role Split-Screen Dual Role Runner Tests', () => {
  test('should build split screen configuration with default and custom values', () => {
    const defaultConfig = buildSplitScreenConfig('prof_admin', 'prof_user');
    assert.equal(defaultConfig.leftProfileId, 'prof_admin');
    assert.equal(defaultConfig.rightProfileId, 'prof_user');
    assert.equal(defaultConfig.orientation, 'side-by-side');
    assert.equal(defaultConfig.syncScroll, false);

    const customConfig = buildSplitScreenConfig('prof_admin', 'prof_user', {
      orientation: 'stacked',
      targetUrl: 'https://staging.app.com/dashboard',
      syncScroll: true,
    });
    assert.equal(customConfig.orientation, 'stacked');
    assert.equal(customConfig.targetUrl, 'https://staging.app.com/dashboard');
    assert.equal(customConfig.syncScroll, true);
  });

  test('should encode and decode split runner query string parameters accurately', () => {
    const runnerUrl = buildSplitRunnerUrl(
      'role_1',
      'role_2',
      'https://shop.example.com/cart',
      'stacked',
      true
    );
    assert.ok(runnerUrl.startsWith('split-runner.html?'));

    const parsed = parseSplitRunnerParams(runnerUrl.replace('split-runner.html', ''));
    assert.equal(parsed.leftProfileId, 'role_1');
    assert.equal(parsed.rightProfileId, 'role_2');
    assert.equal(parsed.targetUrl, 'https://shop.example.com/cart');
    assert.equal(parsed.orientation, 'stacked');
    assert.equal(parsed.syncScroll, true);
  });

  test('should generate complete split screen runner HTML structure with role badges and iframes', () => {
    const config = buildSplitScreenConfig('left_id', 'right_id', {
      targetUrl: 'https://app.dev/admin',
    });

    const html = generateSplitScreenHtml(config, 'Enterprise Admin', 'Support Agent');
    assert.ok(html.includes('<!DOCTYPE html>'));
    assert.ok(html.includes('Enterprise Admin'));
    assert.ok(html.includes('Support Agent'));
    assert.ok(html.includes('frameLeft'));
    assert.ok(html.includes('frameRight'));
    assert.ok(html.includes('https://app.dev/admin'));
  });
});

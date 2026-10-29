import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  parseCssColor,
  getRelativeLuminance,
  calculateContrastRatio,
  evaluateContrast,
  generateA11yScore,
  buildA11yOverlayScript,
  buildA11yCleanupScript,
} from '../src/core/a11yHeatmapEngine.ts';
import type { A11yViolation } from '../src/types/index.ts';

describe('WCAG 2.2 Visual a11y Overlay & Contrast Heatmap Tests', () => {
  test('should parse hex, rgb, rgba, and named colors accurately', () => {
    assert.deepEqual(parseCssColor('#ffffff'), [255, 255, 255]);
    assert.deepEqual(parseCssColor('#000'), [0, 0, 0]);
    assert.deepEqual(parseCssColor('rgb(10, 20, 30)'), [10, 20, 30]);
    assert.deepEqual(parseCssColor('rgba(50, 100, 150, 0.5)'), [50, 100, 150]);
    assert.deepEqual(parseCssColor('white'), [255, 255, 255]);
    assert.deepEqual(parseCssColor('black'), [0, 0, 0]);
  });

  test('should calculate relative luminance and contrast ratio adhering to WCAG 2.2', () => {
    const whiteLum = getRelativeLuminance([255, 255, 255]);
    const blackLum = getRelativeLuminance([0, 0, 0]);

    assert.equal(whiteLum, 1);
    assert.equal(blackLum, 0);

    // Black on white is 21:1
    const maxRatio = calculateContrastRatio([0, 0, 0], [255, 255, 255]);
    assert.equal(maxRatio, 21);

    // Identical colors is 1:1
    const minRatio = calculateContrastRatio([255, 255, 255], [255, 255, 255]);
    assert.equal(minRatio, 1);
  });

  test('should evaluate contrast against WCAG AA and AAA thresholds', () => {
    // Pure black text on white background -> passes AA & AAA
    const highContrast = evaluateContrast('#000000', '#ffffff');
    assert.equal(highContrast.ratio, 21);
    assert.equal(highContrast.passesAA, true);
    assert.equal(highContrast.passesAAA, true);

    // Very light grey text (#cccccc) on white background -> fails AA
    const lowContrast = evaluateContrast('#cccccc', '#ffffff');
    assert.ok(lowContrast.ratio < 4.5);
    assert.equal(lowContrast.passesAA, false);
    assert.equal(lowContrast.passesAAA, false);
  });

  test('should compute weighted accessibility score accurately', () => {
    // Zero violations -> 100 score
    assert.equal(generateA11yScore([]), 100);

    const violations: A11yViolation[] = [
      {
        id: 'v1',
        rule: 'FORM_LABEL',
        impact: 'CRITICAL', // -15
        selector: '#username',
        message: 'Missing label',
        wcagCriteria: '1.3.1',
      },
      {
        id: 'v2',
        rule: 'IMAGE_ALT',
        impact: 'SERIOUS', // -8
        selector: 'img.logo',
        message: 'Missing alt',
        wcagCriteria: '1.1.1',
      },
    ];

    // 100 - 15 - 8 = 77
    assert.equal(generateA11yScore(violations), 77);
  });

  test('should generate in-page overlay inspection and cleanup scripts', () => {
    const overlayScript = buildA11yOverlayScript();
    assert.ok(overlayScript.includes('IMAGE_ALT'));
    assert.ok(overlayScript.includes('FORM_LABEL'));
    assert.ok(overlayScript.includes('__qaswitch_a11y_badge__'));
    assert.ok(overlayScript.includes('__qaswitch_a11y_hud__'));

    const cleanupScript = buildA11yCleanupScript();
    assert.ok(cleanupScript.includes('__qaswitch_a11y_hud__'));
    assert.ok(cleanupScript.includes('__qaswitch_a11y_badge__'));
  });
});

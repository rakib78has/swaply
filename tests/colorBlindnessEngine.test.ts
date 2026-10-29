import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  COLOR_MATRICES,
  getSvgColorMatrix,
  formatVisionDescription,
  buildVisionFilterScript,
  buildVisionFilterCleanupScript,
} from '../src/core/colorBlindnessEngine.ts';

describe('Vision Deficiency & Color Blindness Simulator Tests', () => {
  test('should provide standard color matrices for all vision types', () => {
    assert.ok(COLOR_MATRICES.protanopia.length > 10);
    assert.ok(COLOR_MATRICES.deuteranopia.length > 10);
    assert.ok(COLOR_MATRICES.tritanopia.length > 10);
    assert.ok(COLOR_MATRICES.achromatopsia.length > 10);
    assert.ok(COLOR_MATRICES.normal.length > 10);
  });

  test('should return correct SVG matrix string by type or fallback to normal', () => {
    const protanopia = getSvgColorMatrix('protanopia');
    assert.equal(protanopia, COLOR_MATRICES.protanopia);

    const fallback = getSvgColorMatrix('unknown' as any);
    assert.equal(fallback, COLOR_MATRICES.normal);
  });

  test('should return descriptive clinical guidance for deficiency types', () => {
    assert.ok(formatVisionDescription('protanopia').includes('Red-Blind'));
    assert.ok(formatVisionDescription('deuteranopia').includes('Green-Blind'));
    assert.ok(formatVisionDescription('tritanopia').includes('Blue-Blind'));
    assert.ok(formatVisionDescription('achromatopsia').includes('Monochrome'));
    assert.ok(formatVisionDescription('blurred').includes('Low Visual Acuity'));
    assert.ok(formatVisionDescription('normal').includes('Normal Vision'));
  });

  test('should build SVG injection script for color blindness', () => {
    const script = buildVisionFilterScript({
      type: 'deuteranopia',
      intensity: 1,
      enabled: true,
    });
    assert.ok(script.includes('qaswitch-color-filter'));
    assert.ok(script.includes('feColorMatrix'));
    assert.ok(script.includes(COLOR_MATRICES.deuteranopia));
    assert.ok(script.includes('filter: url(#qaswitch-color-filter)'));
  });

  test('should build blur filter for low visual acuity', () => {
    const blurScript = buildVisionFilterScript({
      type: 'blurred',
      intensity: 0.8,
      enabled: true,
    });
    assert.ok(blurScript.includes('blur('));
    assert.ok(blurScript.includes('!important'));
  });

  test('should generate cleanup script if disabled or normal vision', () => {
    const disabledScript = buildVisionFilterScript({
      type: 'protanopia',
      intensity: 1,
      enabled: false,
    });
    assert.ok(disabledScript.includes('qaswitch-vision-filter'));
    assert.ok(disabledScript.includes('.remove()'));

    const cleanup = buildVisionFilterCleanupScript();
    assert.ok(cleanup.includes('qaswitch-vision-filter'));
    assert.ok(cleanup.includes('qaswitch-vision-style'));
  });
});

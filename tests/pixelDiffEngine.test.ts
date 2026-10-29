import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  validatePixelDiffConfig,
  buildPixelDiffOverlayScript,
  buildPixelDiffCleanupScript,
} from '../src/core/pixelDiffEngine.ts';

describe('Pixel-Perfect Ghost Overlay & Visual Regression Tests', () => {
  test('should validate and clamp pixel diff configuration', () => {
    const valid = validatePixelDiffConfig({
      imageUrl: 'https://design.com/mock.png',
      opacity: 0.75,
      blendMode: 'difference',
      offsetX: 10,
      offsetY: -5,
      splitMode: true,
      splitPercent: 40,
      enabled: true,
    });

    assert.equal(valid.imageUrl, 'https://design.com/mock.png');
    assert.equal(valid.opacity, 0.75);
    assert.equal(valid.blendMode, 'difference');
    assert.equal(valid.offsetX, 10);
    assert.equal(valid.offsetY, -5);
    assert.equal(valid.splitMode, true);
    assert.equal(valid.splitPercent, 40);
    assert.equal(valid.enabled, true);

    // Clamping opacity and splitPercent
    const clamped = validatePixelDiffConfig({
      opacity: 1.5,
      splitPercent: 120,
      blendMode: 'invalid-blend',
    });
    assert.equal(clamped.opacity, 1);
    assert.equal(clamped.splitPercent, 100);
    assert.equal(clamped.blendMode, 'normal');
  });

  test('should generate in-page ghost overlay script with blend mode and clip-path', () => {
    const config = validatePixelDiffConfig({
      imageUrl: 'data:image/png;base64,mock',
      opacity: 0.6,
      blendMode: 'difference',
      splitMode: true,
      splitPercent: 50,
      enabled: true,
    });

    const script = buildPixelDiffOverlayScript(config);
    assert.ok(script.includes('__qaswitch_ghost_overlay__'));
    assert.ok(script.includes('difference'));
    assert.ok(script.includes('clipPath'));
    assert.ok(script.includes('polygon(0 0, 50% 0, 50% 100%, 0 100%)'));
  });

  test('should generate cleanup script removing overlay and HUD elements', () => {
    const cleanup = buildPixelDiffCleanupScript();
    assert.ok(cleanup.includes('__qaswitch_ghost_overlay__'));
    assert.ok(cleanup.includes('__qaswitch_ghost_hud__'));
  });
});

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  getViewportPresets,
  findViewportPresetById,
  buildViewportEmulationScript
} from '../src/core/viewportEmulator.ts';

describe('Device & Viewport Emulator Tests', () => {
  test('should return mobile and desktop presets', () => {
    const presets = getViewportPresets();
    assert.ok(presets.length >= 4);

    const iphone = findViewportPresetById('iphone_16_pro');
    assert.equal(iphone?.width, 393);
    assert.equal(iphone?.height, 852);
    assert.equal(iphone?.isMobile, true);

    const desktop = findViewportPresetById('desktop_fhd');
    assert.equal(desktop?.width, 1920);
    assert.equal(desktop?.height, 1080);
    assert.equal(desktop?.isMobile, false);
  });

  test('should generate in-page viewport and touch emulation script', () => {
    const iphone = findViewportPresetById('iphone_16_pro')!;
    const script = buildViewportEmulationScript(iphone);

    assert.ok(script.includes('navigator, \'maxTouchPoints\''));
    assert.ok(script.includes('393'));
    assert.ok(script.includes('852'));
    assert.ok(script.includes('qaswitch:viewport_emulated'));
  });
});

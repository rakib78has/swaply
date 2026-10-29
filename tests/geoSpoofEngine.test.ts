import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  getGeoPresets,
  findGeoPresetById,
  buildGeoSpoofScript
} from '../src/core/geoSpoofEngine.ts';

describe('Geo-Location & Timezone Spoofer Tests', () => {
  test('should return all predefined geographic presets', () => {
    const presets = getGeoPresets();
    assert.ok(presets.length >= 5);
    const us = findGeoPresetById('us_ny');
    assert.equal(us?.countryCode, 'US');
    assert.equal(us?.currency, 'USD');

    const jp = findGeoPresetById('jp_tokyo');
    assert.equal(jp?.countryCode, 'JP');
    assert.equal(jp?.currency, 'JPY');
  });

  test('should generate in-page geolocation and timezone override script', () => {
    const jp = findGeoPresetById('jp_tokyo')!;
    const script = buildGeoSpoofScript(jp);

    assert.ok(script.includes('35.6762'));
    assert.ok(script.includes('139.6503'));
    assert.ok(script.includes('Asia/Tokyo'));
    assert.ok(script.includes('navigator.geolocation.getCurrentPosition'));
    assert.ok(script.includes('Intl.DateTimeFormat'));
  });
});

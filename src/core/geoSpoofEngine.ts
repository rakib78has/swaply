/**
 * Role-Linked Geo-Location & Timezone Spoofer Engine
 * Simulates multi-region geographic coordinates, locale currencies, and timezones directly in the browser.
 */

import type { GeoLocationProfile } from '../types/index.ts';

export const GEO_PRESETS: GeoLocationProfile[] = [
  {
    id: 'us_ny',
    name: '🇺🇸 United States (New York)',
    latitude: 40.7128,
    longitude: -74.006,
    timezone: 'America/New_York',
    countryCode: 'US',
    currency: 'USD'
  },
  {
    id: 'uk_london',
    name: '🇬🇧 United Kingdom (London)',
    latitude: 51.5074,
    longitude: -0.1278,
    timezone: 'Europe/London',
    countryCode: 'GB',
    currency: 'GBP'
  },
  {
    id: 'jp_tokyo',
    name: '🇯🇵 Japan (Tokyo)',
    latitude: 35.6762,
    longitude: 139.6503,
    timezone: 'Asia/Tokyo',
    countryCode: 'JP',
    currency: 'JPY'
  },
  {
    id: 'de_frankfurt',
    name: '🇩🇪 Germany (Frankfurt)',
    latitude: 50.1109,
    longitude: 8.6821,
    timezone: 'Europe/Berlin',
    countryCode: 'DE',
    currency: 'EUR'
  },
  {
    id: 'au_sydney',
    name: '🇦🇺 Australia (Sydney)',
    latitude: -33.8688,
    longitude: 151.2093,
    timezone: 'Australia/Sydney',
    countryCode: 'AU',
    currency: 'AUD'
  }
];

export function getGeoPresets(): GeoLocationProfile[] {
  return GEO_PRESETS;
}

export function findGeoPresetById(id: string): GeoLocationProfile | undefined {
  return GEO_PRESETS.find((p) => p.id === id);
}

export function buildGeoSpoofScript(profile: GeoLocationProfile): string {
  return `
    (() => {
      const lat = ${profile.latitude};
      const lon = ${profile.longitude};
      const tz = ${JSON.stringify(profile.timezone)};

      // 1. Override Geolocation API
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition = function(success, error, options) {
          success({
            coords: {
              latitude: lat,
              longitude: lon,
              accuracy: 10,
              altitude: null,
              altitudeAccuracy: null,
              heading: null,
              speed: null
            },
            timestamp: Date.now()
          });
        };

        navigator.geolocation.watchPosition = function(success, error, options) {
          navigator.geolocation.getCurrentPosition(success, error, options);
          return 101;
        };
      }

      // 2. Override Timezone via Intl
      try {
        const origDateTimeFormat = Intl.DateTimeFormat;
        Intl.DateTimeFormat = function(locales, options) {
          const opts = Object.assign({}, options, { timeZone: tz });
          return origDateTimeFormat(locales, opts);
        };
        Intl.DateTimeFormat.prototype = origDateTimeFormat.prototype;
      } catch (e) {}
    })();
  `;
}

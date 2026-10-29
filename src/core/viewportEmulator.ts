/**
 * Role-Linked Device & Viewport Emulator Engine
 * Emulates mobile devices, tablets, and responsive desktop viewports directly in the inspected tab.
 */

import type { DevicePreset } from '../types/index.ts';

export const DEVICE_PRESETS: DevicePreset[] = [
  {
    id: 'iphone_16_pro',
    name: '📱 iPhone 16 Pro',
    width: 393,
    height: 852,
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1',
    isMobile: true,
    deviceScaleFactor: 3
  },
  {
    id: 'ipad_air',
    name: '📲 iPad Air (Tablet)',
    width: 820,
    height: 1180,
    userAgent: 'Mozilla/5.0 (iPad; CPU OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1',
    isMobile: true,
    deviceScaleFactor: 2
  },
  {
    id: 'desktop_fhd',
    name: '🖥️ Desktop HD (1080p)',
    width: 1920,
    height: 1080,
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
    isMobile: false,
    deviceScaleFactor: 1
  },
  {
    id: 'macbook_pro',
    name: '💻 MacBook Pro (14-inch)',
    width: 1440,
    height: 900,
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
    isMobile: false,
    deviceScaleFactor: 2
  }
];

export function getViewportPresets(): DevicePreset[] {
  return DEVICE_PRESETS;
}

export function findViewportPresetById(id: string): DevicePreset | undefined {
  return DEVICE_PRESETS.find((d) => d.id === id);
}

export function buildViewportEmulationScript(preset: DevicePreset): string {
  return `
    (() => {
      // 1. Emulate touch support if mobile
      if (${preset.isMobile}) {
        try {
          window.ontouchstart = function() {};
          Object.defineProperty(navigator, 'maxTouchPoints', { get: () => 5, configurable: true });
        } catch (e) {}
      }

      // 2. Dispatch viewport configuration notice
      window.dispatchEvent(new CustomEvent('qaswitch:viewport_emulated', {
        detail: {
          width: ${preset.width},
          height: ${preset.height},
          isMobile: ${preset.isMobile},
          device: ${JSON.stringify(preset.name)}
        }
      }));
    })();
  `;
}

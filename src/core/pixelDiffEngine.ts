/**
 * Pixel-Perfect Figma Overlay & Visual Regression "Ghost" Mode Engine
 * Injects a semi-transparent or difference-blended design mock overlay with sub-pixel nudging and curtain split sliders.
 */

import type { PixelDiffConfig } from '../types/index.ts';

export function validatePixelDiffConfig(raw: unknown): PixelDiffConfig {
  const defaults: PixelDiffConfig = {
    imageUrl: '',
    opacity: 0.5,
    blendMode: 'normal',
    offsetX: 0,
    offsetY: 0,
    splitMode: false,
    splitPercent: 50,
    enabled: false,
  };

  if (!raw || typeof raw !== 'object') return defaults;
  const p = raw as Partial<PixelDiffConfig>;

  const validBlends = ['normal', 'difference', 'overlay', 'multiply'];
  const blendMode = validBlends.includes(p.blendMode as string)
    ? (p.blendMode as PixelDiffConfig['blendMode'])
    : 'normal';

  const opacity = typeof p.opacity === 'number' ? Math.max(0, Math.min(1, p.opacity)) : 0.5;
  const splitPercent = typeof p.splitPercent === 'number' ? Math.max(0, Math.min(100, p.splitPercent)) : 50;

  return {
    imageUrl: typeof p.imageUrl === 'string' ? p.imageUrl.trim() : '',
    opacity,
    blendMode,
    offsetX: Number(p.offsetX) || 0,
    offsetY: Number(p.offsetY) || 0,
    splitMode: Boolean(p.splitMode),
    splitPercent,
    enabled: Boolean(p.enabled),
  };
}

/**
 * Builds the in-page client script injecting the visual ghost overlay.
 */
export function buildPixelDiffOverlayScript(config: PixelDiffConfig): string {
  if (!config.enabled || !config.imageUrl) {
    return buildPixelDiffCleanupScript();
  }

  const safeConfig = JSON.stringify(config);

  return `
    (() => {
      const cfg = ${safeConfig};

      // 1. Clean existing overlay
      document.getElementById('__qaswitch_ghost_overlay__')?.remove();
      document.getElementById('__qaswitch_ghost_hud__')?.remove();

      // 2. Create Ghost Image Layer
      const overlay = document.createElement('div');
      overlay.id = '__qaswitch_ghost_overlay__';
      overlay.style.position = 'fixed';
      overlay.style.top = cfg.offsetY + 'px';
      overlay.style.left = cfg.offsetX + 'px';
      overlay.style.width = '100vw';
      overlay.style.height = '100vh';
      overlay.style.backgroundImage = 'url(' + cfg.imageUrl + ')';
      overlay.style.backgroundRepeat = 'no-repeat';
      overlay.style.backgroundPosition = 'top center';
      overlay.style.backgroundSize = 'contain';
      overlay.style.opacity = cfg.opacity;
      overlay.style.mixBlendMode = cfg.blendMode;
      overlay.style.pointerEvents = 'none';
      overlay.style.zIndex = '999998';

      if (cfg.splitMode) {
        overlay.style.clipPath = 'polygon(0 0, ${config.splitPercent}% 0, ${config.splitPercent}% 100%, 0 100%)';
      }

      document.body.appendChild(overlay);

      // 3. Create Floating Controller HUD
      const hud = document.createElement('div');
      hud.id = '__qaswitch_ghost_hud__';
      hud.style.position = 'fixed';
      hud.style.bottom = '20px';
      hud.style.left = '20px';
      hud.style.background = '#0f172a';
      hud.style.color = '#f8fafc';
      hud.style.border = '1px solid #38bdf8';
      hud.style.borderRadius = '8px';
      hud.style.padding = '8px 12px';
      hud.style.boxShadow = '0 10px 25px rgba(0,0,0,0.5)';
      hud.style.zIndex = '999999';
      hud.style.fontSize = '11px';
      hud.style.fontFamily = 'sans-serif';
      hud.style.display = 'flex';
      hud.style.alignItems = 'center';
      hud.style.gap = '8px';

      hud.innerHTML = \`
        <span style="font-weight: bold; color: #38bdf8;">👻 Ghost Mode:</span>
        <span>Opacity: \${Math.round(cfg.opacity * 100)}%</span>
        <span>Blend: \${cfg.blendMode}</span>
        <button id="__btn_dismiss_ghost__" style="background:#334155;color:#fff;border:none;padding:3px 6px;border-radius:4px;cursor:pointer;">Dismiss</button>
      \`;

      document.body.appendChild(hud);

      document.getElementById('__btn_dismiss_ghost__')?.addEventListener('click', () => {
        document.getElementById('__qaswitch_ghost_overlay__')?.remove();
        document.getElementById('__qaswitch_ghost_hud__')?.remove();
      });
    })();
  `;
}

/**
 * Builds cleanup script removing overlay and HUD.
 */
export function buildPixelDiffCleanupScript(): string {
  return `
    (() => {
      document.getElementById('__qaswitch_ghost_overlay__')?.remove();
      document.getElementById('__qaswitch_ghost_hud__')?.remove();
    })();
  `;
}

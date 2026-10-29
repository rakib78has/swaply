/**
 * WCAG 2.2 Visual a11y Overlay & Contrast Heatmap Engine
 * Scans DOM elements for WCAG AA violations (contrast, missing alt, form labels, buttons),
 * provides accurate relative luminance contrast calculation, and renders visual overlay badges.
 */

import type {
  A11yViolation,
  A11yRule,
  A11yImpact,
  A11yAuditSummary,
} from '../types/index.ts';

/**
 * Parses CSS color strings (#hex, rgb, rgba) into [r, g, b] tuple (0-255).
 */
export function parseCssColor(colorStr: string): [number, number, number] | null {
  if (!colorStr || typeof colorStr !== 'string') return null;

  const s = colorStr.trim().toLowerCase();

  // 1. Hex format: #fff, #ffffff, #ffffffff
  if (s.startsWith('#')) {
    const hex = s.slice(1);
    if (hex.length === 3) {
      return [
        parseInt(hex[0] + hex[0], 16),
        parseInt(hex[1] + hex[1], 16),
        parseInt(hex[2] + hex[2], 16),
      ];
    }
    if (hex.length >= 6) {
      return [
        parseInt(hex.slice(0, 2), 16),
        parseInt(hex.slice(2, 4), 16),
        parseInt(hex.slice(4, 6), 16),
      ];
    }
  }

  // 2. rgb(r, g, b) or rgba(r, g, b, a)
  const rgbMatch = s.match(/rgba?\s*\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/);
  if (rgbMatch) {
    return [
      parseInt(rgbMatch[1], 10),
      parseInt(rgbMatch[2], 10),
      parseInt(rgbMatch[3], 10),
    ];
  }

  // 3. Named colors fallback
  const namedColors: Record<string, [number, number, number]> = {
    black: [0, 0, 0],
    white: [255, 255, 255],
    red: [255, 0, 0],
    green: [0, 128, 0],
    blue: [0, 0, 255],
    gray: [128, 128, 128],
    grey: [128, 128, 128],
    yellow: [255, 255, 0],
  };

  if (namedColors[s]) {
    return namedColors[s];
  }

  return null;
}

/**
 * Calculates WCAG 2.1 / 2.2 relative luminance for an sRGB color.
 */
export function getRelativeLuminance(rgb: [number, number, number]): number {
  const [r, g, b] = rgb.map((val) => {
    const s = val / 255;
    return s <= 0.04045 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });

  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/**
 * Computes contrast ratio between two sRGB colors (1:1 to 21:1).
 */
export function calculateContrastRatio(
  rgb1: [number, number, number],
  rgb2: [number, number, number]
): number {
  const l1 = getRelativeLuminance(rgb1);
  const l2 = getRelativeLuminance(rgb2);

  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);

  const ratio = (lighter + 0.05) / (darker + 0.05);
  return Math.round(ratio * 100) / 100;
}

/**
 * Evaluates contrast between text and background against WCAG 2.2 AA / AAA criteria.
 */
export function evaluateContrast(
  textColor: string,
  bgColor: string,
  isLargeText = false
): {
  ratio: number;
  passesAA: boolean;
  passesAAA: boolean;
} {
  const c1 = parseCssColor(textColor) || [0, 0, 0];
  const c2 = parseCssColor(bgColor) || [255, 255, 255];

  const ratio = calculateContrastRatio(c1, c2);
  const aaMin = isLargeText ? 3.0 : 4.5;
  const aaaMin = isLargeText ? 4.5 : 7.0;

  return {
    ratio,
    passesAA: ratio >= aaMin,
    passesAAA: ratio >= aaaMin,
  };
}

/**
 * Computes overall accessibility score (0 - 100) based on violations.
 */
export function generateA11yScore(violations: A11yViolation[]): number {
  let deductions = 0;

  for (const v of violations) {
    switch (v.impact) {
      case 'CRITICAL':
        deductions += 15;
        break;
      case 'SERIOUS':
        deductions += 8;
        break;
      case 'MODERATE':
        deductions += 4;
        break;
      case 'MINOR':
        deductions += 1;
        break;
    }
  }

  return Math.max(0, 100 - deductions);
}

/**
 * Builds the visual overlay injection script for active browser tabs.
 */
export function buildA11yOverlayScript(): string {
  return `
    (() => {
      // Clean up any existing overlay
      const existingHud = document.getElementById('__qaswitch_a11y_hud__');
      if (existingHud) existingHud.remove();
      document.querySelectorAll('.__qaswitch_a11y_badge__').forEach(el => el.remove());

      const violations = [];

      // 1. Check Missing Alt on Images
      const images = document.querySelectorAll('img');
      images.forEach((img, idx) => {
        if (!img.hasAttribute('alt')) {
          violations.push({
            id: 'a11y_img_' + idx,
            rule: 'IMAGE_ALT',
            impact: 'SERIOUS',
            selector: img.id ? '#' + img.id : (img.className ? '.' + img.className.split(' ')[0] : 'img[' + idx + ']'),
            message: 'Image missing alt attribute',
            wcagCriteria: 'WCAG 2.2 AA 1.1.1',
            element: img
          });
        }
      });

      // 2. Check Form Labels
      const inputs = document.querySelectorAll('input:not([type="hidden"]):not([type="submit"]):not([type="button"]), textarea, select');
      inputs.forEach((input, idx) => {
        const id = input.getAttribute('id');
        const hasAria = input.getAttribute('aria-label') || input.getAttribute('aria-labelledby');
        const hasLabel = id && document.querySelector('label[for="' + id + '"]');
        const isWrapped = input.closest('label');

        if (!hasAria && !hasLabel && !isWrapped) {
          violations.push({
            id: 'a11y_input_' + idx,
            rule: 'FORM_LABEL',
            impact: 'CRITICAL',
            selector: id ? '#' + id : (input.name ? 'input[name="' + input.name + '"]' : 'input[' + idx + ']'),
            message: 'Form control missing associated label or aria-label',
            wcagCriteria: 'WCAG 2.2 AA 1.3.1',
            element: input
          });
        }
      });

      // 3. Check Buttons without Accessible Names
      const buttons = document.querySelectorAll('button, a[role="button"]');
      buttons.forEach((btn, idx) => {
        const text = btn.innerText?.trim();
        const aria = btn.getAttribute('aria-label') || btn.getAttribute('aria-labelledby');
        const title = btn.getAttribute('title');
        if (!text && !aria && !title) {
          violations.push({
            id: 'a11y_btn_' + idx,
            rule: 'BUTTON_NAME',
            impact: 'CRITICAL',
            selector: btn.id ? '#' + btn.id : 'button[' + idx + ']',
            message: 'Button element has no accessible text or aria-label',
            wcagCriteria: 'WCAG 2.2 AA 4.1.2',
            element: btn
          });
        }
      });

      // Render Visual Badges and Outlines
      violations.forEach((v) => {
        if (v.element) {
          v.element.style.outline = '2px dashed #ef4444';
          v.element.style.outlineOffset = '2px';

          const badge = document.createElement('div');
          badge.className = '__qaswitch_a11y_badge__';
          badge.style.position = 'absolute';
          badge.style.background = '#ef4444';
          badge.style.color = '#ffffff';
          badge.style.fontSize = '10px';
          badge.style.fontWeight = 'bold';
          badge.style.padding = '2px 6px';
          badge.style.borderRadius = '4px';
          badge.style.zIndex = '999999';
          badge.style.pointerEvents = 'none';
          badge.innerText = v.rule + ' (' + v.impact + ')';

          try {
            const rect = v.element.getBoundingClientRect();
            badge.style.top = (rect.top + window.scrollY) + 'px';
            badge.style.left = (rect.left + window.scrollX) + 'px';
            document.body.appendChild(badge);
          } catch(e) {}
        }
      });

      // Floating Summary HUD
      const hud = document.createElement('div');
      hud.id = '__qaswitch_a11y_hud__';
      hud.style.position = 'fixed';
      hud.style.bottom = '20px';
      hud.style.right = '20px';
      hud.style.background = '#0f172a';
      hud.style.color = '#f8fafc';
      hud.style.border = '1px solid #ef4444';
      hud.style.borderRadius = '8px';
      hud.style.padding = '10px 14px';
      hud.style.boxShadow = '0 10px 25px rgba(0,0,0,0.5)';
      hud.style.zIndex = '1000000';
      hud.style.fontSize = '12px';
      hud.style.fontFamily = 'sans-serif';
      hud.innerHTML = \`
        <div style="font-weight: bold; margin-bottom: 6px; display: flex; align-items: center; justify-content: space-between;">
          <span>♿ WCAG 2.2 Inspector</span>
          <span style="color: \${violations.length > 0 ? '#ef4444' : '#22c55e'}">\${violations.length} Issues Found</span>
        </div>
        <div style="font-size: 11px; color: #94a3b8; margin-bottom: 8px;">
          Badges & outlines applied. Press Dismiss to restore.
        </div>
        <button id="__btn_dismiss_a11y__" style="background: #334155; color: #fff; border: none; padding: 4px 8px; border-radius: 4px; cursor: pointer; font-size: 11px;">Dismiss Overlay</button>
      \`;
      document.body.appendChild(hud);

      document.getElementById('__btn_dismiss_a11y__')?.addEventListener('click', () => {
        hud.remove();
        document.querySelectorAll('.__qaswitch_a11y_badge__').forEach(el => el.remove());
        violations.forEach(v => {
          if (v.element) v.element.style.outline = '';
        });
      });

      return {
        totalViolations: violations.length,
        violations: violations.map(v => ({ id: v.id, rule: v.rule, impact: v.impact, selector: v.selector, message: v.message }))
      };
    })();
  `;
}

/**
 * Builds cleanup script removing badges and outlines.
 */
export function buildA11yCleanupScript(): string {
  return `
    (() => {
      document.getElementById('__qaswitch_a11y_hud__')?.remove();
      document.querySelectorAll('.__qaswitch_a11y_badge__').forEach(el => el.remove());
    })();
  `;
}

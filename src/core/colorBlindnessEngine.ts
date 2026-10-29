/**
 * Vision Deficiency & Color Blindness Simulator Engine
 * Injects SVG feColorMatrix filters and CSS filters into the DOM to simulate
 * Protanopia, Deuteranopia, Tritanopia, Achromatopsia, and Low Visual Acuity (Blur).
 */

import type {
  VisionDeficiencyType,
  VisionFilterConfig,
} from '../types/index.ts';

/**
 * Standard W3C / Brettel / Machado color transformation matrices for SVG feColorMatrix.
 */
export const COLOR_MATRICES: Record<VisionDeficiencyType, string> = {
  normal: '1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 1 0',
  protanopia: '0.567 0.433 0 0 0  0.558 0.442 0 0 0  0 0.242 0.758 0 0  0 0 0 1 0',
  deuteranopia: '0.625 0.375 0 0 0  0.700 0.300 0 0 0  0 0.300 0.700 0 0  0 0 0 1 0',
  tritanopia: '0.950 0.050 0 0 0  0 0.433 0.567 0 0  0 0.475 0.525 0 0  0 0 0 1 0',
  achromatopsia: '0.299 0.587 0.114 0 0  0.299 0.587 0.114 0 0  0.299 0.587 0.114 0 0  0 0 0 1 0',
  blurred: '', // Handled via CSS blur() filter
};

export function getSvgColorMatrix(type: VisionDeficiencyType): string {
  return COLOR_MATRICES[type] ?? COLOR_MATRICES.normal;
}

export function formatVisionDescription(type: VisionDeficiencyType): string {
  switch (type) {
    case 'protanopia':
      return 'Protanopia (Red-Blind): Difficulty distinguishing red from green; reds appear darker.';
    case 'deuteranopia':
      return 'Deuteranopia (Green-Blind): Most common form; difficulty distinguishing red and green hues.';
    case 'tritanopia':
      return 'Tritanopia (Blue-Blind): Rare form; difficulty distinguishing blue from yellow/green.';
    case 'achromatopsia':
      return 'Achromatopsia (Monochrome): Complete color blindness; vision strictly in shades of gray.';
    case 'blurred':
      return 'Low Visual Acuity (Blur): Simulates uncorrected refractive errors, cataracts, or myopia.';
    case 'normal':
    default:
      return 'Normal Vision: Full standard RGB spectrum.';
  }
}

/**
 * Generates the in-page script that injects the SVG filter definition and applies CSS to <html>.
 */
export function buildVisionFilterScript(config: VisionFilterConfig): string {
  if (!config.enabled || config.type === 'normal') {
    return buildVisionFilterCleanupScript();
  }

  const filterId = 'qaswitch-vision-filter';
  const styleId = 'qaswitch-vision-style';
  const intensity = Math.max(0, Math.min(1, config.intensity ?? 1.0));

  if (config.type === 'blurred') {
    const blurPx = Math.round(intensity * 6) || 3;
    return `
      (() => {
        let style = document.getElementById('${styleId}');
        if (!style) {
          style = document.createElement('style');
          style.id = '${styleId}';
          document.head.appendChild(style);
        }
        style.textContent = 'html { filter: blur(${blurPx}px) !important; }';
      })();
    `;
  }

  const matrix = getSvgColorMatrix(config.type);

  return `
    (() => {
      // 1. Remove previous SVG if present
      document.getElementById('${filterId}')?.remove();

      // 2. Create SVG with feColorMatrix
      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svg.id = '${filterId}';
      svg.setAttribute('style', 'position:absolute; width:0; height:0; pointer-events:none; overflow:hidden;');
      svg.innerHTML = \`<defs><filter id="qaswitch-color-filter"><feColorMatrix type="matrix" values="${matrix}"/></filter></defs>\`;
      document.body.appendChild(svg);

      // 3. Inject CSS style
      let style = document.getElementById('${styleId}');
      if (!style) {
        style = document.createElement('style');
        style.id = '${styleId}';
        document.head.appendChild(style);
      }
      style.textContent = 'html { filter: url(#qaswitch-color-filter) !important; }';
    })();
  `;
}

/**
 * Builds cleanup script removing filter and restored styles.
 */
export function buildVisionFilterCleanupScript(): string {
  return `
    (() => {
      document.getElementById('qaswitch-vision-filter')?.remove();
      document.getElementById('qaswitch-vision-style')?.remove();
    })();
  `;
}

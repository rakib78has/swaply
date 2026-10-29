/**
 * In-Page XSS & Input Injection Fuzzer Engine
 * Fuzzes form inputs with OWASP polyglot XSS, SQLi markers, and traps dangerous DOM sinks.
 */

import type { FuzzPayloadType, FuzzResult, FuzzReport } from '../types/index.ts';

export const STANDARD_FUZZ_PAYLOADS: Record<FuzzPayloadType, string[]> = {
  POLYGLOT_XSS: [
    `javascript:/*--></title></style></textarea></script></xmp><svg/onload='+/\\"/+/onmouseover=1/+/[*/[]/+alert(1)//'>`,
    `"><img src=x onerror=console.warn('QASWITCH_XSS_HIT')>`,
    `<svg onload=console.warn('QASWITCH_XSS_HIT')>`,
  ],
  SQLI_MARKER: [
    `' OR '1'='1' -- `,
    `" OR ""="`,
    `' UNION SELECT 1,2,3--`,
  ],
  HTML_INJECTION: [
    `<div id="__qaswitch_html_inj_probe__">QA_PROBE</div>`,
    `"><marquee>INJECTION_TEST</marquee>`,
  ],
  SSTI_PROBE: [
    `{{7*7}}`,
    `${7*7}`,
    `<%= 7*7 %>`,
  ],
};

/**
 * Returns all active fuzzing payloads for specified or all categories.
 */
export function getFuzzPayloads(categories?: FuzzPayloadType[]): Array<{ type: FuzzPayloadType; payload: string }> {
  const cats = categories && categories.length > 0
    ? categories
    : (Object.keys(STANDARD_FUZZ_PAYLOADS) as FuzzPayloadType[]);

  const list: Array<{ type: FuzzPayloadType; payload: string }> = [];
  for (const c of cats) {
    const payloads = STANDARD_FUZZ_PAYLOADS[c] || [];
    for (const p of payloads) {
      list.push({ type: c, payload: p });
    }
  }
  return list;
}

/**
 * Pure evaluation function testing whether raw payload reflects in HTML unescaped.
 */
export function evaluateSinkVulnerability(
  targetContent: string,
  payload: string
): { isVulnerable: boolean; sinkName?: string } {
  if (!targetContent || !payload) return { isVulnerable: false };

  // If the exact raw unescaped payload or probe string is reflected in HTML
  if (targetContent.includes(payload)) {
    return { isVulnerable: true, sinkName: 'Direct HTML Reflection' };
  }

  // Check HTML injection marker
  if (payload.includes('__qaswitch_html_inj_probe__') && targetContent.includes('__qaswitch_html_inj_probe__')) {
    return { isVulnerable: true, sinkName: 'Unsanitized DOM Node' };
  }

  return { isVulnerable: false };
}

/**
 * Formats structured fuzzing audit report into markdown.
 */
export function formatFuzzReportMarkdown(report: FuzzReport): string {
  const lines = [
    `# 🛡️ QASwitch In-Page Injection & XSS Fuzzer Report`,
    `**Target URL:** ${report.url}`,
    `**Timestamp:** ${new Date(report.timestamp).toISOString()}`,
    `**Inputs Fuzzed:** ${report.totalInputsFuzzed}`,
    `**Vulnerabilities Flagged:** ${report.findings.length}`,
    '',
    '| Input Selector | Type | Severity | Sink Detected | Reflected |',
    '| --- | --- | --- | --- | --- |',
  ];

  if (report.findings.length === 0) {
    lines.push('| *None* | - | 🟢 PASS | No unescaped reflections or DOM sink triggers | No |');
  } else {
    for (const f of report.findings) {
      const sevIcon = f.severity === 'CRITICAL' ? '🔴 CRITICAL' : '🟡 HIGH';
      lines.push(`| \`${f.inputSelector}\` | ${f.payloadType} | ${sevIcon} | ${f.sinkTriggered || 'Reflection'} | ${f.reflected ? 'Yes' : 'No'} |`);
    }
  }

  return lines.join('\n');
}

/**
 * Builds the in-page client script that traps DOM sinks and injects payloads.
 */
export function buildFuzzerScript(payloadList: Array<{ type: FuzzPayloadType; payload: string }>): string {
  const safePayloads = JSON.stringify(payloadList);

  return `
    (() => {
      const payloads = ${safePayloads};
      const findings = [];
      const inputs = document.querySelectorAll('input:not([type="hidden"]):not([type="submit"]):not([type="button"]), textarea');

      // 1. Trap innerHTML sink
      const origInnerHTML = Object.getOwnPropertyDescriptor(Element.prototype, 'innerHTML')?.set;
      if (origInnerHTML && !window.__QASWITCH_SINK_TRAP__) {
        window.__QASWITCH_SINK_TRAP__ = true;
        Object.defineProperty(Element.prototype, 'innerHTML', {
          set: function(val) {
            for (const p of payloads) {
              if (typeof val === 'string' && val.includes(p.payload)) {
                findings.push({
                  id: 'fuzz_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
                  inputSelector: this.tagName.toLowerCase(),
                  payloadType: p.type,
                  payload: p.payload,
                  sinkTriggered: 'Element.innerHTML',
                  severity: 'CRITICAL',
                  reflected: true
                });
              }
            }
            return origInnerHTML.call(this, val);
          }
        });
      }

      // 2. Fuzz inputs with first XSS polyglot & HTML injection probe
      let fuzzedCount = 0;
      inputs.forEach((input, idx) => {
        const testPayload = payloads[idx % payloads.length] || payloads[0];
        if (testPayload) {
          input.value = testPayload.payload;
          input.dispatchEvent(new Event('input', { bubbles: true }));
          input.dispatchEvent(new Event('change', { bubbles: true }));
          fuzzedCount++;

          // Check if payload reflects immediately in body without encoding
          if (document.body.innerHTML.includes(testPayload.payload)) {
            findings.push({
              id: 'fuzz_ref_' + idx,
              inputSelector: input.id ? '#' + input.id : (input.name ? 'input[name="' + input.name + '"]' : 'input[' + idx + ']'),
              payloadType: testPayload.type,
              payload: testPayload.payload,
              sinkTriggered: 'Immediate DOM Reflection',
              severity: 'CRITICAL',
              reflected: true
            });
          }
        }
      });

      return {
        url: window.location.href,
        timestamp: Date.now(),
        totalInputsFuzzed: fuzzedCount,
        findings: findings
      };
    })();
  `;
}

/**
 * Builds cleanup script.
 */
export function buildFuzzerCleanupScript(): string {
  return `
    (() => {
      document.getElementById('__qaswitch_fuzzer_hud__')?.remove();
    })();
  `;
}

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  STANDARD_FUZZ_PAYLOADS,
  getFuzzPayloads,
  evaluateSinkVulnerability,
  formatFuzzReportMarkdown,
  buildFuzzerScript,
  buildFuzzerCleanupScript,
} from '../src/core/xssFuzzerEngine.ts';
import type { FuzzReport } from '../src/types/index.ts';

describe('In-Page XSS & Input Injection Fuzzer Engine Tests', () => {
  test('should provide standard OWASP polyglot XSS, SQLi markers, and probes', () => {
    assert.ok(STANDARD_FUZZ_PAYLOADS.POLYGLOT_XSS.length > 0);
    assert.ok(STANDARD_FUZZ_PAYLOADS.SQLI_MARKER.length > 0);
    assert.ok(STANDARD_FUZZ_PAYLOADS.HTML_INJECTION.length > 0);
    assert.ok(STANDARD_FUZZ_PAYLOADS.SSTI_PROBE.length > 0);
  });

  test('should retrieve filtered fuzz payloads or all categories', () => {
    const polyglotOnly = getFuzzPayloads(['POLYGLOT_XSS']);
    assert.ok(polyglotOnly.length >= 2);
    assert.equal(polyglotOnly.every(p => p.type === 'POLYGLOT_XSS'), true);

    const all = getFuzzPayloads();
    assert.ok(all.length >= 8);
  });

  test('should detect raw reflection and unescaped HTML sink injections', () => {
    const payload = '"><img src=x onerror=console.warn(1)>';
    const htmlWithVuln = '<div>Welcome, ' + payload + '</div>';
    const benignHtml = '<div>Welcome, &quot;&gt;&lt;img src=x&gt;</div>';

    const vulnResult = evaluateSinkVulnerability(htmlWithVuln, payload);
    assert.equal(vulnResult.isVulnerable, true);
    assert.equal(vulnResult.sinkName, 'Direct HTML Reflection');

    const safeResult = evaluateSinkVulnerability(benignHtml, payload);
    assert.equal(safeResult.isVulnerable, false);

    const probe = '<div id="__qaswitch_html_inj_probe__">QA_PROBE</div>';
    const probeHit = evaluateSinkVulnerability('<main><div id="__qaswitch_html_inj_probe__">QA_PROBE</div></main>', probe);
    assert.equal(probeHit.isVulnerable, true);
  });

  test('should format markdown report for clean audits and critical findings', () => {
    const cleanReport: FuzzReport = {
      timestamp: 1700000000000,
      url: 'https://example.com/login',
      totalInputsFuzzed: 4,
      findings: [],
    };
    const cleanMd = formatFuzzReportMarkdown(cleanReport);
    assert.ok(cleanMd.includes('🟢 PASS'));
    assert.ok(cleanMd.includes('https://example.com/login'));

    const vulnReport: FuzzReport = {
      timestamp: 1700000000000,
      url: 'https://example.com/search',
      totalInputsFuzzed: 2,
      findings: [
        {
          id: 'fuzz_1',
          inputSelector: '#search-box',
          payloadType: 'POLYGLOT_XSS',
          payload: '<svg onload=1>',
          sinkTriggered: 'Element.innerHTML',
          severity: 'CRITICAL',
          reflected: true,
        },
      ],
    };
    const vulnMd = formatFuzzReportMarkdown(vulnReport);
    assert.ok(vulnMd.includes('🔴 CRITICAL'));
    assert.ok(vulnMd.includes('#search-box'));
  });

  test('should generate valid in-page fuzzer and sink-trapper script', () => {
    const payloads = getFuzzPayloads(['SQLI_MARKER']);
    const script = buildFuzzerScript(payloads);
    assert.ok(script.includes('Element.prototype'));
    assert.ok(script.includes('innerHTML'));
    assert.ok(script.includes('querySelectorAll'));

    const cleanup = buildFuzzerCleanupScript();
    assert.ok(cleanup.includes('__qaswitch_fuzzer_hud__'));
  });
});

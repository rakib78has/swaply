import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  scanDomForSecretLeaks,
  evaluateSecurityHeaders,
  generateDastReport
} from '../src/core/dastScanner.ts';

describe('DevSecOps DAST Scanner Tests', () => {
  test('should detect Stripe and AWS leaked keys in HTML source', () => {
    const mockStripeKey = ['sk', 'live', '123456789012345678901234'].join('_');
    const mockAwsKey = ['AKIA', 'IOSFODNN7EXAMPLE'].join('');
    const html = `
      <html>
        <script>
          const stripeKey = "${mockStripeKey}";
          const awsKey = "${mockAwsKey}";
        </script>
      </html>
    `;

    const findings = scanDomForSecretLeaks(html);
    assert.equal(findings.length, 2);
    assert.ok(findings.some((f) => f.id.includes('stripe')));
    assert.ok(findings.some((f) => f.id.includes('aws')));
  });

  test('should detect missing clickjacking headers', () => {
    const findings = evaluateSecurityHeaders({});
    assert.ok(findings.some((f) => f.type === 'CLICKJACKING'));
  });

  test('should detect insecure CORS wildcard with credentials enabled', () => {
    const headers = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Credentials': 'true'
    };
    const findings = evaluateSecurityHeaders(headers);
    assert.ok(findings.some((f) => f.type === 'CORS_MISCONFIG'));
  });

  test('should generate full DAST audit report and calculate score', () => {
    const html = '<div>Safe page</div>';
    const headers = {
      'X-Frame-Options': 'DENY'
    };
    const report = generateDastReport('example.com', html, headers);
    assert.equal(report.domain, 'example.com');
    assert.equal(report.findings.length, 0);
    assert.equal(report.score, 100);
  });
});

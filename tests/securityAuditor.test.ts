import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { auditSessionSecurity, formatMarkdownSecurityReport } from '../src/core/securityAuditor.ts';

describe('OWASP Security Auditor Tests', () => {
  test('should award grade A+ to perfectly secured session cookies', () => {
    const report = auditSessionSecurity('api.example.com', [
      {
        name: 'app_session',
        value: 'secure_tok_123',
        domain: 'api.example.com',
        path: '/',
        secure: true,
        httpOnly: true,
        sameSite: 'strict'
      }
    ], { local: { user_theme: 'dark' }, session: {} });

    assert.equal(report.grade, 'A+');
    assert.ok(report.score >= 95);
    assert.equal(report.findings.length, 0);
  });

  test('should detect missing HttpOnly on sensitive auth cookies', () => {
    const report = auditSessionSecurity('mybank.com', [
      {
        name: 'auth_jwt_token',
        value: 'raw_jwt_value',
        domain: 'mybank.com',
        path: '/',
        secure: true,
        httpOnly: false, // Insecure: vulnerable to XSS theft
        sameSite: 'lax'
      }
    ], { local: {}, session: {} });

    const finding = report.findings.find((f) => f.category === 'COOKIE_HTTPONLY');
    assert.ok(finding);
    assert.equal(finding.severity, 'HIGH');
    assert.ok(report.score < 95);
  });

  test('should detect plaintext credentials in localStorage', () => {
    const report = auditSessionSecurity('app.dev', [], {
      local: {
        access_token_bearer: 'secret_bearer_key_12345',
        theme: 'light'
      },
      session: {}
    });

    const finding = report.findings.find((f) => f.category === 'STORAGE_PLAINTEXT');
    assert.ok(finding);
    assert.equal(finding.severity, 'HIGH');
  });

  test('should flag SameSite=None without Secure flag as CRITICAL', () => {
    const report = auditSessionSecurity('store.com', [
      {
        name: 'tracking_id',
        value: 'trk_999',
        domain: 'store.com',
        path: '/',
        secure: false, // CRITICAL: None without Secure
        sameSite: 'no_restriction'
      }
    ]);

    const critical = report.findings.find((f) => f.severity === 'CRITICAL');
    assert.ok(critical);
    assert.ok(report.score <= 65);
  });

  test('should generate structured Markdown audit report', () => {
    const report = auditSessionSecurity('test.com', [
      { name: 'session_cookie', value: '123', domain: 'test.com', path: '/', secure: false, httpOnly: false }
    ]);
    const markdown = formatMarkdownSecurityReport(report);

    assert.match(markdown, /# 🛡️ QASwitch Security Audit Report/);
    assert.match(markdown, /Overall Security Grade/);
    assert.match(markdown, /Remediation/);
  });
});

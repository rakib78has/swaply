/**
 * OWASP Cookie & Session Security Auditor
 * Scans active cookies and localStorage for security vulnerabilities and generates an audit grade.
 */

import type {
  SessionCookie,
  DOMStorageSnapshot,
  SecurityAuditReport,
  SecurityFinding
} from '../types/index.ts';

const SENSITIVE_COOKIE_REGEX = /(sess|token|jwt|auth|sid|user|id|login|key)/i;
const SENSITIVE_STORAGE_REGEX = /(pass|token|jwt|secret|key|bearer|auth|credit|ssn|private)/i;

export function auditSessionSecurity(
  domain: string,
  cookies: SessionCookie[] = [],
  storage: DOMStorageSnapshot = { local: {}, session: {} }
): SecurityAuditReport {
  const findings: SecurityFinding[] = [];
  const isLocalhost = domain.includes('localhost') || domain.includes('127.0.0.1');

  // 1. Audit Cookies
  for (const c of cookies) {
    const isSensitive = SENSITIVE_COOKIE_REGEX.test(c.name);

    // Check HttpOnly on sensitive session cookies
    if (isSensitive && !c.httpOnly) {
      findings.push({
        id: `sec_httponly_${c.name}`,
        severity: 'HIGH',
        category: 'COOKIE_HTTPONLY',
        title: `Sensitive Cookie Missing HttpOnly Flag`,
        target: c.name,
        description: `Cookie "${c.name}" appears to store session/authentication state but lacks the HttpOnly flag. This allows malicious JavaScript in XSS attacks to steal it.`,
        remediation: `Set the 'HttpOnly' flag on cookie "${c.name}" on the server.`
      });
    }

    // Check Secure flag
    if (!c.secure && !isLocalhost) {
      findings.push({
        id: `sec_secure_${c.name}`,
        severity: isSensitive ? 'HIGH' : 'MEDIUM',
        category: 'COOKIE_SECURE',
        title: `Cookie Missing Secure Flag`,
        target: c.name,
        description: `Cookie "${c.name}" does not enforce HTTPS transmission. It can be intercepted in plaintext over untrusted networks.`,
        remediation: `Always set the 'Secure' attribute on cookies served over HTTPS.`
      });
    }

    // Check SameSite attribute
    if (!c.sameSite || c.sameSite === 'unspecified') {
      findings.push({
        id: `sec_samesite_${c.name}`,
        severity: 'MEDIUM',
        category: 'COOKIE_SAMESITE',
        title: `Unspecified SameSite Policy`,
        target: c.name,
        description: `Cookie "${c.name}" does not declare SameSite=Lax or SameSite=Strict, increasing exposure to Cross-Site Request Forgery (CSRF).`,
        remediation: `Explicitly configure 'SameSite=Lax' or 'SameSite=Strict' for this cookie.`
      });
    } else if (c.sameSite === 'no_restriction' && !c.secure) {
      findings.push({
        id: `sec_samesite_none_insecure_${c.name}`,
        severity: 'CRITICAL',
        category: 'COOKIE_SAMESITE',
        title: `SameSite=None Without Secure Flag`,
        target: c.name,
        description: `Cookie "${c.name}" has SameSite=None but is not marked Secure. Modern browsers block this configuration entirely.`,
        remediation: `When using SameSite=None, 'Secure' must always be true.`
      });
    }
  }

  // 2. Audit LocalStorage for Plaintext Secrets
  const localStorageKeys = storage && storage.local ? Object.keys(storage.local) : [];
  for (const k of localStorageKeys) {
    if (SENSITIVE_STORAGE_REGEX.test(k)) {
      const val = storage.local[k] || '';
      if (val.length > 5) {
        findings.push({
          id: `sec_storage_${k}`,
          severity: 'HIGH',
          category: 'STORAGE_PLAINTEXT',
          title: `Sensitive Credential in Plaintext localStorage`,
          target: `localStorage['${k}']`,
          description: `Key "${k}" holds sensitive data in unencrypted window.localStorage, making it vulnerable to extraction via XSS.`,
          remediation: `Store authentication tokens in HttpOnly cookies or session-scoped memory instead of permanent localStorage.`
        });
      }
    }
  }

  // Calculate Scores & Severity Counts
  let score = 100;
  let criticalCount = 0;
  let highCount = 0;
  let mediumCount = 0;
  let lowCount = 0;

  for (const f of findings) {
    if (f.severity === 'CRITICAL') {
      score -= 35;
      criticalCount++;
    } else if (f.severity === 'HIGH') {
      score -= 18;
      highCount++;
    } else if (f.severity === 'MEDIUM') {
      score -= 8;
      mediumCount++;
    } else if (f.severity === 'LOW') {
      score -= 3;
      lowCount++;
    }
  }

  score = Math.max(0, Math.min(100, score));

  let grade: 'A+' | 'A' | 'B' | 'C' | 'F' = 'A+';
  if (score >= 95 && criticalCount === 0 && highCount === 0) grade = 'A+';
  else if (score >= 85 && criticalCount === 0) grade = 'A';
  else if (score >= 70) grade = 'B';
  else if (score >= 50) grade = 'C';
  else grade = 'F';

  return {
    domain,
    timestamp: Date.now(),
    grade,
    score,
    totalCookiesScanned: cookies.length,
    totalStorageKeysScanned: localStorageKeys.length,
    findings,
    summary: {
      criticalCount,
      highCount,
      mediumCount,
      lowCount,
      passCount: Math.max(0, cookies.length + localStorageKeys.length - findings.length)
    }
  };
}

export function formatMarkdownSecurityReport(report: SecurityAuditReport): string {
  const lines: string[] = [
    `# 🛡️ QASwitch Security Audit Report: ${report.domain}`,
    ``,
    `**Overall Security Grade:** \`${report.grade}\` (${report.score}/100)`,
    `**Timestamp:** ${new Date(report.timestamp).toISOString()}`,
    `**Scanned:** ${report.totalCookiesScanned} cookies, ${report.totalStorageKeysScanned} storage keys`,
    ``,
    `### 📊 Findings Summary`,
    `- 🔴 **Critical:** ${report.summary.criticalCount}`,
    `- 🟠 **High:** ${report.summary.highCount}`,
    `- 🟡 **Medium:** ${report.summary.mediumCount}`,
    `- 🟢 **Passing Checks:** ${report.summary.passCount}`,
    ``,
    `### 🔍 Detailed Audit Findings`
  ];

  if (report.findings.length === 0) {
    lines.push(`✅ **No security vulnerabilities detected!** All cookies enforce HttpOnly, Secure, and strict SameSite rules.`);
  } else {
    report.findings.forEach((f, idx) => {
      lines.push(
        `#### ${idx + 1}. [${f.severity}] ${f.title}`,
        `- **Target:** \`${f.target}\``,
        `- **Description:** ${f.description}`,
        `- **Remediation:** ${f.remediation}`,
        ``
      );
    });
  }

  return lines.join('\n');
}

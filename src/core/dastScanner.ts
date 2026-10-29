/**
 * DevSecOps DAST Scanner
 * Audits in-page secrets leaks, CORS misconfigurations, Clickjacking defenses, and CSP policies.
 */

import type { DastFinding, DastReport } from '../types/index.ts';

const SECRET_PATTERNS = [
  { name: 'Stripe Secret Key', regex: /sk_live_[0-9a-zA-Z]{24}/g, severity: 'HIGH' as const },
  { name: 'AWS Access Key ID', regex: /AKIA[0-9A-Z]{16}/g, severity: 'HIGH' as const },
  { name: 'Google API Key', regex: /AIza[0-9A-Za-z-_]{35}/g, severity: 'MEDIUM' as const },
  { name: 'Private RSA Key', regex: /-----BEGIN (?:RSA )?PRIVATE KEY-----/g, severity: 'HIGH' as const }
];

export function scanDomForSecretLeaks(html: string): DastFinding[] {
  if (!html || typeof html !== 'string') return [];

  const findings: DastFinding[] = [];

  for (const { name, regex, severity } of SECRET_PATTERNS) {
    const matches = html.match(regex);
    if (matches && matches.length > 0) {
      findings.push({
        id: `secret_${name.toLowerCase().replace(/\s+/g, '_')}`,
        type: 'SECRET_LEAK',
        severity,
        target: `DOM Script / Markup (${matches.length} occurrences)`,
        description: `Potential hardcoded production secret (${name}) detected in client-side HTML/JS source.`,
        remediation: 'Remove private credentials from frontend assets. Rotate the affected API secret immediately.'
      });
    }
  }

  return findings;
}

export function evaluateSecurityHeaders(headers: Record<string, string>): DastFinding[] {
  const findings: DastFinding[] = [];
  const lowerMap = Object.entries(headers).reduce((acc, [k, v]) => {
    acc[k.toLowerCase()] = v;
    return acc;
  }, {} as Record<string, string>);

  // 1. Clickjacking check
  const xfo = lowerMap['x-frame-options'];
  const csp = lowerMap['content-security-policy'];
  const hasCspFrameAncestors = csp && csp.includes('frame-ancestors');

  if (!xfo && !hasCspFrameAncestors) {
    findings.push({
      id: 'dast_clickjacking_missing',
      type: 'CLICKJACKING',
      severity: 'MEDIUM',
      target: 'HTTP Response Headers',
      description: 'Missing X-Frame-Options or CSP frame-ancestors header. Webpage may be embedded in malicious iframes.',
      remediation: "Configure 'X-Frame-Options: DENY' or 'Content-Security-Policy: frame-ancestors none;'."
    });
  }

  // 2. CORS Wildcard with Credentials check
  const acao = lowerMap['access-control-allow-origin'];
  const acac = lowerMap['access-control-allow-credentials'];
  if (acao === '*' && acac === 'true') {
    findings.push({
      id: 'dast_cors_wildcard_credentials',
      type: 'CORS_MISCONFIG',
      severity: 'HIGH',
      target: 'Access-Control-Allow-Origin',
      description: 'CORS policy enables credentials with wildcard origin, creating cross-origin data exposure risk.',
      remediation: 'Specify explicit trusted origins instead of wildcard * when credentials flag is enabled.'
    });
  }

  return findings;
}

export function generateDastReport(
  domain: string,
  html: string,
  headers: Record<string, string> = {}
): DastReport {
  const findings = [
    ...scanDomForSecretLeaks(html),
    ...evaluateSecurityHeaders(headers)
  ];

  let score = 100;
  for (const f of findings) {
    if (f.severity === 'HIGH') score -= 30;
    else if (f.severity === 'MEDIUM') score -= 15;
    else if (f.severity === 'LOW') score -= 5;
  }
  score = Math.max(0, Math.min(100, score));

  return {
    domain,
    scannedAt: Date.now(),
    findings,
    score
  };
}

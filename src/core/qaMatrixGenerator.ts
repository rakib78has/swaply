/**
 * Automated QA Test Matrix & Step Generator Engine
 * Transforms saved profiles, credentials, and access rules into structured Test Matrices (Markdown & CSV).
 */

import type {
  ProfileRecord,
  QAMatrixRow,
  QAMatrixExport,
} from '../types/index.ts';

export function inferRbacLevel(profile: ProfileRecord): string {
  const text = `${profile.name} ${JSON.stringify(profile.headers || {})} ${JSON.stringify(profile.storage?.local || {})}`.toLowerCase();

  if (text.includes('super_admin') || text.includes('superadmin')) return 'SUPER_ADMIN';
  if (text.includes('admin')) return 'ADMIN_ACCESS';
  if (text.includes('vip') || text.includes('gold')) return 'VIP_PREMIUM';
  if (text.includes('auditor') || text.includes('read_only')) return 'READ_ONLY_AUDITOR';
  if (text.includes('banned') || text.includes('restricted')) return 'DENIED_BLOCKED';

  return 'STANDARD_USER';
}

export function generateMatrixRow(
  profile: ProfileRecord,
  index: number,
  targetUrl = 'https://example.com/app'
): QAMatrixRow {
  const padIdx = String(index).padStart(3, '0');
  const testId = `TC-${padIdx}`;

  const cookieCount = profile.cookies ? profile.cookies.length : 0;
  const localKeys = profile.storage?.local ? Object.keys(profile.storage.local).length : 0;
  const authState = `${cookieCount} cookies, ${localKeys} storage keys`;

  const headerKeys = profile.headers ? Object.keys(profile.headers) : [];
  const headersSummary = headerKeys.length > 0
    ? headerKeys.join(', ')
    : 'None';

  const rbac = inferRbacLevel(profile);
  const expectedStatus = rbac === 'DENIED_BLOCKED' ? 403 : 200;

  return {
    testId,
    roleName: profile.name,
    url: profile.url || targetUrl,
    authState,
    headersSummary,
    rbacAccessLevel: rbac,
    expectedStatus,
    result: 'UNTESTED',
  };
}

export function buildQAMatrix(
  profiles: ProfileRecord[],
  domain: string,
  defaultUrl = ''
): QAMatrixExport {
  const rows: QAMatrixRow[] = [];
  let idx = 1;

  for (const p of profiles) {
    rows.push(generateMatrixRow(p, idx++, defaultUrl || p.url));
  }

  return {
    timestamp: Date.now(),
    domain,
    rows,
  };
}

export function exportMatrixToMarkdown(matrix: QAMatrixExport): string {
  const lines = [
    `# 📑 QA Test Execution Matrix - ${matrix.domain}`,
    `**Generated:** ${new Date(matrix.timestamp).toISOString()}`,
    `**Total Test Cases:** ${matrix.rows.length}`,
    '',
    '| Test ID | Role Persona | Target URL | Expected Status | RBAC Level | Headers | Result |',
    '| --- | --- | --- | --- | --- | --- | --- |',
  ];

  for (const r of matrix.rows) {
    lines.push(`| **${r.testId}** | ${r.roleName} | \`${r.url}\` | **${r.expectedStatus}** | \`${r.rbacAccessLevel}\` | ${r.headersSummary} | ${r.result} |`);
  }

  return lines.join('\n');
}

export function exportMatrixToCsv(matrix: QAMatrixExport): string {
  const header = ['Test ID', 'Role Persona', 'Target URL', 'Expected Status', 'RBAC Level', 'Auth State', 'Headers', 'Result'];
  const lines = [header.join(',')];

  for (const r of matrix.rows) {
    const row = [
      `"${r.testId}"`,
      `"${r.roleName.replace(/"/g, '""')}"`,
      `"${r.url.replace(/"/g, '""')}"`,
      `"${r.expectedStatus}"`,
      `"${r.rbacAccessLevel}"`,
      `"${r.authState.replace(/"/g, '""')}"`,
      `"${r.headersSummary.replace(/"/g, '""')}"`,
      `"${r.result}"`,
    ];
    lines.push(row.join(','));
  }

  return lines.join('\n');
}

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  inferRbacLevel,
  generateMatrixRow,
  buildQAMatrix,
  exportMatrixToMarkdown,
  exportMatrixToCsv,
} from '../src/core/qaMatrixGenerator.ts';
import type { ProfileRecord } from '../src/types/index.ts';

describe('Automated QA Test Matrix & Step Generator Tests', () => {
  const dummyProfiles: ProfileRecord[] = [
    {
      id: 'p1',
      name: 'Super Admin User',
      domain: 'app.acme.com',
      url: 'https://app.acme.com/admin',
      cookies: [{ name: 'token', value: 'xyz', domain: 'app.acme.com', path: '/' }],
      headers: { 'X-Admin-Role': 'SuperAdmin' },
      createdAt: 1700000000000,
      updatedAt: 1700000000000,
    },
    {
      id: 'p2',
      name: 'Banned Fraudulent User',
      domain: 'app.acme.com',
      url: 'https://app.acme.com/dashboard',
      cookies: [],
      storage: { local: { role: 'restricted' } },
      createdAt: 1700000000000,
      updatedAt: 1700000000000,
    },
    {
      id: 'p3',
      name: 'Standard Customer',
      domain: 'app.acme.com',
      url: 'https://app.acme.com/store',
      cookies: [],
      createdAt: 1700000000000,
      updatedAt: 1700000000000,
    },
  ];

  test('should accurately infer RBAC access level from name, headers, and storage', () => {
    assert.equal(inferRbacLevel(dummyProfiles[0]), 'SUPER_ADMIN');
    assert.equal(inferRbacLevel(dummyProfiles[1]), 'DENIED_BLOCKED');
    assert.equal(inferRbacLevel(dummyProfiles[2]), 'STANDARD_USER');

    const auditor = { ...dummyProfiles[2], name: 'Compliance Auditor' };
    assert.equal(inferRbacLevel(auditor), 'READ_ONLY_AUDITOR');

    const vip = { ...dummyProfiles[2], name: 'VIP Gold Member' };
    assert.equal(inferRbacLevel(vip), 'VIP_PREMIUM');
  });

  test('should generate structured matrix row with padded test IDs and expected status', () => {
    const row1 = generateMatrixRow(dummyProfiles[0], 1);
    assert.equal(row1.testId, 'TC-001');
    assert.equal(row1.roleName, 'Super Admin User');
    assert.equal(row1.expectedStatus, 200);
    assert.equal(row1.headersSummary, 'X-Admin-Role');

    const row2 = generateMatrixRow(dummyProfiles[1], 2);
    assert.equal(row2.testId, 'TC-002');
    assert.equal(row2.expectedStatus, 403); // Banned user
    assert.equal(row2.rbacAccessLevel, 'DENIED_BLOCKED');
  });

  test('should build QA matrix and export to Markdown table', () => {
    const matrix = buildQAMatrix(dummyProfiles, 'app.acme.com');
    assert.equal(matrix.rows.length, 3);
    assert.equal(matrix.domain, 'app.acme.com');

    const md = exportMatrixToMarkdown(matrix);
    assert.ok(md.includes('# 📑 QA Test Execution Matrix - app.acme.com'));
    assert.ok(md.includes('| **TC-001** | Super Admin User |'));
    assert.ok(md.includes('| **TC-002** | Banned Fraudulent User |'));
    assert.ok(md.includes('SUPER_ADMIN'));
    assert.ok(md.includes('DENIED_BLOCKED'));
  });

  test('should export QA matrix to CSV format with quoted values', () => {
    const matrix = buildQAMatrix(dummyProfiles, 'app.acme.com');
    const csv = exportMatrixToCsv(matrix);

    const lines = csv.split('\n');
    assert.ok(lines.length >= 4);
    assert.ok(lines[0].includes('Test ID,Role Persona,Target URL'));
    assert.ok(lines[1].includes('"TC-001"'));
    assert.ok(lines[1].includes('"Super Admin User"'));
    assert.ok(lines[2].includes('"TC-002"'));
    assert.ok(lines[2].includes('"DENIED_BLOCKED"'));
  });
});

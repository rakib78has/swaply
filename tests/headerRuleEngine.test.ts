import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildDomainUrlFilter,
  buildDynamicDNRRule,
  parseHeaderInput,
  formatHeadersForDisplay
} from '../src/core/headerRuleEngine.ts';

describe('DNR Header Rule Engine Tests', () => {
  it('should construct valid Declarative Net Request domain filters', () => {
    assert.equal(buildDomainUrlFilter('example.com'), '||example.com^');
    assert.equal(buildDomainUrlFilter('.staging.myapp.io'), '||staging.myapp.io^');
    assert.equal(buildDomainUrlFilter('LOCALHOST'), '||localhost^');
  });

  it('should assemble dynamic modifyHeaders rule correctly', () => {
    const headers = {
      'Authorization': 'Bearer test_token_123',
      'X-QA-Role': 'superadmin',
      'X-Tenant-ID': 'tenant_99'
    };

    const rule = buildDynamicDNRRule(1001, 'api.company.io', headers);
    assert.ok(rule);
    assert.equal(rule.id, 1001);
    assert.equal(rule.priority, 1);
    assert.equal(rule.action.type, 'modifyHeaders');
    assert.equal(rule.condition.urlFilter, '||api.company.io^');
    assert.equal(rule.action.requestHeaders.length, 3);

    const authHeader = rule.action.requestHeaders.find((h) => h.header === 'Authorization');
    assert.equal(authHeader?.operation, 'set');
    assert.equal(authHeader?.value, 'Bearer test_token_123');
  });

  it('should return null when no headers are supplied', () => {
    assert.equal(buildDynamicDNRRule(1002, 'example.com', {}), null);
    assert.equal(buildDynamicDNRRule(1002, 'example.com', { '': 'empty-key' }), null);
  });

  it('should parse raw multiline HTTP header strings', () => {
    const raw = `
      # Comments should be ignored
      Authorization: Bearer secret:key:with:colons
      X-Feature-Flags: new-checkout,v2
      InvalidLineWithoutColon
      X-Role: admin
    `;

    const parsed = parseHeaderInput(raw);
    assert.equal(parsed['Authorization'], 'Bearer secret:key:with:colons');
    assert.equal(parsed['X-Feature-Flags'], 'new-checkout,v2');
    assert.equal(parsed['X-Role'], 'admin');
    assert.equal('InvalidLineWithoutColon' in parsed, false);
  });

  it('should format header records into display text', () => {
    const headers = {
      'X-Role': 'admin',
      'X-Tenant': 'acme'
    };

    const formatted = formatHeadersForDisplay(headers);
    assert.ok(formatted.includes('X-Role: admin'));
    assert.ok(formatted.includes('X-Tenant: acme'));
  });
});

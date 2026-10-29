import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { buildMockRules, parseMockRulesText } from '../src/core/apiMockEngine.ts';

describe('API Mocking & Error Simulator Tests', () => {
  test('should parse multiline mock rules correctly', () => {
    const raw = `
      # Comment line
      500 /api/checkout
      403 /api/admin/users
      200 /api/user {"name":"Mock User","credits":999}
    `;

    const parsed = parseMockRulesText(raw);
    assert.equal(parsed.length, 3);
    assert.equal(parsed[0].statusCode, 500);
    assert.equal(parsed[0].urlPattern, '/api/checkout');
    assert.equal(parsed[2].statusCode, 200);
    assert.match(parsed[2].mockResponseJson || '', /Mock User/);
  });

  test('should generate redirect rule to data URI for mock JSON responses', () => {
    const rules = buildMockRules('example.com', [
      {
        id: 'rule1',
        name: 'Mock User Profile',
        urlPattern: '/api/v1/profile',
        statusCode: 200,
        mockResponseJson: '{"role":"vip","active":true}',
        enabled: true
      }
    ]);

    assert.equal(rules.length, 1);
    assert.equal(rules[0].action.type, 'redirect');
    assert.ok(rules[0].action.redirect?.url?.startsWith('data:application/json'));
    assert.match(rules[0].condition.urlFilter, /example\.com\/api\/v1\/profile/);
  });

  test('should generate error response headers rule for simulated status codes', () => {
    const rules = buildMockRules('example.com', [
      {
        id: 'rule2',
        name: 'Checkout Failure Simulator',
        urlPattern: '/api/pay',
        statusCode: 500,
        enabled: true
      }
    ]);

    assert.equal(rules.length, 1);
    assert.equal(rules[0].action.type, 'modifyHeaders');
    const statusHeader = rules[0].action.responseHeaders?.find((h) => h.header === 'X-QASwitch-Mock-Status');
    assert.equal(statusHeader?.value, '500');
  });

  test('should ignore disabled mock rules', () => {
    const rules = buildMockRules('example.com', [
      {
        id: 'rule3',
        name: 'Disabled Rule',
        urlPattern: '/api/test',
        statusCode: 404,
        enabled: false
      }
    ]);

    assert.equal(rules.length, 0);
  });
});

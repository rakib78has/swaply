import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  validateRewriteRule,
  applyRewriteSubstitution,
  buildDNRRedirectRule,
  parseRewriteRulesText,
  formatRewriteRulesText,
} from '../src/core/urlRewriteEngine.ts';

describe('Dynamic URL & Microservice Gateway Rewrite Tests', () => {
  test('should validate regex and build valid rewrite rule object', () => {
    const valid = validateRewriteRule({
      id: 101,
      name: 'Staging to Local Order Service',
      regexFilter: '^https://api\\.staging\\.com/v1/(.*)',
      substitution: 'http://localhost:3000/v1/\\1',
      enabled: true,
    });

    assert.ok(valid);
    assert.equal(valid.id, 101);
    assert.equal(valid.regexFilter, '^https://api\\.staging\\.com/v1/(.*)');

    // Invalid regex fails
    const invalid = validateRewriteRule({
      regexFilter: '[unclosed-bracket',
      substitution: 'http://localhost:3000',
    });
    assert.equal(invalid, null);
  });

  test('should apply regex substitution to rewrite target URLs', () => {
    const originalUrl = 'https://api.staging.com/v1/users/42/profile';
    const rewritten = applyRewriteSubstitution(
      originalUrl,
      '^https://api\\.staging\\.com/v1/(.*)',
      'http://localhost:8080/v1/$1'
    );
    assert.equal(rewritten, 'http://localhost:8080/v1/users/42/profile');

    // Non-matching URL returns null
    const nonMatching = applyRewriteSubstitution(
      'https://other.domain.com/index.html',
      '^https://api\\.staging\\.com/v1/(.*)',
      'http://localhost:8080/v1/$1'
    );
    assert.equal(nonMatching, null);
  });

  test('should build Chrome Declarative Net Request redirect rule structure', () => {
    const rule = validateRewriteRule({
      id: 501,
      regexFilter: '^https://remote\\.com/(.*)',
      substitution: 'http://localhost:4000/\\1',
    })!;

    const dnrRule = buildDNRRedirectRule(rule);
    assert.equal(dnrRule.id, 501);
    assert.equal(dnrRule.action.type, 'redirect');
    assert.equal(dnrRule.action.redirect.regexSubstitution, 'http://localhost:4000/\\1');
    assert.equal(dnrRule.condition.regexFilter, '^https://remote\\.com/(.*)');
  });

  test('should parse and format multiline rewrite definitions', () => {
    const raw = `
      # Mocking user service
      ^https://api\\.prod\\.com/users/(.*) -> http://localhost:5001/users/$1
      # Mocking billing service
      ^https://api\\.prod\\.com/billing/(.*) -> http://localhost:5002/billing/$1
    `;

    const parsed = parseRewriteRulesText(raw);
    assert.equal(parsed.length, 2);
    assert.equal(parsed[0].regexFilter, '^https://api\\.prod\\.com/users/(.*)');
    assert.equal(parsed[0].substitution, 'http://localhost:5001/users/$1');

    const formatted = formatRewriteRulesText(parsed);
    assert.ok(formatted.includes('http://localhost:5001/users/$1'));
  });
});

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  getAvailablePersonaTemplates,
  synthesizeRoleFromTemplate,
  encodeMockJwt
} from '../src/core/roleSynthesizer.ts';

describe('AI Persona Synthesizer Tests', () => {
  test('should provide built-in presets across ECommerce, SaaS, and Security categories', () => {
    const templates = getAvailablePersonaTemplates();
    assert.ok(templates.length >= 6);

    const categories = new Set(templates.map((t) => t.category));
    assert.ok(categories.has('ECOMMERCE'));
    assert.ok(categories.has('SAAS'));
    assert.ok(categories.has('SECURITY'));
  });

  test('should synthesize a complete VIP Gold Shopper with realistic JWT and storage', () => {
    const profile = synthesizeRoleFromTemplate('myshop.com', 'ecommerce_vip');

    assert.equal(profile.name, 'VIP Shopper');
    assert.equal(profile.domain, 'myshop.com');
    assert.equal(profile.colorTheme, 'purple');

    // Check JWT in app_session cookie
    const sessionCookie = profile.cookies.find((c) => c.name === 'app_session');
    assert.ok(sessionCookie);
    assert.match(sessionCookie.value, /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/);

    // Check localStorage
    assert.equal(profile.storage.local['user_tier'], 'gold');

    // Check headers
    assert.ok(profile.headers?.['Authorization']?.startsWith('Bearer '));
    assert.equal(profile.headers?.['X-Customer-Tier'], 'VIP-Gold');
  });

  test('should synthesize Security SQLi persona with proper payloads', () => {
    const sqliProfile = synthesizeRoleFromTemplate('target.local', 'security_sqli');

    assert.ok(sqliProfile.name.includes("' OR '1'='1"));
    const probeCookie = sqliProfile.cookies.find((c) => c.name === 'probe_session');
    assert.ok(probeCookie?.value.includes("' OR '1'='1"));
  });

  test('should encode custom claims into valid JWT structure', () => {
    const jwt = encodeMockJwt({ user: 'tester', role: 'admin' });
    const parts = jwt.split('.');
    assert.equal(parts.length, 3);

    const decodedHeader = JSON.parse(Buffer.from(parts[0], 'base64url').toString('utf8'));
    assert.equal(decodedHeader.alg, 'HS256');

    const decodedPayload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'));
    assert.equal(decodedPayload.user, 'tester');
    assert.equal(decodedPayload.role, 'admin');
  });
});

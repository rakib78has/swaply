import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  exportToPlaywrightStorageState,
  exportToPostmanEnvironment,
  exportToCypressSnippet,
  mapSameSiteToPlaywright
} from '../src/core/testSuiteExporter.ts';
import type { ProfileRecord } from '../src/types/index.ts';

const mockProfile: ProfileRecord = {
  id: 'prof_test_123',
  name: 'Admin Tester',
  createdAt: 1700000000000,
  domain: 'app.example.com',
  url: 'https://app.example.com/dashboard',
  cookies: [
    {
      name: 'auth_token',
      value: 'jwt_admin_secret_999',
      domain: 'app.example.com',
      path: '/',
      secure: true,
      httpOnly: true,
      sameSite: 'no_restriction',
      expirationDate: 1750000000
    },
    {
      name: 'theme',
      value: 'dark',
      domain: 'app.example.com',
      path: '/',
      secure: false,
      httpOnly: false,
      sameSite: 'lax'
    }
  ],
  storage: {
    local: {
      userId: 'usr_admin_1',
      permissions: 'all'
    },
    session: {}
  },
  headers: {
    Authorization: 'Bearer jwt_admin_secret_999',
    'X-Role': 'admin'
  }
};

describe('Test Suite Exporter Tests', () => {
  test('should map SameSite cookies to strict Playwright format', () => {
    assert.equal(mapSameSiteToPlaywright('no_restriction'), 'None');
    assert.equal(mapSameSiteToPlaywright('lax'), 'Lax');
    assert.equal(mapSameSiteToPlaywright('strict'), 'Strict');
    assert.equal(mapSameSiteToPlaywright(undefined), 'Lax');
  });

  test('should generate valid Playwright storageState structure', () => {
    const pwState = exportToPlaywrightStorageState(mockProfile);

    assert.equal(pwState.cookies.length, 2);
    assert.equal(pwState.cookies[0].name, 'auth_token');
    assert.equal(pwState.cookies[0].sameSite, 'None');
    assert.equal(pwState.cookies[0].secure, true);

    assert.equal(pwState.origins.length, 1);
    assert.equal(pwState.origins[0].origin, 'https://app.example.com');
    assert.equal(pwState.origins[0].localStorage.length, 2);
    assert.equal(pwState.origins[0].localStorage[0].name, 'userId');
  });

  test('should generate Postman environment JSON with cookies and headers', () => {
    const postman = exportToPostmanEnvironment(mockProfile);

    assert.equal(postman._postman_variable_scope, 'environment');
    assert.equal(postman.id, 'env_prof_test_123');

    const authCookieVar = postman.values.find((v) => v.key === 'cookie_auth_token');
    assert.ok(authCookieVar);
    assert.equal(authCookieVar.value, 'jwt_admin_secret_999');

    const authHeaderVar = postman.values.find((v) => v.key === 'header_authorization');
    assert.ok(authHeaderVar);
    assert.equal(authHeaderVar.value, 'Bearer jwt_admin_secret_999');
  });

  test('should generate executable Cypress commands snippet', () => {
    const snippet = exportToCypressSnippet(mockProfile);

    assert.match(snippet, /cy\.setCookie\('auth_token'/);
    assert.match(snippet, /cy\.window\(\)/);
    assert.match(snippet, /win\.localStorage\.setItem\('userId'/);
  });
});

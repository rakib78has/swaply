import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { isJWT, inspectJWT, extractJWTsFromSession } from '../src/core/jwtInspector.ts';

describe('JWT Inspector Regression Tests', () => {
  // Helper to create a fake JWT
  function createTestJWT(header: object, payload: object): string {
    const b64 = (obj: object) => Buffer.from(JSON.stringify(obj)).toString('base64url');
    return `${b64(header)}.${b64(payload)}.fake_signature_bytes`;
  }

  it('should identify valid and invalid JWT strings accurately', () => {
    const valid = createTestJWT({ alg: 'HS256' }, { sub: '12345' });
    assert.equal(isJWT(valid), true);
    assert.equal(isJWT('not-a-token'), false);
    assert.equal(isJWT(''), false);
    assert.equal(isJWT(null), false);
    assert.equal(isJWT('header.payload'), false); // Only 2 parts
  });

  it('should decode JWT header, payload, and claims', () => {
    const expFuture = Math.floor(Date.now() / 1000) + 3600; // 1 hour in future
    const token = createTestJWT(
      { alg: 'RS256', typ: 'JWT' },
      { sub: 'usr_admin_001', role: 'admin', exp: expFuture, email: 'admin@corp.io' }
    );

    const inspected = inspectJWT<{ sub: string; role: string; email: string }>(token);
    assert.ok(inspected);
    assert.equal(inspected.header.alg, 'RS256');
    assert.equal(inspected.payload.sub, 'usr_admin_001');
    assert.equal(inspected.payload.role, 'admin');
    assert.equal(inspected.isExpired, false);
    assert.ok(inspected.expiresInSeconds && inspected.expiresInSeconds > 0);
  });

  it('should detect expired tokens and format expiration notices', () => {
    const expPast = Math.floor(Date.now() / 1000) - 1800; // 30 minutes in past
    const token = createTestJWT({ alg: 'HS256' }, { exp: expPast });

    const inspected = inspectJWT(token);
    assert.ok(inspected);
    assert.equal(inspected.isExpired, true);
    assert.ok(inspected.formattedExpiration?.includes('Expired'));
  });

  it('should scan cookies and localStorage for active JWTs', () => {
    const token1 = createTestJWT({ alg: 'HS256' }, { role: 'admin' });
    const token2 = createTestJWT({ alg: 'HS256' }, { role: 'user' });

    const cookies = [
      { name: 'session_jwt', value: token1 },
      { name: 'regular_cookie', value: 'plain_value' }
    ];
    const storage = {
      authToken: token2,
      theme: 'dark'
    };

    const detected = extractJWTsFromSession(cookies, storage);
    assert.equal(detected.length, 2);
    assert.equal(detected.find((d) => d.name === 'session_jwt')?.source, 'cookie');
    assert.equal(detected.find((d) => d.name === 'authToken')?.source, 'storage');
  });
});


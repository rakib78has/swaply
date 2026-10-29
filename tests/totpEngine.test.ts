import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  decodeBase32,
  getRemainingTotpSeconds,
  getCurrentTotpCounter,
  generateTotpCode,
  buildOtpAutoFillScript
} from '../src/core/totpEngine.ts';

describe('2FA / TOTP Authenticator Engine Tests', () => {
  // Standard test vector RFC 6238 key: "JBSWY3DPEHPK3PXP" (base32 for "Hello!\xde\xad\xbe\xef")
  const testSecret = 'JBSWY3DPEHPK3PXP';

  test('should decode base32 strings accurately', () => {
    const bytes = decodeBase32('JBSWY3DPEHPK3PXP');
    assert.ok(bytes instanceof Uint8Array);
    assert.equal(bytes.length, 10);
  });

  test('should calculate remaining seconds countdown accurately', () => {
    // 1700000010 % 30 is 0. 1700000020 % 30 is 10.
    const epochSec = 1700000020; // 10 seconds into a 30s window
    const remaining = getRemainingTotpSeconds(epochSec * 1000, 30);
    assert.equal(remaining, 20);

    const counter = getCurrentTotpCounter(epochSec * 1000, 30);
    assert.equal(counter, Math.floor(epochSec / 30));
  });

  test('should generate 6-digit TOTP code for timestamp', async () => {
    const code = await generateTotpCode(testSecret, 1700000000000);
    assert.equal(typeof code, 'string');
    assert.equal(code.length, 6);
    assert.match(code, /^[0-9]{6}$/);
  });

  test('should throw error for invalid base32 secret', async () => {
    await assert.rejects(async () => {
      await generateTotpCode('');
    }, /Invalid Base32 secret/);
  });

  test('should generate auto-fill script containing target code', () => {
    const script = buildOtpAutoFillScript('987654');
    assert.ok(script.includes('987654'));
    assert.ok(script.includes('one-time-code'));
  });
});

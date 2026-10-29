import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { encryptSessionData, decryptSessionData } from '../src/core/cryptoUtils.ts';

describe('Web Crypto E2E Encryption Tests', () => {
  it('should encrypt and decrypt arbitrary session payloads accurately', async () => {
    const payload = {
      user: 'admin@company.io',
      role: 'superadmin',
      tokens: {
        jwt: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
        refreshToken: 'rt_999888'
      },
      cookies: [
        { name: 'session_id', value: 'secret_val_123', domain: 'staging.company.io', path: '/' }
      ]
    };

    const passphrase = 'UltraSecureTeamPassword!2026';
    const encrypted = await encryptSessionData(payload, passphrase);

    assert.ok(encrypted.startsWith('qas_enc_'));
    assert.notEqual(encrypted, JSON.stringify(payload));

    const decrypted = await decryptSessionData<typeof payload>(encrypted, passphrase);
    assert.deepEqual(decrypted, payload);
  });

  it('should reject decryption when the passphrase is incorrect', async () => {
    const payload = { secret: 'sensitive_qa_token' };
    const encrypted = await encryptSessionData(payload, 'CorrectPassword123');

    await assert.rejects(
      async () => {
        await decryptSessionData(encrypted, 'WrongPassword456');
      },
      /Incorrect passphrase or corrupted encrypted payload/
    );
  });

  it('should reject corrupted ciphertext or malformed prefix', async () => {
    await assert.rejects(
      async () => {
        await decryptSessionData('not_an_encrypted_payload', 'pass');
      },
      /Invalid encrypted QASwitch payload format/
    );

    await assert.rejects(
      async () => {
        await decryptSessionData('qas_enc_onlyonesegment', 'pass');
      },
      /Malformed encrypted payload segments/
    );
  });
});


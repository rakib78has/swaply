import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  maskEmail,
  maskCreditCard,
  scrubText,
  scrubObject
} from '../src/core/piiScrubber.ts';

describe('GDPR & PII Privacy Scrubber Tests', () => {
  test('should mask email addresses while preserving domain', () => {
    assert.equal(maskEmail('alex@enterprise.com'), 'a***x@enterprise.com');
    assert.equal(maskEmail('qa@test.io'), 'q***@test.io');
  });

  test('should mask 16-digit credit cards leaving only last 4 digits', () => {
    assert.equal(maskCreditCard('4111 2222 3333 4567'), '****-****-****-4567');
  });

  test('should scrub arbitrary strings containing mixed sensitive data', () => {
    const raw = 'User alice@test.com with card 1234-5678-9012-3456 and token Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.xyz.secret';
    const scrubbed = scrubText(raw);

    assert.ok(!scrubbed.includes('alice@test.com'));
    assert.ok(scrubbed.includes('a***e@test.com'));
    assert.ok(!scrubbed.includes('1234-5678-9012-3456'));
    assert.ok(scrubbed.includes('****-****-****-3456'));
    assert.ok(scrubbed.includes('Bearer eyJhbGciOi...secret'));
  });

  test('should deeply scrub nested objects and arrays', () => {
    const payload = {
      user: {
        email: 'developer@domain.org',
        profile: {
          card: '4000-1234-5678-9999'
        }
      },
      tags: ['contact: john@gmail.com']
    };

    const clean = scrubObject(payload);
    assert.ok(clean.user.email.includes('d***r@domain.org'));
    assert.ok(clean.user.profile.card.includes('****-****-****-9999'));
    assert.ok(clean.tags[0].includes('j***n@gmail.com'));
  });
});

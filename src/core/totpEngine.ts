/**
 * Built-in 2FA / TOTP Authenticator Engine (RFC 6238)
 * Generates 6-digit Time-based One-Time Passwords from shared secrets and builds auto-fill DOM scripts.
 */

const BASE32_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

export function decodeBase32(encoded: string): Uint8Array {
  const clean = encoded.toUpperCase().replace(/[\s=-]/g, '');
  let bits = 0;
  let value = 0;
  const output: number[] = [];

  for (let i = 0; i < clean.length; i++) {
    const val = BASE32_CHARS.indexOf(clean[i]);
    if (val === -1) continue;

    value = (value << 5) | val;
    bits += 5;

    if (bits >= 8) {
      output.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }

  return new Uint8Array(output);
}

export function getRemainingTotpSeconds(nowMs: number = Date.now(), stepSeconds = 30): number {
  const currentSeconds = Math.floor(nowMs / 1000);
  return stepSeconds - (currentSeconds % stepSeconds);
}

export function getCurrentTotpCounter(nowMs: number = Date.now(), stepSeconds = 30): number {
  return Math.floor(nowMs / 1000 / stepSeconds);
}

/**
 * Pure HMAC-SHA1 calculation using Web Crypto API (supported across Node.js 18+ and Chrome MV3)
 */
export async function generateTotpCode(
  secret: string,
  timestampMs: number = Date.now(),
  stepSeconds = 30,
  digits = 6
): Promise<string> {
  const keyBytes = decodeBase32(secret);
  if (keyBytes.length === 0) {
    throw new Error('Invalid Base32 secret key');
  }

  const counter = Math.floor(timestampMs / 1000 / stepSeconds);
  const counterBuffer = new ArrayBuffer(8);
  const view = new DataView(counterBuffer);
  // Big-endian 64-bit integer
  view.setUint32(0, Math.floor(counter / 0x100000000));
  view.setUint32(4, counter >>> 0);

  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyBytes,
    { name: 'HMAC', hash: 'SHA-1' },
    false,
    ['sign']
  );

  const signature = await crypto.subtle.sign('HMAC', cryptoKey, counterBuffer);
  const sigBytes = new Uint8Array(signature);

  const offset = sigBytes[sigBytes.length - 1] & 0x0f;
  const binary =
    ((sigBytes[offset] & 0x7f) << 24) |
    ((sigBytes[offset + 1] & 0xff) << 16) |
    ((sigBytes[offset + 2] & 0xff) << 8) |
    (sigBytes[offset + 3] & 0xff);

  const otp = binary % Math.pow(10, digits);
  return otp.toString().padStart(digits, '0');
}

/**
 * Generates client-side DOM injection script that finds common OTP/2FA input fields and autofills the code
 */
export function buildOtpAutoFillScript(code: string): string {
  const safeCode = JSON.stringify(code);
  return `
    (() => {
      const code = ${safeCode};
      const selectors = [
        'input[autocomplete="one-time-code"]',
        'input[name*="otp" i]',
        'input[name*="2fa" i]',
        'input[name*="code" i]',
        'input[id*="otp" i]',
        'input[id*="2fa" i]',
        'input[placeholder*="code" i]',
        'input[type="tel"][maxlength="6"]',
        'input[type="text"][maxlength="6"]'
      ];

      for (const sel of selectors) {
        const input = document.querySelector(sel);
        if (input) {
          input.value = code;
          input.dispatchEvent(new Event('input', { bubbles: true }));
          input.dispatchEvent(new Event('change', { bubbles: true }));
          break;
        }
      }
    })();
  `;
}

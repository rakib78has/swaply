/**
 * End-to-End Encryption Utilities for QASwitch Sessions
 * Uses Web Crypto API (AES-GCM 256-bit + PBKDF2) for secure team session sharing.
 */

const PBKDF2_ITERATIONS = 100000;
const ALGORITHM = "AES-GCM";
const PREFIX = "qas_enc_";

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

/**
 * Derives an AES-GCM CryptoKey from a passphrase and salt using PBKDF2
 */
async function deriveKey(passphrase: string, salt: Uint8Array): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const baseKey = await crypto.subtle.importKey(
    "raw",
    encoder.encode(passphrase),
    "PBKDF2",
    false,
    ["deriveKey"]
  );

  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: salt as unknown as BufferSource,
      iterations: PBKDF2_ITERATIONS,
      hash: "SHA-256"
    },
    baseKey,
    { name: ALGORITHM, length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

/**
 * Encrypts arbitrary serializable data using AES-GCM with a passphrase.
 * Returns format: "qas_enc_<salt_b64>.<iv_b64>.<ciphertext_b64>"
 */
export async function encryptSessionData(data: unknown, passphrase: string): Promise<string> {
  if (!passphrase || typeof passphrase !== "string") {
    throw new Error("Passphrase is required for encrypted export");
  }

  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(passphrase, salt);

  const encoder = new TextEncoder();
  const plaintext = encoder.encode(JSON.stringify(data));

  const ciphertext = await crypto.subtle.encrypt(
    { name: ALGORITHM, iv: iv as unknown as BufferSource },
    key,
    plaintext
  );

  const saltB64 = arrayBufferToBase64(salt.buffer);
  const ivB64 = arrayBufferToBase64(iv.buffer);
  const cipherB64 = arrayBufferToBase64(ciphertext);

  return `${PREFIX}${saltB64}.${ivB64}.${cipherB64}`;
}

/**
 * Decrypts a "qas_enc_..." string using the matching passphrase.
 */
export async function decryptSessionData<T = unknown>(encryptedPayload: string, passphrase: string): Promise<T> {
  if (!encryptedPayload || !encryptedPayload.startsWith(PREFIX)) {
    throw new Error("Invalid encrypted QASwitch payload format");
  }

  const payload = encryptedPayload.slice(PREFIX.length);
  const parts = payload.split(".");
  if (parts.length !== 3) {
    throw new Error("Malformed encrypted payload segments");
  }

  const [saltB64, ivB64, cipherB64] = parts;
  const salt = new Uint8Array(base64ToArrayBuffer(saltB64));
  const iv = new Uint8Array(base64ToArrayBuffer(ivB64));
  const ciphertext = base64ToArrayBuffer(cipherB64);

  const key = await deriveKey(passphrase, salt);

  try {
    const decrypted = await crypto.subtle.decrypt(
      { name: ALGORITHM, iv: iv as unknown as BufferSource },
      key,
      ciphertext
    );

    const decoder = new TextDecoder();
    return JSON.parse(decoder.decode(decrypted)) as T;
  } catch {
    throw new Error("Incorrect passphrase or corrupted encrypted payload");
  }
}


/**
 * GDPR & PII Data Masker / Privacy Scrubber
 * Sanitizes emails, credit cards, phone numbers, and auth tokens from sessions before team sharing or ticket creation.
 */

const EMAIL_REGEX = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g;
const CREDIT_CARD_REGEX = /\b(?:\d{4}[ -]?){3}(\d{4})\b/g;
const PHONE_REGEX = /\b(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?(\d{4})\b/g;
const JWT_AUTH_REGEX = /Bearer\s+([A-Za-z0-9-_]{10})[A-Za-z0-9-_.]+([A-Za-z0-9-_]{6})/g;

export function maskEmail(email: string): string {
  const [local, domain] = email.split('@');
  if (!domain) return email;
  const maskedLocal = local.length > 2 ? `${local[0]}***${local[local.length - 1]}` : `${local[0]}***`;
  return `${maskedLocal}@${domain}`;
}

export function maskCreditCard(card: string): string {
  const digits = card.replace(/\D/g, '');
  if (digits.length < 4) return '****';
  const last4 = digits.slice(-4);
  return `****-****-****-${last4}`;
}

export function scrubText(text: string): string {
  if (!text || typeof text !== 'string') return text;

  let result = text;

  // Mask Emails
  result = result.replace(EMAIL_REGEX, (match) => maskEmail(match));

  // Mask Credit Cards
  result = result.replace(CREDIT_CARD_REGEX, (_match, last4) => `****-****-****-${last4}`);

  // Mask Phones
  result = result.replace(PHONE_REGEX, (_match, last4) => `***-***-${last4}`);

  // Mask Bearer Tokens
  result = result.replace(JWT_AUTH_REGEX, (_match, prefix, suffix) => `Bearer ${prefix}...${suffix}`);

  return result;
}

export function scrubObject<T>(input: T): T {
  if (input === null || typeof input !== 'object') {
    if (typeof input === 'string') {
      return scrubText(input) as unknown as T;
    }
    return input;
  }

  if (Array.isArray(input)) {
    return input.map((item) => scrubObject(item)) as unknown as T;
  }

  const output: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(input as Record<string, unknown>)) {
    output[key] = scrubObject(val);
  }

  return output as T;
}

/**
 * AI Smart Form Filler & Realistic Seed Data Generator Engine
 * Generates context-aware, realistic mock data and dispatches synthetic input events for modern SPAs.
 */

import type { FakerFieldType } from '../types/index.ts';

const SAMPLE_NAMES = [
  'Alex Morgan',
  'Sarah Jenkins',
  'Tanvir Ahmed',
  'Elena Rostova',
  'David Kim',
  'Amina Yusuf',
  'Marcus Vance',
  'Priya Patel',
  'Carlos Gomez',
  'Jordan Lee',
];

const SAMPLE_COMPANIES = [
  'Acme Cloud Corp',
  'Nexus Cybernetics',
  'Apex Fintech Group',
  'Starlight Logistics',
  'Hyperion Labs',
  'Vanguard Retail',
];

const SAMPLE_ADDRESSES = [
  '742 Evergreen Terrace, Springfield, OR 97477',
  '221B Baker Street, London, NW1 6XE',
  '450 Serra Mall, Stanford, CA 94305',
  '100 Innovation Way, Austin, TX 78701',
];

/**
 * Validates a credit card number using Luhn 10 algorithm.
 */
export function validateLuhn(cardNumber: string): boolean {
  const digits = cardNumber.replace(/\D/g, '');
  if (digits.length < 13 || digits.length > 19) return false;

  let sum = 0;
  let alternate = false;

  for (let i = digits.length - 1; i >= 0; i--) {
    let n = parseInt(digits.charAt(i), 10);
    if (alternate) {
      n *= 2;
      if (n > 9) n = (n % 10) + 1;
    }
    sum += n;
    alternate = !alternate;
  }

  return sum % 10 === 0;
}

/**
 * Generates a valid Visa-like 16-digit credit card number passing Luhn 10.
 */
export function generateValidCreditCard(): string {
  // 15 digits starting with 4 (Visa prefix)
  const base = '453201511283036';
  let sum = 0;
  for (let i = 0; i < 15; i++) {
    let digit = parseInt(base.charAt(i), 10);
    if (i % 2 === 0) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
  }
  const checkDigit = (10 - (sum % 10)) % 10;
  return `${base}${checkDigit}`;
}

/**
 * Detects the semantic field type from input tag, type attribute, name, and placeholder.
 */
export function detectFieldType(
  nameAttr = '',
  typeAttr = 'text',
  placeholderAttr = ''
): FakerFieldType {
  const text = `${nameAttr} ${typeAttr} ${placeholderAttr}`.toLowerCase();

  if (typeAttr === 'email' || text.includes('email') || text.includes('mail')) {
    return 'email';
  }
  if (typeAttr === 'password' || text.includes('pass') || text.includes('pwd')) {
    return 'password';
  }
  if (
    typeAttr === 'tel' ||
    text.includes('phone') ||
    text.includes('mobile') ||
    text.includes('cell') ||
    text.includes('tel')
  ) {
    return 'phone';
  }
  if (
    text.includes('card') ||
    text.includes('cc_') ||
    text.includes('credit') ||
    /(^|[_\s-])pan([_\s-]|$)/.test(text)
  ) {
    return 'creditCard';
  }
  if (
    text.includes('company') ||
    text.includes('org') ||
    text.includes('corp') ||
    text.includes('business')
  ) {
    return 'company';
  }
  if (
    text.includes('address') ||
    text.includes('street') ||
    text.includes('city') ||
    text.includes('zip') ||
    text.includes('postal')
  ) {
    return 'address';
  }
  if (
    text.includes('first_name') ||
    text.includes('last_name') ||
    text.includes('name') ||
    text.includes('user') ||
    text.includes('author')
  ) {
    return 'name';
  }
  if (typeAttr === 'date' || text.includes('date') || text.includes('birth') || text.includes('dob')) {
    return 'date';
  }
  if (typeAttr === 'number' || text.includes('qty') || text.includes('count') || text.includes('amount')) {
    return 'number';
  }
  if (text.includes('uuid') || text.includes('guid') || text.includes('token_id')) {
    return 'uuid';
  }

  return 'text';
}

/**
 * Generates realistic fake data for a given field type.
 */
export function generateFakeValue(fieldType: FakerFieldType, index = 0): string {
  switch (fieldType) {
    case 'email':
      return `qa.tester_${(Date.now() % 10000) + index}@qa-sandbox.io`;
    case 'name':
      return SAMPLE_NAMES[index % SAMPLE_NAMES.length];
    case 'phone':
      return `+1-555-${String(100 + (index % 900))}-${String(1000 + (index % 9000))}`;
    case 'creditCard':
      return generateValidCreditCard();
    case 'password':
      return 'P@ssw0rd!2026#QA';
    case 'company':
      return SAMPLE_COMPANIES[index % SAMPLE_COMPANIES.length];
    case 'address':
      return SAMPLE_ADDRESSES[index % SAMPLE_ADDRESSES.length];
    case 'date':
      return '2026-05-15';
    case 'number':
      return String(42 + index);
    case 'uuid':
      return '9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d';
    case 'text':
    default:
      return 'Automated QA test verification content.';
  }
}

/**
 * Builds the in-page client script that auto-fills all matching inputs.
 */
export function buildFormFillerScript(options: { onlyEmpty?: boolean } = { onlyEmpty: true }): string {
  const onlyEmpty = Boolean(options.onlyEmpty);

  return `
    (() => {
      let filledCount = 0;
      const inputs = document.querySelectorAll('input:not([type="hidden"]):not([type="submit"]):not([type="button"]):not([type="checkbox"]):not([type="radio"]), textarea');

      function detect(name, type, ph) {
        const text = (name + ' ' + type + ' ' + ph).toLowerCase();
        if (type === 'email' || text.includes('email')) return 'email';
        if (type === 'password' || text.includes('pass')) return 'password';
        if (type === 'tel' || text.includes('phone') || text.includes('mobile')) return 'phone';
        if (text.includes('card') || text.includes('credit')) return 'creditCard';
        if (text.includes('company') || text.includes('org')) return 'company';
        if (text.includes('address') || text.includes('street') || text.includes('city') || text.includes('zip')) return 'address';
        if (text.includes('name') || text.includes('user')) return 'name';
        if (type === 'date' || text.includes('date')) return 'date';
        if (type === 'number' || text.includes('qty')) return 'number';
        return 'text';
      }

      function getVal(kind, idx) {
        if (kind === 'email') return 'qa.tester_' + (Date.now() % 1000) + '@example.com';
        if (kind === 'name') return 'Alex Morgan';
        if (kind === 'password') return 'P@ssw0rd!2026#QA';
        if (kind === 'phone') return '+1-555-019-2834';
        if (kind === 'creditCard') return '4532015112830366';
        if (kind === 'company') return 'Acme QA Cloud Inc';
        if (kind === 'address') return '742 Evergreen Terrace, Springfield, OR';
        if (kind === 'date') return '2026-05-15';
        if (kind === 'number') return '5';
        return 'Automated QA verification input.';
      }

      inputs.forEach((input, idx) => {
        if (${onlyEmpty} && input.value && input.value.trim() !== '') {
          return;
        }

        const name = input.getAttribute('name') || input.id || '';
        const type = (input.getAttribute('type') || 'text').toLowerCase();
        const ph = input.getAttribute('placeholder') || '';

        const kind = detect(name, type, ph);
        const val = getVal(kind, idx);

        // Native value setter to trigger React/Vue setters
        const nativeSetter = Object.getOwnPropertyDescriptor(
          input instanceof HTMLTextAreaElement ? window.HTMLTextAreaElement.prototype : window.HTMLInputElement.prototype,
          'value'
        )?.set;

        if (nativeSetter) {
          nativeSetter.call(input, val);
        } else {
          input.value = val;
        }

        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.dispatchEvent(new Event('change', { bubbles: true }));
        input.dispatchEvent(new Event('blur', { bubbles: true }));
        filledCount++;
      });

      return filledCount;
    })();
  `;
}

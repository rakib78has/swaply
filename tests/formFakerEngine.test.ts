import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  detectFieldType,
  generateFakeValue,
  validateLuhn,
  generateValidCreditCard,
  buildFormFillerScript,
} from '../src/core/formFakerEngine.ts';

describe('AI Smart Form Filler & Faker Engine Tests', () => {
  test('should detect semantic field types from input name, type, and placeholder', () => {
    assert.equal(detectFieldType('user_email', 'text', 'Enter work email'), 'email');
    assert.equal(detectFieldType('password', 'password', 'Enter secret password'), 'password');
    assert.equal(detectFieldType('mobile_phone', 'tel', 'Your phone number'), 'phone');
    assert.equal(detectFieldType('card_number', 'text', 'Credit card number'), 'creditCard');
    assert.equal(detectFieldType('company_name', 'text', 'Organization'), 'company');
    assert.equal(detectFieldType('shipping_address', 'text', 'Street address'), 'address');
    assert.equal(detectFieldType('full_name', 'text', 'Full name'), 'name');
    assert.equal(detectFieldType('order_qty', 'number', 'Quantity'), 'number');
  });

  test('should generate valid credit card passing Luhn 10 algorithm', () => {
    const card = generateValidCreditCard();
    assert.equal(card.length, 16);
    assert.equal(card.startsWith('4'), true);
    assert.equal(validateLuhn(card), true);

    // Invalid cards should fail Luhn
    assert.equal(validateLuhn('4532015112830367'), false);
    assert.equal(validateLuhn('12345'), false);
  });

  test('should generate contextual fake values for each field type', () => {
    const name = generateFakeValue('name');
    assert.ok(name.length > 2);

    const email = generateFakeValue('email');
    assert.ok(email.includes('@'));

    const phone = generateFakeValue('phone');
    assert.ok(phone.startsWith('+1-555'));

    const date = generateFakeValue('date');
    assert.equal(/^\d{4}-\d{2}-\d{2}$/.test(date), true);

    const uuid = generateFakeValue('uuid');
    assert.equal(uuid.length, 36);
  });

  test('should generate client script with native value setters and synthetic events', () => {
    const script = buildFormFillerScript({ onlyEmpty: true });
    assert.ok(script.includes('document.querySelectorAll'));
    assert.ok(script.includes('nativeSetter'));
    assert.ok(script.includes("new Event('input', { bubbles: true })"));
  });
});

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { generateBugReportMarkdown } from '../src/core/bugReporter.ts';

describe('Bug Reporter Generator Tests', () => {
  test('should generate complete, structured Markdown bug report', () => {
    const report = generateBugReportMarkdown({
      title: 'Checkout button disabled unexpectedly',
      description: 'Clicking pay now button triggers no response and remains disabled.',
      domain: 'shop.example.com',
      currentUrl: 'https://shop.example.com/cart',
      activeRoleName: 'Buyer Role',
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
      timestamp: 1700000000000,
      cookiesCount: 5,
      storageKeysCount: 12,
      headers: {
        Authorization: 'Bearer buyer_token_123',
        'X-Tenant-ID': 'org_qa'
      },
      jwtSummary: 'JWT Valid (Subject: buyer_123, Expires: in 45m)',
      consoleErrors: [
        'Uncaught TypeError: Cannot read properties of undefined (reading "charge")',
        'POST https://shop.example.com/api/pay 400 (Bad Request)'
      ],
      screenshotDataUri: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII='
    });

    assert.match(report, /# 🐞 \[Bug\]: Checkout button disabled unexpectedly/);
    assert.match(report, /Active Role:\*\* `Buyer Role`/);
    assert.match(report, /Cookies Attached:\*\* `5` cookies/);
    assert.match(report, /Authorization: Bearer buyer_token_123/);
    assert.match(report, /Uncaught TypeError: Cannot read properties/);
    assert.match(report, /!\[Bug Screenshot\]\(data:image\/png;base64,/);
    assert.match(report, /Steps to Reproduce with QASwitch/);
  });
});

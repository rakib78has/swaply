import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { generateCurlCommand } from '../src/core/curlGenerator.ts';
import type { SessionCookie } from '../src/types/index.ts';

describe('cURL Command Generator Tests', () => {
  it('should generate valid cURL command with cookie header', () => {
    const cookies: SessionCookie[] = [
      { name: 'session_id', value: 'token_123', domain: 'api.dev', path: '/' },
      { name: 'role', value: 'admin', domain: 'api.dev', path: '/' }
    ];

    const curl = generateCurlCommand('https://api.dev/v1/users', cookies);

    assert.ok(curl.startsWith("curl -X GET 'https://api.dev/v1/users'"));
    assert.ok(curl.includes("-H 'Cookie: session_id=token_123; role=admin'"));
  });

  it('should support custom HTTP methods and additional headers', () => {
    const cookies: SessionCookie[] = [
      { name: 'auth', value: 'secret', domain: 'api.dev', path: '/' }
    ];

    const curl = generateCurlCommand('https://api.dev/v1/orders', cookies, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Requested-With': 'XMLHttpRequest'
      }
    });

    assert.ok(curl.includes('curl -X POST'));
    assert.ok(curl.includes("-H 'Content-Type: application/json'"));
    assert.ok(curl.includes("-H 'X-Requested-With: XMLHttpRequest'"));
  });

  it('should escape single quotes safely in URLs and cookies', () => {
    const cookies: SessionCookie[] = [
      { name: 'tricky', value: "val'with'quotes", domain: 'api.dev', path: '/' }
    ];

    const curl = generateCurlCommand("https://api.dev/search?q=it's", cookies);
    assert.ok(!curl.includes("it's")); // escaped
  });
});


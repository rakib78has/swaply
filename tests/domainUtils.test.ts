import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { extractValidDomain, slugifyProfileName } from '../src/core/domainUtils.ts';

describe('Domain Utils Regression Tests', () => {
  it('should accept valid standard web domains', () => {
    assert.equal(extractValidDomain('https://example.com/login'), 'example.com');
    assert.equal(extractValidDomain('https://sub.staging.mycompany.io/dashboard'), 'sub.staging.mycompany.io');
    assert.equal(extractValidDomain('http://localhost:3000/app'), 'localhost');
    assert.equal(extractValidDomain('http://127.0.0.1:8080/'), '127.0.0.1');
  });

  it('should reject restricted internal browser protocols', () => {
    assert.equal(extractValidDomain('chrome://extensions'), null);
    assert.equal(extractValidDomain('chrome://settings'), null);
    assert.equal(extractValidDomain('chrome-extension://abcdef/popup.html'), null);
    assert.equal(extractValidDomain('edge://settings'), null);
    assert.equal(extractValidDomain('about:blank'), null);
    assert.equal(extractValidDomain('devtools://devtools/bundled/inspector.html'), null);
    assert.equal(extractValidDomain('file:///C:/Users/file.html'), null);
  });

  it('should reject Chrome Web Store domains due to extension sandboxing rules', () => {
    assert.equal(extractValidDomain('https://chromewebstore.google.com/detail/123'), null);
    assert.equal(extractValidDomain('https://chrome.google.com/webstore/detail/123'), null);
  });

  it('should handle null, empty, and malformed inputs gracefully', () => {
    assert.equal(extractValidDomain(null), null);
    assert.equal(extractValidDomain(undefined), null);
    assert.equal(extractValidDomain(''), null);
    assert.equal(extractValidDomain('not-a-valid-url'), null);
  });

  it('should slugify profile names properly for filenames', () => {
    assert.equal(slugifyProfileName('Admin Superuser!'), 'admin-superuser');
    assert.equal(slugifyProfileName('Regular User #2'), 'regular-user-2');
    assert.equal(slugifyProfileName('   spaced   name   '), 'spaced-name');
  });
});


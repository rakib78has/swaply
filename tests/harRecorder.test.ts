import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  createHarEntryFromNetwork,
  createHarLog,
  formatHarJson
} from '../src/core/harRecorder.ts';

describe('HAR Session Traffic Recorder Tests', () => {
  test('should generate valid HAR entry from network parameters', () => {
    const entry = createHarEntryFromNetwork('https://api.myapp.com/v1/user', 'POST', 201, 'application/json', 60);
    assert.equal(entry.request.method, 'POST');
    assert.equal(entry.request.url, 'https://api.myapp.com/v1/user');
    assert.equal(entry.response.status, 201);
    assert.equal(entry.time, 60);
  });

  test('should format standard HAR 1.2 log specification', () => {
    const entry = createHarEntryFromNetwork('https://api.myapp.com/auth');
    const har = createHarLog('api.myapp.com', [entry]) as any;

    assert.equal(har.log.version, '1.2');
    assert.equal(har.log.creator.name, 'QASwitch Session Recorder');
    assert.equal(har.log.entries.length, 1);

    const json = formatHarJson(har);
    assert.ok(json.includes('"version": "1.2"'));
    assert.ok(json.includes('https://api.myapp.com/auth'));
  });
});

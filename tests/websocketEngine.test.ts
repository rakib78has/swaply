import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  parseWebSocketPayload,
  createFrameRecord,
  filterWebSocketFrames,
  buildWebSocketInterceptorScript,
  injectSyntheticFrameScript,
} from '../src/core/websocketEngine.ts';
import type { WebSocketFrame } from '../src/types/index.ts';

describe('WebSocket & SSE Live Frame Inspector Tests', () => {
  test('should parse text, JSON, and binary payloads accurately', () => {
    const textRes = parseWebSocketPayload('{"event":"ping"}');
    assert.equal(textRes.text, '{"event":"ping"}');
    assert.equal(textRes.isBinary, false);
    assert.ok(textRes.size > 0);

    const emptyRes = parseWebSocketPayload('');
    assert.equal(emptyRes.size, 0);

    const buffer = new ArrayBuffer(16);
    const binRes = parseWebSocketPayload(buffer);
    assert.equal(binRes.isBinary, true);
    assert.equal(binRes.size, 16);
    assert.ok(binRes.text.includes('Binary ArrayBuffer'));
  });

  test('should create typed frame record with timestamp and id', () => {
    const frame = createFrameRecord('UP', 'TEXT', 'wss://api.example.com/ws', '{"action":"auth"}', 1700000000000);
    assert.equal(frame.direction, 'UP');
    assert.equal(frame.type, 'TEXT');
    assert.equal(frame.url, 'wss://api.example.com/ws');
    assert.equal(frame.payload, '{"action":"auth"}');
    assert.equal(frame.timestamp, 1700000000000);
    assert.ok(frame.id.startsWith('ws_1700000000000'));
  });

  test('should filter frames by search query, direction, and url', () => {
    const frames: WebSocketFrame[] = [
      createFrameRecord('UP', 'TEXT', 'wss://chat.com/socket', '{"msg":"hello"}', 1),
      createFrameRecord('DOWN', 'TEXT', 'wss://chat.com/socket', '{"msg":"welcome back"}', 2),
      createFrameRecord('DOWN', 'SSE', 'https://stream.com/sse', 'event: update', 3),
      createFrameRecord('UP', 'TEXT', 'wss://auth.com/live', '{"token":"xyz"}', 4),
    ];

    // Direction filter
    const downOnly = filterWebSocketFrames(frames, { direction: 'DOWN' });
    assert.equal(downOnly.length, 2);

    // Search filter
    const searchHello = filterWebSocketFrames(frames, { search: 'welcome' });
    assert.equal(searchHello.length, 1);
    assert.equal(searchHello[0].payload, '{"msg":"welcome back"}');

    // URL filter
    const streamOnly = filterWebSocketFrames(frames, { url: 'stream.com' });
    assert.equal(streamOnly.length, 1);
    assert.equal(streamOnly[0].type, 'SSE');
  });

  test('should generate in-page interceptor script hooking WebSocket and EventSource', () => {
    const script = buildWebSocketInterceptorScript();
    assert.ok(script.includes('window.WebSocket = function'));
    assert.ok(script.includes('window.__QASWITCH_WS_FRAMES__'));
    assert.ok(script.includes('window.__QASWITCH_INJECT_WS_FRAME__'));
    assert.ok(script.includes('window.EventSource = function'));
    assert.ok(script.includes('qaswitch:ws_frame'));
  });

  test('should generate synthetic frame injection script with target URL', () => {
    const script = injectSyntheticFrameScript('{"notification":"Role escalated"}', 'chat.com');
    assert.ok(script.includes('Role escalated'));
    assert.ok(script.includes('chat.com'));
    assert.ok(script.includes('__QASWITCH_INJECT_WS_FRAME__'));
  });
});

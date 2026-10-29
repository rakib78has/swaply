import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  parseRecordedEvents,
  formatFlightRecorderLog,
  buildFlightRecorderScript
} from '../src/core/flightRecorder.ts';
import type { FlightRecorderEvent } from '../src/types/index.ts';

describe('Blackbox Flight Recorder Tests', () => {
  test('should parse raw JSON event logs accurately', () => {
    const raw = JSON.stringify([
      { timestamp: 1000, type: 'ERROR', message: 'Uncaught TypeError' }
    ]);
    const events = parseRecordedEvents(raw);
    assert.equal(events.length, 1);
    assert.equal(events[0].type, 'ERROR');
  });

  test('should format structured markdown crash report', () => {
    const events: FlightRecorderEvent[] = [
      { timestamp: 1700000000000, type: 'CLICK', message: 'BUTTON#checkout-btn' },
      { timestamp: 1700000001000, type: 'ERROR', message: '500 Server Error' }
    ];

    const md = formatFlightRecorderLog(events);
    assert.ok(md.includes('Blackbox Flight Recorder Log'));
    assert.ok(md.includes('BUTTON#checkout-btn'));
    assert.ok(md.includes('500 Server Error'));
  });

  test('should generate in-page circular event capture script', () => {
    const script = buildFlightRecorderScript();
    assert.ok(script.includes('window.__QASWITCH_FLIGHT_RECORDER__'));
    assert.ok(script.includes('console.error'));
    assert.ok(script.includes('window.addEventListener(\'click\''));
  });
});

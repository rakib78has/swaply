/**
 * Blackbox Flight Recorder Engine
 * In-page rolling event buffer capturing the last 60 seconds of console errors, failed network calls, and user interactions.
 */

import type { FlightRecorderEvent } from '../types/index.ts';

export function parseRecordedEvents(raw: string): FlightRecorderEvent[] {
  if (!raw || typeof raw !== 'string') return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function formatFlightRecorderLog(events: FlightRecorderEvent[]): string {
  if (events.length === 0) {
    return '# 🎙️ Blackbox Flight Recorder: No anomalies recorded.';
  }

  const lines = [
    `# 🎙️ QASwitch Blackbox Flight Recorder Log`,
    `**Total Events Captured:** ${events.length}`,
    `**Captured At:** ${new Date().toISOString()}`,
    ``,
    `| Timestamp | Type | Message | Details |`,
    `|---|---|---|---|`
  ];

  for (const e of events) {
    const time = new Date(e.timestamp).toLocaleTimeString();
    const cleanMsg = (e.message || '').replace(/\|/g, '\\|').replace(/\n/g, ' ');
    const details = e.details ? JSON.stringify(e.details).replace(/\|/g, '\\|') : '-';
    lines.push(`| ${time} | \`${e.type}\` | ${cleanMsg} | \`${details}\` |`);
  }

  return lines.join('\n');
}

export function buildFlightRecorderScript(): string {
  return `
    (() => {
      if (window.__QASWITCH_FLIGHT_RECORDER__) return;
      window.__QASWITCH_FLIGHT_RECORDER__ = [];
      const MAX_EVENTS = 50;

      function pushEvent(type, message, details) {
        window.__QASWITCH_FLIGHT_RECORDER__.push({
          timestamp: Date.now(),
          type,
          message: String(message),
          details
        });
        if (window.__QASWITCH_FLIGHT_RECORDER__.length > MAX_EVENTS) {
          window.__QASWITCH_FLIGHT_RECORDER__.shift();
        }
      }

      // 1. Intercept console.error & console.warn
      const origError = console.error;
      console.error = function(...args) {
        pushEvent('ERROR', args.map(String).join(' '));
        return origError.apply(this, args);
      };

      // 2. Global uncaught error listener
      window.addEventListener('error', (e) => {
        pushEvent('ERROR', e.message, { filename: e.filename, lineno: e.lineno });
      });

      // 3. User click breadcrumbs
      window.addEventListener('click', (e) => {
        const target = e.target;
        const tag = target ? target.tagName : 'UNKNOWN';
        const id = target && target.id ? '#' + target.id : '';
        pushEvent('CLICK', tag + id, { x: e.clientX, y: e.clientY });
      }, true);
    })();
  `;
}

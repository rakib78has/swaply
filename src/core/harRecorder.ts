/**
 * HAR (HTTP Archive) Session Traffic Recorder
 * Assembles captured network exchanges into the standard HAR 1.2 format for DevTools & Charles Proxy import.
 */

import type { HarEntry } from '../types/index.ts';

export function createHarEntryFromNetwork(
  url: string,
  method = 'GET',
  status = 200,
  mimeType = 'application/json',
  timeMs = 45
): HarEntry {
  return {
    startedDateTime: new Date().toISOString(),
    time: timeMs,
    request: {
      method,
      url,
      headers: [
        { name: 'User-Agent', value: 'QASwitch/2.2.0 Enterprise Agent' },
        { name: 'Accept', value: '*/*' }
      ]
    },
    response: {
      status,
      statusText: status === 200 ? 'OK' : 'Error',
      headers: [{ name: 'Content-Type', value: mimeType }],
      content: {
        size: 0,
        mimeType
      }
    }
  };
}

export function createHarLog(domain: string, entries: HarEntry[] = []): object {
  return {
    log: {
      version: '1.2',
      creator: {
        name: 'QASwitch Session Recorder',
        version: '2.2.0',
        comment: `Captured session traffic for ${domain}`
      },
      browser: {
        name: 'Google Chrome',
        version: 'Manifest V3'
      },
      pages: [
        {
          startedDateTime: new Date().toISOString(),
          id: `page_${domain}`,
          title: `QASwitch Traffic for ${domain}`,
          pageTimings: {
            onContentLoad: 120,
            onLoad: 350
          }
        }
      ],
      entries
    }
  };
}

export function formatHarJson(harLog: object): string {
  return JSON.stringify(harLog, null, 2);
}

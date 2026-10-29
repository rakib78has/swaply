/**
 * WebSocket & SSE Live Frame Inspector + Mock Injector
 * Captures bi-directional WebSocket frames, SSE events, and supports synthetic frame injection.
 */

import type {
  WebSocketFrame,
  WebSocketFrameDirection,
  WebSocketFrameType,
} from '../types/index.ts';

/**
 * Serializes payload data to string and calculates byte size.
 */
export function parseWebSocketPayload(data: unknown): {
  text: string;
  size: number;
  isBinary: boolean;
} {
  if (data === null || data === undefined) {
    return { text: '', size: 0, isBinary: false };
  }

  if (typeof data === 'string') {
    return {
      text: data,
      size: new TextEncoder().encode(data).length,
      isBinary: false,
    };
  }

  if (typeof ArrayBuffer !== 'undefined' && data instanceof ArrayBuffer) {
    return {
      text: `[Binary ArrayBuffer: ${data.byteLength} bytes]`,
      size: data.byteLength,
      isBinary: true,
    };
  }

  try {
    const json = JSON.stringify(data);
    return {
      text: json,
      size: new TextEncoder().encode(json).length,
      isBinary: false,
    };
  } catch {
    const str = String(data);
    return {
      text: str,
      size: new TextEncoder().encode(str).length,
      isBinary: false,
    };
  }
}

/**
 * Creates a normalized frame record.
 */
export function createFrameRecord(
  direction: WebSocketFrameDirection,
  type: WebSocketFrameType,
  url: string,
  payload: string,
  timestamp = Date.now()
): WebSocketFrame {
  const { size } = parseWebSocketPayload(payload);
  return {
    id: `ws_${timestamp}_${Math.random().toString(36).substring(2, 7)}`,
    timestamp,
    direction,
    type,
    url,
    payload,
    size,
  };
}

/**
 * Filters frames by search query, direction, or URL.
 */
export function filterWebSocketFrames(
  frames: WebSocketFrame[],
  filter: {
    search?: string;
    direction?: WebSocketFrameDirection;
    type?: WebSocketFrameType;
    url?: string;
  }
): WebSocketFrame[] {
  if (!frames || !Array.isArray(frames)) return [];

  return frames.filter((frame) => {
    if (filter.direction && frame.direction !== filter.direction) {
      return false;
    }
    if (filter.type && frame.type !== filter.type) {
      return false;
    }
    if (filter.url && !frame.url.toLowerCase().includes(filter.url.toLowerCase())) {
      return false;
    }
    if (filter.search) {
      const q = filter.search.toLowerCase();
      const matchPayload = frame.payload.toLowerCase().includes(q);
      const matchUrl = frame.url.toLowerCase().includes(q);
      if (!matchPayload && !matchUrl) return false;
    }
    return true;
  });
}

/**
 * Builds in-page interception script for WebSocket & EventSource.
 */
export function buildWebSocketInterceptorScript(): string {
  return `
    (() => {
      window.__QASWITCH_WS_FRAMES__ = window.__QASWITCH_WS_FRAMES__ || [];
      window.__QASWITCH_ACTIVE_SOCKETS__ = window.__QASWITCH_ACTIVE_SOCKETS__ || [];

      if (window.__QASWITCH_WS_HOOKED__) return;
      window.__QASWITCH_WS_HOOKED__ = true;

      const OrigWebSocket = window.WebSocket;

      window.WebSocket = function(url, protocols) {
        const ws = new OrigWebSocket(url, protocols);
        const wsUrl = String(url);
        window.__QASWITCH_ACTIVE_SOCKETS__.push(ws);

        // Record Outbound frames (UP)
        const origSend = ws.send;
        ws.send = function(data) {
          const payloadStr = typeof data === 'string' ? data : '[Binary/Object]';
          const frame = {
            id: 'ws_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
            timestamp: Date.now(),
            direction: 'UP',
            type: typeof data === 'string' ? 'TEXT' : 'BINARY',
            url: wsUrl,
            payload: payloadStr,
            size: typeof data === 'string' ? payloadStr.length : 0
          };
          window.__QASWITCH_WS_FRAMES__.push(frame);
          window.dispatchEvent(new CustomEvent('qaswitch:ws_frame', { detail: frame }));
          return origSend.apply(this, arguments);
        };

        // Record Inbound frames (DOWN)
        ws.addEventListener('message', function(event) {
          const payloadStr = typeof event.data === 'string' ? event.data : '[Binary/Object]';
          const frame = {
            id: 'ws_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
            timestamp: Date.now(),
            direction: 'DOWN',
            type: typeof event.data === 'string' ? 'TEXT' : 'BINARY',
            url: wsUrl,
            payload: payloadStr,
            size: typeof event.data === 'string' ? payloadStr.length : 0
          };
          window.__QASWITCH_WS_FRAMES__.push(frame);
          window.dispatchEvent(new CustomEvent('qaswitch:ws_frame', { detail: frame }));
        });

        return ws;
      };

      window.WebSocket.prototype = OrigWebSocket.prototype;
      window.WebSocket.CONNECTING = OrigWebSocket.CONNECTING;
      window.WebSocket.OPEN = OrigWebSocket.OPEN;
      window.WebSocket.CLOSING = OrigWebSocket.CLOSING;
      window.WebSocket.CLOSED = OrigWebSocket.CLOSED;

      // Global synthetic frame injector
      window.__QASWITCH_INJECT_WS_FRAME__ = function(payload, targetUrl) {
        const sockets = window.__QASWITCH_ACTIVE_SOCKETS__ || [];
        let count = 0;
        for (const ws of sockets) {
          if (ws.readyState === WebSocket.OPEN) {
            if (!targetUrl || (ws.url && ws.url.includes(targetUrl))) {
              const evt = new MessageEvent('message', { data: payload });
              ws.dispatchEvent(evt);
              count++;
            }
          }
        }
        return count;
      };

      // Also hook EventSource (SSE)
      if (window.EventSource) {
        const OrigEventSource = window.EventSource;
        window.EventSource = function(url, config) {
          const es = new OrigEventSource(url, config);
          const esUrl = String(url);

          es.addEventListener('message', function(event) {
            const frame = {
              id: 'sse_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
              timestamp: Date.now(),
              direction: 'DOWN',
              type: 'SSE',
              url: esUrl,
              payload: event.data || '',
              size: (event.data || '').length
            };
            window.__QASWITCH_WS_FRAMES__.push(frame);
            window.dispatchEvent(new CustomEvent('qaswitch:ws_frame', { detail: frame }));
          });

          return es;
        };
        window.EventSource.prototype = OrigEventSource.prototype;
      }
    })();
  `;
}

/**
 * Builds script to inject synthetic message frame into in-page WebSocket.
 */
export function injectSyntheticFrameScript(payload: string, urlPattern = ''): string {
  const safePayload = JSON.stringify(payload);
  const safePattern = JSON.stringify(urlPattern);

  return `
    (() => {
      if (typeof window.__QASWITCH_INJECT_WS_FRAME__ === 'function') {
        const injectedCount = window.__QASWITCH_INJECT_WS_FRAME__(${safePayload}, ${safePattern});
        console.log('[QASwitch] Injected synthetic WebSocket frame into ' + injectedCount + ' socket(s)');
      }
    })();
  `;
}

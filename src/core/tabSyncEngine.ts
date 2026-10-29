/**
 * Real-Time Multi-Tab Action Synchronizer Engine
 * Synchronizes scroll position, form input changes, and navigations across multiple open browser tabs
 * using the HTML5 BroadcastChannel API and extension runtime messaging.
 */

import type {
  TabSyncConfig,
  TabSyncEventType,
  TabSyncMessage,
} from '../types/index.ts';

export function buildTabSyncConfig(
  channelName = 'default_qa_sync',
  options?: Partial<TabSyncConfig>
): TabSyncConfig {
  return {
    channel: channelName.trim() || 'default_qa_sync',
    syncScroll: options?.syncScroll ?? true,
    syncInputs: options?.syncInputs ?? true,
    syncNav: options?.syncNav ?? false,
    enabled: options?.enabled ?? true,
  };
}

export function createSyncMessage(
  type: TabSyncEventType,
  channel: string,
  senderTabId: number,
  payload: Record<string, unknown>,
  timestamp = Date.now()
): TabSyncMessage {
  return {
    type,
    channel,
    senderTabId,
    timestamp,
    payload,
  };
}

/**
 * Builds the in-page client script that establishes the BroadcastChannel and sync listeners.
 */
export function buildTabSyncScript(config: TabSyncConfig, tabId = 1): string {
  if (!config.enabled) {
    return buildTabSyncCleanupScript(config.channel);
  }

  const safeConfig = JSON.stringify(config);
  const myTabId = tabId;

  return `
    (() => {
      const cfg = ${safeConfig};
      const myId = ${myTabId};
      const channelName = ${JSON.stringify('qaswitch_tab_sync_' + config.channel)};

      // Close previous instance if open
      if (window.__QASWITCH_BC__) {
        try { window.__QASWITCH_BC__.close(); } catch(e) {}
      }

      const bc = new BroadcastChannel(channelName);
      window.__QASWITCH_BC__ = bc;

      let isReceivingScroll = false;

      // 1. Receive incoming broadcasts from peer tabs
      bc.onmessage = function(event) {
        const msg = event.data;
        if (!msg || msg.senderTabId === myId) return;

        if (msg.type === 'SCROLL' && cfg.syncScroll) {
          isReceivingScroll = true;
          window.scrollTo({
            top: msg.payload.y,
            left: msg.payload.x,
            behavior: 'instant'
          });
          setTimeout(() => { isReceivingScroll = false; }, 50);
        }

        if (msg.type === 'INPUT' && cfg.syncInputs) {
          const el = document.querySelector(msg.payload.selector);
          if (el && el.value !== msg.payload.value) {
            el.value = msg.payload.value;
            el.dispatchEvent(new Event('input', { bubbles: true }));
          }
        }
      };

      // 2. Broadcast Local Scroll
      if (cfg.syncScroll) {
        let scrollTimeout;
        window.addEventListener('scroll', function() {
          if (isReceivingScroll) return;
          clearTimeout(scrollTimeout);
          scrollTimeout = setTimeout(() => {
            bc.postMessage({
              type: 'SCROLL',
              channel: cfg.channel,
              senderTabId: myId,
              timestamp: Date.now(),
              payload: { x: window.scrollX, y: window.scrollY }
            });
          }, 40);
        }, { passive: true });
      }

      // 3. Broadcast Local Form Input
      if (cfg.syncInputs) {
        document.addEventListener('input', function(e) {
          const target = e.target;
          if (!target || !target.tagName || !['INPUT', 'TEXTAREA'].includes(target.tagName)) return;
          const selector = target.id ? '#' + target.id : (target.name ? target.tagName.toLowerCase() + '[name="' + target.name + '"]' : null);
          if (!selector) return;

          bc.postMessage({
            type: 'INPUT',
            channel: cfg.channel,
            senderTabId: myId,
            timestamp: Date.now(),
            payload: { selector, value: target.value }
          });
        }, { passive: true });
      }

      console.log('[QASwitch] Multi-Tab Action Synchronizer attached to channel: ' + channelName);
    })();
  `;
}

/**
 * Builds cleanup script closing channel.
 */
export function buildTabSyncCleanupScript(channelName: string): string {
  return `
    (() => {
      if (window.__QASWITCH_BC__) {
        try { window.__QASWITCH_BC__.close(); } catch(e) {}
        delete window.__QASWITCH_BC__;
      }
    })();
  `;
}

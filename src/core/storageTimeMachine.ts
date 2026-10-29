/**
 * DOM Storage & Cookie State Time Machine Engine
 * Records every client-side storage mutation with timestamps, old/new values, and supports time-travel state rollback.
 */

import type {
  StorageMutationRecord,
  StorageMutationType,
} from '../types/index.ts';

export function createMutationRecord(
  type: StorageMutationType,
  key: string,
  oldValue: string | null,
  newValue: string | null,
  caller = 'in-page script',
  timestamp = Date.now()
): StorageMutationRecord {
  return {
    id: `mut_${timestamp}_${Math.random().toString(36).substring(2, 6)}`,
    timestamp,
    type,
    key,
    oldValue,
    newValue,
    caller,
  };
}

/**
 * Filters mutation records by key or operation type.
 */
export function filterMutations(
  records: StorageMutationRecord[],
  filter?: { key?: string; type?: StorageMutationType }
): StorageMutationRecord[] {
  if (!records || !Array.isArray(records)) return [];

  return records.filter((r) => {
    if (filter?.key && !r.key.toLowerCase().includes(filter.key.toLowerCase())) {
      return false;
    }
    if (filter?.type && r.type !== filter.type) {
      return false;
    }
    return true;
  });
}

/**
 * Pure simulation function: Reconstructs exact localStorage and sessionStorage states
 * up to a specific timestamp by replaying mutations chronologically.
 */
export function reconstructStateAt(
  records: StorageMutationRecord[],
  targetTimestamp: number
): { local: Record<string, string>; session: Record<string, string> } {
  const local: Record<string, string> = {};
  const session: Record<string, string> = {};

  const sorted = [...records].sort((a, b) => a.timestamp - b.timestamp);

  for (const m of sorted) {
    if (m.timestamp > targetTimestamp) break;

    if (m.type === 'SET_LOCAL' && m.newValue !== null) {
      local[m.key] = m.newValue;
    } else if (m.type === 'REMOVE_LOCAL') {
      delete local[m.key];
    } else if (m.type === 'SET_SESSION' && m.newValue !== null) {
      session[m.key] = m.newValue;
    } else if (m.type === 'REMOVE_SESSION') {
      delete session[m.key];
    }
  }

  return { local, session };
}

/**
 * Builds the in-page client script that monkey-patches storage methods and logs changes.
 */
export function buildStorageInterceptorScript(): string {
  return `
    (() => {
      window.__QASWITCH_STORAGE_CHANGELOG__ = window.__QASWITCH_STORAGE_CHANGELOG__ || [];
      if (window.__QASWITCH_STORAGE_HOOKED__) return;
      window.__QASWITCH_STORAGE_HOOKED__ = true;

      // 1. Hook localStorage
      const origLocalSet = window.localStorage.setItem;
      const origLocalRemove = window.localStorage.removeItem;

      window.localStorage.setItem = function(key, val) {
        const old = window.localStorage.getItem(key);
        const record = {
          id: 'mut_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
          timestamp: Date.now(),
          type: 'SET_LOCAL',
          key: String(key),
          oldValue: old,
          newValue: String(val)
        };
        window.__QASWITCH_STORAGE_CHANGELOG__.push(record);
        window.dispatchEvent(new CustomEvent('qaswitch:storage_mutation', { detail: record }));
        return origLocalSet.apply(this, arguments);
      };

      window.localStorage.removeItem = function(key) {
        const old = window.localStorage.getItem(key);
        const record = {
          id: 'mut_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
          timestamp: Date.now(),
          type: 'REMOVE_LOCAL',
          key: String(key),
          oldValue: old,
          newValue: null
        };
        window.__QASWITCH_STORAGE_CHANGELOG__.push(record);
        window.dispatchEvent(new CustomEvent('qaswitch:storage_mutation', { detail: record }));
        return origLocalRemove.apply(this, arguments);
      };

      // 2. Hook sessionStorage
      const origSessionSet = window.sessionStorage.setItem;
      const origSessionRemove = window.sessionStorage.removeItem;

      window.sessionStorage.setItem = function(key, val) {
        const old = window.sessionStorage.getItem(key);
        const record = {
          id: 'mut_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
          timestamp: Date.now(),
          type: 'SET_SESSION',
          key: String(key),
          oldValue: old,
          newValue: String(val)
        };
        window.__QASWITCH_STORAGE_CHANGELOG__.push(record);
        window.dispatchEvent(new CustomEvent('qaswitch:storage_mutation', { detail: record }));
        return origSessionSet.apply(this, arguments);
      };

      window.sessionStorage.removeItem = function(key) {
        const old = window.sessionStorage.getItem(key);
        const record = {
          id: 'mut_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
          timestamp: Date.now(),
          type: 'REMOVE_SESSION',
          key: String(key),
          oldValue: old,
          newValue: null
        };
        window.__QASWITCH_STORAGE_CHANGELOG__.push(record);
        window.dispatchEvent(new CustomEvent('qaswitch:storage_mutation', { detail: record }));
        return origSessionRemove.apply(this, arguments);
      };
    })();
  `;
}

/**
 * Builds script to restore in-page storage to a previous snapshot state.
 */
export function buildStorageRollbackScript(snapshot: { local: Record<string, string>; session: Record<string, string> }): string {
  const safeSnapshot = JSON.stringify(snapshot);

  return `
    (() => {
      const snap = ${safeSnapshot};
      try {
        window.localStorage.clear();
        for (const [k, v] of Object.entries(snap.local || {})) {
          window.localStorage.setItem(k, v);
        }
        window.sessionStorage.clear();
        for (const [k, v] of Object.entries(snap.session || {})) {
          window.sessionStorage.setItem(k, v);
        }
        console.log('[QASwitch] Storage Time Machine rolled back state successfully');
      } catch (e) {
        console.error('[QASwitch] Failed rollback:', e);
      }
    })();
  `;
}

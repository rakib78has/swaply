/**
 * DOM Storage snapshotting, sanitization, and restoration logic
 */

import type { DOMStorageSnapshot } from "../types/index.ts";

/**
 * Normalizes raw storage output from executeScript into a safe snapshot.
 */
export function sanitizeStorageSnapshot(raw?: unknown): DOMStorageSnapshot {
  const result: DOMStorageSnapshot = {
    local: {},
    session: {}
  };

  if (!raw || typeof raw !== "object") {
    return result;
  }

  const candidate = raw as Partial<DOMStorageSnapshot>;

  if (candidate.local && typeof candidate.local === "object") {
    for (const [k, v] of Object.entries(candidate.local)) {
      if (typeof k === "string" && typeof v === "string") {
        result.local[k] = v;
      }
    }
  }

  if (candidate.session && typeof candidate.session === "object") {
    for (const [k, v] of Object.entries(candidate.session)) {
      if (typeof k === "string" && typeof v === "string") {
        result.session[k] = v;
      }
    }
  }

  return result;
}

/**
 * The pure function executed inside the web page context to snapshot storage.
 */
export function inPageStorageSnapshotScript(): DOMStorageSnapshot {
  const local: Record<string, string> = {};
  const session: Record<string, string> = {};

  try {
    for (let i = 0; i < window.localStorage.length; i++) {
      const k = window.localStorage.key(i);
      if (k !== null) {
        const val = window.localStorage.getItem(k);
        if (val !== null) local[k] = val;
      }
    }
  } catch {
    // Cross-origin or restricted frame security handling
  }

  try {
    for (let i = 0; i < window.sessionStorage.length; i++) {
      const k = window.sessionStorage.key(i);
      if (k !== null) {
        const val = window.sessionStorage.getItem(k);
        if (val !== null) session[k] = val;
      }
    }
  } catch {
    // Security error handling
  }

  return { local, session };
}

/**
 * The pure function executed inside the web page context to restore storage and reload.
 */
export function inPageStorageRestoreScript(data: DOMStorageSnapshot): void {
  try {
    window.localStorage.clear();
    if (data?.local) {
      for (const [k, v] of Object.entries(data.local)) {
        window.localStorage.setItem(k, v);
      }
    }
  } catch {}

  try {
    window.sessionStorage.clear();
    if (data?.session) {
      for (const [k, v] of Object.entries(data.session)) {
        window.sessionStorage.setItem(k, v);
      }
    }
  } catch {}

  window.location.reload();
}


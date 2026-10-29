/**
 * Session Rollback / Undo Engine ("Time Machine")
 * Snapshots pre-switch state to allow 1-click restoration if switching was accidental.
 */

import type { SessionCookie, DOMStorageSnapshot, RollbackSnapshot } from '../types/index.ts';

export function createRollbackSnapshot(
  domain: string,
  cookies: SessionCookie[],
  storage: DOMStorageSnapshot,
  previousProfileName = 'Previous Session'
): RollbackSnapshot {
  return {
    id: `rb_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    timestamp: Date.now(),
    domain,
    previousProfileName,
    cookies: cookies || [],
    storage: storage || { local: {}, session: {} }
  };
}

export function isRollbackAvailable(snapshot: RollbackSnapshot | null, maxAgeMs = 15 * 60 * 1000): boolean {
  if (!snapshot || !snapshot.domain || !snapshot.timestamp) return false;
  const elapsed = Date.now() - snapshot.timestamp;
  return elapsed <= maxAgeMs;
}

export function formatRollbackLabel(snapshot: RollbackSnapshot | null): string {
  if (!snapshot) return 'No rollback state available';
  const cookieCount = snapshot.cookies ? snapshot.cookies.length : 0;
  return `Undo switch to "${snapshot.previousProfileName}" (${cookieCount} cookies)`;
}

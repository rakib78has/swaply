/**
 * Session TTL & Auto-Expiry Engine
 * Manages profile time-to-live, countdowns, and expiration warnings for short-lived sessions.
 */

export function calculateExpiration(createdAt: number, ttlMinutes?: number | null): number | null {
  if (!ttlMinutes || ttlMinutes <= 0) return null;
  return createdAt + ttlMinutes * 60 * 1000;
}

export function isProfileExpired(expiresAt?: number | null, now = Date.now()): boolean {
  if (!expiresAt) return false;
  return now >= expiresAt;
}

export function formatRemainingTTL(expiresAt?: number | null, now = Date.now()): string {
  if (!expiresAt) return 'Permanent (No Expiry)';

  const diffMs = expiresAt - now;
  if (diffMs <= 0) {
    const agoMinutes = Math.floor(Math.abs(diffMs) / 60000);
    return `Expired ${agoMinutes > 0 ? `${agoMinutes}m ago` : 'just now'}`;
  }

  const hours = Math.floor(diffMs / 3600000);
  const minutes = Math.floor((diffMs % 3600000) / 60000);

  if (hours > 0) {
    return `Expires in ${hours}h ${minutes}m`;
  }
  return `Expires in ${minutes}m`;
}

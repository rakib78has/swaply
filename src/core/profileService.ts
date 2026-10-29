/**
 * Profile CRUD, Freemium quotas, and JSON import/export validation
 */

import type { ProfileRecord, ExportPayload, SessionCookie, DOMStorageSnapshot } from "../types/index.ts";
import { sanitizeStorageSnapshot } from "./storageManager.ts";

export const MAX_FREE_PROFILES = 2;
export const VALID_DEMO_KEY = "QAPRO-DEV";

/**
 * Checks if the user is allowed to save a new profile under their tier limit.
 */
export function canCreateProfile(currentCount: number, isPro: boolean): boolean {
  if (isPro) return true;
  return currentCount < MAX_FREE_PROFILES;
}

/**
 * Creates a clean, typed ProfileRecord.
 */
export function createNewProfile(
  name: string,
  domain: string,
  url: string,
  cookies: SessionCookie[],
  storage: DOMStorageSnapshot
): ProfileRecord {
  return {
    id: `prof_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
    name: name.trim(),
    createdAt: Date.now(),
    domain,
    url,
    cookies: cookies || [],
    storage: sanitizeStorageSnapshot(storage)
  };
}

/**
 * Validates license keys (supports QAPRO-DEV demo key and standard PRO-* keys).
 */
export function validateLicenseKey(rawKey?: string | null): boolean {
  if (!rawKey || typeof rawKey !== "string") return false;
  const key = rawKey.trim().toUpperCase();
  return key === VALID_DEMO_KEY || key.startsWith("PRO-");
}

/**
 * Generates portable export payload for JSON downloads.
 */
export function buildExportPayload(domain: string, profiles: ProfileRecord[]): ExportPayload {
  return {
    version: "1.0",
    exportedAt: new Date().toISOString(),
    domain,
    profiles
  };
}

/**
 * Validates, parses, and sanitizes untrusted JSON input for profile imports.
 */
export function parseAndValidateImportJSON(jsonStr: string, fallbackUrl = ""): ProfileRecord[] | null {
  try {
    const parsed = JSON.parse(jsonStr);

    let candidateList: unknown[] = [];
    if (parsed && typeof parsed === "object") {
      if (Array.isArray(parsed.profiles)) {
        candidateList = parsed.profiles;
      } else if (Array.isArray(parsed)) {
        candidateList = parsed;
      }
    }

    if (!Array.isArray(candidateList) || candidateList.length === 0) {
      return null;
    }

    const validated: ProfileRecord[] = [];

    for (const item of candidateList) {
      if (!item || typeof item !== "object") continue;
      const candidate = item as Partial<ProfileRecord>;

      if (!candidate.name || typeof candidate.name !== "string") continue;

      const cookies: SessionCookie[] = Array.isArray(candidate.cookies)
        ? candidate.cookies.filter((c): c is SessionCookie => Boolean(c && typeof c.name === "string"))
        : [];

      const storage = sanitizeStorageSnapshot(candidate.storage);

      // Generate a fresh unique ID to prevent collisions
      const profile: ProfileRecord = {
        id: `prof_imp_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        name: `${candidate.name} (Imported)`,
        createdAt: Date.now(),
        domain: candidate.domain || "localhost",
        url: candidate.url || fallbackUrl,
        cookies,
        storage
      };

      validated.push(profile);
    }

    return validated.length > 0 ? validated : null;
  } catch {
    return null;
  }
}


/**
 * Cookie snapshotting, deduplication, and restoration orchestrator
 */

import type { SessionCookie, CookieSetDetails } from "../types/index.ts";

/**
 * Reconstructs the exact URL required for chrome.cookies.remove and chrome.cookies.set.
 * Correctly strips leading dots (e.g. '.github.com' -> 'https://github.com/').
 */
export function buildCookieUrl(cookie: Partial<SessionCookie>, fallbackDomain = "localhost"): string {
  const protocol = cookie.secure ? "https:" : "http:";
  let domain = cookie.domain || fallbackDomain;

  if (domain.startsWith(".")) {
    domain = domain.substring(1);
  }

  const rawPath = cookie.path || "/";
  const path = rawPath.startsWith("/") ? rawPath : `/${rawPath}`;

  return `${protocol}//${domain}${path}`;
}

/**
 * Deduplicates cookie arrays across URL-level and domain-level queries.
 */
export function deduplicateCookies(cookies: SessionCookie[]): SessionCookie[] {
  const map = new Map<string, SessionCookie>();

  for (const c of cookies) {
    if (!c || !c.name) continue;
    const key = `${c.storeId || "0"}|${c.domain || ""}|${c.path || "/"}|${c.name}`;
    map.set(key, c);
  }

  return Array.from(map.values());
}

/**
 * Prepares strict details for chrome.cookies.set(), enforcing Chrome MV3 rules:
 * 1. Host-only cookies MUST NOT pass domain.
 * 2. Session cookies MUST NOT pass expirationDate.
 * 3. sameSite: 'no_restriction' MUST force secure: true.
 */
export function prepareCookieSetDetails(cookie: SessionCookie, fallbackDomain?: string): CookieSetDetails {
  const url = buildCookieUrl(cookie, fallbackDomain);

  const details: CookieSetDetails = {
    url,
    name: cookie.name,
    value: cookie.value || "",
    path: cookie.path || "/",
    secure: Boolean(cookie.secure),
    httpOnly: Boolean(cookie.httpOnly),
    storeId: cookie.storeId
  };

  // Only attach domain if NOT a host-only cookie
  if (!cookie.hostOnly && cookie.domain) {
    details.domain = cookie.domain;
  }

  // Only attach expirationDate if NOT a session cookie and expiration is valid
  if (!cookie.session && typeof cookie.expirationDate === "number" && cookie.expirationDate > 0) {
    details.expirationDate = cookie.expirationDate;
  }

  // Handle Chrome SameSite semantics
  if (cookie.sameSite && ["no_restriction", "lax", "strict"].includes(cookie.sameSite)) {
    details.sameSite = cookie.sameSite as "no_restriction" | "lax" | "strict";
    if (cookie.sameSite === "no_restriction") {
      details.secure = true;
    }
  }

  return details;
}

/**
 * Purges all given cookies using the provided remove executor.
 */
export function removeCookieBatch(
  cookies: SessionCookie[],
  removeFn: (details: { url: string; name: string; storeId?: string }) => Promise<unknown>,
  fallbackDomain?: string
): Promise<{ deleted: number; errors: number }> {
  return cookies.reduce(
    async (accPromise, cookie) => {
      const acc = await accPromise;
      try {
        const url = buildCookieUrl(cookie, fallbackDomain);
        await removeFn({ url, name: cookie.name, storeId: cookie.storeId });
        acc.deleted++;
      } catch {
        acc.errors++;
      }
      return acc;
    },
    Promise.resolve({ deleted: 0, errors: 0 })
  );
}

/**
 * Restores a batch of saved cookies using the provided set executor.
 */
export function restoreCookieBatch(
  cookies: SessionCookie[],
  setFn: (details: CookieSetDetails) => Promise<unknown>,
  fallbackDomain?: string
): Promise<{ restored: number; failed: number }> {
  return cookies.reduce(
    async (accPromise, cookie) => {
      const acc = await accPromise;
      try {
        const details = prepareCookieSetDetails(cookie, fallbackDomain);
        await setFn(details);
        acc.restored++;
      } catch {
        acc.failed++;
      }
      return acc;
    },
    Promise.resolve({ restored: 0, failed: 0 })
  );
}


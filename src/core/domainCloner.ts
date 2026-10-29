/**
 * Cross-Environment Profile Cloner
 * Ports authenticated sessions across environments (e.g. Staging -> Localhost, PR Previews).
 */

import type { ProfileRecord, SessionCookie } from "../types/index.ts";

export interface CloneOptions {
  targetDomain: string;
  targetUrl?: string;
  newName?: string;
}

/**
 * Rewrites a single cookie's domain, security, and path to conform to a new target environment.
 */
export function portCookieToDomain(cookie: SessionCookie, targetDomain: string): SessionCookie {
  const isTargetLocalhost = targetDomain === "localhost" || targetDomain === "127.0.0.1";

  // Re-scope domain
  let newDomain = targetDomain;
  if (!cookie.hostOnly && cookie.domain.startsWith(".") && !isTargetLocalhost) {
    newDomain = targetDomain.startsWith(".") ? targetDomain : `.${targetDomain}`;
  }

  // If porting to unencrypted localhost, remove secure: true requirement
  const newSecure = isTargetLocalhost ? false : Boolean(cookie.secure);

  return {
    ...cookie,
    domain: newDomain,
    secure: newSecure,
    // SameSite=None requires Secure; if secure was disabled for localhost, relax sameSite to lax
    sameSite: isTargetLocalhost && cookie.sameSite === "no_restriction" ? "lax" : cookie.sameSite
  };
}

/**
 * Clones a profile to a new environment domain with full cookie and metadata transformation.
 */
export function cloneProfileToDomain(profile: ProfileRecord, options: CloneOptions): ProfileRecord {
  const { targetDomain, targetUrl, newName } = options;
  const cleanTarget = targetDomain.trim().toLowerCase();

  const portedCookies = profile.cookies.map((c) => portCookieToDomain(c, cleanTarget));

  return {
    id: `prof_clone_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    name: newName || `${profile.name} (Ported to ${cleanTarget})`,
    createdAt: Date.now(),
    domain: cleanTarget,
    url: targetUrl || `http://${cleanTarget}/`,
    cookies: portedCookies,
    storage: {
      local: { ...profile.storage?.local },
      session: { ...profile.storage?.session }
    }
  };
}


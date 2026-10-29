/**
 * URL and Domain validation utilities for QASwitch
 */

export const RESTRICTED_PROTOCOLS = new Set([
  "chrome:",
  "chrome-extension:",
  "devtools:",
  "edge:",
  "about:",
  "view-source:",
  "data:",
  "blob:",
  "file:"
]);

export const RESTRICTED_HOSTS = new Set([
  "chromewebstore.google.com",
  "chrome.google.com"
]);

/**
 * Validates a URL and extracts its hostname if permitted by Chrome security boundaries.
 */
export function extractValidDomain(urlStr?: string | null): string | null {
  if (!urlStr || typeof urlStr !== "string") {
    return null;
  }

  try {
    const url = new URL(urlStr);

    if (RESTRICTED_PROTOCOLS.has(url.protocol)) {
      return null;
    }

    if (RESTRICTED_HOSTS.has(url.hostname)) {
      return null;
    }

    return url.hostname;
  } catch {
    return null;
  }
}

/**
 * Slugifies a profile name for safe file naming in exports.
 */
export function slugifyProfileName(text: string): string {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^\w\-]+/g, "")
    .substring(0, 20);
}


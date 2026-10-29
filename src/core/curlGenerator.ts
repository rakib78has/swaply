/**
 * cURL Command Generator for Active QA Sessions
 * Generates ready-to-run terminal cURL snippets pre-authenticated with active cookies.
 */

import type { SessionCookie } from "../types/index.ts";

export interface CurlOptions {
  method?: string;
  headers?: Record<string, string>;
  includeUserAgent?: boolean;
}

export function generateCurlCommand(
  url: string,
  cookies: SessionCookie[] = [],
  options: CurlOptions = {}
): string {
  const method = (options.method || "GET").toUpperCase();
  const safeUrl = url.replace(/'/g, "'\\''");

  const cookieHeader = cookies
    .map((c) => `${c.name}=${c.value}`)
    .join("; ");

  const parts = [`curl -X ${method} '${safeUrl}'`];

  if (cookieHeader) {
    const safeCookies = cookieHeader.replace(/'/g, "'\\''");
    parts.push(`-H 'Cookie: ${safeCookies}'`);
  }

  if (options.headers) {
    for (const [k, v] of Object.entries(options.headers)) {
      const safeVal = v.replace(/'/g, "'\\''");
      parts.push(`-H '${k}: ${safeVal}'`);
    }
  }

  return parts.join(" \\\n  ");
}


/**
 * Declarative Net Request Header Rule Engine (Manifest V3)
 * Assembles and validates native Chromium rules to inject custom request headers per role profile.
 */

import type { DynamicHeaderRule, DNRHeaderAction } from "../types/index.ts";

export const DNR_BASE_RULE_ID = 1000;

/**
 * Creates a URL filter for Declarative Net Request matching domain and subdomains.
 */
export function buildDomainUrlFilter(domain: string): string {
  let cleanDomain = domain.trim().toLowerCase();
  if (cleanDomain.startsWith(".")) {
    cleanDomain = cleanDomain.slice(1);
  }
  return `||${cleanDomain}^`;
}

/**
 * Converts a key-value header dictionary into dynamic DNR modifyHeaders rules.
 */
export function buildDynamicDNRRule(
  ruleId: number,
  domain: string,
  headers: Record<string, string> = {}
): DynamicHeaderRule | null {
  const actions: DNRHeaderAction[] = [];

  for (const [k, v] of Object.entries(headers)) {
    if (typeof k === "string" && k.trim().length > 0 && typeof v === "string") {
      actions.push({
        header: k.trim(),
        operation: "set",
        value: v.trim()
      });
    }
  }

  if (actions.length === 0) {
    return null;
  }

  return {
    id: ruleId,
    priority: 1,
    action: {
      type: "modifyHeaders",
      requestHeaders: actions
    },
    condition: {
      urlFilter: buildDomainUrlFilter(domain),
      resourceTypes: ["main_frame", "sub_frame", "xmlhttprequest"]
    }
  };
}

/**
 * Parses header strings in HTTP format (e.g. "Header-Name: value\nHeader-Two: value2")
 */
export function parseHeaderInput(rawStr?: string | null): Record<string, string> {
  const result: Record<string, string> = {};
  if (!rawStr || typeof rawStr !== "string") return result;

  const lines = rawStr.split("\n");
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const colonIdx = trimmed.indexOf(":");
    if (colonIdx > 0) {
      const name = trimmed.slice(0, colonIdx).trim();
      const val = trimmed.slice(colonIdx + 1).trim();
      if (name) result[name] = val;
    }
  }

  return result;
}

/**
 * Serializes headers dictionary into a readable multiline string for editing.
 */
export function formatHeadersForDisplay(headers: Record<string, string> = {}): string {
  return Object.entries(headers)
    .map(([k, v]) => `${k}: ${v}`)
    .join("\n");
}

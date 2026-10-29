/**
 * Omnibox Quick Switch Engine
 * Powers Chrome address bar omnibox typing ("qa <role>") for instant role activation.
 */

import type { ProfileRecord } from '../types/index.ts';

export interface OmniboxSuggestion {
  content: string;
  description: string;
}

export function filterRolesForOmnibox(
  profiles: ProfileRecord[],
  query: string
): OmniboxSuggestion[] {
  if (!Array.isArray(profiles) || profiles.length === 0) {
    return [
      {
        content: 'help',
        description: '<dim>No saved roles found for this domain. Open QASwitch to save a session.</dim>'
      }
    ];
  }

  const cleanQuery = (query || '').trim().toLowerCase();

  const filtered = cleanQuery
    ? profiles.filter((p) => p.name.toLowerCase().includes(cleanQuery))
    : profiles;

  if (filtered.length === 0) {
    return [
      {
        content: 'none',
        description: `<dim>No roles matching "${cleanQuery}".</dim>`
      }
    ];
  }

  return filtered.slice(0, 5).map((p) => {
    const cookieCount = p.cookies ? p.cookies.length : 0;
    const headerCount = p.headers ? Object.keys(p.headers).length : 0;
    const extra = headerCount > 0 ? ` + ${headerCount} headers` : '';

    return {
      content: p.name,
      description: `<match>Switch to</match> <url>${escapeXml(p.name)}</url> <dim>(${cookieCount} cookies${extra})</dim>`
    };
  });
}

export function resolveOmniboxSelection(
  profiles: ProfileRecord[],
  selectedText: string
): ProfileRecord | null {
  if (!Array.isArray(profiles) || profiles.length === 0) return null;
  const target = (selectedText || '').trim().toLowerCase();

  // 1. Exact match
  const exact = profiles.find((p) => p.name.toLowerCase() === target);
  if (exact) return exact;

  // 2. Starts with match
  const prefix = profiles.find((p) => p.name.toLowerCase().startsWith(target));
  if (prefix) return prefix;

  // 3. Substring match
  return profiles.find((p) => p.name.toLowerCase().includes(target)) || null;
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

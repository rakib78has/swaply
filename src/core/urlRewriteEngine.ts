/**
 * Dynamic URL & Microservice Gateway Rewrite Studio Engine
 * Generates Chrome Declarative Net Request (DNR) regex redirect rules to reroute API calls to localhost or mock services.
 */

import type { UrlRewriteRule } from '../types/index.ts';

export function validateRewriteRule(raw: unknown): UrlRewriteRule | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Partial<UrlRewriteRule>;

  if (!r.regexFilter || typeof r.regexFilter !== 'string' || !r.substitution || typeof r.substitution !== 'string') {
    return null;
  }

  try {
    new RegExp(r.regexFilter);
  } catch {
    return null;
  }

  return {
    id: typeof r.id === 'number' ? r.id : Math.floor(Math.random() * 900000) + 100000,
    name: r.name || 'API Rewrite Rule',
    regexFilter: r.regexFilter.trim(),
    substitution: r.substitution.trim(),
    enabled: r.enabled !== false,
  };
}

/**
 * Pure evaluation function testing URL substitution on string input.
 */
export function applyRewriteSubstitution(
  url: string,
  regexFilter: string,
  substitution: string
): string | null {
  try {
    const reg = new RegExp(regexFilter);
    if (!reg.test(url)) return null;

    // Normalize \1 to $1 for standard JS replace
    const normalizedSub = substitution.replace(/\\(\d+)/g, '$$$1');
    return url.replace(reg, normalizedSub);
  } catch {
    return null;
  }
}

/**
 * Builds Chrome Manifest V3 DeclarativeNetRequest dynamic redirect rule.
 */
export function buildDNRRedirectRule(rule: UrlRewriteRule): {
  id: number;
  priority: number;
  action: {
    type: 'redirect';
    redirect: { regexSubstitution: string };
  };
  condition: {
    regexFilter: string;
    resourceTypes: Array<'xmlhttprequest' | 'main_frame' | 'sub_frame'>;
  };
} {
  return {
    id: rule.id,
    priority: 2,
    action: {
      type: 'redirect',
      redirect: {
        regexSubstitution: rule.substitution,
      },
    },
    condition: {
      regexFilter: rule.regexFilter,
      resourceTypes: ['xmlhttprequest', 'main_frame', 'sub_frame'],
    },
  };
}

/**
 * Parses multiline string syntax into UrlRewriteRule array.
 * Example syntax:
 * ^https://api\.staging\.com/v1/(.*) -> http://localhost:8080/v1/\1
 */
export function parseRewriteRulesText(text: string): UrlRewriteRule[] {
  if (!text || typeof text !== 'string') return [];

  const lines = text.split('\n');
  const rules: UrlRewriteRule[] = [];
  let nextId = 200001;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    const arrowIdx = trimmed.indexOf('->');
    if (arrowIdx > 0) {
      const regexFilter = trimmed.slice(0, arrowIdx).trim();
      const substitution = trimmed.slice(arrowIdx + 2).trim();

      const rule = validateRewriteRule({
        id: nextId++,
        name: `Rewrite ${rules.length + 1}`,
        regexFilter,
        substitution,
        enabled: true,
      });

      if (rule) rules.push(rule);
    }
  }

  return rules;
}

/**
 * Formats rules into editable text.
 */
export function formatRewriteRulesText(rules: UrlRewriteRule[]): string {
  if (!rules || !Array.isArray(rules)) return '';
  return rules.map((r) => `${r.regexFilter} -> ${r.substitution}`).join('\n');
}

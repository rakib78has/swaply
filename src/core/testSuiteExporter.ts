/**
 * Automated Test Suite Exporter
 * Converts QASwitch profiles to Playwright storageState, Postman Environment, and Cypress fixtures.
 */

import type {
  ProfileRecord,
  PlaywrightStorageState,
  PlaywrightCookie,
  PostmanEnvironment,
  SessionCookie
} from '../types/index.ts';

/**
 * Maps Chrome/QASwitch SameSite format to Playwright strict SameSite format
 */
export function mapSameSiteToPlaywright(sameSite?: string): "Lax" | "Strict" | "None" {
  if (!sameSite) return "Lax";
  const lower = sameSite.toLowerCase();
  if (lower === "strict") return "Strict";
  if (lower === "no_restriction" || lower === "none") return "None";
  return "Lax";
}

/**
 * Exports profile to standard Playwright storageState.json
 */
export function exportToPlaywrightStorageState(profile: ProfileRecord): PlaywrightStorageState {
  const originUrl = profile.url ? new URL(profile.url).origin : `https://${profile.domain}`;

  const cookies: PlaywrightCookie[] = (profile.cookies || []).map((c: SessionCookie) => {
    return {
      name: c.name,
      value: c.value,
      domain: c.domain,
      path: c.path || "/",
      expires: c.expirationDate || -1,
      httpOnly: Boolean(c.httpOnly),
      secure: Boolean(c.secure),
      sameSite: mapSameSiteToPlaywright(c.sameSite)
    };
  });

  const localEntries: Array<{ name: string; value: string }> = [];
  if (profile.storage && profile.storage.local) {
    for (const [k, v] of Object.entries(profile.storage.local)) {
      if (typeof v === 'string') {
        localEntries.push({ name: k, value: v });
      }
    }
  }

  return {
    cookies,
    origins: [
      {
        origin: originUrl,
        localStorage: localEntries
      }
    ]
  };
}

/**
 * Exports profile to Postman Environment JSON collection
 */
export function exportToPostmanEnvironment(profile: ProfileRecord): PostmanEnvironment {
  const values: Array<{ key: string; value: string; enabled: boolean }> = [];

  // Add cookies as variables
  (profile.cookies || []).forEach((c: SessionCookie) => {
    values.push({
      key: `cookie_${c.name}`,
      value: c.value,
      enabled: true
    });
  });

  // Add custom headers if present
  if (profile.headers) {
    for (const [headerName, headerVal] of Object.entries(profile.headers)) {
      values.push({
        key: `header_${headerName.toLowerCase().replace(/[^a-z0-9]/g, '_')}`,
        value: headerVal,
        enabled: true
      });
    }
  }

  // Add domain
  values.push({
    key: "base_domain",
    value: profile.domain,
    enabled: true
  });

  return {
    id: `env_${profile.id}`,
    name: `QASwitch - ${profile.name} (${profile.domain})`,
    values,
    _postman_variable_scope: "environment"
  };
}

/**
 * Generates ready-to-run Cypress code snippet
 */
export function exportToCypressSnippet(profile: ProfileRecord): string {
  const lines: string[] = [
    `// Cypress Auth Fixture for Role: ${profile.name} (${profile.domain})`,
    `describe('Setup Auth Session - ${profile.name}', () => {`,
    `  beforeEach(() => {`
  ];

  (profile.cookies || []).forEach((c: SessionCookie) => {
    const opts: string[] = [`domain: '${c.domain}'`, `path: '${c.path || '/'}'`];
    if (c.secure) opts.push(`secure: true`);
    if (c.httpOnly) opts.push(`httpOnly: true`);
    lines.push(`    cy.setCookie('${c.name}', '${c.value}', { ${opts.join(', ')} });`);
  });

  if (profile.storage && profile.storage.local && Object.keys(profile.storage.local).length > 0) {
    lines.push(`    cy.window().then((win) => {`);
    for (const [k, v] of Object.entries(profile.storage.local)) {
      const escapedVal = JSON.stringify(v);
      lines.push(`      win.localStorage.setItem('${k}', ${escapedVal});`);
    }
    lines.push(`    });`);
  }

  lines.push(`  });`);
  lines.push(`});`);

  return lines.join('\n');
}

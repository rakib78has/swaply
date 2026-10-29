/**
 * In-Browser API Response Mocking & Network Error Simulator
 * Generates dynamic Declarative Net Request rules to intercept endpoints, inject error codes, or stub mock JSON.
 */

import type { ApiMockRule } from '../types/index.ts';

export const BASE_MOCK_RULE_ID = 3000;

export interface GeneratedDNRRule {
  id: number;
  priority: number;
  action: {
    type: "redirect" | "modifyHeaders" | "block";
    redirect?: {
      url?: string;
    };
    responseHeaders?: Array<{
      header: string;
      operation: "set" | "append" | "remove";
      value: string;
    }>;
  };
  condition: {
    urlFilter: string;
    resourceTypes: Array<"main_frame" | "sub_frame" | "xmlhttprequest">;
  };
}

export function buildMockRules(
  domain: string,
  mockRules: ApiMockRule[]
): GeneratedDNRRule[] {
  if (!Array.isArray(mockRules) || mockRules.length === 0) return [];

  const results: GeneratedDNRRule[] = [];
  const cleanDomain = domain.startsWith('.') ? domain.slice(1) : domain;

  mockRules.forEach((rule, index) => {
    if (!rule.enabled || !rule.urlPattern) return;

    const ruleId = BASE_MOCK_RULE_ID + index;
    const cleanPattern = rule.urlPattern.trim();

    // 1. If rule has a custom mock response JSON, redirect to data URI
    if (rule.mockResponseJson && rule.mockResponseJson.trim()) {
      const encoded = encodeURIComponent(rule.mockResponseJson.trim());
      const dataUri = `data:application/json;charset=utf-8,${encoded}`;

      results.push({
        id: ruleId,
        priority: 2,
        action: {
          type: "redirect",
          redirect: {
            url: dataUri
          }
        },
        condition: {
          urlFilter: cleanPattern.startsWith('*') || cleanPattern.includes('://')
            ? cleanPattern
            : `||${cleanDomain}${cleanPattern.startsWith('/') ? '' : '/'}${cleanPattern}`,
          resourceTypes: ["xmlhttprequest", "sub_frame"]
        }
      });
      return;
    }

    // 2. If status code is an error (e.g. 500, 403, 429), inject error headers or block
    if (rule.statusCode >= 400) {
      results.push({
        id: ruleId,
        priority: 2,
        action: {
          type: "modifyHeaders",
          responseHeaders: [
            { header: "X-QASwitch-Mock-Status", operation: "set", value: String(rule.statusCode) },
            { header: "X-QASwitch-Simulated-Error", operation: "set", value: "true" }
          ]
        },
        condition: {
          urlFilter: cleanPattern.startsWith('*') || cleanPattern.includes('://')
            ? cleanPattern
            : `||${cleanDomain}${cleanPattern.startsWith('/') ? '' : '/'}${cleanPattern}`,
          resourceTypes: ["xmlhttprequest", "sub_frame"]
        }
      });
    }
  });

  return results;
}

export function parseMockRulesText(rawText: string): ApiMockRule[] {
  if (!rawText || typeof rawText !== 'string') return [];
  const lines = rawText.split('\n').map((l) => l.trim()).filter((l) => l && !l.startsWith('#'));
  const rules: ApiMockRule[] = [];

  lines.forEach((line, idx) => {
    // Format: <STATUS_CODE> <URL_PATTERN> [OPTIONAL_JSON]
    // Example: 500 /api/checkout
    // Example: 200 /api/user {"name":"Mock User","credits":999}
    const match = line.match(/^(\d{3})\s+(\S+)(?:\s+(.*))?$/);
    if (match) {
      rules.push({
        id: `mock_${idx + 1}`,
        name: `Rule #${idx + 1}`,
        statusCode: parseInt(match[1], 10),
        urlPattern: match[2],
        mockResponseJson: match[3] || undefined,
        enabled: true
      });
    }
  });

  return rules;
}

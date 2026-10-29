/**
 * GraphQL Operation Spy & Mocking Studio Engine
 * Intercepts, parses, inspects, and mocks GraphQL queries and mutations in-flight.
 */

import type {
  GraphQLMockRule,
  GraphQLCapturedOperation,
  GraphQLOperationType,
} from '../types/index.ts';

export interface ParsedGraphQLPayload {
  operationName?: string;
  operationType: GraphQLOperationType;
  query?: string;
  variables?: Record<string, unknown>;
}

/**
 * Parses raw request body into structured GraphQL parameters.
 */
export function parseGraphQLPayload(rawBody: string | Record<string, unknown> | null | undefined): ParsedGraphQLPayload {
  if (!rawBody) {
    return { operationType: 'any' };
  }

  let parsed: Record<string, unknown> = {};
  if (typeof rawBody === 'string') {
    try {
      parsed = JSON.parse(rawBody);
    } catch {
      // If not JSON, it could be a raw query string
      parsed = { query: rawBody };
    }
  } else if (typeof rawBody === 'object') {
    parsed = rawBody;
  }

  let operationName = typeof parsed.operationName === 'string' ? parsed.operationName.trim() : undefined;
  const query = typeof parsed.query === 'string' ? parsed.query : undefined;
  const variables = typeof parsed.variables === 'object' && parsed.variables !== null
    ? (parsed.variables as Record<string, unknown>)
    : undefined;

  let operationType: GraphQLOperationType = 'query';

  if (query) {
    // Regex detect operation type and name if missing
    // e.g. "mutation CreateOrder {" or "query GetUsers(" or "subscription OnMessage {"
    const opRegex = /(query|mutation|subscription)\s+([A-Za-z0-9_]+)?/i;
    const match = query.match(opRegex);
    if (match) {
      const typeStr = match[1].toLowerCase();
      if (typeStr === 'mutation') operationType = 'mutation';
      else if (typeStr === 'subscription') operationType = 'subscription';
      else operationType = 'query';

      if (!operationName && match[2]) {
        operationName = match[2];
      }
    } else if (/^\s*\{\s*/.test(query)) {
      // Anonymous query: "{ user { id } }"
      operationType = 'query';
    }
  }

  return {
    operationName,
    operationType,
    query,
    variables,
  };
}

/**
 * Matches a GraphQL request against active mock rules.
 */
export function matchGraphQLRule(
  rules: GraphQLMockRule[],
  request: ParsedGraphQLPayload
): GraphQLMockRule | null {
  if (!rules || !Array.isArray(rules) || rules.length === 0) return null;

  for (const rule of rules) {
    if (!rule.enabled) continue;

    // Check operationType
    if (
      rule.operationType &&
      rule.operationType !== 'any' &&
      request.operationType !== 'any' &&
      rule.operationType.toLowerCase() !== request.operationType.toLowerCase()
    ) {
      continue;
    }

    // Check operationName
    const ruleOp = rule.operationName.trim();
    if (ruleOp !== '*') {
      if (!request.operationName) continue;
      if (ruleOp.toLowerCase() !== request.operationName.toLowerCase()) continue;
    }

    // Check variablesMatch if specified
    if (rule.variablesMatch && Object.keys(rule.variablesMatch).length > 0) {
      if (!request.variables) continue;
      let varsMatch = true;
      for (const [key, val] of Object.entries(rule.variablesMatch)) {
        if (JSON.stringify(request.variables[key]) !== JSON.stringify(val)) {
          varsMatch = false;
          break;
        }
      }
      if (!varsMatch) continue;
    }

    return rule;
  }

  return null;
}

/**
 * Formats a GraphQL mock rule response into standard HTTP response data.
 */
export function formatGraphQLResponse(rule: GraphQLMockRule): {
  statusCode: number;
  headers: Record<string, string>;
  body: string;
} {
  const dataPayload = {
    data: rule.mockData || {},
  };

  return {
    statusCode: rule.statusCode || 200,
    headers: {
      'Content-Type': 'application/json',
      'X-QASwitch-GraphQL-Mock': 'true',
    },
    body: JSON.stringify(dataPayload),
  };
}

/**
 * Builds the in-page client script that intercepts fetch & XHR GraphQL calls.
 */
export function buildGraphQLInterceptorScript(rules: GraphQLMockRule[]): string {
  const serializedRules = JSON.stringify(rules || []);

  return `
    (() => {
      window.__QASWITCH_GRAPHQL_RULES__ = ${serializedRules};
      window.__QASWITCH_GRAPHQL_LOGS__ = window.__QASWITCH_GRAPHQL_LOGS__ || [];

      if (window.__QASWITCH_GQL_HOOKED__) return;
      window.__QASWITCH_GQL_HOOKED__ = true;

      const origFetch = window.fetch;
      window.fetch = async function(resource, init) {
        let isGql = false;
        let bodyText = '';
        let url = '';

        try {
          url = typeof resource === 'string' ? resource : (resource && resource.url) || '';
          if (init && init.body && typeof init.body === 'string') {
            bodyText = init.body;
          }
        } catch (e) {}

        if (url.includes('/graphql') || (bodyText && (bodyText.includes('"query"') || bodyText.includes('"operationName"')))) {
          isGql = true;
        }

        if (isGql) {
          let parsed = null;
          try {
            parsed = JSON.parse(bodyText);
          } catch(e) {}

          const opName = parsed?.operationName;
          const query = parsed?.query || '';
          const variables = parsed?.variables;

          // Check rules
          const activeRules = window.__QASWITCH_GRAPHQL_RULES__ || [];
          for (const rule of activeRules) {
            if (!rule.enabled) continue;
            let matched = false;
            if (rule.operationName === '*' || (opName && rule.operationName.toLowerCase() === opName.toLowerCase())) {
              matched = true;
            }
            if (matched) {
              const logEntry = {
                id: 'gql_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
                timestamp: Date.now(),
                operationName: opName || 'Anonymous',
                operationType: rule.operationType || 'query',
                query: query,
                variables: variables,
                response: { data: rule.mockData },
                mocked: true
              };
              window.__QASWITCH_GRAPHQL_LOGS__.push(logEntry);
              window.dispatchEvent(new CustomEvent('qaswitch:graphql_operation', { detail: logEntry }));

              return new Response(JSON.stringify({ data: rule.mockData }), {
                status: rule.statusCode || 200,
                headers: { 'Content-Type': 'application/json', 'X-QASwitch-Mocked': 'true' }
              });
            }
          }

          // If not mocked, record live pass-through
          try {
            const resp = await origFetch.apply(this, arguments);
            const clone = resp.clone();
            clone.json().then((json) => {
              const logEntry = {
                id: 'gql_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
                timestamp: Date.now(),
                operationName: opName || 'Anonymous',
                operationType: 'query',
                query: query,
                variables: variables,
                response: json,
                mocked: false
              };
              window.__QASWITCH_GRAPHQL_LOGS__.push(logEntry);
              window.dispatchEvent(new CustomEvent('qaswitch:graphql_operation', { detail: logEntry }));
            }).catch(() => {});
            return resp;
          } catch(err) {
            throw err;
          }
        }

        return origFetch.apply(this, arguments);
      };
    })();
  `;
}

/**
 * Builds cleanup script to remove or disable GraphQL mocking.
 */
export function buildGraphQLCleanupScript(): string {
  return `
    (() => {
      window.__QASWITCH_GRAPHQL_RULES__ = [];
    })();
  `;
}

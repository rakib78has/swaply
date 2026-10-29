import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  parseGraphQLPayload,
  matchGraphQLRule,
  formatGraphQLResponse,
  buildGraphQLInterceptorScript,
  buildGraphQLCleanupScript,
} from '../src/core/graphqlEngine.ts';
import type { GraphQLMockRule } from '../src/types/index.ts';

describe('GraphQL Operation Spy & Mocking Engine Tests', () => {
  test('should parse GraphQL JSON payload with operationName, query, and variables', () => {
    const raw = JSON.stringify({
      operationName: 'GetUserProfile',
      query: 'query GetUserProfile($id: ID!) { user(id: $id) { id name email } }',
      variables: { id: 'usr_123' },
    });

    const parsed = parseGraphQLPayload(raw);
    assert.equal(parsed.operationName, 'GetUserProfile');
    assert.equal(parsed.operationType, 'query');
    assert.deepEqual(parsed.variables, { id: 'usr_123' });
    assert.ok(parsed.query?.includes('user(id: $id)'));
  });

  test('should detect mutation operation and extract operationName from query string when omitted in JSON', () => {
    const raw = JSON.stringify({
      query: 'mutation UpdateCartItem($qty: Int!) { updateCart(quantity: $qty) { success } }',
    });

    const parsed = parseGraphQLPayload(raw);
    assert.equal(parsed.operationName, 'UpdateCartItem');
    assert.equal(parsed.operationType, 'mutation');
  });

  test('should match mock rules by operationName and operationType', () => {
    const rules: GraphQLMockRule[] = [
      {
        id: 'rule_1',
        operationName: 'GetUserProfile',
        operationType: 'query',
        mockData: { user: { id: 'usr_mock', name: 'Mock Admin' } },
        enabled: true,
      },
      {
        id: 'rule_2',
        operationName: 'CheckoutMutation',
        operationType: 'mutation',
        mockData: { checkout: { orderId: 'ord_999' } },
        enabled: true,
      },
    ];

    const matched1 = matchGraphQLRule(rules, {
      operationName: 'GetUserProfile',
      operationType: 'query',
    });
    assert.ok(matched1);
    assert.equal(matched1.id, 'rule_1');

    const matched2 = matchGraphQLRule(rules, {
      operationName: 'CheckoutMutation',
      operationType: 'mutation',
    });
    assert.ok(matched2);
    assert.equal(matched2.id, 'rule_2');

    // Mismatched operation
    const unmatched = matchGraphQLRule(rules, {
      operationName: 'DeleteAccount',
      operationType: 'mutation',
    });
    assert.equal(unmatched, null);
  });

  test('should support wildcard operation matching and variable matching', () => {
    const rules: GraphQLMockRule[] = [
      {
        id: 'rule_vip',
        operationName: 'GetDiscount',
        variablesMatch: { tier: 'VIP' },
        mockData: { discount: 50 },
        enabled: true,
      },
      {
        id: 'rule_wildcard',
        operationName: '*',
        mockData: { mocked: true },
        enabled: true,
      },
    ];

    const matchedVip = matchGraphQLRule(rules, {
      operationName: 'GetDiscount',
      operationType: 'query',
      variables: { tier: 'VIP' },
    });
    assert.equal(matchedVip?.id, 'rule_vip');

    const nonVip = matchGraphQLRule(rules, {
      operationName: 'GetDiscount',
      operationType: 'query',
      variables: { tier: 'STANDARD' },
    });
    // Should fall back to wildcard
    assert.equal(nonVip?.id, 'rule_wildcard');
  });

  test('should format mock response adhering to GraphQL spec', () => {
    const rule: GraphQLMockRule = {
      id: 'mock_1',
      operationName: 'TestOp',
      mockData: { items: [1, 2, 3] },
      statusCode: 200,
      enabled: true,
    };

    const formatted = formatGraphQLResponse(rule);
    assert.equal(formatted.statusCode, 200);
    assert.equal(formatted.headers['Content-Type'], 'application/json');
    const parsedBody = JSON.parse(formatted.body);
    assert.deepEqual(parsedBody.data, { items: [1, 2, 3] });
  });

  test('should generate fetch interceptor and cleanup scripts', () => {
    const rules: GraphQLMockRule[] = [
      {
        id: 'r1',
        operationName: 'Test',
        mockData: {},
        enabled: true,
      },
    ];

    const interceptor = buildGraphQLInterceptorScript(rules);
    assert.ok(interceptor.includes('__QASWITCH_GRAPHQL_RULES__'));
    assert.ok(interceptor.includes('window.fetch'));
    assert.ok(interceptor.includes('qaswitch:graphql_operation'));

    const cleanup = buildGraphQLCleanupScript();
    assert.ok(cleanup.includes('__QASWITCH_GRAPHQL_RULES__ = []'));
  });
});

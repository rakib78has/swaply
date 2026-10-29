import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  formatSlackPayload,
  formatDiscordPayload,
  formatGenericWebhookPayload,
  broadcastSessionToWebhook
} from '../src/core/webhookBroadcaster.ts';
import type { WebhookConfig } from '../src/types/index.ts';

describe('Team Webhook Broadcaster Tests', () => {
  const roleName = 'QA Team Lead';
  const domain = 'app.example.com';
  const snippet = 'eyJhbGciOiJBMjU2R0NNIn0...snippet';

  test('should format Slack Block Kit payload correctly', () => {
    const payload = formatSlackPayload(roleName, domain, snippet, '1h 30m') as any;

    assert.ok(payload.blocks);
    assert.equal(payload.blocks[0].text.text, '🔐 QASwitch: Role "QA Team Lead" Broadcast');
    assert.ok(payload.blocks[1].fields.some((f: any) => f.text.includes(domain)));
    assert.ok(payload.blocks[2].text.text.includes(snippet));
  });

  test('should format Discord Embed payload correctly', () => {
    const payload = formatDiscordPayload(roleName, domain, snippet, 'Permanent') as any;

    assert.ok(payload.embeds);
    assert.equal(payload.embeds[0].title, '🔐 QASwitch Session Broadcast: QA Team Lead');
    assert.equal(payload.embeds[0].color, 0x6366f1);
    assert.ok(payload.embeds[0].fields.some((f: any) => f.name === '🌐 Domain' && f.value.includes(domain)));
  });

  test('should format Generic JSON webhook payload correctly', () => {
    const payload = formatGenericWebhookPayload(roleName, domain, snippet, '30m') as any;

    assert.equal(payload.event, 'session.broadcast');
    assert.equal(payload.version, '2.1.0');
    assert.equal(payload.domain, domain);
    assert.equal(payload.roleName, roleName);
    assert.equal(payload.encryptedSnippet, snippet);
    assert.ok(typeof payload.timestamp === 'number');
  });

  test('should fail gracefully if webhook is disabled or URL is missing', async () => {
    const config: WebhookConfig = {
      url: '',
      platform: 'slack',
      enabled: false
    };

    const result = await broadcastSessionToWebhook(config, roleName, domain, snippet);
    assert.equal(result.success, false);
    assert.ok(result.error?.includes('not configured'));
  });
});

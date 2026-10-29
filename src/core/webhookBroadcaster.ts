/**
 * Team Webhook Broadcaster (Slack, Discord & Teams Hub)
 * Broadcasts encrypted sessions, expiry notices, and 1-click import guides to team chat channels.
 */

import type { WebhookConfig } from '../types/index.ts';

export function formatSlackPayload(
  roleName: string,
  domain: string,
  encryptedSnippet: string,
  expiryNotice = 'Permanent (No Expiry)'
): object {
  return {
    blocks: [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: `🔐 QASwitch: Role "${roleName}" Broadcast`,
          emoji: true
        }
      },
      {
        type: 'section',
        fields: [
          { type: 'mrkdwn', text: `*Domain:*\n\`${domain}\`` },
          { type: 'mrkdwn', text: `*Active Role:*\n\`${roleName}\`` },
          { type: 'mrkdwn', text: `*Expiry:*\n${expiryNotice}` },
          { type: 'mrkdwn', text: `*Encryption:*\nAES-GCM 256-bit` }
        ]
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*Encrypted Session Snippet:*\n\`\`\`${encryptedSnippet}\`\`\``
        }
      },
      {
        type: 'context',
        elements: [
          {
            type: 'mrkdwn',
            text: '💡 _To import: Open QASwitch &rarr; Import &rarr; Paste this snippet with team passphrase._'
          }
        ]
      }
    ]
  };
}

export function formatDiscordPayload(
  roleName: string,
  domain: string,
  encryptedSnippet: string,
  expiryNotice = 'Permanent (No Expiry)'
): object {
  return {
    embeds: [
      {
        title: `🔐 QASwitch Session Broadcast: ${roleName}`,
        color: 0x6366f1, // Indigo
        fields: [
          { name: '🌐 Domain', value: `\`${domain}\``, inline: true },
          { name: '👤 Role Name', value: `\`${roleName}\``, inline: true },
          { name: '⏱️ Expiry', value: expiryNotice, inline: true },
          { name: '📦 Encrypted Snippet', value: `\`\`\`${encryptedSnippet}\`\`\``, inline: false }
        ],
        footer: {
          text: 'QASwitch v2.1 • AES-GCM Encrypted Team Sharing'
        },
        timestamp: new Date().toISOString()
      }
    ]
  };
}

export function formatGenericWebhookPayload(
  roleName: string,
  domain: string,
  encryptedSnippet: string,
  expiryNotice = 'Permanent'
): object {
  return {
    event: 'session.broadcast',
    version: '2.1.0',
    domain,
    roleName,
    expiryNotice,
    encryptedSnippet,
    timestamp: Date.now()
  };
}

export async function broadcastSessionToWebhook(
  config: WebhookConfig,
  roleName: string,
  domain: string,
  encryptedSnippet: string,
  expiryNotice?: string
): Promise<{ success: boolean; error?: string }> {
  if (!config.url || !config.enabled) {
    return { success: false, error: 'Webhook URL not configured or disabled' };
  }

  let body: object;
  if (config.platform === 'slack') {
    body = formatSlackPayload(roleName, domain, encryptedSnippet, expiryNotice);
  } else if (config.platform === 'discord') {
    body = formatDiscordPayload(roleName, domain, encryptedSnippet, expiryNotice);
  } else {
    body = formatGenericWebhookPayload(roleName, domain, encryptedSnippet, expiryNotice);
  }

  try {
    const res = await fetch(config.url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });

    if (!res.ok) {
      return { success: false, error: `HTTP ${res.status}: ${res.statusText}` };
    }
    return { success: true };
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }
}

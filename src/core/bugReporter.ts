/**
 * 1-Click Jira & GitHub Bug Reporter
 * Assembles active role auth state, console logs, environment context, and screenshot into an instant bug report.
 */

import type { BugReportOptions } from '../types/index.ts';

export function generateBugReportMarkdown(opts: BugReportOptions): string {
  const ts = opts.timestamp ? new Date(opts.timestamp).toISOString() : new Date().toISOString();
  const roleName = opts.activeRoleName || 'Guest / Unauthenticated';

  const lines: string[] = [
    `# 🐞 [Bug]: ${opts.title}`,
    ``,
    `## 📋 Issue Description`,
    opts.description || `*Describe the observed vs expected behavior here.*`,
    ``,
    `## 👤 Active QA Role & Environment`,
    `- **Active Role:** \`${roleName}\``,
    `- **Domain:** \`${opts.domain}\``,
    `- **Page URL:** [${opts.currentUrl}](${opts.currentUrl})`,
    `- **Captured At:** \`${ts}\``,
    `- **User Agent:** \`${opts.userAgent}\``,
    ``,
    `## 🔐 Session Authentication State`,
    `- **Cookies Attached:** \`${opts.cookiesCount}\` cookies`,
    `- **LocalStorage Keys:** \`${opts.storageKeysCount}\` keys`
  ];

  if (opts.jwtSummary) {
    lines.push(`- **JWT Token Info:** ${opts.jwtSummary}`);
  }

  if (opts.headers && Object.keys(opts.headers).length > 0) {
    lines.push(
      ``,
      `### Injected HTTP Headers (DNR)`,
      '```http'
    );
    for (const [k, v] of Object.entries(opts.headers)) {
      lines.push(`${k}: ${v}`);
    }
    lines.push('```');
  }

  if (opts.consoleErrors && opts.consoleErrors.length > 0) {
    lines.push(
      ``,
      `## 🚨 Console Logs & Unhandled Exceptions`,
      '```log'
    );
    opts.consoleErrors.forEach((err) => lines.push(err));
    lines.push('```');
  }

  if (opts.screenshotDataUri) {
    lines.push(
      ``,
      `## 📸 Attached Screenshot`,
      `![Bug Screenshot](${opts.screenshotDataUri})`
    );
  }

  lines.push(
    ``,
    `## 🔄 Steps to Reproduce with QASwitch`,
    `1. Open [${opts.currentUrl}](${opts.currentUrl}) in Chrome.`,
    `2. Open **QASwitch** extension &rarr; Switch to role **\`${roleName}\`**.`,
    `3. Perform the action causing the issue.`
  );

  return lines.join('\n');
}

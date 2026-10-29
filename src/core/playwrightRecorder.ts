/**
 * Action Recorder to Playwright TypeScript Spec Generator
 * Converts recorded user interactions (clicks, inputs, navigations, and role switches) into executable Playwright E2E tests.
 */

import type { RecordedAction } from '../types/index.ts';

export function generatePlaywrightSpec(
  testTitle: string,
  startUrl: string,
  actions: RecordedAction[] = []
): string {
  const steps: string[] = [];

  steps.push(`  // 1. Initial Navigation`);
  steps.push(`  await page.goto(${JSON.stringify(startUrl)});`);

  for (const a of actions) {
    if (a.action === 'navigate' && a.value) {
      steps.push(`  await page.goto(${JSON.stringify(a.value)});`);
    } else if (a.action === 'click' && a.selector) {
      steps.push(`  await page.locator(${JSON.stringify(a.selector)}).click();`);
    } else if (a.action === 'fill' && a.selector) {
      steps.push(`  await page.locator(${JSON.stringify(a.selector)}).fill(${JSON.stringify(a.value || '')});`);
    } else if (a.action === 'switch_role' && a.value) {
      steps.push(`  // QASwitch: Role switched to ${a.value}`);
      steps.push(`  await page.reload();`);
    }
  }

  return `import { test, expect } from '@playwright/test';

test.describe('Recorded QA Scenario: ${testTitle}', () => {
  test('should execute automated user flow', async ({ page }) => {
${steps.join('\n')}

    // Assert final page state
    await expect(page).toHaveURL(/.*${new URL(startUrl).hostname || ''}.*/);
  });
});
`;
}

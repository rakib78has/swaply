import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { generatePlaywrightSpec } from '../src/core/playwrightRecorder.ts';
import type { RecordedAction } from '../src/types/index.ts';

describe('Action Recorder to Playwright Spec Tests', () => {
  test('should generate runnable Playwright TypeScript test file', () => {
    const actions: RecordedAction[] = [
      { action: 'click', selector: '#login-button', timestamp: 1000 },
      { action: 'fill', selector: '#email-input', value: 'qa@enterprise.com', timestamp: 2000 },
      { action: 'switch_role', value: 'Super Admin', timestamp: 3000 }
    ];

    const spec = generatePlaywrightSpec('Customer Onboarding Flow', 'https://portal.enterprise.io/login', actions);

    assert.ok(spec.includes("import { test, expect } from '@playwright/test';"));
    assert.ok(spec.includes("page.goto(\"https://portal.enterprise.io/login\")"));
    assert.ok(spec.includes("page.locator(\"#login-button\").click()"));
    assert.ok(spec.includes("page.locator(\"#email-input\").fill(\"qa@enterprise.com\")"));
    assert.ok(spec.includes("// QASwitch: Role switched to Super Admin"));
    assert.ok(spec.includes("await page.reload()"));
  });
});

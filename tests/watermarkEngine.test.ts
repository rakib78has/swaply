import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { getRoleColorTheme, buildWatermarkInjectionScript } from '../src/core/watermarkEngine.ts';

describe('Watermark & Visual Role Indicator Tests', () => {
  test('should detect appropriate colors based on role naming patterns', () => {
    const adminTheme = getRoleColorTheme('Super Administrator');
    assert.equal(adminTheme.primary, '#ef4444');
    assert.ok(adminTheme.badgeLabel.includes('ADMIN'));

    const vipTheme = getRoleColorTheme('VIP Gold Member');
    assert.equal(vipTheme.primary, '#a855f7');
    assert.ok(vipTheme.badgeLabel.includes('VIP'));

    const testerTheme = getRoleColorTheme('Lead QA Engineer');
    assert.equal(testerTheme.primary, '#10b981');
    assert.ok(testerTheme.badgeLabel.includes('QA TESTER'));

    const guestTheme = getRoleColorTheme('Anonymous Guest');
    assert.equal(guestTheme.primary, '#64748b');

    const defaultTheme = getRoleColorTheme('Standard Employee');
    assert.equal(defaultTheme.primary, '#3b82f6');
  });

  test('should generate clean cleanup script when watermark is disabled', () => {
    const script = buildWatermarkInjectionScript(null, { enabled: false });
    assert.match(script, /oldPill\.remove\(\)/);
    assert.match(script, /oldBorder\.remove\(\)/);
  });

  test('should generate injection script with top border and corner pill elements', () => {
    const script = buildWatermarkInjectionScript('Admin Role', {
      enabled: true,
      showTopBorder: true,
      showCornerPill: true
    });

    assert.match(script, /__qaswitch_role_border__/);
    assert.match(script, /__qaswitch_role_pill__/);
    assert.match(script, /Admin Role/);
  });
});

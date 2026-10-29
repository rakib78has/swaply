import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  bindTabToRole,
  unbindTab,
  getRoleForTab,
  getAllTabBindings,
  clearAllTabBindings,
  generateTabContainerBadge,
  buildTabContainerScript
} from '../src/core/tabContainerEngine.ts';
import type { ProfileRecord } from '../src/types/index.ts';

const mockProfile: ProfileRecord = {
  id: 'prof_tab_1',
  name: 'Customer Support',
  createdAt: 1000,
  domain: 'portal.company.com',
  url: 'https://portal.company.com',
  cookies: [],
  storage: { local: {}, session: {} },
  colorTheme: 'red'
};

describe('Multi-Tab Container Engine Tests', () => {
  beforeEach(() => {
    clearAllTabBindings();
  });

  test('should bind and unbind specific tab IDs to independent roles', () => {
    const binding = bindTabToRole(101, mockProfile);
    assert.equal(binding.tabId, 101);
    assert.equal(binding.profileName, 'Customer Support');

    const retrieved = getRoleForTab(101);
    assert.equal(retrieved?.profileId, 'prof_tab_1');

    assert.equal(getRoleForTab(999), null);

    const unbound = unbindTab(101);
    assert.equal(unbound, true);
    assert.equal(getRoleForTab(101), null);
  });

  test('should support multiple concurrent tab bindings across domains', () => {
    bindTabToRole(101, mockProfile);
    bindTabToRole(102, { ...mockProfile, id: 'prof_tab_2', name: 'Super Admin', colorTheme: 'purple' });

    const all = getAllTabBindings();
    assert.equal(all.length, 2);
    assert.equal(all[0].profileName, 'Customer Support');
    assert.equal(all[1].profileName, 'Super Admin');
  });

  test('should generate accurate badge and colors for tab container', () => {
    const badge = generateTabContainerBadge({
      tabId: 101,
      domain: 'test.com',
      profileId: 'p1',
      profileName: 'Administrator',
      colorTheme: 'red',
      boundAt: 1000
    });

    assert.equal(badge.text, 'ADM');
    assert.equal(badge.color, '#ef4444');
  });

  test('should generate in-page container indicator script', () => {
    const script = buildTabContainerScript({
      tabId: 101,
      domain: 'test.com',
      profileId: 'p1',
      profileName: 'Lead Auditor',
      colorTheme: 'green',
      boundAt: 1000
    });

    assert.match(script, /__qaswitch_tab_container_tag__/);
    assert.match(script, /Lead Auditor/);
  });
});

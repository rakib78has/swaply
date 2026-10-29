/**
 * Multi-Tab Container Mode Engine
 * Enables tab-isolated personas so Tab 1 can run as Admin and Tab 2 as Customer simultaneously without Incognito.
 */

import type { ProfileRecord, TabRoleBinding } from '../types/index.ts';

const tabRoleMap = new Map<number, TabRoleBinding>();

export function bindTabToRole(tabId: number, profile: ProfileRecord): TabRoleBinding {
  const binding: TabRoleBinding = {
    tabId,
    domain: profile.domain,
    profileId: profile.id,
    profileName: profile.name,
    colorTheme: profile.colorTheme || 'blue',
    boundAt: Date.now()
  };

  tabRoleMap.set(tabId, binding);
  return binding;
}

export function unbindTab(tabId: number): boolean {
  return tabRoleMap.delete(tabId);
}

export function getRoleForTab(tabId: number): TabRoleBinding | null {
  return tabRoleMap.get(tabId) || null;
}

export function getAllTabBindings(): TabRoleBinding[] {
  return Array.from(tabRoleMap.values());
}

export function clearAllTabBindings(): void {
  tabRoleMap.clear();
}

export function generateTabContainerBadge(binding: TabRoleBinding | null): { text: string; color: string } {
  if (!binding) return { text: '', color: '#10b981' };

  const shortName = binding.profileName.slice(0, 3).toUpperCase();
  let color = '#3b82f6';
  if (binding.colorTheme === 'red') color = '#ef4444';
  else if (binding.colorTheme === 'purple') color = '#a855f7';
  else if (binding.colorTheme === 'green') color = '#10b981';

  return { text: shortName, color };
}

export function buildTabContainerScript(binding: TabRoleBinding | null): string {
  if (!binding) {
    return `
      (() => {
        const el = document.getElementById('__qaswitch_tab_container_tag__');
        if (el) el.remove();
      })();
    `;
  }

  const roleName = JSON.stringify(binding.profileName);
  const color = binding.colorTheme === 'red' ? '#ef4444' : binding.colorTheme === 'purple' ? '#a855f7' : '#3b82f6';

  return `
    (() => {
      let tag = document.getElementById('__qaswitch_tab_container_tag__');
      if (!tag) {
        tag = document.createElement('div');
        tag.id = '__qaswitch_tab_container_tag__';
        tag.style.cssText = 'position:fixed!important;top:10px!important;right:16px!important;z-index:2147483645!important;padding:4px 10px!important;background:#0f172a!important;color:#f8fafc!important;border:1px solid ${color}!important;border-radius:12px!important;font-size:10px!important;font-weight:700!important;letter-spacing:0.4px!important;box-shadow:0 2px 8px rgba(0,0,0,0.4)!important;pointer-events:none!important;opacity:0.88!important;';
        document.documentElement.appendChild(tag);
      }
      tag.innerHTML = '🔀 CONTAINER: ' + ${roleName};
    })();
  `;
}

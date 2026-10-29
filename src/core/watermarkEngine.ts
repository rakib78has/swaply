/**
 * Visual Role Indicator & Watermark Engine
 * Injects a subtle, non-intrusive role indicator bar and badge into the active webpage.
 */

export interface RoleTheme {
  primary: string;
  border: string;
  text: string;
  badgeLabel: string;
}

export function getRoleColorTheme(roleName: string, customTheme?: string): RoleTheme {
  const norm = (roleName || '').toLowerCase();

  if (customTheme === 'red' || norm.includes('admin') || norm.includes('root') || norm.includes('superuser')) {
    return {
      primary: '#ef4444',
      border: '#b91c1c',
      text: '#ffffff',
      badgeLabel: '🔴 ADMIN'
    };
  }

  if (customTheme === 'purple' || norm.includes('vip') || norm.includes('pro') || norm.includes('premium')) {
    return {
      primary: '#a855f7',
      border: '#7e22ce',
      text: '#ffffff',
      badgeLabel: '🟣 VIP'
    };
  }

  if (customTheme === 'green' || norm.includes('qa') || norm.includes('tester') || norm.includes('audit')) {
    return {
      primary: '#10b981',
      border: '#047857',
      text: '#ffffff',
      badgeLabel: '🟢 QA TESTER'
    };
  }

  if (customTheme === 'amber' || norm.includes('manager') || norm.includes('editor') || norm.includes('staff')) {
    return {
      primary: '#f59e0b',
      border: '#b45309',
      text: '#ffffff',
      badgeLabel: '🟡 STAFF'
    };
  }

  if (norm.includes('guest') || norm.includes('logged out') || norm.includes('anon')) {
    return {
      primary: '#64748b',
      border: '#334155',
      text: '#ffffff',
      badgeLabel: '⚪ GUEST'
    };
  }

  // Default: Blue User
  return {
    primary: '#3b82f6',
    border: '#1d4ed8',
    text: '#ffffff',
    badgeLabel: '🔵 USER'
  };
}

/**
 * Builds the browser injection script to display or remove the role watermark
 */
export function buildWatermarkInjectionScript(
  roleName: string | null,
  options: { enabled: boolean; showTopBorder?: boolean; showCornerPill?: boolean; customTheme?: string }
): string {
  if (!options.enabled || !roleName) {
    return `
      (() => {
        const oldPill = document.getElementById('__qaswitch_role_pill__');
        if (oldPill) oldPill.remove();
        const oldBorder = document.getElementById('__qaswitch_role_border__');
        if (oldBorder) oldBorder.remove();
      })();
    `;
  }

  const theme = getRoleColorTheme(roleName, options.customTheme);
  const showTopBorder = options.showTopBorder !== false;
  const showCornerPill = options.showCornerPill !== false;
  const sanitizedRoleName = JSON.stringify(roleName);

  return `
    (() => {
      // 1. Clean existing indicators
      const oldPill = document.getElementById('__qaswitch_role_pill__');
      if (oldPill) oldPill.remove();
      const oldBorder = document.getElementById('__qaswitch_role_border__');
      if (oldBorder) oldBorder.remove();

      ${showTopBorder ? `
      // 2. Inject 3px colored top border indicator
      const borderEl = document.createElement('div');
      borderEl.id = '__qaswitch_role_border__';
      borderEl.style.cssText = 'position:fixed!important;top:0!important;left:0!important;width:100%!important;height:3px!important;background-color:${theme.primary}!important;z-index:2147483646!important;pointer-events:none!important;box-shadow:0 0 8px ${theme.primary}!important;';
      document.documentElement.appendChild(borderEl);
      ` : ''}

      ${showCornerPill ? `
      // 3. Inject floating role pill
      const pillEl = document.createElement('div');
      pillEl.id = '__qaswitch_role_pill__';
      pillEl.style.cssText = 'position:fixed!important;bottom:16px!important;right:16px!important;z-index:2147483647!important;display:flex!important;align-items:center!important;gap:8px!important;padding:6px 12px!important;background:#0f172a!important;color:#f8fafc!important;border:1.5px solid ${theme.primary}!important;border-radius:20px!important;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif!important;font-size:11px!important;font-weight:600!important;box-shadow:0 4px 12px rgba(0,0,0,0.3)!important;cursor:move!important;user-select:none!important;opacity:0.92!important;transition:opacity 0.2s ease!important;';
      pillEl.title = 'QASwitch Active Role (Click to dismiss)';
      pillEl.innerHTML = '<span style="display:inline-block;width:7px;height:7px;border-radius:50%;background:${theme.primary};box-shadow:0 0 6px ${theme.primary}"></span><span style="letter-spacing:0.3px;">' + ${sanitizedRoleName} + '</span>';

      pillEl.addEventListener('mouseenter', () => { pillEl.style.opacity = '1'; });
      pillEl.addEventListener('mouseleave', () => { pillEl.style.opacity = '0.92'; });
      pillEl.addEventListener('dblclick', () => { pillEl.remove(); });
      document.documentElement.appendChild(pillEl);
      ` : ''}
    })();
  `;
}

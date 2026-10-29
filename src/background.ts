/**
 * Swaply - Background Service Worker (Manifest V3)
 * Manages Context Menus, Keyboard Shortcuts, and Cross-Tab Badge Synchronization.
 */

import type { ProfileRecord, SessionCookie } from "./types/index.ts";
import { extractValidDomain } from "./core/domainUtils.ts";
import { buildCookieUrl, prepareCookieSetDetails, deduplicateCookies } from "./core/cookieManager.ts";
import { inPageStorageRestoreScript } from "./core/storageManager.ts";

const STORAGE_PREFIX = "qaswitch_domain_";
const ACTIVE_PROFILE_PREFIX = "qaswitch_active_";

// Initialize on extension install or update
chrome.runtime.onInstalled.addListener(() => {
  setupContextMenus();
});

// Re-sync badge and menus when switching browser tabs
chrome.tabs.onActivated.addListener(async (activeInfo) => {
  try {
    const tab = await chrome.tabs.get(activeInfo.tabId);
    await syncTabState(tab);
  } catch {}
});

// Re-sync badge when page finishes loading or changes URL
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.status === "complete" && tab.url) {
    await syncTabState(tab);
  }
});

// Handle Keyboard Shortcuts
chrome.commands.onCommand.addListener(async (command) => {
  if (command === "clean_slate_reset") {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab && tab.id && tab.url) {
      await executeCleanSlate(tab);
    }
  }
});

// Handle Context Menu clicks
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (!tab || !tab.id || !tab.url) return;

  if (info.menuItemId === "qaswitch_reset") {
    await executeCleanSlate(tab);
    return;
  }

  const itemId = String(info.menuItemId);
  if (itemId.startsWith("qaswitch_switch_")) {
    const profileId = itemId.replace("qaswitch_switch_", "");
    const domain = extractValidDomain(tab.url);
    if (!domain) return;

    const key = `${STORAGE_PREFIX}${domain}`;
    const data = await chrome.storage.local.get([key]);
    const profiles = Array.isArray(data[key]) ? (data[key] as ProfileRecord[]) : [];
    const target = profiles.find((p) => p.id === profileId);

    if (target) {
      await applyProfileToTab(tab, target, domain);
    }
  }
});

/**
 * Synchronize badge text and context menu options for the current active tab
 */
async function syncTabState(tab: chrome.tabs.Tab): Promise<void> {
  if (!tab.id || !tab.url) return;
  const domain = extractValidDomain(tab.url);

  if (!domain) {
    chrome.action.setBadgeText({ text: "", tabId: tab.id });
    return;
  }

  // 1. Update Badge
  const activeKey = `${ACTIVE_PROFILE_PREFIX}${domain}`;
  const profileKey = `${STORAGE_PREFIX}${domain}`;
  const data = await chrome.storage.local.get([activeKey, profileKey]);

  const activeId = data[activeKey] as string | undefined;
  const profiles = Array.isArray(data[profileKey]) ? (data[profileKey] as ProfileRecord[]) : [];

  const activeProfile = profiles.find((p) => p.id === activeId);
  if (activeProfile) {
    const badgeText = activeProfile.name.slice(0, 3).toUpperCase();
    chrome.action.setBadgeText({ text: badgeText, tabId: tab.id });
    chrome.action.setBadgeBackgroundColor({ color: "#10b981", tabId: tab.id });
  } else {
    chrome.action.setBadgeText({ text: "", tabId: tab.id });
  }

  // 2. Update Context Menus
  await updateContextMenusForDomain(domain, profiles, activeId);
}

/**
 * Setup Context Menus dynamically
 */
function setupContextMenus(): void {
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({
      id: "qaswitch_parent",
      title: "Swaply",
      contexts: ["page", "action"]
    });

    chrome.contextMenus.create({
      parentId: "qaswitch_parent",
      id: "qaswitch_reset",
      title: "⚡ Reset Session (Clean Slate)",
      contexts: ["page", "action"]
    });
  });
}

/**
 * Rebuild Context Menu items for active domain profiles
 */
async function updateContextMenusForDomain(
  domain: string,
  profiles: ProfileRecord[],
  activeProfileId?: string
): Promise<void> {
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({
      id: "qaswitch_parent",
      title: `Swaply (${domain})`,
      contexts: ["page", "action"]
    });

    chrome.contextMenus.create({
      parentId: "qaswitch_parent",
      id: "qaswitch_reset",
      title: "⚡ Reset Session (Clean Slate)",
      contexts: ["page", "action"]
    });

    if (profiles.length > 0) {
      chrome.contextMenus.create({
        parentId: "qaswitch_parent",
        id: "qaswitch_sep",
        type: "separator",
        contexts: ["page", "action"]
      });

      for (const p of profiles) {
        const isCurrent = p.id === activeProfileId;
        chrome.contextMenus.create({
          parentId: "qaswitch_parent",
          id: `qaswitch_switch_${p.id}`,
          title: `${isCurrent ? "✓ " : "Switch to: "}${p.name}`,
          contexts: ["page", "action"]
        });
      }
    }
  });
}

/**
 * Switch session on active tab
 */
async function applyProfileToTab(tab: chrome.tabs.Tab, profile: ProfileRecord, domain: string): Promise<void> {
  if (!tab.id || !tab.url) return;

  // 1. Purge active cookies
  await clearCookiesForTab(tab, domain);

  // 2. Restore saved cookies
  for (const cookie of profile.cookies || []) {
    try {
      const details = prepareCookieSetDetails(cookie, domain);
      await chrome.cookies.set(details as chrome.cookies.SetDetails);
    } catch {}
  }

  // 3. Mark as active
  const activeKey = `${ACTIVE_PROFILE_PREFIX}${domain}`;
  await chrome.storage.local.set({ [activeKey]: profile.id });

  const badgeText = profile.name.slice(0, 3).toUpperCase();
  chrome.action.setBadgeText({ text: badgeText, tabId: tab.id });
  chrome.action.setBadgeBackgroundColor({ color: "#10b981", tabId: tab.id });

  // 4. Inject storage & reload
  await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    func: inPageStorageRestoreScript,
    args: [profile.storage || { local: {}, session: {} }]
  });
}

/**
 * Clean slate reset executor
 */
async function executeCleanSlate(tab: chrome.tabs.Tab): Promise<void> {
  if (!tab.id || !tab.url) return;
  const domain = extractValidDomain(tab.url);
  if (!domain) return;

  await clearCookiesForTab(tab, domain);

  const activeKey = `${ACTIVE_PROFILE_PREFIX}${domain}`;
  await chrome.storage.local.remove([activeKey]);
  chrome.action.setBadgeText({ text: "", tabId: tab.id });

  await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    func: () => {
      try { window.localStorage.clear(); } catch {}
      try { window.sessionStorage.clear(); } catch {}
      window.location.reload();
    }
  });
}

/**
 * Remove all cookies on the domain
 */
async function clearCookiesForTab(tab: chrome.tabs.Tab, hostname: string): Promise<void> {
  if (!tab.url) return;
  const rawCookies = await chrome.cookies.getAll({ url: tab.url });
  let domainCookies: chrome.cookies.Cookie[] = [];
  try {
    domainCookies = await chrome.cookies.getAll({ domain: hostname });
  } catch {}

  const all = deduplicateCookies([...rawCookies, ...domainCookies] as SessionCookie[]);
  for (const cookie of all) {
    try {
      const url = buildCookieUrl(cookie, hostname);
      await chrome.cookies.remove({ url, name: cookie.name, storeId: cookie.storeId });
    } catch {}
  }
}


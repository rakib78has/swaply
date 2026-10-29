/**
 * QASwitch - Background Service Worker (Manifest V3 Runtime v1.6.0)
 * Handles Context Menus, Keyboard Shortcuts, Tab Badges, and Declarative Net Request Header Rules.
 */

const STORAGE_PREFIX = "qaswitch_domain_";
const ACTIVE_PROFILE_PREFIX = "qaswitch_active_";
const DNR_RULE_ID = 2001;

const RESTRICTED_PROTOCOLS = new Set([
  "chrome:",
  "chrome-extension:",
  "devtools:",
  "edge:",
  "about:",
  "view-source:",
  "data:",
  "blob:",
  "file:"
]);

function extractValidDomain(urlStr) {
  if (!urlStr || typeof urlStr !== "string") return null;
  try {
    const url = new URL(urlStr);
    if (RESTRICTED_PROTOCOLS.has(url.protocol)) return null;
    if (url.hostname === "chromewebstore.google.com" || url.hostname === "chrome.google.com") return null;
    return url.hostname;
  } catch {
    return null;
  }
}

function buildCookieUrl(cookie, fallbackDomain = "localhost") {
  const protocol = cookie.secure ? "https:" : "http:";
  let domain = cookie.domain || fallbackDomain;
  if (domain.startsWith(".")) {
    domain = domain.substring(1);
  }
  const rawPath = cookie.path || "/";
  const path = rawPath.startsWith("/") ? rawPath : `/${rawPath}`;
  return `${protocol}//${domain}${path}`;
}

function prepareCookieSetDetails(cookie, fallbackDomain) {
  const url = buildCookieUrl(cookie, fallbackDomain);
  const details = {
    url,
    name: cookie.name,
    value: cookie.value || "",
    path: cookie.path || "/",
    secure: Boolean(cookie.secure),
    httpOnly: Boolean(cookie.httpOnly),
    storeId: cookie.storeId
  };
  if (!cookie.hostOnly && cookie.domain) {
    details.domain = cookie.domain;
  }
  if (!cookie.session && typeof cookie.expirationDate === "number" && cookie.expirationDate > 0) {
    details.expirationDate = cookie.expirationDate;
  }
  if (cookie.sameSite && ["no_restriction", "lax", "strict"].includes(cookie.sameSite)) {
    details.sameSite = cookie.sameSite;
    if (cookie.sameSite === "no_restriction") {
      details.secure = true;
    }
  }
  return details;
}

function deduplicateCookies(cookies) {
  const map = new Map();
  for (const c of cookies) {
    if (!c || !c.name) continue;
    const key = `${c.storeId || "0"}|${c.domain || ""}|${c.path || "/"}|${c.name}`;
    map.set(key, c);
  }
  return Array.from(map.values());
}

// Lifecycle Init
chrome.runtime.onInstalled.addListener(() => {
  setupInitialContextMenus();
});

// Update Badge & Context Menu on Tab Change
chrome.tabs.onActivated.addListener(async (activeInfo) => {
  try {
    const tab = await chrome.tabs.get(activeInfo.tabId);
    await syncTabState(tab);
  } catch {}
});

chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.status === "complete" && tab.url) {
    await syncTabState(tab);
  }
});

// Keyboard Command Listener
chrome.commands.onCommand.addListener(async (command) => {
  if (command === "clean_slate_reset") {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab && tab.id && tab.url) {
      await executeCleanSlate(tab);
    }
  } else if (command === "toggle_role_watermark") {
    const data = await chrome.storage.local.get("qaswitch_watermark_enabled");
    const nextVal = data.qaswitch_watermark_enabled === false ? true : false;
    await chrome.storage.local.set({ qaswitch_watermark_enabled: nextVal });
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab) await syncTabState(tab);
  }
});

// Omnibox ("qa <role>") Quick Switcher
if (chrome.omnibox) {
  chrome.omnibox.setDefaultSuggestion({
    description: "Swaply: Type a role name (e.g. <match>admin</match>, <match>user</match>) to switch active tab"
  });

  chrome.omnibox.onInputChanged.addListener(async (text, suggest) => {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab || !tab.url) return;
      const domain = extractValidDomain(tab.url);
      if (!domain) return;

      const key = `${STORAGE_PREFIX}${domain}`;
      const data = await chrome.storage.local.get([key]);
      const profiles = Array.isArray(data[key]) ? data[key] : [];

      const cleanQuery = text.trim().toLowerCase();
      const filtered = cleanQuery
        ? profiles.filter((p) => p.name.toLowerCase().includes(cleanQuery))
        : profiles;

      suggest(
        filtered.slice(0, 5).map((p) => ({
          content: p.name,
          description: `Switch to <match>${p.name}</match> (${(p.cookies || []).length} cookies)`
        }))
      );
    } catch {}
  });

  chrome.omnibox.onInputEntered.addListener(async (text) => {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab || !tab.url) return;
      const domain = extractValidDomain(tab.url);
      if (!domain) return;

      const key = `${STORAGE_PREFIX}${domain}`;
      const data = await chrome.storage.local.get([key]);
      const profiles = Array.isArray(data[key]) ? data[key] : [];

      const target =
        profiles.find((p) => p.name.toLowerCase() === text.trim().toLowerCase()) ||
        profiles.find((p) => p.name.toLowerCase().includes(text.trim().toLowerCase()));

      if (target) {
        await applyProfileToTab(tab, target, domain);
      }
    } catch {}
  });
}

// Context Menu Click Listener
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
    const profiles = Array.isArray(data[key]) ? data[key] : [];
    const target = profiles.find((p) => p.id === profileId);

    if (target) {
      await applyProfileToTab(tab, target, domain);
    }
  }
});

async function syncTabState(tab) {
  if (!tab.id || !tab.url) return;
  const domain = extractValidDomain(tab.url);

  if (!domain) {
    chrome.action.setBadgeText({ text: "", tabId: tab.id });
    return;
  }

  const activeKey = `${ACTIVE_PROFILE_PREFIX}${domain}`;
  const profileKey = `${STORAGE_PREFIX}${domain}`;
  const data = await chrome.storage.local.get([activeKey, profileKey]);

  const activeId = data[activeKey];
  const profiles = Array.isArray(data[profileKey]) ? data[profileKey] : [];

  const activeProfile = profiles.find((p) => p.id === activeId);
  if (activeProfile) {
    const badgeText = activeProfile.name.slice(0, 3).toUpperCase();
    chrome.action.setBadgeText({ text: badgeText, tabId: tab.id });
    chrome.action.setBadgeBackgroundColor({ color: "#10b981", tabId: tab.id });
    await syncDNRHeaders(domain, activeProfile.headers);
    await injectWatermarkIntoTab(tab.id, activeProfile.name);
  } else {
    chrome.action.setBadgeText({ text: "", tabId: tab.id });
    await injectWatermarkIntoTab(tab.id, null);
  }

  await injectHeartbeatSniffer(tab.id);
  await injectFlightRecorder(tab.id);

  updateContextMenusForDomain(domain, profiles, activeId);
}

async function injectFlightRecorder(tabId) {
  try {
    await chrome.scripting.executeScript({
      target: { tabId },
      func: () => {
        if (window.__QASWITCH_FLIGHT_RECORDER__) return;
        window.__QASWITCH_FLIGHT_RECORDER__ = [];
        const MAX_EVENTS = 50;

        function pushEvent(type, message, details) {
          window.__QASWITCH_FLIGHT_RECORDER__.push({
            timestamp: Date.now(),
            type,
            message: String(message),
            details
          });
          if (window.__QASWITCH_FLIGHT_RECORDER__.length > MAX_EVENTS) {
            window.__QASWITCH_FLIGHT_RECORDER__.shift();
          }
        }

        const origError = console.error;
        console.error = function(...args) {
          pushEvent("ERROR", args.map(String).join(" "));
          return origError.apply(this, args);
        };

        window.addEventListener("error", (e) => {
          pushEvent("ERROR", e.message, { filename: e.filename, lineno: e.lineno });
        });

        window.addEventListener("click", (e) => {
          const target = e.target;
          const tag = target ? target.tagName : "UNKNOWN";
          const id = target && target.id ? "#" + target.id : "";
          pushEvent("CLICK", tag + id, { x: e.clientX, y: e.clientY });
        }, true);
      }
    });
  } catch {}
}

async function injectHeartbeatSniffer(tabId) {
  try {
    await chrome.scripting.executeScript({
      target: { tabId },
      func: () => {
        if (window.__QASWITCH_HEARTBEAT_SNIFFER__) return;
        window.__QASWITCH_HEARTBEAT_SNIFFER__ = true;

        const notifyExpired = (status) => {
          try {
            chrome.runtime.sendMessage({
              type: "HEARTBEAT_STATUS",
              statusCode: status,
              domain: window.location.hostname
            });
          } catch {}
        };

        const origFetch = window.fetch;
        if (origFetch) {
          window.fetch = async function(...args) {
            try {
              const res = await origFetch.apply(this, args);
              if (res && (res.status === 401 || res.status === 403)) {
                notifyExpired(res.status);
              }
              return res;
            } catch (err) {
              throw err;
            }
          };
        }

        const origOpen = XMLHttpRequest.prototype.open;
        const origSend = XMLHttpRequest.prototype.send;
        XMLHttpRequest.prototype.open = function(method, url) {
          this.__qaswitch_url = url;
          return origOpen.apply(this, arguments);
        };
        XMLHttpRequest.prototype.send = function() {
          this.addEventListener('load', function() {
            if (this.status === 401 || this.status === 403) {
              notifyExpired(this.status);
            }
          });
          return origSend.apply(this, arguments);
        };
      }
    });
  } catch {}
}

async function injectWatermarkIntoTab(tabId, profileName) {
  try {
    const { qaswitch_watermark_enabled } = await chrome.storage.local.get("qaswitch_watermark_enabled");
    const enabled = qaswitch_watermark_enabled !== false;
    await chrome.scripting.executeScript({
      target: { tabId },
      func: (role, isEnabled) => {
        const oldPill = document.getElementById("__qaswitch_role_pill__");
        if (oldPill) oldPill.remove();
        const oldBorder = document.getElementById("__qaswitch_role_border__");
        if (oldBorder) oldBorder.remove();

        if (!isEnabled || !role) return;

        const norm = role.toLowerCase();
        let color = "#3b82f6";
        if (norm.includes("admin") || norm.includes("root")) color = "#ef4444";
        else if (norm.includes("vip") || norm.includes("pro")) color = "#a855f7";
        else if (norm.includes("qa") || norm.includes("test")) color = "#10b981";
        else if (norm.includes("guest")) color = "#64748b";

        const border = document.createElement("div");
        border.id = "__qaswitch_role_border__";
        border.style.cssText = `position:fixed!important;top:0!important;left:0!important;width:100%!important;height:3px!important;background-color:${color}!important;z-index:2147483646!important;pointer-events:none!important;box-shadow:0 0 8px ${color}!important;`;
        document.documentElement.appendChild(border);

        const pill = document.createElement("div");
        pill.id = "__qaswitch_role_pill__";
        pill.style.cssText = `position:fixed!important;bottom:16px!important;right:16px!important;z-index:2147483647!important;display:flex!important;align-items:center!important;gap:8px!important;padding:6px 12px!important;background:#0f172a!important;color:#f8fafc!important;border:1.5px solid ${color}!important;border-radius:20px!important;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif!important;font-size:11px!important;font-weight:600!important;box-shadow:0 4px 12px rgba(0,0,0,0.3)!important;cursor:pointer!important;user-select:none!important;opacity:0.9!important;transition:all 0.2s!important;`;
        pill.title = "Swaply Active Role (Double-click to dismiss)";
        pill.innerHTML = `<span style="display:inline-block;width:7px;height:7px;border-radius:50%;background:${color};box-shadow:0 0 6px ${color}"></span><span>${role}</span>`;
        pill.ondblclick = () => pill.remove();
        document.documentElement.appendChild(pill);
      },
      args: [profileName, enabled]
    });
  } catch {}
}

function setupInitialContextMenus() {
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

function updateContextMenusForDomain(domain, profiles, activeProfileId) {
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

async function syncDNRHeaders(domain, headers = {}) {
  try {
    if (!chrome.declarativeNetRequest) return;

    await chrome.declarativeNetRequest.updateDynamicRules({
      removeRuleIds: [DNR_RULE_ID]
    });

    const actions = [];
    for (const [k, v] of Object.entries(headers)) {
      if (k && v && typeof k === "string" && typeof v === "string") {
        actions.push({ header: k.trim(), operation: "set", value: v.trim() });
      }
    }

    if (actions.length > 0) {
      let cleanDomain = domain.startsWith(".") ? domain.slice(1) : domain;
      await chrome.declarativeNetRequest.updateDynamicRules({
        addRules: [
          {
            id: DNR_RULE_ID,
            priority: 1,
            action: { type: "modifyHeaders", requestHeaders: actions },
            condition: {
              urlFilter: `||${cleanDomain}^`,
              resourceTypes: ["main_frame", "sub_frame", "xmlhttprequest"]
            }
          }
        ]
      });
    }
  } catch (err) {
    console.warn("DNR header sync notice:", err);
  }
}

async function applyProfileToTab(tab, profile, domain) {
  if (!tab.id || !tab.url) return;

  // Snapshot rollback buffer before applying new profile
  try {
    const rawCookies = await chrome.cookies.getAll({ url: tab.url });
    const storageRes = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => {
        const local = {};
        for (let i = 0; i < localStorage.length; i++) {
          const k = localStorage.key(i);
          if (k) local[k] = localStorage.getItem(k);
        }
        return { local };
      }
    });
    const rollback = {
      timestamp: Date.now(),
      domain,
      cookies: rawCookies,
      storage: storageRes?.[0]?.result || { local: {} }
    };
    await chrome.storage.local.set({ [`qaswitch_rollback_${domain}`]: rollback });
  } catch {}

  await clearCookiesForTab(tab, domain);

  for (const cookie of profile.cookies || []) {
    try {
      const details = prepareCookieSetDetails(cookie, domain);
      await chrome.cookies.set(details);
    } catch {}
  }

  const activeKey = `${ACTIVE_PROFILE_PREFIX}${domain}`;
  await chrome.storage.local.set({ [activeKey]: profile.id });

  const badgeText = profile.name.slice(0, 3).toUpperCase();
  chrome.action.setBadgeText({ text: badgeText, tabId: tab.id });
  chrome.action.setBadgeBackgroundColor({ color: "#10b981", tabId: tab.id });

  // Sync custom HTTP headers into Declarative Net Request
  await syncDNRHeaders(domain, profile.headers);

  const navUrl = profile.macro && profile.macro.autoNavigateUrl ? profile.macro.autoNavigateUrl : null;
  await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    func: (data, targetNav) => {
      try {
        window.localStorage.clear();
        if (data && data.local) {
          for (const [k, v] of Object.entries(data.local)) {
            window.localStorage.setItem(k, v);
          }
        }
      } catch {}

      try {
        window.sessionStorage.clear();
        if (data && data.session) {
          for (const [k, v] of Object.entries(data.session)) {
            window.sessionStorage.setItem(k, v);
          }
        }
      } catch {}

      if (targetNav && typeof targetNav === "string" && targetNav.trim()) {
        try {
          const dest = targetNav.startsWith("http")
            ? targetNav
            : `${window.location.origin}${targetNav.startsWith("/") ? targetNav : "/" + targetNav}`;
          window.location.href = dest;
          return;
        } catch {}
      }

      window.location.reload();
    },
    args: [profile.storage || { local: {}, session: {} }, navUrl]
  });
}

async function executeCleanSlate(tab) {
  if (!tab.id || !tab.url) return;
  const domain = extractValidDomain(tab.url);
  if (!domain) return;

  await clearCookiesForTab(tab, domain);

  const activeKey = `${ACTIVE_PROFILE_PREFIX}${domain}`;
  await chrome.storage.local.remove([activeKey]);
  chrome.action.setBadgeText({ text: "", tabId: tab.id });

  // Clear Declarative Net Request dynamic headers
  await syncDNRHeaders(domain, {});

  await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    func: () => {
      try { window.localStorage.clear(); } catch {}
      try { window.sessionStorage.clear(); } catch {}
      window.location.reload();
    }
  });
}

async function clearCookiesForTab(tab, hostname) {
  if (!tab.url) return;
  const rawCookies = await chrome.cookies.getAll({ url: tab.url });
  let domainCookies = [];
  try {
    domainCookies = await chrome.cookies.getAll({ domain: hostname });
  } catch {}

  const all = deduplicateCookies([...rawCookies, ...domainCookies]);
  for (const cookie of all) {
    try {
      const url = buildCookieUrl(cookie, hostname);
      await chrome.cookies.remove({ url, name: cookie.name, storeId: cookie.storeId });
    } catch {}
  }
}

// Runtime Message Handling (Heartbeat status & Webhook dispatching)
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === "HEARTBEAT_STATUS") {
    const tabId = sender.tab ? sender.tab.id : null;
    if (tabId) {
      chrome.action.setBadgeText({ text: "⚠️EXP", tabId });
      chrome.action.setBadgeBackgroundColor({ color: "#ef4444", tabId });
    }
    if (request.domain) {
      chrome.storage.local.set({
        [`qaswitch_heartbeat_${request.domain}`]: {
          domain: request.domain,
          lastChecked: Date.now(),
          isExpired: true,
          statusCode: request.statusCode
        }
      });
    }
    sendResponse({ received: true });
    return true;
  }

  if (request.type === "BROADCAST_WEBHOOK") {
    const { url, payload } = request;
    fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
        sendResponse({ success: true });
      })
      .catch((err) => {
        sendResponse({ success: false, error: err.message });
      });
    return true; // Keep channel open for async response
  }
});

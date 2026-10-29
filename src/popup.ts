/**
 * QASwitch - Extension Popup Controller (TypeScript)
 * Orchestrates DOM events, Chrome APIs, and Core Services.
 */

import type { ProfileRecord, SessionCookie, DOMStorageSnapshot } from "./types/index.ts";
import { extractValidDomain, slugifyProfileName } from "./core/domainUtils.ts";
import {
  buildCookieUrl,
  deduplicateCookies,
  prepareCookieSetDetails
} from "./core/cookieManager.ts";
import {
  inPageStorageSnapshotScript,
  inPageStorageRestoreScript,
  sanitizeStorageSnapshot
} from "./core/storageManager.ts";
import {
  MAX_FREE_PROFILES,
  VALID_DEMO_KEY,
  canCreateProfile,
  createNewProfile,
  validateLicenseKey,
  buildExportPayload,
  parseAndValidateImportJSON
} from "./core/profileService.ts";

// Constants
const STORAGE_PREFIX = "qaswitch_domain_";
const ACTIVE_PROFILE_PREFIX = "qaswitch_active_";
const PRO_STORAGE_KEY = "qaswitch_is_pro_user";

// State
let currentTab: chrome.tabs.Tab | null = null;
let currentHostname: string | null = null;
let currentProfiles: ProfileRecord[] = [];
let activeProfileId: string | null = null;
let isProUser = false;

// DOM Elements
const elements = {
  domainText: document.getElementById("domainText") as HTMLElement,
  statusDot: document.getElementById("statusDot") as HTMLElement,
  restrictedNotice: document.getElementById("restrictedNotice") as HTMLElement,
  mainWorkspace: document.getElementById("mainWorkspace") as HTMLElement,
  tierBadge: document.getElementById("tierBadge") as HTMLElement,
  tierLabel: document.getElementById("tierLabel") as HTMLElement,
  tierCount: document.getElementById("tierCount") as HTMLElement,
  proBanner: document.getElementById("proBanner") as HTMLElement,
  upgradeBannerBtn: document.getElementById("upgradeBannerBtn") as HTMLButtonElement,
  nukeSessionBtn: document.getElementById("nukeSessionBtn") as HTMLButtonElement,
  profileNameInput: document.getElementById("profileNameInput") as HTMLInputElement,
  saveBtn: document.getElementById("saveBtn") as HTMLButtonElement,
  profileList: document.getElementById("profileList") as HTMLElement,
  emptyState: document.getElementById("emptyState") as HTMLElement,
  profileStatsText: document.getElementById("profileStatsText") as HTMLElement,
  importJsonBtn: document.getElementById("importJsonBtn") as HTMLButtonElement,
  exportAllJsonBtn: document.getElementById("exportAllJsonBtn") as HTMLButtonElement,
  importFileInput: document.getElementById("importFileInput") as HTMLInputElement,
  proModal: document.getElementById("proModal") as HTMLElement,
  closeModalBtn: document.getElementById("closeModalBtn") as HTMLButtonElement,
  licenseKeyInput: document.getElementById("licenseKeyInput") as HTMLInputElement,
  activateLicenseBtn: document.getElementById("activateLicenseBtn") as HTMLButtonElement,
  demoKeyPill: document.getElementById("demoKeyPill") as HTMLElement,
  toast: document.getElementById("toast") as HTMLElement,
  toastMessage: document.getElementById("toastMessage") as HTMLElement
};

document.addEventListener("DOMContentLoaded", async () => {
  setupEventListeners();
  await loadProStatus();
  await initializeDomainSession();
});

function setupEventListeners(): void {
  elements.saveBtn.addEventListener("click", handleSaveSession);
  elements.profileNameInput.addEventListener("keydown", (e: KeyboardEvent) => {
    if (e.key === "Enter" && !elements.saveBtn.disabled) {
      handleSaveSession();
    }
  });

  elements.nukeSessionBtn.addEventListener("click", handleNukeSession);
  elements.tierBadge.addEventListener("click", openProModal);
  if (elements.upgradeBannerBtn) {
    elements.upgradeBannerBtn.addEventListener("click", openProModal);
  }
  elements.closeModalBtn.addEventListener("click", closeProModal);
  elements.proModal.addEventListener("click", (e: MouseEvent) => {
    if (e.target === elements.proModal) closeProModal();
  });

  elements.activateLicenseBtn.addEventListener("click", handleActivateLicense);
  elements.demoKeyPill.addEventListener("click", () => {
    elements.licenseKeyInput.value = VALID_DEMO_KEY;
  });

  elements.exportAllJsonBtn.addEventListener("click", handleExportAll);
  elements.importJsonBtn.addEventListener("click", () => elements.importFileInput.click());
  elements.importFileInput.addEventListener("change", handleImportFile);
}

async function loadProStatus(): Promise<void> {
  const data = await chrome.storage.local.get([PRO_STORAGE_KEY]);
  isProUser = Boolean(data[PRO_STORAGE_KEY]);
  updateTierBadgeUI();
}

function updateTierBadgeUI(): void {
  if (isProUser) {
    elements.tierBadge.classList.add("pro-active");
    elements.tierLabel.textContent = "PRO 👑";
    elements.tierCount.classList.add("hidden");
    elements.proBanner.classList.add("hidden");
  } else {
    elements.tierBadge.classList.remove("pro-active");
    elements.tierLabel.textContent = "FREE";
    elements.tierCount.classList.remove("hidden");
  }
}

async function initializeDomainSession(): Promise<void> {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    currentTab = tab;

    if (!tab || !tab.url) {
      showRestrictedState("No active tab found");
      return;
    }

    const domain = extractValidDomain(tab.url);
    if (!domain) {
      showRestrictedState("Restricted browser page");
      return;
    }

    currentHostname = domain;
    elements.domainText.textContent = domain;
    elements.domainText.title = tab.url;
    elements.statusDot.classList.add("online");

    const activeKey = `${ACTIVE_PROFILE_PREFIX}${currentHostname}`;
    const activeData = await chrome.storage.local.get([activeKey]);
    activeProfileId = (activeData[activeKey] as string) || null;

    await loadProfilesForDomain();
  } catch (err) {
    console.error("Initialization error:", err);
    showRestrictedState("Failed to inspect active tab");
  }
}

function showRestrictedState(reason?: string): void {
  elements.domainText.textContent = reason || "Restricted URL";
  elements.statusDot.classList.remove("online");
  elements.statusDot.classList.add("warning");
  elements.restrictedNotice.classList.remove("hidden");
  elements.mainWorkspace.classList.add("hidden");
  elements.tierBadge.classList.add("hidden");
  elements.nukeSessionBtn.classList.add("hidden");
}

function getStorageKey(domain: string): string {
  return `${STORAGE_PREFIX}${domain}`;
}

async function loadProfilesForDomain(): Promise<void> {
  if (!currentHostname) return;

  const key = getStorageKey(currentHostname);
  const data = await chrome.storage.local.get([key]);
  currentProfiles = Array.isArray(data[key]) ? (data[key] as ProfileRecord[]) : [];

  renderProfileList();
  updateFreemiumStatus();
}

function updateFreemiumStatus(): void {
  const count = currentProfiles.length;
  elements.tierCount.textContent = `${count}/${MAX_FREE_PROFILES}`;
  elements.profileStatsText.textContent = `${count} ${count === 1 ? "profile" : "profiles"}`;

  const isLimitReached = !canCreateProfile(count, isProUser);

  if (isLimitReached) {
    elements.proBanner.classList.remove("hidden");
    elements.saveBtn.disabled = true;
    elements.profileNameInput.disabled = true;
    elements.profileNameInput.placeholder = "Free limit reached (2/2 profiles)";
  } else {
    elements.proBanner.classList.add("hidden");
    elements.saveBtn.disabled = false;
    elements.profileNameInput.disabled = false;
    elements.profileNameInput.placeholder = "e.g. Admin, Paid Member, Buyer...";
  }
}

function renderProfileList(): void {
  elements.profileList.innerHTML = "";

  if (currentProfiles.length === 0) {
    elements.emptyState.classList.remove("hidden");
    elements.profileList.classList.add("hidden");
    return;
  }

  elements.emptyState.classList.add("hidden");
  elements.profileList.classList.remove("hidden");

  currentProfiles.forEach((profile) => {
    const card = document.createElement("div");
    const isActive = profile.id === activeProfileId;
    card.className = `profile-card ${isActive ? "active-profile" : ""}`;

    const relativeTime = formatRelativeTime(profile.createdAt);
    const cookieCount = profile.cookies ? profile.cookies.length : 0;
    const localKeys = profile.storage?.local ? Object.keys(profile.storage.local).length : 0;
    const sessionKeys = profile.storage?.session ? Object.keys(profile.storage.session).length : 0;
    const storageCount = localKeys + sessionKeys;

    card.innerHTML = `
      <div class="profile-card-header">
        <div class="profile-title-group">
          <span class="profile-name" title="${escapeHtml(profile.name)}">${escapeHtml(profile.name)}</span>
          ${isActive ? '<span class="active-pill">ACTIVE</span>' : ""}
        </div>
        <div class="profile-meta">
          <span class="profile-time">${relativeTime}</span>
        </div>
      </div>

      <div class="profile-badges">
        <span class="badge" title="${cookieCount} cookies saved">
          🍪 ${cookieCount} cookies
        </span>
        <span class="badge" title="${storageCount} total storage keys (${localKeys} local, ${sessionKeys} session)">
          💾 ${storageCount} keys
        </span>
      </div>

      <div class="profile-actions">
        <button class="btn btn-apply" data-action="apply" data-id="${profile.id}">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
            <polyline points="1 4 1 10 7 10" />
            <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
          </svg>
          ${isActive ? "Re-apply" : "Switch"}
        </button>
        <div class="profile-actions-right">
          <button class="btn-icon-action" data-action="export-single" data-id="${profile.id}" title="Export profile JSON">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
          </button>
          <button class="btn-icon-action btn-delete" data-action="delete" data-id="${profile.id}" title="Delete Profile">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
            </svg>
          </button>
        </div>
      </div>
    `;

    (card.querySelector('[data-action="apply"]') as HTMLElement).addEventListener("click", () =>
      handleApplyProfile(profile)
    );
    (card.querySelector('[data-action="export-single"]') as HTMLElement).addEventListener("click", () =>
      exportSingleProfile(profile)
    );
    (card.querySelector('[data-action="delete"]') as HTMLElement).addEventListener("click", () =>
      handleDeleteProfile(profile.id, profile.name)
    );

    elements.profileList.appendChild(card);
  });
}

async function handleSaveSession(): Promise<void> {
  const profileName = elements.profileNameInput.value.trim();

  if (!profileName) {
    showToast("Please enter a profile name", "error");
    elements.profileNameInput.focus();
    return;
  }

  if (!canCreateProfile(currentProfiles.length, isProUser)) {
    showToast("Free tier limit reached", "error");
    openProModal();
    return;
  }

  if (!currentTab || !currentTab.id || !currentHostname || !currentTab.url) {
    showToast("No active tab session", "error");
    return;
  }

  setLoadingState(elements.saveBtn, true, "Saving...");

  try {
    const rawCookies = await chrome.cookies.getAll({ url: currentTab.url });
    let domainCookies: chrome.cookies.Cookie[] = [];
    try {
      domainCookies = await chrome.cookies.getAll({ domain: currentHostname });
    } catch {}

    const cookies = deduplicateCookies([...rawCookies, ...domainCookies] as SessionCookie[]);
    const storage = await snapshotDOMStorage(currentTab.id);

    const newProfile = createNewProfile(profileName, currentHostname, currentTab.url, cookies, storage);

    currentProfiles.unshift(newProfile);
    const key = getStorageKey(currentHostname);
    await chrome.storage.local.set({ [key]: currentProfiles });

    await setActiveProfile(newProfile);

    elements.profileNameInput.value = "";
    renderProfileList();
    updateFreemiumStatus();
    showToast(`Saved session "${profileName}"`, "success");
  } catch (err) {
    console.error("Failed to save session:", err);
    showToast("Failed to snapshot session", "error");
  } finally {
    setLoadingState(elements.saveBtn, false, "Save");
  }
}

async function snapshotDOMStorage(tabId: number): Promise<DOMStorageSnapshot> {
  try {
    const results = await chrome.scripting.executeScript({
      target: { tabId },
      func: inPageStorageSnapshotScript
    });
    return sanitizeStorageSnapshot(results?.[0]?.result);
  } catch (err) {
    console.warn("Could not capture DOM storage:", err);
    return { local: {}, session: {} };
  }
}

async function handleApplyProfile(profile: ProfileRecord): Promise<void> {
  if (!currentTab || !currentTab.id || !currentHostname) return;
  showToast(`Switching to "${profile.name}"...`);

  try {
    await clearActiveCookies(currentTab, currentHostname);
    await restoreSavedCookies(profile.cookies || []);
    await setActiveProfile(profile);

    await chrome.scripting.executeScript({
      target: { tabId: currentTab.id },
      func: inPageStorageRestoreScript,
      args: [profile.storage || { local: {}, session: {} }]
    });

    showToast(`Switched to "${profile.name}"! Reloading...`, "success");
    setTimeout(() => window.close(), 450);
  } catch (err) {
    console.error("Failed to switch profile:", err);
    showToast("Failed to switch session", "error");
  }
}

async function handleNukeSession(): Promise<void> {
  if (!currentTab || !currentTab.id || !currentHostname) return;
  if (!confirm(`Reset session on ${currentHostname}? All cookies and storage will be wiped.`)) {
    return;
  }

  showToast("Clearing session and cookies...");

  try {
    await clearActiveCookies(currentTab, currentHostname);

    const activeKey = `${ACTIVE_PROFILE_PREFIX}${currentHostname}`;
    await chrome.storage.local.remove([activeKey]);
    activeProfileId = null;
    chrome.action.setBadgeText({ text: "", tabId: currentTab.id });

    await chrome.scripting.executeScript({
      target: { tabId: currentTab.id },
      func: () => {
        try { window.localStorage.clear(); } catch {}
        try { window.sessionStorage.clear(); } catch {}
        window.location.reload();
      }
    });

    renderProfileList();
    showToast("Session reset to anonymous guest state", "success");
    setTimeout(() => window.close(), 450);
  } catch (err) {
    console.error("Failed to nuke session:", err);
    showToast("Failed to reset session", "error");
  }
}

async function setActiveProfile(profile: ProfileRecord): Promise<void> {
  if (!currentTab || !currentHostname) return;
  activeProfileId = profile.id;
  const activeKey = `${ACTIVE_PROFILE_PREFIX}${currentHostname}`;
  await chrome.storage.local.set({ [activeKey]: profile.id });

  try {
    const badgeText = profile.name.slice(0, 3).toUpperCase();
    if (currentTab.id) {
      chrome.action.setBadgeText({ text: badgeText, tabId: currentTab.id });
      chrome.action.setBadgeBackgroundColor({ color: "#10b981", tabId: currentTab.id });
    }
  } catch {}
}

async function clearActiveCookies(tab: chrome.tabs.Tab, hostname: string): Promise<void> {
  if (!tab.url) return;
  const rawCookies = await chrome.cookies.getAll({ url: tab.url });
  let domainCookies: chrome.cookies.Cookie[] = [];
  try {
    domainCookies = await chrome.cookies.getAll({ domain: hostname });
  } catch {}

  const allCookies = deduplicateCookies([...rawCookies, ...domainCookies] as SessionCookie[]);
  for (const cookie of allCookies) {
    try {
      const url = buildCookieUrl(cookie, hostname);
      await chrome.cookies.remove({ url, name: cookie.name, storeId: cookie.storeId });
    } catch {}
  }
}

async function restoreSavedCookies(cookies: SessionCookie[]): Promise<void> {
  for (const cookie of cookies) {
    try {
      const details = prepareCookieSetDetails(cookie, currentHostname || "localhost");
      await chrome.cookies.set(details as chrome.cookies.SetDetails);
    } catch {}
  }
}

async function handleDeleteProfile(profileId: string, profileName: string): Promise<void> {
  if (!currentHostname) return;
  try {
    currentProfiles = currentProfiles.filter((p) => p.id !== profileId);
    const key = getStorageKey(currentHostname);
    await chrome.storage.local.set({ [key]: currentProfiles });

    if (activeProfileId === profileId) {
      activeProfileId = null;
      const activeKey = `${ACTIVE_PROFILE_PREFIX}${currentHostname}`;
      await chrome.storage.local.remove([activeKey]);
      if (currentTab?.id) {
        chrome.action.setBadgeText({ text: "", tabId: currentTab.id });
      }
    }

    renderProfileList();
    updateFreemiumStatus();
    showToast(`Deleted "${profileName}"`, "success");
  } catch (err) {
    console.error("Delete failed:", err);
    showToast("Failed to delete profile", "error");
  }
}

function exportSingleProfile(profile: ProfileRecord): void {
  if (!isProUser) {
    openProModal();
    return;
  }

  const payload = buildExportPayload(currentHostname || "domain", [profile]);
  const filename = `qaswitch-${currentHostname}-${slugifyProfileName(profile.name)}.json`;
  downloadJSON(payload, filename);
  showToast(`Exported "${profile.name}" JSON`, "success");
}

function handleExportAll(): void {
  if (!isProUser) {
    openProModal();
    return;
  }

  if (currentProfiles.length === 0) {
    showToast("No profiles to export", "error");
    return;
  }

  const payload = buildExportPayload(currentHostname || "domain", currentProfiles);
  const filename = `qaswitch-${currentHostname}-all-profiles.json`;
  downloadJSON(payload, filename);
  showToast(`Exported ${currentProfiles.length} profiles`, "success");
}

function handleImportFile(event: Event): void {
  if (!isProUser) {
    elements.importFileInput.value = "";
    openProModal();
    return;
  }

  const target = event.target as HTMLInputElement;
  const file = target.files?.[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = async (e: ProgressEvent<FileReader>) => {
    try {
      const jsonStr = e.target?.result as string;
      const importedProfiles = parseAndValidateImportJSON(jsonStr, currentTab?.url || "");

      if (!importedProfiles || importedProfiles.length === 0) {
        showToast("Invalid QASwitch JSON structure", "error");
        return;
      }

      for (const p of importedProfiles) {
        currentProfiles.push(p);
      }

      if (currentHostname) {
        const key = getStorageKey(currentHostname);
        await chrome.storage.local.set({ [key]: currentProfiles });
      }

      renderProfileList();
      updateFreemiumStatus();
      showToast(`Imported ${importedProfiles.length} profile(s)`, "success");
    } catch {
      showToast("Could not read JSON file", "error");
    } finally {
      elements.importFileInput.value = "";
    }
  };

  reader.readAsText(file);
}

function downloadJSON(data: unknown, filename: string): void {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function openProModal(): void {
  elements.proModal.classList.remove("hidden");
  elements.licenseKeyInput.focus();
}

function closeProModal(): void {
  elements.proModal.classList.add("hidden");
  elements.licenseKeyInput.value = "";
}

async function handleActivateLicense(): Promise<void> {
  const key = elements.licenseKeyInput.value;

  if (validateLicenseKey(key)) {
    isProUser = true;
    await chrome.storage.local.set({ [PRO_STORAGE_KEY]: true });
    updateTierBadgeUI();
    updateFreemiumStatus();
    closeProModal();
    showToast("QASwitch Pro activated! Enjoy unlimited profiles 🎉", "success");
  } else {
    showToast("Invalid License Key (Try QAPRO-DEV)", "error");
  }
}

function formatRelativeTime(timestamp?: number): string {
  if (!timestamp) return "";
  const diffSec = Math.floor((Date.now() - timestamp) / 1000);

  if (diffSec < 60) return "Just now";
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;

  return new Date(timestamp).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric"
  });
}

function setLoadingState(btn: HTMLButtonElement, isLoading: boolean, text: string): void {
  const btnText = btn.querySelector(".btn-text");
  btn.disabled = isLoading;
  if (btnText) btnText.textContent = text;
}

let toastTimeout: NodeJS.Timeout | null = null;
function showToast(message: string, type: "normal" | "success" | "error" = "normal"): void {
  if (toastTimeout) clearTimeout(toastTimeout);

  elements.toastMessage.textContent = message;
  elements.toast.className = "toast-container";

  if (type === "success") elements.toast.classList.add("toast-success");
  if (type === "error") elements.toast.classList.add("toast-error");

  elements.toast.classList.remove("hidden");

  toastTimeout = setTimeout(() => {
    elements.toast.classList.add("hidden");
  }, 2400);
}

function escapeHtml(str: string): string {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}


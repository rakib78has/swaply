/**
 * QASwitch - DevTools Panel Controller (v1.6.0)
 * Drives persistent DevTools inspection, 1-click role switching, JWT decoding, DNR Headers, and cURL generation.
 */

const STORAGE_PREFIX = "qaswitch_domain_";
const ACTIVE_PROFILE_PREFIX = "qaswitch_active_";

let currentDomain = null;
let currentUrl = null;
let currentProfiles = [];
let activeProfileId = null;
let activeCookies = [];
let activeLocalStorage = {};

document.addEventListener("DOMContentLoaded", async () => {
  setupTabs();
  setupActions();
  await refreshDevToolsState();
});

function setupTabs() {
  const tabs = document.querySelectorAll(".nav-tab");
  tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      tabs.forEach((t) => t.classList.remove("active"));
      document.querySelectorAll(".tab-pane").forEach((p) => p.classList.remove("active"));

      tab.classList.add("active");
      const targetId = `tab-${tab.dataset.tab}`;
      const pane = document.getElementById(targetId);
      if (pane) pane.classList.add("active");
    });
  });
}

function setupActions() {
  document.getElementById("panelRefreshBtn").addEventListener("click", refreshDevToolsState);
  document.getElementById("panelNukeBtn").addEventListener("click", handlePanelNuke);
  document.getElementById("panelUndoBtn").addEventListener("click", handlePanelUndo);
  document.getElementById("copyCurlBtn").addEventListener("click", () => {
    const text = document.getElementById("curlOutput").value;
    navigator.clipboard.writeText(text);
    const btn = document.getElementById("copyCurlBtn");
    btn.textContent = "✓ Copied cURL!";
    setTimeout(() => (btn.textContent = "📋 Copy cURL to Clipboard"), 1800);
  });
  document.getElementById("copyPlaywrightStateBtn").addEventListener("click", () => {
    const text = document.getElementById("playwrightStateOutput").value;
    navigator.clipboard.writeText(text);
    const btn = document.getElementById("copyPlaywrightStateBtn");
    btn.textContent = "✓ Copied State!";
    setTimeout(() => (btn.textContent = "📋 Copy Playwright storageState"), 1800);
  });
  document.getElementById("copyPanelSecurityReportBtn").addEventListener("click", () => {
    const text = document.getElementById("panelSecurityReportOutput").value;
    navigator.clipboard.writeText(text);
    const btn = document.getElementById("copyPanelSecurityReportBtn");
    btn.textContent = "✓ Copied Report!";
    setTimeout(() => (btn.textContent = "📋 Copy Security Report"), 1800);
  });
  document.getElementById("panelSendWebhookBtn").addEventListener("click", handlePanelWebhookBroadcast);
  document.getElementById("panelApplyFlagsBtn").addEventListener("click", handlePanelApplyFlags);
  document.getElementById("panelCopyFlightBtn").addEventListener("click", handlePanelCopyFlight);
  document.getElementById("panelRunDastBtn").addEventListener("click", handlePanelRunDast);
  document.getElementById("panelRefreshGraphqlBtn")?.addEventListener("click", renderGraphqlTab);
  document.getElementById("panelRefreshWsBtn")?.addEventListener("click", renderWsTab);
  document.getElementById("panelRunVitalsBtn")?.addEventListener("click", renderVitalsTab);
  document.getElementById("panelRefreshTimeMachineBtn")?.addEventListener("click", renderTimeMachineTab);
  document.getElementById("panelRunWaterfallBtn")?.addEventListener("click", renderWaterfallTab);
  document.getElementById("panelGenerateMatrixBtn")?.addEventListener("click", renderMatrixTab);
}

async function refreshDevToolsState() {
  if (chrome.devtools && chrome.devtools.inspectedWindow) {
    chrome.devtools.inspectedWindow.eval("window.location.href", async (url, isException) => {
      if (isException || !url) return;
      await processInspectedUrl(url, () => {
        return new Promise((resolve) => {
          chrome.devtools.inspectedWindow.eval(
            `(() => {
              const dump = {};
              for (let i = 0; i < localStorage.length; i++) {
                const k = localStorage.key(i);
                if (k) dump[k] = localStorage.getItem(k);
              }
              return dump;
            })()`,
            (storageResult) => resolve(storageResult || {})
          );
        });
      });
    });
  } else if (chrome.tabs) {
    try {
      const tabs = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
      const tab = tabs[0] || (await chrome.tabs.query({}))[0];
      if (tab && tab.url) {
        await processInspectedUrl(tab.url, async () => {
          try {
            const results = await chrome.scripting.executeScript({
              target: { tabId: tab.id },
              func: () => {
                const dump = {};
                for (let i = 0; i < localStorage.length; i++) {
                  const k = localStorage.key(i);
                  if (k) dump[k] = localStorage.getItem(k);
                }
                return dump;
              }
            });
            return results?.[0]?.result || {};
          } catch {
            return {};
          }
        });
      }
    } catch (e) {
      console.warn("DevTools fallback query failed:", e);
    }
  }
}

async function processInspectedUrl(url, getStorage) {
  currentUrl = url;
  try {
    const parsed = new URL(url);
    currentDomain = parsed.hostname;
    document.getElementById("inspectedDomain").textContent = currentDomain;

    const profileKey = `${STORAGE_PREFIX}${currentDomain}`;
    const activeKey = `${ACTIVE_PROFILE_PREFIX}${currentDomain}`;
    const data = await chrome.storage.local.get([profileKey, activeKey]);

    currentProfiles = Array.isArray(data[profileKey]) ? data[profileKey] : [];
    activeProfileId = data[activeKey] || null;

    renderPanelRoles();

    activeCookies = await chrome.cookies.getAll({ url: currentUrl });
    activeLocalStorage = await getStorage();

    renderJWTInspector();
    renderActiveHeaders();
    renderCurlOutput();
    renderRawStorage();
    renderPlaywrightOutput();
    renderPanelSecurityAudit();
    renderWebhookTab();
    renderFlagsTab();
    renderFlightTab();
    renderDastTab();
    renderWaterfallTab();
    renderMatrixTab();

    const rollbackKey = `qaswitch_rollback_${currentDomain}`;
    const rollbackData = await chrome.storage.local.get([rollbackKey]);
    const undoBtn = document.getElementById("panelUndoBtn");
    if (rollbackData[rollbackKey]) {
      undoBtn.style.display = "inline-block";
    } else {
      undoBtn.style.display = "none";
    }
  } catch (e) {
    console.error("DevTools refresh failed:", e);
  }
}

function renderPlaywrightOutput() {
  const origin = currentUrl ? new URL(currentUrl).origin : `https://${currentDomain}`;
  const cookies = (activeCookies || []).map((c) => ({
    name: c.name,
    value: c.value,
    domain: c.domain,
    path: c.path || "/",
    expires: c.expirationDate || -1,
    httpOnly: Boolean(c.httpOnly),
    secure: Boolean(c.secure),
    sameSite: c.sameSite === "strict" ? "Strict" : c.sameSite === "no_restriction" ? "None" : "Lax"
  }));
  const localStorage = [];
  if (activeLocalStorage) {
    for (const [k, v] of Object.entries(activeLocalStorage)) {
      if (typeof v === "string") localStorage.push({ name: k, value: v });
    }
  }
  const state = { cookies, origins: [{ origin, localStorage }] };
  document.getElementById("playwrightStateOutput").value = JSON.stringify(state, null, 2);
}

function renderPanelSecurityAudit() {
  const findings = [];
  const SENSITIVE_COOKIE_REGEX = /(sess|token|jwt|auth|sid|user|id|login|key)/i;
  const isLocalhost = currentDomain.includes("localhost") || currentDomain.includes("127.0.0.1");

  for (const c of activeCookies || []) {
    const isSensitive = SENSITIVE_COOKIE_REGEX.test(c.name);
    if (isSensitive && !c.httpOnly) {
      findings.push(`- [HIGH] Cookie "${c.name}" lacks HttpOnly (XSS credential theft risk)`);
    }
    if (!c.secure && !isLocalhost) {
      findings.push(`- [HIGH] Cookie "${c.name}" lacks Secure flag (MITM plaintext risk)`);
    }
    if (!c.sameSite || c.sameSite === "unspecified") {
      findings.push(`- [MEDIUM] Cookie "${c.name}" has unspecified SameSite policy (CSRF risk)`);
    }
  }

  for (const k of Object.keys(activeLocalStorage || {})) {
    if (/(pass|token|jwt|secret|key|auth)/i.test(k)) {
      findings.push(`- [HIGH] Sensitive credential stored in window.localStorage['${k}']`);
    }
  }

  const score = Math.max(0, 100 - findings.length * 15);
  const grade = score >= 90 ? "A+" : score >= 80 ? "A" : score >= 65 ? "B" : score >= 50 ? "C" : "F";

  const lines = [
    `# 🛡️ QASwitch DevTools Security Audit: ${currentDomain}`,
    `Grade: ${grade} (${score}/100) | Scanned: ${(activeCookies || []).length} cookies, ${Object.keys(activeLocalStorage || {}).length} storage keys`,
    ``,
    findings.length === 0 ? `✅ Excellent! Zero session security vulnerabilities detected.` : `### Vulnerability Findings (${findings.length}):\n` + findings.join("\n")
  ];

  document.getElementById("panelSecurityReportOutput").value = lines.join("\n");
}

async function handlePanelUndo() {
  const rollbackKey = `qaswitch_rollback_${currentDomain}`;
  const data = await chrome.storage.local.get([rollbackKey]);
  const rollback = data[rollbackKey];
  if (!rollback) return;

  for (const c of activeCookies) {
    try {
      const protocol = c.secure ? "https:" : "http:";
      const host = c.domain.startsWith(".") ? c.domain.slice(1) : c.domain;
      await chrome.cookies.remove({ url: `${protocol}//${host}${c.path || "/"}`, name: c.name, storeId: c.storeId });
    } catch {}
  }

  for (const c of rollback.cookies || []) {
    try {
      const protocol = c.secure ? "https:" : "http:";
      const host = c.domain.startsWith(".") ? c.domain.slice(1) : c.domain;
      const details = {
        url: `${protocol}//${host}${c.path || "/"}`,
        name: c.name,
        value: c.value,
        path: c.path || "/",
        secure: Boolean(c.secure),
        httpOnly: Boolean(c.httpOnly),
        storeId: c.storeId
      };
      if (!c.hostOnly && c.domain) details.domain = c.domain;
      await chrome.cookies.set(details);
    } catch {}
  }

  await chrome.storage.local.remove([rollbackKey]);

  const storageStr = JSON.stringify(rollback.storage || { local: {} });
  await executeInTargetWindow(`
    try {
      const data = ${storageStr};
      localStorage.clear();
      if (data.local) {
        for (const [k, v] of Object.entries(data.local)) localStorage.setItem(k, v);
      }
      window.location.reload();
    } catch (e) {}
  `);

  setTimeout(refreshDevToolsState, 500);
}

function renderPanelRoles() {
  const container = document.getElementById("panelRoleList");
  container.innerHTML = "";

  if (currentProfiles.length === 0) {
    container.innerHTML = '<div class="empty-hint">No saved roles for this domain.</div>';
    return;
  }

  currentProfiles.forEach((p) => {
    const item = document.createElement("div");
    const isActive = p.id === activeProfileId;
    item.className = `role-item ${isActive ? "active" : ""}`;

    item.innerHTML = `
      <div class="role-info">
        <span class="role-name">${escapeHtml(p.name)}</span>
        <span class="role-sub">${p.cookies?.length || 0} cookies • ${Object.keys(p.headers || {}).length} headers</span>
      </div>
      <button class="btn btn-sm btn-switch" data-id="${p.id}">${isActive ? "Active" : "Switch"}</button>
    `;

    item.querySelector("button").addEventListener("click", () => handleApplyRole(p));
    container.appendChild(item);
  });
}

async function handleApplyRole(profile) {
  for (const c of activeCookies) {
    try {
      const protocol = c.secure ? "https:" : "http:";
      const host = c.domain.startsWith(".") ? c.domain.slice(1) : c.domain;
      const url = `${protocol}//${host}${c.path || "/"}`;
      await chrome.cookies.remove({ url, name: c.name, storeId: c.storeId });
    } catch {}
  }

  for (const c of profile.cookies || []) {
    try {
      const protocol = c.secure ? "https:" : "http:";
      const host = c.domain.startsWith(".") ? c.domain.slice(1) : c.domain;
      const details = {
        url: `${protocol}//${host}${c.path || "/"}`,
        name: c.name,
        value: c.value,
        path: c.path || "/",
        secure: Boolean(c.secure),
        httpOnly: Boolean(c.httpOnly),
        storeId: c.storeId
      };
      if (!c.hostOnly && c.domain) details.domain = c.domain;
      if (!c.session && c.expirationDate) details.expirationDate = c.expirationDate;
      await chrome.cookies.set(details);
    } catch {}
  }

  const activeKey = `${ACTIVE_PROFILE_PREFIX}${currentDomain}`;
  await chrome.storage.local.set({ [activeKey]: profile.id });

  const storageStr = JSON.stringify(profile.storage || { local: {}, session: {} });
  await executeInTargetWindow(`
    try {
      const data = ${storageStr};
      localStorage.clear();
      if (data.local) {
        for (const [k, v] of Object.entries(data.local)) localStorage.setItem(k, v);
      }
      sessionStorage.clear();
      if (data.session) {
        for (const [k, v] of Object.entries(data.session)) sessionStorage.setItem(k, v);
      }
      window.location.reload();
    } catch (e) {}
  `);

  setTimeout(refreshDevToolsState, 500);
}

async function handlePanelNuke() {
  for (const c of activeCookies) {
    try {
      const protocol = c.secure ? "https:" : "http:";
      const host = c.domain.startsWith(".") ? c.domain.slice(1) : c.domain;
      await chrome.cookies.remove({ url: `${protocol}//${host}${c.path || "/"}`, name: c.name, storeId: c.storeId });
    } catch {}
  }

  const activeKey = `${ACTIVE_PROFILE_PREFIX}${currentDomain}`;
  await chrome.storage.local.remove([activeKey]);

  await executeInTargetWindow(`
    localStorage.clear();
    sessionStorage.clear();
    window.location.reload();
  `);

  setTimeout(refreshDevToolsState, 500);
}

async function executeInTargetWindow(codeStr) {
  if (chrome.devtools && chrome.devtools.inspectedWindow) {
    chrome.devtools.inspectedWindow.eval(codeStr);
  } else if (chrome.tabs && chrome.scripting) {
    try {
      const tabs = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
      const tab = tabs[0] || (await chrome.tabs.query({}))[0];
      if (tab && tab.id) {
        await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          func: new Function(codeStr)
        });
      }
    } catch (e) {
      console.warn("Failed to execute script in tab:", e);
    }
  }
}

function isJWT(str) {
  if (!str || typeof str !== "string") return false;
  const parts = str.trim().split(".");
  return parts.length === 3 && parts[0].length > 0 && parts[1].length > 0;
}

function decodeBase64Url(str) {
  let base64 = str.replace(/-/g, "+").replace(/_/g, "/");
  while (base64.length % 4) base64 += "=";
  return decodeURIComponent(
    atob(base64)
      .split("")
      .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
      .join("")
  );
}

function parseJWT(token) {
  try {
    const parts = token.split(".");
    const header = JSON.parse(decodeBase64Url(parts[0]));
    const payload = JSON.parse(decodeBase64Url(parts[1]));
    let expiryNotice = "No expiration date";
    let isExpired = false;

    if (payload.exp) {
      const diffSec = payload.exp - Math.floor(Date.now() / 1000);
      isExpired = diffSec <= 0;
      if (isExpired) {
        const mins = Math.abs(Math.floor(diffSec / 60));
        expiryNotice = `Expired ${mins}m ago`;
      } else {
        const mins = Math.floor(diffSec / 60);
        expiryNotice = `Valid (${mins}m remaining)`;
      }
    }

    return { header, payload, isExpired, expiryNotice };
  } catch {
    return null;
  }
}

function renderJWTInspector() {
  const container = document.getElementById("jwtListContainer");
  container.innerHTML = "";

  const jwts = [];
  for (const c of activeCookies) {
    if (isJWT(c.value)) {
      const parsed = parseJWT(c.value);
      if (parsed) jwts.push({ source: "Cookie", name: c.name, parsed });
    }
  }

  for (const [k, v] of Object.entries(activeLocalStorage)) {
    if (typeof v === "string" && isJWT(v)) {
      const parsed = parseJWT(v);
      if (parsed) jwts.push({ source: "LocalStorage", name: k, parsed });
    }
  }

  if (jwts.length === 0) {
    container.innerHTML = '<div class="empty-hint">No JWT tokens detected in cookies or localStorage.</div>';
    return;
  }

  jwts.forEach((j) => {
    const card = document.createElement("div");
    card.className = "jwt-card";

    card.innerHTML = `
      <div class="jwt-header-row">
        <span class="jwt-source-badge">${j.source}: ${escapeHtml(j.name)}</span>
        <span class="jwt-expiry-badge ${j.parsed.isExpired ? "expired" : "valid"}">${j.parsed.expiryNotice}</span>
      </div>
      <div><strong>Decoded Payload:</strong></div>
      <pre class="jwt-code-block">${escapeHtml(JSON.stringify(j.parsed.payload, null, 2))}</pre>
    `;

    container.appendChild(card);
  });
}

function renderActiveHeaders() {
  const activeProfile = currentProfiles.find((p) => p.id === activeProfileId);
  const headers = activeProfile?.headers || {};
  const lines = Object.entries(headers).map(([k, v]) => `${k}: ${v}`);
  document.getElementById("activeHeadersOutput").value =
    lines.length > 0
      ? lines.join("\n")
      : "(No custom HTTP headers injected for this role. Use + Add HTTP Headers in QASwitch popup)";
}

function renderCurlOutput() {
  if (!currentUrl) return;
  const cookieHeader = activeCookies.map((c) => `${c.name}=${c.value}`).join("; ");
  const safeUrl = currentUrl.replace(/'/g, "'\\''");

  let curl = `curl -X GET '${safeUrl}'`;
  if (cookieHeader) {
    curl += ` \\\n  -H 'Cookie: ${cookieHeader.replace(/'/g, "'\\''")}'`;
  }
  document.getElementById("curlOutput").value = curl;
}

function renderRawStorage() {
  document.getElementById("rawCookiesDump").textContent =
    activeCookies.length > 0 ? JSON.stringify(activeCookies, null, 2) : "(No cookies)";
  document.getElementById("rawStorageDump").textContent =
    Object.keys(activeLocalStorage).length > 0 ? JSON.stringify(activeLocalStorage, null, 2) : "(LocalStorage empty)";
}

function escapeHtml(str) {
  if (!str) return "";
  return String(str).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function renderWebhookTab() {
  const activeProfile = currentProfiles.find((p) => p.id === activeProfileId);
  const roleName = activeProfile ? activeProfile.name : "Guest / Active DevTools Session";

  const payload = {
    event: "devtools.session.broadcast",
    version: "2.1.0",
    domain: currentDomain,
    role: roleName,
    cookiesCount: activeCookies.length,
    storageKeysCount: Object.keys(activeLocalStorage).length,
    timestamp: Date.now()
  };

  const preview = document.getElementById("panelWebhookPayloadPreview");
  if (preview) {
    preview.value = JSON.stringify(payload, null, 2);
  }

  chrome.storage.local.get(["qaswitch_webhook_config"], (data) => {
    const input = document.getElementById("panelWebhookUrl");
    if (input && data.qaswitch_webhook_config && data.qaswitch_webhook_config.url) {
      input.value = data.qaswitch_webhook_config.url;
    }
  });
}

function handlePanelWebhookBroadcast() {
  const url = document.getElementById("panelWebhookUrl").value.trim();
  const preview = document.getElementById("panelWebhookPayloadPreview").value;
  const btn = document.getElementById("panelSendWebhookBtn");

  if (!url) {
    alert("Please enter a valid webhook URL.");
    return;
  }

  btn.textContent = "Broadcasting...";
  try {
    const payload = JSON.parse(preview);
    chrome.runtime.sendMessage({ type: "BROADCAST_WEBHOOK", url, payload }, (res) => {
      btn.textContent = "🚀 Broadcast Now";
      if (res && res.success) {
        alert("Broadcast sent successfully to team channel!");
      } else {
        alert("Broadcast failed: " + (res?.error || "Unknown network error"));
      }
    });
  } catch (err) {
    btn.textContent = "🚀 Broadcast Now";
    alert("Invalid payload: " + err.message);
  }
}

function renderFlagsTab() {
  chrome.storage.local.get([`qaswitch_flags_${currentDomain}`], (data) => {
    const input = document.getElementById("panelFlagsInput");
    if (input) {
      input.value = data[`qaswitch_flags_${currentDomain}`] || "newCheckoutFlow=true\ndarkMode=true";
    }
  });
}

function handlePanelApplyFlags() {
  const text = document.getElementById("panelFlagsInput").value.trim();
  const btn = document.getElementById("panelApplyFlagsBtn");
  chrome.storage.local.set({ [`qaswitch_flags_${currentDomain}`]: text }, () => {
    btn.textContent = "✓ Injected!";
    setTimeout(() => (btn.textContent = "⚡ Inject Overrides into Page"), 1500);
  });
}

function renderFlightTab() {
  if (chrome.devtools && chrome.devtools.inspectedWindow) {
    chrome.devtools.inspectedWindow.eval("window.__QASWITCH_FLIGHT_RECORDER__ || []", (events, isErr) => {
      const output = document.getElementById("panelFlightLogOutput");
      if (output) {
        if (!isErr && Array.isArray(events) && events.length > 0) {
          const lines = events.map((e) => `[${new Date(e.timestamp).toLocaleTimeString()}] [${e.type}] ${e.message}`);
          output.value = lines.join("\n");
        } else {
          output.value = "# Blackbox Flight Recorder: Active\nNo error events or anomalies detected in the last 60 seconds.";
        }
      }
    });
  }
}

function handlePanelCopyFlight() {
  const text = document.getElementById("panelFlightLogOutput").value;
  navigator.clipboard.writeText(text);
  const btn = document.getElementById("panelCopyFlightBtn");
  btn.textContent = "✓ Copied!";
  setTimeout(() => (btn.textContent = "📋 Copy Flight Log"), 1500);
}

function renderDastTab() {
  if (chrome.devtools && chrome.devtools.inspectedWindow) {
    chrome.devtools.inspectedWindow.eval("document.documentElement.outerHTML", (html, isErr) => {
      const output = document.getElementById("panelDastReportOutput");
      if (output) {
        if (!isErr && html) {
          const findings = [];
          if (/sk_live_[0-9a-zA-Z]{24}/.test(html)) {
            findings.push("[HIGH] Potential Stripe Secret Key leaked in client script");
          }
          if (/AKIA[0-9A-Z]{16}/.test(html)) {
            findings.push("[HIGH] Potential AWS Access Key ID leaked in client HTML");
          }
          if (findings.length === 0) {
            output.value = `✓ DAST Scanner: 0 client-side secret leaks detected on ${currentDomain}.\nScore: 100/100`;
          } else {
            output.value = `# DevSecOps DAST Findings for ${currentDomain}:\n` + findings.join("\n");
          }
        }
      }
    });
  }
}

function handlePanelRunDast() {
  renderDastTab();
  const btn = document.getElementById("panelRunDastBtn");
  btn.textContent = "✓ Scan Complete!";
  setTimeout(() => (btn.textContent = "🔍 Run DAST Scan"), 1500);
}

function renderGraphqlTab() {
  if (chrome.devtools && chrome.devtools.inspectedWindow) {
    chrome.devtools.inspectedWindow.eval("window.__QASWITCH_GRAPHQL_LOGS__ || []", (logs, isErr) => {
      const output = document.getElementById("panelGraphqlOutput");
      if (output) {
        if (!isErr && Array.isArray(logs) && logs.length > 0) {
          output.value = JSON.stringify(logs, null, 2);
        } else {
          output.value = "No GraphQL operations intercepted in active tab yet.\n(Use GraphQL Studio in Popup to inject active mock rules).";
        }
      }
    });
  }
}

function renderWsTab() {
  if (chrome.devtools && chrome.devtools.inspectedWindow) {
    chrome.devtools.inspectedWindow.eval("window.__QASWITCH_WS_FRAMES__ || []", (frames, isErr) => {
      const output = document.getElementById("panelWsOutput");
      if (output) {
        if (!isErr && Array.isArray(frames) && frames.length > 0) {
          const lines = frames.map(f => `[${new Date(f.timestamp).toLocaleTimeString()}] [${f.direction}] ${f.payload}`);
          output.value = lines.join("\n");
        } else {
          output.value = "No WebSocket or SSE frames captured yet.\n(Ensure WebSocket Inspector is open or tab was loaded).";
        }
      }
    });
  }
}

function renderVitalsTab() {
  if (chrome.devtools && chrome.devtools.inspectedWindow) {
    chrome.devtools.inspectedWindow.eval(
      `(() => {
        const nav = performance.getEntriesByType('navigation')[0];
        const paints = performance.getEntriesByType('paint');
        const res = [];
        if (nav) res.push('TTFB: ' + Math.round(nav.responseStart - nav.requestStart) + 'ms');
        const fcp = paints.find(p => p.name === 'first-contentful-paint');
        if (fcp) res.push('FCP: ' + Math.round(fcp.startTime) + 'ms');
        if (performance.memory) res.push('Heap: ' + Math.round(performance.memory.usedJSHeapSize / (1024*1024)) + 'MB');
        return res.join('\\n');
      })()`,
      (vitalsText, isErr) => {
        const output = document.getElementById("panelVitalsOutput");
        if (output) {
          output.value = !isErr && vitalsText ? vitalsText : "Could not collect performance metrics from active tab.";
        }
      }
    );
  }
}

function renderTimeMachineTab() {
  if (chrome.devtools && chrome.devtools.inspectedWindow) {
    chrome.devtools.inspectedWindow.eval("window.__QASWITCH_STORAGE_CHANGELOG__ || []", (logs, isErr) => {
      const output = document.getElementById("panelTimeMachineOutput");
      if (output) {
        if (!isErr && Array.isArray(logs) && logs.length > 0) {
          const lines = logs.map(l => `[${new Date(l.timestamp).toLocaleTimeString()}] [${l.type}] ${l.key} => ${l.newValue}`);
          output.value = lines.join("\n");
        } else {
          output.value = "No storage mutations recorded yet in active tab.\n(Open Time Machine in popup to enable mutation observer).";
        }
      }
    });
  }
}

function renderWaterfallTab() {
  if (chrome.devtools && chrome.devtools.inspectedWindow) {
    chrome.devtools.inspectedWindow.eval(
      `(() => {
        const entries = performance.getEntriesByType('resource');
        let total = 0;
        let bottlenecks = 0;
        const lines = ['# URL | Category | Duration | Size | Bottleneck'];
        for (const e of entries) {
          const b = e.transferSize || 0;
          const d = Math.round(e.duration);
          total += b;
          let isB = false;
          let reason = 'OK';
          if (b > 1024*1024) { isB = true; reason = 'Image > 1MB'; }
          else if (b > 500*1024 && (e.name.includes('.js') || e.initiatorType === 'script')) { isB = true; reason = 'Script > 500KB'; }
          else if (d > 2500) { isB = true; reason = 'Slow > 2.5s'; }
          if (isB) bottlenecks++;
          const short = e.name.length > 50 ? e.name.slice(0, 47) + '...' : e.name;
          lines.push(short + ' | ' + (e.initiatorType || 'other') + ' | ' + d + 'ms | ' + Math.round(b/1024) + 'KB | ' + reason);
        }
        lines.unshift('Score: ' + Math.max(0, 100 - (bottlenecks * 12)) + '/100 | Transferred: ' + Math.round(total/1024) + 'KB | Bottlenecks: ' + bottlenecks);
        return lines.join('\\n');
      })()`,
      (reportText, isErr) => {
        const output = document.getElementById("panelWaterfallOutput");
        if (output) {
          output.value = !isErr && reportText ? reportText : "Could not collect resource waterfall data.";
        }
      }
    );
  }
}

function renderMatrixTab() {
  const output = document.getElementById("panelMatrixOutput");
  if (!output) return;

  if (!currentProfiles || currentProfiles.length === 0) {
    output.value = "No saved profiles found for this domain.\nSave profiles to auto-generate QA Test Matrix.";
    return;
  }

  function inferRbac(p) {
    const t = `${p.name} ${JSON.stringify(p.headers || {})} ${JSON.stringify(p.storage?.local || {})}`.toLowerCase();
    if (t.includes('super_admin') || t.includes('superadmin')) return 'SUPER_ADMIN';
    if (t.includes('admin')) return 'ADMIN_ACCESS';
    if (t.includes('vip') || t.includes('gold')) return 'VIP_PREMIUM';
    if (t.includes('auditor') || t.includes('read_only')) return 'READ_ONLY_AUDITOR';
    if (t.includes('banned') || t.includes('restricted')) return 'DENIED_BLOCKED';
    return 'STANDARD_USER';
  }

  const lines = [
    `# QA Test Matrix: ${currentDomain || 'Unknown'}`,
    `Total Cases: ${currentProfiles.length}`,
    '',
    'Test ID | Role Persona | Expected Status | RBAC Level | Headers'
  ];

  currentProfiles.forEach((p, idx) => {
    const rbac = inferRbac(p);
    const expected = rbac === 'DENIED_BLOCKED' ? 403 : 200;
    const h = p.headers ? Object.keys(p.headers).join(', ') || 'None' : 'None';
    lines.push(`TC-${String(idx + 1).padStart(3, '0')} | ${p.name} | ${expected} | ${rbac} | ${h}`);
  });

  output.value = lines.join('\n');
}

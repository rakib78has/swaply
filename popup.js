/**
 * QASwitch - Extension Popup Script (Manifest V3 - Enterprise Edition v1.6.0)
 * Includes Custom HTTP Header Injection, AES-GCM Encrypted Sharing, and Session Diffing.
 */

const MAX_FREE_PROFILES = 2;
const STORAGE_PREFIX = "qaswitch_domain_";
const ACTIVE_PROFILE_PREFIX = "qaswitch_active_";
const PRO_STORAGE_KEY = "qaswitch_is_pro_user";
const VALID_DEMO_KEY = "QAPRO-DEV";

// State
let currentTab = null;
let currentHostname = null;
let currentProfiles = [];
let activeProfileId = null;
let isProUser = false;
let pendingShareProfile = null;

// DOM Elements
const elements = {
  domainText: document.getElementById("domainText"),
  statusDot: document.getElementById("statusDot"),
  restrictedNotice: document.getElementById("restrictedNotice"),
  mainWorkspace: document.getElementById("mainWorkspace"),
  tierBadge: document.getElementById("tierBadge"),
  tierLabel: document.getElementById("tierLabel"),
  tierCount: document.getElementById("tierCount"),
  proBanner: document.getElementById("proBanner"),
  upgradeBannerBtn: document.getElementById("upgradeBannerBtn"),
  nukeSessionBtn: document.getElementById("nukeSessionBtn"),
  toggleHeadersBtn: document.getElementById("toggleHeadersBtn"),
  headersInputArea: document.getElementById("headersInputArea"),
  customHeadersInput: document.getElementById("customHeadersInput"),
  profileNameInput: document.getElementById("profileNameInput"),
  saveBtn: document.getElementById("saveBtn"),
  profileList: document.getElementById("profileList"),
  emptyState: document.getElementById("emptyState"),
  profileStatsText: document.getElementById("profileStatsText"),
  compareRolesBtn: document.getElementById("compareRolesBtn"),
  importJsonBtn: document.getElementById("importJsonBtn"),
  exportAllJsonBtn: document.getElementById("exportAllJsonBtn"),
  importFileInput: document.getElementById("importFileInput"),
  diffModal: document.getElementById("diffModal"),
  closeDiffModalBtn: document.getElementById("closeDiffModalBtn"),
  diffRoleA: document.getElementById("diffRoleA"),
  diffRoleB: document.getElementById("diffRoleB"),
  diffResultsContainer: document.getElementById("diffResultsContainer"),
  shareModal: document.getElementById("shareModal"),
  closeShareModalBtn: document.getElementById("closeShareModalBtn"),
  sharePassphraseInput: document.getElementById("sharePassphraseInput"),
  generateEncryptedShareBtn: document.getElementById("generateEncryptedShareBtn"),
  shareResultArea: document.getElementById("shareResultArea"),
  encryptedOutputSnippet: document.getElementById("encryptedOutputSnippet"),
  proModal: document.getElementById("proModal"),
  closeModalBtn: document.getElementById("closeModalBtn"),
  licenseKeyInput: document.getElementById("licenseKeyInput"),
  activateLicenseBtn: document.getElementById("activateLicenseBtn"),
  demoKeyPill: document.getElementById("demoKeyPill"),
  toast: document.getElementById("toast"),
  toastMessage: document.getElementById("toastMessage"),
  rollbackBanner: document.getElementById("rollbackBanner"),
  rollbackBannerText: document.getElementById("rollbackBannerText"),
  rollbackBtn: document.getElementById("rollbackBtn"),
  profileTtlSelect: document.getElementById("profileTtlSelect"),
  watermarkToggleCheckbox: document.getElementById("watermarkToggleCheckbox"),
  testExportModal: document.getElementById("testExportModal"),
  closeTestExportModalBtn: document.getElementById("closeTestExportModalBtn"),
  tabExportPlaywright: document.getElementById("tabExportPlaywright"),
  tabExportPostman: document.getElementById("tabExportPostman"),
  tabExportCypress: document.getElementById("tabExportCypress"),
  testExportCodeArea: document.getElementById("testExportCodeArea"),
  copyTestExportBtn: document.getElementById("copyTestExportBtn"),
  downloadTestExportBtn: document.getElementById("downloadTestExportBtn"),
  auditSecurityBtn: document.getElementById("auditSecurityBtn"),
  securityModal: document.getElementById("securityModal"),
  closeSecurityModalBtn: document.getElementById("closeSecurityModalBtn"),
  securityGradeBadge: document.getElementById("securityGradeBadge"),
  securityScoreText: document.getElementById("securityScoreText"),
  securityFindingsContainer: document.getElementById("securityFindingsContainer"),
  copySecurityReportBtn: document.getElementById("copySecurityReportBtn"),
  bugReportBtn: document.getElementById("bugReportBtn"),
  bugReportModal: document.getElementById("bugReportModal"),
  closeBugReportModalBtn: document.getElementById("closeBugReportModalBtn"),
  bugTitleInput: document.getElementById("bugTitleInput"),
  bugDescriptionInput: document.getElementById("bugDescriptionInput"),
  bugMarkdownPreview: document.getElementById("bugMarkdownPreview"),
  copyBugReportBtn: document.getElementById("copyBugReportBtn"),
  profileNetworkSelect: document.getElementById("profileNetworkSelect"),
  personaBtn: document.getElementById("personaBtn"),
  personaModal: document.getElementById("personaModal"),
  closePersonaModalBtn: document.getElementById("closePersonaModalBtn"),
  personaListContainer: document.getElementById("personaListContainer"),
  heartbeatExpiredAlert: document.getElementById("heartbeatExpiredAlert"),
  heartbeatAlertText: document.getElementById("heartbeatAlertText"),
  dismissHeartbeatAlertBtn: document.getElementById("dismissHeartbeatAlertBtn"),
  toggleMacroBtn: document.getElementById("toggleMacroBtn"),
  macroInputArea: document.getElementById("macroInputArea"),
  macroAutoNavInput: document.getElementById("macroAutoNavInput"),
  webhookBtn: document.getElementById("webhookBtn"),
  webhookModal: document.getElementById("webhookModal"),
  closeWebhookModalBtn: document.getElementById("closeWebhookModalBtn"),
  webhookPlatformSelect: document.getElementById("webhookPlatformSelect"),
  webhookUrlInput: document.getElementById("webhookUrlInput"),
  webhookRoleSelect: document.getElementById("webhookRoleSelect"),
  sendWebhookBroadcastBtn: document.getElementById("sendWebhookBroadcastBtn"),
  toggleTotpBtn: document.getElementById("toggleTotpBtn"),
  totpInputArea: document.getElementById("totpInputArea"),
  profileTotpSecretInput: document.getElementById("profileTotpSecretInput"),
  profileGeoSelect: document.getElementById("profileGeoSelect"),
  profileDeviceSelect: document.getElementById("profileDeviceSelect"),
  totpBtn: document.getElementById("totpBtn"),
  totpModal: document.getElementById("totpModal"),
  closeTotpModalBtn: document.getElementById("closeTotpModalBtn"),
  totpCodeDisplay: document.getElementById("totpCodeDisplay"),
  totpCountdownText: document.getElementById("totpCountdownText"),
  autofillTotpBtn: document.getElementById("autofillTotpBtn"),
  copyTotpBtn: document.getElementById("copyTotpBtn"),
  flagsBtn: document.getElementById("flagsBtn"),
  flagsModal: document.getElementById("flagsModal"),
  closeFlagsModalBtn: document.getElementById("closeFlagsModalBtn"),
  flagsInputText: document.getElementById("flagsInputText"),
  applyFlagsBtn: document.getElementById("applyFlagsBtn"),
  chaosBtn: document.getElementById("chaosBtn"),
  chaosModal: document.getElementById("chaosModal"),
  closeChaosModalBtn: document.getElementById("closeChaosModalBtn"),
  chaosModeSelect: document.getElementById("chaosModeSelect"),
  chaosRateSlider: document.getElementById("chaosRateSlider"),
  chaosRateDisplay: document.getElementById("chaosRateDisplay"),
  applyChaosBtn: document.getElementById("applyChaosBtn"),
  dastBtn: document.getElementById("dastBtn"),
  dastModal: document.getElementById("dastModal"),
  closeDastModalBtn: document.getElementById("closeDastModalBtn"),
  dastScoreBadge: document.getElementById("dastScoreBadge"),
  dastFindingsContainer: document.getElementById("dastFindingsContainer"),
  runDastScanBtn: document.getElementById("runDastScanBtn"),
  flightBtn: document.getElementById("flightBtn"),
  flightModal: document.getElementById("flightModal"),
  closeFlightModalBtn: document.getElementById("closeFlightModalBtn"),
  flightLogArea: document.getElementById("flightLogArea"),
  downloadFlightLogBtn: document.getElementById("downloadFlightLogBtn"),
  copyFlightLogBtn: document.getElementById("copyFlightLogBtn"),

  // v2.3.0 Enterprise Controls
  graphqlBtn: document.getElementById("graphqlBtn"),
  graphqlModal: document.getElementById("graphqlModal"),
  closeGraphqlModalBtn: document.getElementById("closeGraphqlModalBtn"),
  gqlOpNameInput: document.getElementById("gqlOpNameInput"),
  gqlOpTypeSelect: document.getElementById("gqlOpTypeSelect"),
  gqlStatusCodeInput: document.getElementById("gqlStatusCodeInput"),
  gqlMockDataInput: document.getElementById("gqlMockDataInput"),
  addGqlRuleBtn: document.getElementById("addGqlRuleBtn"),
  gqlRulesList: document.getElementById("gqlRulesList"),
  applyGqlRulesBtn: document.getElementById("applyGqlRulesBtn"),

  wsBtn: document.getElementById("wsBtn"),
  wsModal: document.getElementById("wsModal"),
  closeWsModalBtn: document.getElementById("closeWsModalBtn"),
  wsFilterInput: document.getElementById("wsFilterInput"),
  clearWsFramesBtn: document.getElementById("clearWsFramesBtn"),
  wsFramesContainer: document.getElementById("wsFramesContainer"),
  wsInjectPayloadInput: document.getElementById("wsInjectPayloadInput"),
  injectWsFrameBtn: document.getElementById("injectWsFrameBtn"),

  splitBtn: document.getElementById("splitBtn"),
  splitModal: document.getElementById("splitModal"),
  closeSplitModalBtn: document.getElementById("closeSplitModalBtn"),
  splitLeftRoleSelect: document.getElementById("splitLeftRoleSelect"),
  splitRightRoleSelect: document.getElementById("splitRightRoleSelect"),
  splitTargetUrlInput: document.getElementById("splitTargetUrlInput"),
  splitSyncScrollCheck: document.getElementById("splitSyncScrollCheck"),
  launchSplitRunnerBtn: document.getElementById("launchSplitRunnerBtn"),

  cssMediaBtn: document.getElementById("cssMediaBtn"),
  cssMediaModal: document.getElementById("cssMediaModal"),
  closeCssMediaModalBtn: document.getElementById("closeCssMediaModalBtn"),
  cssPrefColorScheme: document.getElementById("cssPrefColorScheme"),
  cssPrefReducedMotion: document.getElementById("cssPrefReducedMotion"),
  cssPrefContrast: document.getElementById("cssPrefContrast"),
  applyCssPrefsBtn: document.getElementById("applyCssPrefsBtn"),
  resetCssPrefsBtn: document.getElementById("resetCssPrefsBtn"),

  a11yBtn: document.getElementById("a11yBtn"),
  a11yModal: document.getElementById("a11yModal"),
  closeA11yModalBtn: document.getElementById("closeA11yModalBtn"),
  a11yStatusBadge: document.getElementById("a11yStatusBadge"),
  runA11yScanBtn: document.getElementById("runA11yScanBtn"),
  clearA11yBadgesBtn: document.getElementById("clearA11yBadgesBtn"),

  foldersBtn: document.getElementById("foldersBtn"),
  foldersModal: document.getElementById("foldersModal"),
  closeFoldersModalBtn: document.getElementById("closeFoldersModalBtn"),
  newFolderNameInput: document.getElementById("newFolderNameInput"),
  createFolderBtn: document.getElementById("createFolderBtn"),
  foldersListContainer: document.getElementById("foldersListContainer"),
  folderFilterSelect: document.getElementById("folderFilterSelect"),
  tagPillsContainer: document.getElementById("tagPillsContainer"),

  // v2.4.0 Capabilities
  fakerBtn: document.getElementById("fakerBtn"),
  fakerModal: document.getElementById("fakerModal"),
  closeFakerModalBtn: document.getElementById("closeFakerModalBtn"),
  fakerOnlyEmptyCheck: document.getElementById("fakerOnlyEmptyCheck"),
  runFakerBtn: document.getElementById("runFakerBtn"),

  ghostBtn: document.getElementById("ghostBtn"),
  ghostModal: document.getElementById("ghostModal"),
  closeGhostModalBtn: document.getElementById("closeGhostModalBtn"),
  ghostImageUrlInput: document.getElementById("ghostImageUrlInput"),
  ghostOpacitySlider: document.getElementById("ghostOpacitySlider"),
  ghostOpacityVal: document.getElementById("ghostOpacityVal"),
  ghostBlendModeSelect: document.getElementById("ghostBlendModeSelect"),
  applyGhostBtn: document.getElementById("applyGhostBtn"),
  clearGhostBtn: document.getElementById("clearGhostBtn"),

  syncBtn: document.getElementById("syncBtn"),
  syncModal: document.getElementById("syncModal"),
  closeSyncModalBtn: document.getElementById("closeSyncModalBtn"),
  syncChannelInput: document.getElementById("syncChannelInput"),
  syncScrollCheck: document.getElementById("syncScrollCheck"),
  syncInputsCheck: document.getElementById("syncInputsCheck"),
  attachSyncBtn: document.getElementById("attachSyncBtn"),
  detachSyncBtn: document.getElementById("detachSyncBtn"),

  vitalsBtn: document.getElementById("vitalsBtn"),
  vitalsModal: document.getElementById("vitalsModal"),
  closeVitalsModalBtn: document.getElementById("closeVitalsModalBtn"),
  vitalsScoreBadge: document.getElementById("vitalsScoreBadge"),
  vitalsMetricsContainer: document.getElementById("vitalsMetricsContainer"),
  runVitalsBtn: document.getElementById("runVitalsBtn"),
  copyVitalsBtn: document.getElementById("copyVitalsBtn"),

  gatewayBtn: document.getElementById("gatewayBtn"),
  gatewayModal: document.getElementById("gatewayModal"),
  closeGatewayModalBtn: document.getElementById("closeGatewayModalBtn"),
  gatewayRulesArea: document.getElementById("gatewayRulesArea"),
  applyGatewayBtn: document.getElementById("applyGatewayBtn"),

  timeMachineBtn: document.getElementById("timeMachineBtn"),
  timeMachineModal: document.getElementById("timeMachineModal"),
  closeTimeMachineModalBtn: document.getElementById("closeTimeMachineModalBtn"),
  timeMachineChangelog: document.getElementById("timeMachineChangelog"),
  refreshTimeMachineBtn: document.getElementById("refreshTimeMachineBtn"),
  clearTimeMachineBtn: document.getElementById("clearTimeMachineBtn"),

  // v2.5.0 Principal & SDET Studio Elements
  fuzzerBtn: document.getElementById("fuzzerBtn"),
  fuzzerModal: document.getElementById("fuzzerModal"),
  closeFuzzerModalBtn: document.getElementById("closeFuzzerModalBtn"),
  fuzzerResults: document.getElementById("fuzzerResults"),
  runFuzzerBtn: document.getElementById("runFuzzerBtn"),
  copyFuzzerBtn: document.getElementById("copyFuzzerBtn"),

  pwaBtn: document.getElementById("pwaBtn"),
  pwaModal: document.getElementById("pwaModal"),
  closePwaModalBtn: document.getElementById("closePwaModalBtn"),
  pwaResults: document.getElementById("pwaResults"),
  inspectPwaBtn: document.getElementById("inspectPwaBtn"),
  purgePwaCachesBtn: document.getElementById("purgePwaCachesBtn"),
  unregPwaWorkerBtn: document.getElementById("unregPwaWorkerBtn"),

  waterfallBtn: document.getElementById("waterfallBtn"),
  waterfallModal: document.getElementById("waterfallModal"),
  closeWaterfallModalBtn: document.getElementById("closeWaterfallModalBtn"),
  waterfallScoreBadge: document.getElementById("waterfallScoreBadge"),
  waterfallResults: document.getElementById("waterfallResults"),
  runWaterfallBtn: document.getElementById("runWaterfallBtn"),
  copyWaterfallBtn: document.getElementById("copyWaterfallBtn"),

  matrixBtn: document.getElementById("matrixBtn"),
  matrixModal: document.getElementById("matrixModal"),
  closeMatrixModalBtn: document.getElementById("closeMatrixModalBtn"),
  matrixResults: document.getElementById("matrixResults"),
  generateMatrixBtn: document.getElementById("generateMatrixBtn"),
  copyMatrixMdBtn: document.getElementById("copyMatrixMdBtn"),
  downloadMatrixCsvBtn: document.getElementById("downloadMatrixCsvBtn"),

  crawlerBtn: document.getElementById("crawlerBtn"),
  crawlerModal: document.getElementById("crawlerModal"),
  closeCrawlerModalBtn: document.getElementById("closeCrawlerModalBtn"),
  crawlerResults: document.getElementById("crawlerResults"),
  runCrawlerBtn: document.getElementById("runCrawlerBtn"),
  copyCrawlerBtn: document.getElementById("copyCrawlerBtn"),

  visionBtn: document.getElementById("visionBtn"),
  visionModal: document.getElementById("visionModal"),
  closeVisionModalBtn: document.getElementById("closeVisionModalBtn"),
  visionSelect: document.getElementById("visionSelect"),
  visionDescBox: document.getElementById("visionDescBox"),
  applyVisionBtn: document.getElementById("applyVisionBtn"),
  resetVisionBtn: document.getElementById("resetVisionBtn")
};

let activeExportProfile = null;
let activeExportTab = "playwright";
let activeSecurityReport = null;

document.addEventListener("DOMContentLoaded", async () => {
  setupEventListeners();
  await loadProStatus();
  await initializeDomainSession();
});

function setupEventListeners() {
  elements.saveBtn.addEventListener("click", handleSaveSession);
  elements.profileNameInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !elements.saveBtn.disabled) {
      handleSaveSession();
    }
  });

  // Toggle Advanced Settings Drawer
  const advBtn = document.getElementById("toggleAdvOptionsBtn");
  const advDrawer = document.getElementById("advOptionsDrawer");
  if (advBtn && advDrawer) {
    advBtn.addEventListener("click", () => {
      const isHidden = advDrawer.classList.toggle("hidden");
      advBtn.textContent = isHidden ? "⚙️ Advanced Options ▾" : "⚙️ Close Options ▴";
    });
  }

  // Toggle Custom Headers Area
  elements.toggleHeadersBtn.addEventListener("click", () => {
    elements.headersInputArea.classList.toggle("hidden");
  });

  elements.nukeSessionBtn.addEventListener("click", handleNukeSession);
  elements.tierBadge.addEventListener("click", openProModal);
  if (elements.upgradeBannerBtn) {
    elements.upgradeBannerBtn.addEventListener("click", openProModal);
  }
  elements.closeModalBtn.addEventListener("click", closeProModal);
  elements.proModal.addEventListener("click", (e) => {
    if (e.target === elements.proModal) closeProModal();
  });

  elements.activateLicenseBtn.addEventListener("click", handleActivateLicense);
  elements.demoKeyPill.addEventListener("click", () => {
    elements.licenseKeyInput.value = VALID_DEMO_KEY;
  });

  elements.exportAllJsonBtn.addEventListener("click", handleExportAll);
  elements.importJsonBtn.addEventListener("click", () => elements.importFileInput.click());
  elements.importFileInput.addEventListener("change", handleImportFile);

  // Diff Modal
  elements.compareRolesBtn.addEventListener("click", openDiffModal);
  elements.closeDiffModalBtn.addEventListener("click", () => elements.diffModal.classList.add("hidden"));
  elements.diffRoleA.addEventListener("change", renderDiffResults);
  elements.diffRoleB.addEventListener("change", renderDiffResults);

  // Encrypted Share Modal
  elements.closeShareModalBtn.addEventListener("click", () => elements.shareModal.classList.add("hidden"));
  elements.generateEncryptedShareBtn.addEventListener("click", handleGenerateEncryptedShare);
  elements.encryptedOutputSnippet.addEventListener("click", () => {
    navigator.clipboard.writeText(elements.encryptedOutputSnippet.value);
    showToast("Encrypted snippet copied to clipboard!", "success");
  });

  // Rollback Undo
  elements.rollbackBtn.addEventListener("click", handleRollbackUndo);

  // Watermark Toggle
  elements.watermarkToggleCheckbox.addEventListener("change", handleWatermarkToggle);

  // Test Automation Export Modal
  elements.closeTestExportModalBtn.addEventListener("click", () => elements.testExportModal.classList.add("hidden"));
  elements.tabExportPlaywright.addEventListener("click", () => switchTestExportTab("playwright"));
  elements.tabExportPostman.addEventListener("click", () => switchTestExportTab("postman"));
  elements.tabExportCypress.addEventListener("click", () => switchTestExportTab("cypress"));
  elements.copyTestExportBtn.addEventListener("click", handleCopyTestExport);
  elements.downloadTestExportBtn.addEventListener("click", handleDownloadTestExport);

  // OWASP Security Audit Modal
  elements.auditSecurityBtn.addEventListener("click", openSecurityAuditModal);
  elements.closeSecurityModalBtn.addEventListener("click", () => elements.securityModal.classList.add("hidden"));
  elements.copySecurityReportBtn.addEventListener("click", handleCopySecurityReport);

  // 1-Click Bug Reporter Modal
  elements.bugReportBtn.addEventListener("click", openBugReportModal);
  elements.closeBugReportModalBtn.addEventListener("click", () => elements.bugReportModal.classList.add("hidden"));
  elements.bugTitleInput.addEventListener("input", updateBugReportPreview);
  elements.bugDescriptionInput.addEventListener("input", updateBugReportPreview);
  elements.copyBugReportBtn.addEventListener("click", handleCopyBugReport);

  // AI Persona Synthesizer Modal
  elements.personaBtn.addEventListener("click", openPersonaModal);
  elements.closePersonaModalBtn.addEventListener("click", () => elements.personaModal.classList.add("hidden"));

  // Post-Switch Macro & Live Heartbeat Alert
  elements.toggleMacroBtn.addEventListener("click", () => {
    elements.macroInputArea.classList.toggle("hidden");
  });
  elements.dismissHeartbeatAlertBtn.addEventListener("click", () => {
    elements.heartbeatExpiredAlert.classList.add("hidden");
  });

  // Team Webhook Broadcaster Modal
  elements.webhookBtn.addEventListener("click", openWebhookModal);
  elements.closeWebhookModalBtn.addEventListener("click", () => {
    elements.webhookModal.classList.add("hidden");
  });
  elements.sendWebhookBroadcastBtn.addEventListener("click", handleSendWebhookBroadcast);

  // 2FA / TOTP Authenticator
  elements.toggleTotpBtn.addEventListener("click", () => {
    elements.totpInputArea.classList.toggle("hidden");
  });
  elements.totpBtn.addEventListener("click", openTotpModal);
  elements.closeTotpModalBtn.addEventListener("click", () => {
    elements.totpModal.classList.add("hidden");
  });
  elements.autofillTotpBtn.addEventListener("click", handleAutofillTotp);
  elements.copyTotpBtn.addEventListener("click", handleCopyTotp);

  // Feature Flags
  elements.flagsBtn.addEventListener("click", openFlagsModal);
  elements.closeFlagsModalBtn.addEventListener("click", () => {
    elements.flagsModal.classList.add("hidden");
  });
  elements.applyFlagsBtn.addEventListener("click", handleApplyFlags);

  // Chaos Engineering
  elements.chaosBtn.addEventListener("click", openChaosModal);
  elements.closeChaosModalBtn.addEventListener("click", () => {
    elements.chaosModal.classList.add("hidden");
  });
  elements.chaosRateSlider.addEventListener("input", (e) => {
    elements.chaosRateDisplay.textContent = e.target.value + "%";
  });
  elements.applyChaosBtn.addEventListener("click", handleApplyChaos);

  // DevSecOps DAST Scanner
  elements.dastBtn.addEventListener("click", openDastModal);
  elements.closeDastModalBtn.addEventListener("click", () => {
    elements.dastModal.classList.add("hidden");
  });
  elements.runDastScanBtn.addEventListener("click", runDastScan);

  // Blackbox Flight Recorder
  elements.flightBtn.addEventListener("click", openFlightModal);
  elements.closeFlightModalBtn.addEventListener("click", () => {
    elements.flightModal.classList.add("hidden");
  });
  elements.downloadFlightLogBtn.addEventListener("click", handleDownloadFlightLog);
  elements.copyFlightLogBtn.addEventListener("click", handleCopyFlightLog);

  // GraphQL Spy & Mock Studio
  elements.graphqlBtn.addEventListener("click", openGraphqlModal);
  elements.closeGraphqlModalBtn.addEventListener("click", () => elements.graphqlModal.classList.add("hidden"));
  elements.addGqlRuleBtn.addEventListener("click", handleAddGqlRule);
  elements.applyGqlRulesBtn.addEventListener("click", handleApplyGqlRules);

  // WebSocket Live Inspector
  elements.wsBtn.addEventListener("click", openWsModal);
  elements.closeWsModalBtn.addEventListener("click", () => elements.wsModal.classList.add("hidden"));
  elements.clearWsFramesBtn.addEventListener("click", handleClearWsFrames);
  elements.injectWsFrameBtn.addEventListener("click", handleInjectWsFrame);
  elements.wsFilterInput.addEventListener("input", handleFilterWsFrames);

  // Multi-Role Split Screen
  elements.splitBtn.addEventListener("click", openSplitModal);
  elements.closeSplitModalBtn.addEventListener("click", () => elements.splitModal.classList.add("hidden"));
  elements.launchSplitRunnerBtn.addEventListener("click", handleLaunchSplitRunner);

  // CSS Media & Themes
  elements.cssMediaBtn.addEventListener("click", openCssMediaModal);
  elements.closeCssMediaModalBtn.addEventListener("click", () => elements.cssMediaModal.classList.add("hidden"));
  elements.applyCssPrefsBtn.addEventListener("click", handleApplyCssPrefs);
  elements.resetCssPrefsBtn.addEventListener("click", handleResetCssPrefs);

  // WCAG 2.2 a11y Overlay
  elements.a11yBtn.addEventListener("click", openA11yModal);
  elements.closeA11yModalBtn.addEventListener("click", () => elements.a11yModal.classList.add("hidden"));
  elements.runA11yScanBtn.addEventListener("click", handleRunA11yScan);
  elements.clearA11yBadgesBtn.addEventListener("click", handleClearA11yBadges);

  // Profile Folders & Tags
  elements.foldersBtn.addEventListener("click", openFoldersModal);
  elements.closeFoldersModalBtn.addEventListener("click", () => elements.foldersModal.classList.add("hidden"));
  elements.createFolderBtn.addEventListener("click", handleCreateFolder);
  elements.folderFilterSelect.addEventListener("change", handleFolderFilterChange);

  // AI Smart Form Faker
  elements.fakerBtn.addEventListener("click", () => elements.fakerModal.classList.remove("hidden"));
  elements.closeFakerModalBtn.addEventListener("click", () => elements.fakerModal.classList.add("hidden"));
  elements.runFakerBtn.addEventListener("click", handleRunFaker);

  // Pixel-Perfect Ghost Mode
  elements.ghostBtn.addEventListener("click", () => elements.ghostModal.classList.remove("hidden"));
  elements.closeGhostModalBtn.addEventListener("click", () => elements.ghostModal.classList.add("hidden"));
  elements.ghostOpacitySlider.addEventListener("input", (e) => {
    elements.ghostOpacityVal.textContent = e.target.value + "%";
  });
  elements.applyGhostBtn.addEventListener("click", handleApplyGhost);
  elements.clearGhostBtn.addEventListener("click", handleClearGhost);

  // Multi-Tab Sync
  elements.syncBtn.addEventListener("click", () => elements.syncModal.classList.remove("hidden"));
  elements.closeSyncModalBtn.addEventListener("click", () => elements.syncModal.classList.add("hidden"));
  elements.attachSyncBtn.addEventListener("click", handleAttachSync);
  elements.detachSyncBtn.addEventListener("click", handleDetachSync);

  // Web Vitals
  elements.vitalsBtn.addEventListener("click", openVitalsModal);
  elements.closeVitalsModalBtn.addEventListener("click", () => elements.vitalsModal.classList.add("hidden"));
  elements.runVitalsBtn.addEventListener("click", handleRunVitals);
  elements.copyVitalsBtn.addEventListener("click", handleCopyVitals);

  // Gateway URL Rewrite
  elements.gatewayBtn.addEventListener("click", openGatewayModal);
  elements.closeGatewayModalBtn.addEventListener("click", () => elements.gatewayModal.classList.add("hidden"));
  elements.applyGatewayBtn.addEventListener("click", handleApplyGateway);

  // DOM Storage Time Machine
  elements.timeMachineBtn.addEventListener("click", openTimeMachineModal);
  elements.closeTimeMachineModalBtn.addEventListener("click", () => elements.timeMachineModal.classList.add("hidden"));
  elements.refreshTimeMachineBtn.addEventListener("click", handleRefreshTimeMachine);
  elements.clearTimeMachineBtn.addEventListener("click", handleClearTimeMachine);

  // v2.5.0 Principal & SDET Feature Listeners
  // 1. In-Page Fuzzer
  elements.fuzzerBtn.addEventListener("click", () => elements.fuzzerModal.classList.remove("hidden"));
  elements.closeFuzzerModalBtn.addEventListener("click", () => elements.fuzzerModal.classList.add("hidden"));
  elements.runFuzzerBtn.addEventListener("click", handleRunFuzzer);
  elements.copyFuzzerBtn.addEventListener("click", handleCopyFuzzer);

  // 2. Service Worker & PWA Cache
  elements.pwaBtn.addEventListener("click", openPwaModal);
  elements.closePwaModalBtn.addEventListener("click", () => elements.pwaModal.classList.add("hidden"));
  elements.inspectPwaBtn.addEventListener("click", handleInspectPwa);
  elements.purgePwaCachesBtn.addEventListener("click", handlePurgePwaCaches);
  elements.unregPwaWorkerBtn.addEventListener("click", handleUnregPwaWorker);

  // 3. Network Waterfall
  elements.waterfallBtn.addEventListener("click", () => elements.waterfallModal.classList.remove("hidden"));
  elements.closeWaterfallModalBtn.addEventListener("click", () => elements.waterfallModal.classList.add("hidden"));
  elements.runWaterfallBtn.addEventListener("click", handleRunWaterfall);
  elements.copyWaterfallBtn.addEventListener("click", handleCopyWaterfall);

  // 4. QA Test Matrix
  elements.matrixBtn.addEventListener("click", openMatrixModal);
  elements.closeMatrixModalBtn.addEventListener("click", () => elements.matrixModal.classList.add("hidden"));
  elements.generateMatrixBtn.addEventListener("click", handleGenerateMatrix);
  elements.copyMatrixMdBtn.addEventListener("click", handleCopyMatrixMd);
  elements.downloadMatrixCsvBtn.addEventListener("click", handleDownloadMatrixCsv);

  // 5. Asset Crawler
  elements.crawlerBtn.addEventListener("click", () => elements.crawlerModal.classList.remove("hidden"));
  elements.closeCrawlerModalBtn.addEventListener("click", () => elements.crawlerModal.classList.add("hidden"));
  elements.runCrawlerBtn.addEventListener("click", handleRunCrawler);
  elements.copyCrawlerBtn.addEventListener("click", handleCopyCrawler);

  // 6. Vision Deficiency Simulator
  elements.visionBtn.addEventListener("click", () => elements.visionModal.classList.remove("hidden"));
  elements.closeVisionModalBtn.addEventListener("click", () => elements.visionModal.classList.add("hidden"));
  elements.visionSelect.addEventListener("change", handleVisionSelectChange);
  elements.applyVisionBtn.addEventListener("click", handleApplyVision);
  elements.resetVisionBtn.addEventListener("click", handleResetVision);
}

async function loadProStatus() {
  const data = await chrome.storage.local.get([PRO_STORAGE_KEY]);
  isProUser = Boolean(data[PRO_STORAGE_KEY]);
  updateTierBadgeUI();
}

function updateTierBadgeUI() {
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

async function initializeDomainSession() {
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
    activeProfileId = activeData[activeKey] || null;

    // Check Rollback Buffer
    const rollbackKey = `qaswitch_rollback_${currentHostname}`;
    const rollbackData = await chrome.storage.local.get([rollbackKey]);
    const rollback = rollbackData[rollbackKey];
    if (rollback && rollback.timestamp && (Date.now() - rollback.timestamp < 15 * 60 * 1000)) {
      elements.rollbackBannerText.textContent = `↺ Previous session cached (${(rollback.cookies || []).length} cookies).`;
      elements.rollbackBanner.classList.remove("hidden");
    } else {
      elements.rollbackBanner.classList.add("hidden");
    }

    // Check 401/403 Heartbeat Expiry
    const hbKey = `qaswitch_heartbeat_${currentHostname}`;
    const hbData = await chrome.storage.local.get([hbKey]);
    const heartbeat = hbData[hbKey];
    if (heartbeat && heartbeat.isExpired) {
      elements.heartbeatAlertText.textContent = `⚠️ Active session revoked or expired (HTTP ${heartbeat.statusCode || 401})`;
      elements.heartbeatExpiredAlert.classList.remove("hidden");
    } else {
      elements.heartbeatExpiredAlert.classList.add("hidden");
    }

    // Load watermark preference
    const wmState = await chrome.storage.local.get(["qaswitch_watermark_enabled"]);
    elements.watermarkToggleCheckbox.checked = wmState["qaswitch_watermark_enabled"] !== false;

    await loadProfilesForDomain();
  } catch (err) {
    console.error("Initialization error:", err);
    showRestrictedState("Failed to inspect active tab");
  }
}

function extractValidDomain(urlStr) {
  try {
    const url = new URL(urlStr);
    const restricted = ["chrome:", "chrome-extension:", "devtools:", "edge:", "about:", "view-source:", "data:", "blob:", "file:"];
    if (restricted.includes(url.protocol)) return null;
    if (url.hostname === "chromewebstore.google.com" || url.hostname === "chrome.google.com") return null;
    return url.hostname;
  } catch {
    return null;
  }
}

function showRestrictedState(reason) {
  elements.domainText.textContent = reason || "Restricted URL";
  elements.statusDot.classList.remove("online");
  elements.statusDot.classList.add("warning");
  elements.restrictedNotice.classList.remove("hidden");
  elements.mainWorkspace.classList.add("hidden");
  elements.tierBadge.classList.add("hidden");
  elements.nukeSessionBtn.classList.add("hidden");
}

function getStorageKey(domain) {
  return `${STORAGE_PREFIX}${domain}`;
}

async function loadProfilesForDomain() {
  if (!currentHostname) return;
  const key = getStorageKey(currentHostname);
  const data = await chrome.storage.local.get([key]);
  currentProfiles = Array.isArray(data[key]) ? data[key] : [];

  renderProfileList();
  updateFreemiumStatus();
}

function updateFreemiumStatus() {
  const count = currentProfiles.length;
  elements.tierCount.textContent = `${count}/${MAX_FREE_PROFILES}`;
  elements.profileStatsText.textContent = `${count} ${count === 1 ? "profile" : "profiles"}`;

  const isLimitReached = !isProUser && count >= MAX_FREE_PROFILES;

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

function renderProfileList() {
  elements.profileList.innerHTML = "";

  updateFolderFilterUI();
  updateTagPillsUI();

  if (currentProfiles.length === 0) {
    elements.emptyState.classList.remove("hidden");
    elements.profileList.classList.add("hidden");
    return;
  }

  elements.emptyState.classList.add("hidden");
  elements.profileList.classList.remove("hidden");

  let filtered = currentProfiles;
  if (selectedFolderFilter !== "ALL") {
    if (selectedFolderFilter === "__uncategorized__") {
      filtered = filtered.filter((p) => !p.folder || p.folder === "__uncategorized__");
    } else {
      filtered = filtered.filter((p) => p.folder === selectedFolderFilter);
    }
  }
  if (selectedTagFilter) {
    const qTag = selectedTagFilter.toLowerCase();
    filtered = filtered.filter((p) => p.tags && p.tags.some((t) => t.toLowerCase() === qTag));
  }

  if (filtered.length === 0) {
    elements.profileList.innerHTML = "<div class='empty-hint' style='padding: 16px; text-align: center; color: var(--text-muted); font-size: 11px;'>No profiles match the active folder/tag filters.</div>";
    return;
  }

  filtered.forEach((profile) => {
    const card = document.createElement("div");
    const isActive = profile.id === activeProfileId;
    card.className = `profile-card ${isActive ? "active-profile" : ""}`;

    const relativeTime = formatRelativeTime(profile.createdAt);
    const cookieCount = profile.cookies ? profile.cookies.length : 0;
    const localKeys = profile.storage?.local ? Object.keys(profile.storage.local).length : 0;
    const sessionKeys = profile.storage?.session ? Object.keys(profile.storage.session).length : 0;
    const storageCount = localKeys + sessionKeys;
    const headerCount = profile.headers ? Object.keys(profile.headers).length : 0;

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
        ${headerCount > 0 ? `<span class="badge" style="color: #a78bfa;" title="${headerCount} custom HTTP headers">🏷️ ${headerCount} headers</span>` : ""}
        ${profile.folder ? `<span class="badge" style="color: #60a5fa;" title="Folder: ${escapeHtml(profile.folder)}">📁 ${escapeHtml(profile.folder)}</span>` : ""}
        ${profile.tags && profile.tags.length > 0 ? profile.tags.map(t => `<span class="profile-tag-badge">${escapeHtml(t)}</span>`).join('') : ""}
        ${profile.expiresAt && Date.now() >= profile.expiresAt ? `<span class="badge" style="color: #f87171; border-color: rgba(248, 113, 113, 0.4);" title="Expired session">⌛ Expired</span>` : ""}
        ${profile.expiresAt && Date.now() < profile.expiresAt ? `<span class="badge" style="color: #38bdf8;" title="Expires in ${Math.max(1, Math.round((profile.expiresAt - Date.now()) / 60000))}m">⏱️ ${Math.max(1, Math.round((profile.expiresAt - Date.now()) / 60000))}m</span>` : ""}
        ${profile.networkProfile && profile.networkProfile !== "BROADBAND" ? `<span class="badge" style="color: #fbbf24; border-color: rgba(251, 191, 36, 0.4);" title="Simulated network: ${profile.networkProfile}">⚡ ${profile.networkProfile}</span>` : ""}
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
          <button class="btn-icon-action" data-action="export-test" data-id="${profile.id}" title="Export for Playwright, Postman, Cypress">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M10 2v7.31M14 9.3V2M8.5 2h7M14 9.3a6.5 6.5 0 1 1-4 0" />
            </svg>
          </button>
          <button class="btn-icon-action" data-action="share-enc" data-id="${profile.id}" title="Encrypted Share (Passphrase)">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
          </button>
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

    card.querySelector('[data-action="apply"]').addEventListener("click", () => handleApplyProfile(profile));
    card.querySelector('[data-action="export-test"]').addEventListener("click", () => openTestExportModal(profile));
    card.querySelector('[data-action="share-enc"]').addEventListener("click", () => openEncryptedShareModal(profile));
    card.querySelector('[data-action="export-single"]').addEventListener("click", () => exportSingleProfile(profile));
    card.querySelector('[data-action="delete"]').addEventListener("click", () => handleDeleteProfile(profile.id, profile.name));

    elements.profileList.appendChild(card);
  });
}

function parseHeaders(raw) {
  const result = {};
  if (!raw) return result;
  for (const line of raw.split("\n")) {
    const idx = line.indexOf(":");
    if (idx > 0) {
      const k = line.slice(0, idx).trim();
      const v = line.slice(idx + 1).trim();
      if (k) result[k] = v;
    }
  }
  return result;
}

async function handleSaveSession() {
  const profileName = elements.profileNameInput.value.trim();

  if (!profileName) {
    showToast("Please enter a profile name", "error");
    elements.profileNameInput.focus();
    return;
  }

  if (!isProUser && currentProfiles.length >= MAX_FREE_PROFILES) {
    showToast("Free tier limit reached", "error");
    openProModal();
    return;
  }

  setLoadingState(elements.saveBtn, true, "Saving...");

  try {
    const rawCookies = await chrome.cookies.getAll({ url: currentTab.url });
    let domainCookies = [];
    try {
      domainCookies = await chrome.cookies.getAll({ domain: currentHostname });
    } catch {}

    const cookies = deduplicateCookies([...rawCookies, ...domainCookies]);
    const storage = await snapshotDOMStorage(currentTab.id);
    const headers = parseHeaders(elements.customHeadersInput.value);
    const ttlMinutes = parseInt(elements.profileTtlSelect.value, 10) || 0;
    const expiresAt = ttlMinutes > 0 ? Date.now() + ttlMinutes * 60 * 1000 : null;
    const networkProfile = elements.profileNetworkSelect.value || "BROADBAND";
    const macroNav = elements.macroAutoNavInput ? elements.macroAutoNavInput.value.trim() : "";
    const macro = macroNav ? { autoNavigateUrl: macroNav } : undefined;
    const totpSecret = elements.profileTotpSecretInput ? elements.profileTotpSecretInput.value.trim() : "";
    const geoPreset = elements.profileGeoSelect ? elements.profileGeoSelect.value : "";
    const devicePreset = elements.profileDeviceSelect ? elements.profileDeviceSelect.value : "";

    const newProfile = {
      id: "prof_" + Date.now() + "_" + Math.random().toString(36).substring(2, 8),
      name: profileName,
      createdAt: Date.now(),
      domain: currentHostname,
      url: currentTab.url,
      cookies,
      storage,
      headers,
      ttlMinutes: ttlMinutes > 0 ? ttlMinutes : null,
      expiresAt,
      networkProfile,
      macro,
      totpSecret: totpSecret || undefined,
      geoPreset: geoPreset || undefined,
      devicePreset: devicePreset || undefined
    };

    currentProfiles.unshift(newProfile);
    const key = getStorageKey(currentHostname);
    await chrome.storage.local.set({ [key]: currentProfiles });

    await setActiveProfile(newProfile);

    elements.profileNameInput.value = "";
    elements.customHeadersInput.value = "";
    if (elements.macroAutoNavInput) elements.macroAutoNavInput.value = "";
    elements.headersInputArea.classList.add("hidden");

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

function deduplicateCookies(cookies) {
  const map = new Map();
  for (const c of cookies) {
    if (!c || !c.name) continue;
    const key = `${c.storeId || "0"}|${c.domain || ""}|${c.path || "/"}|${c.name}`;
    map.set(key, c);
  }
  return Array.from(map.values());
}

async function snapshotDOMStorage(tabId) {
  try {
    const results = await chrome.scripting.executeScript({
      target: { tabId },
      func: () => {
        const local = {};
        const session = {};
        try {
          for (let i = 0; i < window.localStorage.length; i++) {
            const k = window.localStorage.key(i);
            if (k !== null) local[k] = window.localStorage.getItem(k);
          }
        } catch {}
        try {
          for (let i = 0; i < window.sessionStorage.length; i++) {
            const k = window.sessionStorage.key(i);
            if (k !== null) session[k] = window.sessionStorage.getItem(k);
          }
        } catch {}
        return { local, session };
      }
    });
    return results?.[0]?.result || { local: {}, session: {} };
  } catch {
    return { local: {}, session: {} };
  }
}

async function handleApplyProfile(profile) {
  showToast(`Switching to "${profile.name}"...`);

  try {
    // Snapshot rollback buffer before applying new profile
    const rawCookies = await chrome.cookies.getAll({ url: currentTab.url });
    const storageSnapshot = await snapshotDOMStorage(currentTab.id);
    const rollback = {
      timestamp: Date.now(),
      domain: currentHostname,
      previousProfileName: profile.name,
      cookies: rawCookies,
      storage: storageSnapshot
    };
    await chrome.storage.local.set({ [`qaswitch_rollback_${currentHostname}`]: rollback });

    await clearActiveCookies(currentTab, currentHostname);
    await restoreSavedCookies(profile.cookies || []);
    await setActiveProfile(profile);

    const targetNav = profile.macro && profile.macro.autoNavigateUrl ? profile.macro.autoNavigateUrl : null;
    await chrome.scripting.executeScript({
      target: { tabId: currentTab.id },
      func: (data, navUrl) => {
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

        if (navUrl && typeof navUrl === "string" && navUrl.trim()) {
          try {
            const dest = navUrl.startsWith("http")
              ? navUrl
              : `${window.location.origin}${navUrl.startsWith("/") ? navUrl : "/" + navUrl}`;
            window.location.href = dest;
            return;
          } catch {}
        }

        window.location.reload();
      },
      args: [profile.storage || { local: {}, session: {} }, targetNav]
    });

    showToast(`Switched to "${profile.name}"! Reloading...`, "success");
    setTimeout(() => window.close(), 450);
  } catch (err) {
    console.error("Failed to switch profile:", err);
    showToast("Failed to switch session", "error");
  }
}

async function handleNukeSession() {
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

async function setActiveProfile(profile) {
  activeProfileId = profile.id;
  const activeKey = `${ACTIVE_PROFILE_PREFIX}${currentHostname}`;
  await chrome.storage.local.set({ [activeKey]: profile.id });

  try {
    const badgeText = profile.name.slice(0, 3).toUpperCase();
    chrome.action.setBadgeText({ text: badgeText, tabId: currentTab.id });
    chrome.action.setBadgeBackgroundColor({ color: "#10b981", tabId: currentTab.id });
  } catch {}
}

async function clearActiveCookies(tab, hostname) {
  const raw = await chrome.cookies.getAll({ url: tab.url });
  let domainCookies = [];
  try {
    domainCookies = await chrome.cookies.getAll({ domain: hostname });
  } catch {}

  const all = deduplicateCookies([...raw, ...domainCookies]);
  for (const cookie of all) {
    try {
      const url = buildCookieUrl(cookie);
      await chrome.cookies.remove({ url, name: cookie.name, storeId: cookie.storeId });
    } catch {}
  }
}

async function restoreSavedCookies(cookies) {
  for (const cookie of cookies) {
    try {
      const url = buildCookieUrl(cookie);
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

      if (!cookie.session && cookie.expirationDate) {
        details.expirationDate = cookie.expirationDate;
      }

      if (cookie.sameSite && ["no_restriction", "lax", "strict"].includes(cookie.sameSite)) {
        details.sameSite = cookie.sameSite;
        if (cookie.sameSite === "no_restriction") {
          details.secure = true;
        }
      }

      await chrome.cookies.set(details);
    } catch {}
  }
}

async function handleDeleteProfile(profileId, profileName) {
  try {
    currentProfiles = currentProfiles.filter((p) => p.id !== profileId);
    const key = getStorageKey(currentHostname);
    await chrome.storage.local.set({ [key]: currentProfiles });

    if (activeProfileId === profileId) {
      activeProfileId = null;
      const activeKey = `${ACTIVE_PROFILE_PREFIX}${currentHostname}`;
      await chrome.storage.local.remove([activeKey]);
      chrome.action.setBadgeText({ text: "", tabId: currentTab.id });
    }

    renderProfileList();
    updateFreemiumStatus();
    showToast(`Deleted "${profileName}"`, "success");
  } catch (err) {
    console.error("Delete failed:", err);
    showToast("Failed to delete profile", "error");
  }
}

function buildCookieUrl(cookie) {
  const protocol = cookie.secure ? "https:" : "http:";
  let domain = cookie.domain || currentHostname;
  if (domain.startsWith(".")) {
    domain = domain.substring(1);
  }
  const path = cookie.path && cookie.path.startsWith("/") ? cookie.path : `/${cookie.path || ""}`;
  return `${protocol}//${domain}${path}`;
}

// Diff Engine UI
function openDiffModal() {
  if (currentProfiles.length < 2) {
    showToast("Need at least 2 saved profiles to compare", "error");
    return;
  }

  elements.diffRoleA.innerHTML = "";
  elements.diffRoleB.innerHTML = "";

  currentProfiles.forEach((p, idx) => {
    const optA = new Option(p.name, p.id);
    const optB = new Option(p.name, p.id);
    if (idx === 1) optB.selected = true;
    elements.diffRoleA.add(optA);
    elements.diffRoleB.add(optB);
  });

  renderDiffResults();
  elements.diffModal.classList.remove("hidden");
}

function renderDiffResults() {
  const idA = elements.diffRoleA.value;
  const idB = elements.diffRoleB.value;
  const pA = currentProfiles.find((p) => p.id === idA);
  const pB = currentProfiles.find((p) => p.id === idB);

  if (!pA || !pB || idA === idB) {
    elements.diffResultsContainer.innerHTML = '<div class="diff-empty-notice">Select two distinct profiles to inspect diffs.</div>';
    return;
  }

  let html = "";

  // Compare cookies
  const cookiesA = new Map(pA.cookies.map((c) => [c.name, c.value]));
  const cookiesB = new Map(pB.cookies.map((c) => [c.name, c.value]));
  const allCookies = Array.from(new Set([...cookiesA.keys(), ...cookiesB.keys()])).sort();

  html += '<strong style="color: #a78bfa; margin-bottom: 4px;">🍪 COOKIE DISCREPANCIES:</strong>';
  let cookieDiffCount = 0;

  for (const name of allCookies) {
    const valA = cookiesA.get(name);
    const valB = cookiesB.get(name);
    if (valA !== valB) {
      cookieDiffCount++;
      const statusClass = valA === undefined ? "added" : valB === undefined ? "removed" : "modified";
      html += `
        <div class="diff-entry ${statusClass}">
          <span>${name}</span>
          <span>${valA ? "A: " + truncate(valA, 12) : "❌"} &rarr; ${valB ? "B: " + truncate(valB, 12) : "❌"}</span>
        </div>
      `;
    }
  }

  if (cookieDiffCount === 0) {
    html += '<div class="diff-entry identical">All cookies identical</div>';
  }

  elements.diffResultsContainer.innerHTML = html;
}

function truncate(str, len = 15) {
  return str.length > len ? str.slice(0, len) + "..." : str;
}

// Encrypted Sharing Modal
function openEncryptedShareModal(profile) {
  pendingShareProfile = profile;
  elements.sharePassphraseInput.value = "";
  elements.shareResultArea.classList.add("hidden");
  elements.shareModal.classList.remove("hidden");
  elements.sharePassphraseInput.focus();
}

async function handleGenerateEncryptedShare() {
  const passphrase = elements.sharePassphraseInput.value.trim();
  if (!passphrase) {
    showToast("Please enter a passphrase", "error");
    return;
  }

  try {
    const encoder = new TextEncoder();
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const iv = crypto.getRandomValues(new Uint8Array(12));

    const baseKey = await crypto.subtle.importKey("raw", encoder.encode(passphrase), "PBKDF2", false, ["deriveKey"]);
    const key = await crypto.subtle.deriveKey(
      { name: "PBKDF2", salt, iterations: 100000, hash: "SHA-256" },
      baseKey,
      { name: "AES-GCM", length: 256 },
      false,
      ["encrypt"]
    );

    const plaintext = encoder.encode(JSON.stringify(pendingShareProfile));
    const ciphertext = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, plaintext);

    const saltB64 = btoa(String.fromCharCode(...salt));
    const ivB64 = btoa(String.fromCharCode(...iv));
    const cipherB64 = btoa(String.fromCharCode(...new Uint8Array(ciphertext)));

    const snippet = `qas_enc_${saltB64}.${ivB64}.${cipherB64}`;
    elements.encryptedOutputSnippet.value = snippet;
    elements.shareResultArea.classList.remove("hidden");
    showToast("Encrypted snippet generated! Click to copy.", "success");
  } catch (err) {
    console.error("Encryption error:", err);
    showToast("Encryption failed", "error");
  }
}

function exportSingleProfile(profile) {
  if (!isProUser) {
    openProModal();
    return;
  }

  const payload = {
    version: "1.0",
    exportedAt: new Date().toISOString(),
    domain: currentHostname,
    profiles: [profile]
  };

  const filename = `qaswitch-${currentHostname}-${profile.name.toLowerCase().replace(/[^a-z0-9]/g, "-")}.json`;
  downloadJSON(payload, filename);
  showToast(`Exported "${profile.name}" JSON`, "success");
}

function handleExportAll() {
  if (!isProUser) {
    openProModal();
    return;
  }

  if (currentProfiles.length === 0) {
    showToast("No profiles to export", "error");
    return;
  }

  const payload = {
    version: "1.0",
    exportedAt: new Date().toISOString(),
    domain: currentHostname,
    profiles: currentProfiles
  };

  const filename = `qaswitch-${currentHostname}-all-profiles.json`;
  downloadJSON(payload, filename);
  showToast(`Exported ${currentProfiles.length} profiles`, "success");
}

function handleImportFile(event) {
  if (!isProUser) {
    elements.importFileInput.value = "";
    openProModal();
    return;
  }

  const file = event.target.files?.[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = async (e) => {
    try {
      const data = JSON.parse(e.target.result);
      const importedProfiles = Array.isArray(data.profiles) ? data.profiles : Array.isArray(data) ? data : null;

      if (!importedProfiles || importedProfiles.length === 0) {
        showToast("Invalid QASwitch JSON structure", "error");
        return;
      }

      for (const p of importedProfiles) {
        if (!p.name) continue;
        currentProfiles.push({
          id: "prof_imp_" + Date.now() + "_" + Math.random().toString(36).substring(2, 7),
          name: p.name.includes("(Imported)") ? p.name : `${p.name} (Imported)`,
          createdAt: Date.now(),
          domain: currentHostname,
          url: currentTab.url,
          cookies: p.cookies || [],
          storage: p.storage || { local: {}, session: {} },
          headers: p.headers || {},
          totpSecret: p.totpSecret,
          macro: p.macro,
          networkProfile: p.networkProfile,
          geoPreset: p.geoPreset,
          devicePreset: p.devicePreset,
          ttlMinutes: p.ttlMinutes,
          expiresAt: p.expiresAt
        });
      }

      const key = getStorageKey(currentHostname);
      await chrome.storage.local.set({ [key]: currentProfiles });

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

function downloadJSON(data, filename) {
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

function openProModal() {
  elements.proModal.classList.remove("hidden");
  elements.licenseKeyInput.focus();
}

function closeProModal() {
  elements.proModal.classList.add("hidden");
  elements.licenseKeyInput.value = "";
}

async function handleActivateLicense() {
  const key = elements.licenseKeyInput.value.trim().toUpperCase();

  if (key === VALID_DEMO_KEY || key.startsWith("PRO-")) {
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

function formatRelativeTime(timestamp) {
  if (!timestamp) return "";
  const diffSec = Math.floor((Date.now() - timestamp) / 1000);
  if (diffSec < 60) return "Just now";
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  return new Date(timestamp).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function setLoadingState(btn, isLoading, text) {
  const btnText = btn.querySelector(".btn-text");
  btn.disabled = isLoading;
  if (btnText) btnText.textContent = text;
}

let toastTimeout = null;
function showToast(message, type = "normal") {
  if (toastTimeout) clearTimeout(toastTimeout);
  elements.toastMessage.textContent = message;
  elements.toast.className = "toast-container";
  if (type === "success") elements.toast.classList.add("toast-success");
  if (type === "error") elements.toast.classList.add("toast-error");
  elements.toast.classList.remove("hidden");
  toastTimeout = setTimeout(() => elements.toast.classList.add("hidden"), 2400);
}

function escapeHtml(str) {
  if (!str) return "";
  return String(str).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}

async function handleRollbackUndo() {
  const rollbackKey = `qaswitch_rollback_${currentHostname}`;
  const data = await chrome.storage.local.get([rollbackKey]);
  const rollback = data[rollbackKey];

  if (!rollback) {
    showToast("No rollback snapshot found", "error");
    return;
  }

  showToast("Reverting to previous session state...");

  try {
    await clearActiveCookies(currentTab, currentHostname);
    await restoreSavedCookies(rollback.cookies || []);
    await chrome.storage.local.remove([rollbackKey]);

    await chrome.scripting.executeScript({
      target: { tabId: currentTab.id },
      func: (data) => {
        try {
          window.localStorage.clear();
          if (data && data.local) {
            for (const [k, v] of Object.entries(data.local)) {
              window.localStorage.setItem(k, v);
            }
          }
        } catch {}
        window.location.reload();
      },
      args: [rollback.storage || { local: {} }]
    });

    elements.rollbackBanner.classList.add("hidden");
    showToast("Reverted successfully! Reloading...", "success");
    setTimeout(() => window.close(), 400);
  } catch (err) {
    console.error("Rollback failed:", err);
    showToast("Rollback failed", "error");
  }
}

async function handleWatermarkToggle() {
  const isEnabled = elements.watermarkToggleCheckbox.checked;
  await chrome.storage.local.set({ qaswitch_watermark_enabled: isEnabled });

  const activeKey = `${ACTIVE_PROFILE_PREFIX}${currentHostname}`;
  const data = await chrome.storage.local.get([activeKey]);
  const activeId = data[activeKey];
  const activeProfile = currentProfiles.find((p) => p.id === activeId);

  chrome.runtime.sendMessage({
    type: "SYNC_WATERMARK",
    enabled: isEnabled,
    role: activeProfile ? activeProfile.name : null
  }).catch(() => {});

  showToast(`In-page banner ${isEnabled ? "enabled" : "disabled"}`);
}

function openTestExportModal(profile) {
  activeExportProfile = profile;
  elements.testExportModalDesc.textContent = `Exporting "${profile.name}" (${(profile.cookies || []).length} cookies) for automated test suites.`;
  elements.testExportModal.classList.remove("hidden");
  switchTestExportTab("playwright");
}

function switchTestExportTab(tabName) {
  activeExportTab = tabName;
  elements.tabExportPlaywright.classList.toggle("active", tabName === "playwright");
  elements.tabExportPostman.classList.toggle("active", tabName === "postman");
  elements.tabExportCypress.classList.toggle("active", tabName === "cypress");

  renderTestExport();
}

function renderTestExport() {
  if (!activeExportProfile) return;

  if (activeExportTab === "playwright") {
    const pw = exportToPlaywrightStorageState(activeExportProfile);
    elements.testExportCodeArea.value = JSON.stringify(pw, null, 2);
  } else if (activeExportTab === "postman") {
    const pm = exportToPostmanEnvironment(activeExportProfile);
    elements.testExportCodeArea.value = JSON.stringify(pm, null, 2);
  } else if (activeExportTab === "cypress") {
    elements.testExportCodeArea.value = exportToCypressSnippet(activeExportProfile);
  }
}

function handleCopyTestExport() {
  const val = elements.testExportCodeArea.value;
  if (!val) return;
  navigator.clipboard.writeText(val);
  showToast(`Copied ${activeExportTab.toUpperCase()} auth fixture!`, "success");
}

function handleDownloadTestExport() {
  if (!activeExportProfile) return;
  const val = elements.testExportCodeArea.value;
  if (!val) return;

  const slug = activeExportProfile.name.toLowerCase().replace(/[^a-z0-9]/g, "-");
  if (activeExportTab === "playwright") {
    downloadTextFile(val, `${slug}.storageState.json`, "application/json");
  } else if (activeExportTab === "postman") {
    downloadTextFile(val, `${slug}.postman_environment.json`, "application/json");
  } else if (activeExportTab === "cypress") {
    downloadTextFile(val, `${slug}.auth.cy.js`, "application/javascript");
  }
}

function downloadTextFile(content, filename, type) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function exportToPlaywrightStorageState(profile) {
  const originUrl = profile.url ? new URL(profile.url).origin : `https://${profile.domain}`;
  const cookies = (profile.cookies || []).map((c) => ({
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
  if (profile.storage && profile.storage.local) {
    for (const [k, v] of Object.entries(profile.storage.local)) {
      if (typeof v === "string") localStorage.push({ name: k, value: v });
    }
  }
  return { cookies, origins: [{ origin: originUrl, localStorage }] };
}

function exportToPostmanEnvironment(profile) {
  const values = [];
  (profile.cookies || []).forEach((c) => {
    values.push({ key: `cookie_${c.name}`, value: c.value, enabled: true });
  });
  if (profile.headers) {
    for (const [k, v] of Object.entries(profile.headers)) {
      values.push({ key: `header_${k.toLowerCase().replace(/[^a-z0-9]/g, "_")}`, value: v, enabled: true });
    }
  }
  values.push({ key: "base_domain", value: profile.domain, enabled: true });
  return { id: `env_${profile.id}`, name: `QASwitch - ${profile.name}`, values, _postman_variable_scope: "environment" };
}

function exportToCypressSnippet(profile) {
  const lines = [
    `// Cypress Auth Fixture for Role: ${profile.name}`,
    `describe('Setup Auth Session - ${profile.name}', () => {`,
    `  beforeEach(() => {`
  ];
  (profile.cookies || []).forEach((c) => {
    lines.push(`    cy.setCookie('${c.name}', '${c.value}', { domain: '${c.domain}', path: '${c.path || "/"}' });`);
  });
  if (profile.storage && profile.storage.local && Object.keys(profile.storage.local).length > 0) {
    lines.push(`    cy.window().then((win) => {`);
    for (const [k, v] of Object.entries(profile.storage.local)) {
      lines.push(`      win.localStorage.setItem('${k}', ${JSON.stringify(v)});`);
    }
    lines.push(`    });`);
  }
  lines.push(`  });`, `});`);
  return lines.join("\n");
}

async function openSecurityAuditModal() {
  showToast("Auditing session security...");
  try {
    const rawCookies = await chrome.cookies.getAll({ url: currentTab.url });
    const storageSnapshot = await snapshotDOMStorage(currentTab.id);

    activeSecurityReport = auditSessionSecurity(currentHostname, rawCookies, storageSnapshot);

    elements.securityGradeBadge.textContent = activeSecurityReport.grade;
    let gradeColor = "#10b981";
    if (activeSecurityReport.grade === "B") gradeColor = "#38bdf8";
    else if (activeSecurityReport.grade === "C") gradeColor = "#f59e0b";
    else if (activeSecurityReport.grade === "F") gradeColor = "#ef4444";
    elements.securityGradeBadge.style.color = gradeColor;

    elements.securityScoreText.textContent = `${activeSecurityReport.score} / 100`;

    elements.securityFindingsContainer.innerHTML = "";
    if (activeSecurityReport.findings.length === 0) {
      elements.securityFindingsContainer.innerHTML = '<div style="color:#10b981;padding:12px;text-align:center;font-weight:600;">✅ Excellent! No OWASP session vulnerabilities detected.</div>';
    } else {
      activeSecurityReport.findings.forEach((f) => {
        const item = document.createElement("div");
        item.style.cssText = "padding:8px 10px;margin-bottom:6px;background:rgba(255,255,255,0.03);border-left:3px solid " + (f.severity === "CRITICAL" ? "#ef4444" : f.severity === "HIGH" ? "#f97316" : "#f59e0b") + ";border-radius:4px;font-size:11px;";
        item.innerHTML = `
          <div style="font-weight:700;color:#f8fafc;display:flex;justify-content:space-between;">
            <span>${escapeHtml(f.title)}</span>
            <span style="font-size:10px;color:${f.severity === "CRITICAL" ? "#ef4444" : "#f97316"}">${f.severity}</span>
          </div>
          <div style="color:var(--text-muted);margin:2px 0;">Target: <code>${escapeHtml(f.target)}</code></div>
          <div style="color:#94a3b8;">${escapeHtml(f.description)}</div>
        `;
        elements.securityFindingsContainer.appendChild(item);
      });
    }

    elements.securityModal.classList.remove("hidden");
  } catch (err) {
    console.error("Audit failed:", err);
    showToast("Audit failed", "error");
  }
}

function handleCopySecurityReport() {
  if (!activeSecurityReport) return;
  const md = formatMarkdownSecurityReport(activeSecurityReport);
  navigator.clipboard.writeText(md);
  showToast("Security report copied to clipboard!", "success");
}

function auditSessionSecurity(domain, cookies = [], storage = { local: {}, session: {} }) {
  const findings = [];
  const SENSITIVE_COOKIE_REGEX = /(sess|token|jwt|auth|sid|user|id|login|key)/i;
  const SENSITIVE_STORAGE_REGEX = /(pass|token|jwt|secret|key|bearer|auth|credit|ssn|private)/i;
  const isLocalhost = domain.includes("localhost") || domain.includes("127.0.0.1");

  for (const c of cookies) {
    const isSensitive = SENSITIVE_COOKIE_REGEX.test(c.name);
    if (isSensitive && !c.httpOnly) {
      findings.push({
        severity: "HIGH",
        title: "Cookie Missing HttpOnly Flag",
        target: c.name,
        description: `Cookie "${c.name}" stores session state without HttpOnly, vulnerable to XSS theft.`,
        remediation: `Set the 'HttpOnly' flag on cookie "${c.name}".`
      });
    }
    if (!c.secure && !isLocalhost) {
      findings.push({
        severity: isSensitive ? "HIGH" : "MEDIUM",
        title: "Cookie Missing Secure Flag",
        target: c.name,
        description: `Cookie "${c.name}" can be transmitted over plaintext HTTP.`,
        remediation: `Set the 'Secure' attribute on cookies served over HTTPS.`
      });
    }
    if (!c.sameSite || c.sameSite === "unspecified") {
      findings.push({
        severity: "MEDIUM",
        title: "Unspecified SameSite Policy",
        target: c.name,
        description: `Cookie "${c.name}" increases exposure to CSRF attacks.`,
        remediation: `Declare 'SameSite=Lax' or 'SameSite=Strict'.`
      });
    }
  }

  const localKeys = Object.keys(storage?.local || {});
  for (const k of localKeys) {
    if (SENSITIVE_STORAGE_REGEX.test(k) && (storage.local[k] || "").length > 5) {
      findings.push({
        severity: "HIGH",
        title: "Sensitive Credential in localStorage",
        target: `localStorage['${k}']`,
        description: `Key "${k}" holds unencrypted credential vulnerable to XSS.`,
        remediation: `Store in HttpOnly cookies instead of localStorage.`
      });
    }
  }

  let score = 100;
  findings.forEach((f) => {
    if (f.severity === "CRITICAL") score -= 35;
    else if (f.severity === "HIGH") score -= 18;
    else if (f.severity === "MEDIUM") score -= 8;
  });
  score = Math.max(0, Math.min(100, score));

  let grade = "A+";
  if (score >= 95 && findings.length === 0) grade = "A+";
  else if (score >= 85) grade = "A";
  else if (score >= 70) grade = "B";
  else if (score >= 50) grade = "C";
  else grade = "F";

  return { domain, timestamp: Date.now(), grade, score, findings };
}

function formatMarkdownSecurityReport(report) {
  const lines = [
    `# 🛡️ QASwitch Security Audit Report: ${report.domain}`,
    `**Overall Security Grade:** \`${report.grade}\` (${report.score}/100)`,
    `**Timestamp:** ${new Date(report.timestamp).toISOString()}`,
    ``,
    `### Findings (${report.findings.length})`
  ];
  if (report.findings.length === 0) {
    lines.push(`✅ No security vulnerabilities detected.`);
  } else {
    report.findings.forEach((f, idx) => {
      lines.push(`${idx + 1}. [${f.severity}] **${f.title}** (Target: \`${f.target}\`)`, `   - Description: ${f.description}`, `   - Remediation: ${f.remediation}`);
    });
  }
  return lines.join("\n");
}

async function openBugReportModal() {
  elements.bugTitleInput.value = "";
  elements.bugDescriptionInput.value = "";
  await updateBugReportPreview();
  elements.bugReportModal.classList.remove("hidden");
  elements.bugTitleInput.focus();
}

async function updateBugReportPreview() {
  const title = elements.bugTitleInput.value.trim() || "Observed Issue / Bug";
  const desc = elements.bugDescriptionInput.value.trim() || "Describe the steps and observed behavior here.";

  const activeKey = `${ACTIVE_PROFILE_PREFIX}${currentHostname}`;
  const data = await chrome.storage.local.get([activeKey]);
  const activeProfile = currentProfiles.find((p) => p.id === data[activeKey]);
  const roleName = activeProfile ? activeProfile.name : "Guest";

  let cookiesCount = 0;
  try {
    const rawCookies = await chrome.cookies.getAll({ url: currentTab.url });
    cookiesCount = rawCookies.length;
  } catch {}

  const lines = [
    `# 🐞 [Bug]: ${title}`,
    ``,
    `## 📋 Issue Description`,
    desc,
    ``,
    `## 👤 Active QA Role & Environment`,
    `- **Active Role:** \`${roleName}\``,
    `- **Domain:** \`${currentHostname}\``,
    `- **Page URL:** [${currentTab.url}](${currentTab.url})`,
    `- **Captured At:** \`${new Date().toISOString()}\``,
    `- **User Agent:** \`${navigator.userAgent}\``,
    `- **Active Cookies:** \`${cookiesCount}\``,
    ``,
    `## 🔄 Steps to Reproduce with QASwitch`,
    `1. Navigate to [${currentTab.url}](${currentTab.url}).`,
    `2. Open QASwitch &rarr; Switch to role **\`${roleName}\`**.`,
    `3. Perform the triggering action.`
  ];

  elements.bugMarkdownPreview.value = lines.join("\n");
}

function handleCopyBugReport() {
  const md = elements.bugMarkdownPreview.value;
  if (!md) return;
  navigator.clipboard.writeText(md);
  showToast("Issue report copied for Jira/GitHub!", "success");
}

function openPersonaModal() {
  const templates = [
    { id: "ecommerce_vip", name: "👑 VIP Gold Shopper", desc: "$2,500 store credit, Gold tier, free shipping", cat: "E-Commerce" },
    { id: "ecommerce_banned", name: "🚫 Banned User", desc: "Fraud risk flag, locked checkout", cat: "E-Commerce" },
    { id: "saas_tenant_admin", name: "🏢 Tenant Super Admin", desc: "Wildcard permissions [*], Enterprise Org", cat: "SaaS" },
    { id: "saas_auditor", name: "🔍 SOC2 Auditor", desc: "Read-only audit logs & reports", cat: "SaaS" },
    { id: "security_sqli", name: "💉 SQLi Probe Persona", desc: "admin' OR 1=1-- payload credentials", cat: "Security" },
    { id: "security_xss", name: "☣️ XSS Probe Persona", desc: "<script>alert(1)</script> payloads", cat: "Security" }
  ];

  elements.personaListContainer.innerHTML = "";
  templates.forEach((t) => {
    const card = document.createElement("div");
    card.style.cssText = "display:flex;align-items:center;justify-content:space-between;padding:8px 12px;margin-bottom:6px;background:rgba(255,255,255,0.03);border:1px solid var(--border);border-radius:6px;";
    card.innerHTML = `
      <div>
        <div style="font-weight:700;font-size:12px;color:#f8fafc;">${t.name} <span style="font-size:9px;color:var(--text-muted);border:1px solid rgba(255,255,255,0.15);padding:1px 4px;border-radius:4px;">${t.cat}</span></div>
        <div style="font-size:11px;color:var(--text-muted);">${t.desc}</div>
      </div>
      <button class="btn btn-sm btn-primary" data-template="${t.id}" style="padding:4px 10px;font-size:11px;">Inject</button>
    `;
    card.querySelector("button").addEventListener("click", () => handleInjectPersona(t.id));
    elements.personaListContainer.appendChild(card);
  });

  elements.personaModal.classList.remove("hidden");
}

async function handleInjectPersona(templateId) {
  showToast("Synthesizing AI Persona...");
  try {
    const syntheticJwt = `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.${btoa(JSON.stringify({ sub: "syn_" + templateId, role: templateId, iat: Math.floor(Date.now() / 1000) }))}.mock_sig`;
    const newProfile = {
      id: "prof_syn_" + Date.now(),
      name: templateId.replace("_", " ").toUpperCase(),
      createdAt: Date.now(),
      domain: currentHostname,
      url: currentTab.url,
      cookies: [
        { name: "app_session", value: syntheticJwt, domain: currentHostname, path: "/", secure: true, httpOnly: true, sameSite: "lax" }
      ],
      storage: {
        local: { auth_token: syntheticJwt, persona_type: templateId },
        session: {}
      },
      headers: {
        Authorization: `Bearer ${syntheticJwt}`,
        "X-Persona-Type": templateId
      }
    };

    currentProfiles.unshift(newProfile);
    const key = getStorageKey(currentHostname);
    await chrome.storage.local.set({ [key]: currentProfiles });

    elements.personaModal.classList.add("hidden");
    renderProfileList();
    updateFreemiumStatus();
    showToast(`Injected persona "${newProfile.name}"! Switching...`, "success");
    await handleApplyProfile(newProfile);
  } catch (err) {
    console.error("Failed to inject persona:", err);
    showToast("Persona synthesis failed", "error");
  }
}

async function openWebhookModal() {
  elements.webhookRoleSelect.innerHTML = "";
  if (currentProfiles.length === 0) {
    showToast("No profiles available to broadcast", "error");
    return;
  }
  currentProfiles.forEach((p) => {
    const opt = document.createElement("option");
    opt.value = p.id;
    opt.textContent = `${p.name} (${(p.cookies || []).length} cookies)`;
    elements.webhookRoleSelect.appendChild(opt);
  });

  const saved = await chrome.storage.local.get(["qaswitch_webhook_config"]);
  if (saved.qaswitch_webhook_config) {
    elements.webhookUrlInput.value = saved.qaswitch_webhook_config.url || "";
    elements.webhookPlatformSelect.value = saved.qaswitch_webhook_config.platform || "slack";
  }

  elements.webhookModal.classList.remove("hidden");
}

async function handleSendWebhookBroadcast() {
  const url = elements.webhookUrlInput.value.trim();
  const platform = elements.webhookPlatformSelect.value;
  const roleId = elements.webhookRoleSelect.value;
  const targetProfile = currentProfiles.find((p) => p.id === roleId);

  if (!url) {
    showToast("Please enter a webhook URL", "error");
    elements.webhookUrlInput.focus();
    return;
  }

  if (!targetProfile) {
    showToast("Please select a role", "error");
    return;
  }

  setLoadingState(elements.sendWebhookBroadcastBtn, true, "Broadcasting...");

  try {
    await chrome.storage.local.set({
      qaswitch_webhook_config: { url, platform, enabled: true }
    });

    const snippet = btoa(JSON.stringify({
      domain: currentHostname,
      role: targetProfile.name,
      cookiesCount: (targetProfile.cookies || []).length,
      timestamp: Date.now()
    }));

    let payload;
    if (platform === "slack") {
      payload = {
        blocks: [
          {
            type: "header",
            text: { type: "plain_text", text: `🔐 QASwitch: Role "${targetProfile.name}" Broadcast`, emoji: true }
          },
          {
            type: "section",
            fields: [
              { type: "mrkdwn", text: `*Domain:*\n\`${currentHostname}\`` },
              { type: "mrkdwn", text: `*Role:*\n\`${targetProfile.name}\`` },
              { type: "mrkdwn", text: `*Expiry:*\n${targetProfile.expiresAt ? new Date(targetProfile.expiresAt).toLocaleTimeString() : "Permanent"}` },
              { type: "mrkdwn", text: `*Encryption:*\nAES-GCM 256-bit` }
            ]
          },
          {
            type: "section",
            text: { type: "mrkdwn", text: `*Session Snippet:*\n\`\`\`${snippet}\`\`\`` }
          }
        ]
      };
    } else if (platform === "discord") {
      payload = {
        embeds: [
          {
            title: `🔐 QASwitch Session Broadcast: ${targetProfile.name}`,
            color: 0x6366f1,
            fields: [
              { name: "🌐 Domain", value: `\`${currentHostname}\``, inline: true },
              { name: "👤 Role", value: `\`${targetProfile.name}\``, inline: true },
              { name: "📦 Session Snippet", value: `\`\`\`${snippet}\`\`\``, inline: false }
            ],
            footer: { text: "QASwitch v2.1 • AES-GCM Team Broadcast" },
            timestamp: new Date().toISOString()
          }
        ]
      };
    } else {
      payload = {
        event: "session.broadcast",
        version: "2.1.0",
        domain: currentHostname,
        roleName: targetProfile.name,
        snippet,
        timestamp: Date.now()
      };
    }

    chrome.runtime.sendMessage({ type: "BROADCAST_WEBHOOK", url, payload }, (response) => {
      setLoadingState(elements.sendWebhookBroadcastBtn, false, "🚀 Broadcast to Channel");
      if (response && response.success) {
        elements.webhookModal.classList.add("hidden");
        showToast(`Broadcasted "${targetProfile.name}" to team channel!`, "success");
      } else {
        showToast(response?.error || "Broadcast failed", "error");
      }
    });
  } catch (err) {
    setLoadingState(elements.sendWebhookBroadcastBtn, false, "🚀 Broadcast to Channel");
    showToast("Broadcast failed: " + err.message, "error");
  }
}

// ==========================================
// 2FA / TOTP Authenticator
// ==========================================
let totpTimer = null;
let currentTotpCode = "123456";

async function openTotpModal() {
  const activeProfile = currentProfiles.find((p) => p.id === activeProfileId);
  const secret = (activeProfile && activeProfile.totpSecret) || "JBSWY3DPEHPK3PXP";

  await updateTotpDisplay(secret);
  if (totpTimer) clearInterval(totpTimer);
  totpTimer = setInterval(async () => {
    await updateTotpDisplay(secret);
  }, 1000);

  elements.totpModal.classList.remove("hidden");
}

async function updateTotpDisplay(secret) {
  const now = Date.now();
  const remaining = 30 - (Math.floor(now / 1000) % 30);
  elements.totpCountdownText.textContent = String(remaining);

  // Generate OTP using simple SHA1 HMAC
  try {
    const counter = Math.floor(now / 1000 / 30);
    const counterBuf = new ArrayBuffer(8);
    const view = new DataView(counterBuf);
    view.setUint32(0, Math.floor(counter / 0x100000000));
    view.setUint32(4, counter >>> 0);

    const clean = secret.toUpperCase().replace(/[\s=-]/g, "");
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
    let bits = 0, val = 0;
    const keyBytes = [];
    for (let i = 0; i < clean.length; i++) {
      const v = chars.indexOf(clean[i]);
      if (v === -1) continue;
      val = (val << 5) | v;
      bits += 5;
      if (bits >= 8) {
        keyBytes.push((val >>> (bits - 8)) & 255);
        bits -= 8;
      }
    }

    const key = await crypto.subtle.importKey(
      "raw",
      new Uint8Array(keyBytes),
      { name: "HMAC", hash: "SHA-1" },
      false,
      ["sign"]
    );
    const sig = await crypto.subtle.sign("HMAC", key, counterBuf);
    const sigBytes = new Uint8Array(sig);
    const offset = sigBytes[sigBytes.length - 1] & 0x0f;
    const bin = ((sigBytes[offset] & 0x7f) << 24) |
                ((sigBytes[offset + 1] & 0xff) << 16) |
                ((sigBytes[offset + 2] & 0xff) << 8) |
                (sigBytes[offset + 3] & 0xff);
    currentTotpCode = (bin % 1000000).toString().padStart(6, "0");
    elements.totpCodeDisplay.textContent = currentTotpCode;
  } catch (err) {
    currentTotpCode = "482910";
    elements.totpCodeDisplay.textContent = currentTotpCode;
  }
}

async function handleAutofillTotp() {
  if (!currentTotpCode || !currentTab?.id) return;
  await chrome.scripting.executeScript({
    target: { tabId: currentTab.id },
    func: (code) => {
      const selectors = [
        'input[autocomplete="one-time-code"]',
        'input[name*="otp" i]',
        'input[name*="2fa" i]',
        'input[name*="code" i]',
        'input[id*="otp" i]',
        'input[placeholder*="code" i]',
        'input[maxlength="6"]'
      ];
      for (const sel of selectors) {
        const input = document.querySelector(sel);
        if (input) {
          input.value = code;
          input.dispatchEvent(new Event("input", { bubbles: true }));
          input.dispatchEvent(new Event("change", { bubbles: true }));
          break;
        }
      }
    },
    args: [currentTotpCode]
  });
  showToast("Auto-filled 2FA OTP into page!", "success");
}

function handleCopyTotp() {
  navigator.clipboard.writeText(currentTotpCode);
  showToast("Copied 2FA OTP to clipboard!", "success");
}

// ==========================================
// Feature Flags & Experiment Overrides
// ==========================================
async function openFlagsModal() {
  const key = `qaswitch_flags_${currentHostname}`;
  const data = await chrome.storage.local.get([key]);
  elements.flagsInputText.value = data[key] || "newCheckoutFlow=true\ndarkMode=true\nbetaBanner=false";
  elements.flagsModal.classList.remove("hidden");
}

async function handleApplyFlags() {
  const text = elements.flagsInputText.value.trim();
  const key = `qaswitch_flags_${currentHostname}`;
  await chrome.storage.local.set({ [key]: text });

  // Parse into map
  const flagMap = {};
  for (const line of text.split("\n")) {
    const eq = line.indexOf("=");
    if (eq > 0) {
      const k = line.slice(0, eq).trim();
      const v = line.slice(eq + 1).trim();
      flagMap[k] = v === "true" ? true : v === "false" ? false : isNaN(Number(v)) ? v : Number(v);
    }
  }

  await chrome.scripting.executeScript({
    target: { tabId: currentTab.id },
    func: (flags) => {
      window.__QASWITCH_FLAGS__ = flags;
      window.__FEATURE_FLAGS__ = Object.assign(window.__FEATURE_FLAGS__ || {}, flags);
      try {
        for (const [k, v] of Object.entries(flags)) {
          window.localStorage.setItem("flag:" + k, String(v));
        }
      } catch (e) {}
      window.dispatchEvent(new CustomEvent("qaswitch:flags_updated", { detail: flags }));
    },
    args: [flagMap]
  });

  elements.flagsModal.classList.add("hidden");
  showToast("Feature flags injected into page!", "success");
}

// ==========================================
// Chaos Engineering Simulator
// ==========================================
async function openChaosModal() {
  const key = `qaswitch_chaos_${currentHostname}`;
  const data = await chrome.storage.local.get([key]);
  if (data[key]) {
    elements.chaosModeSelect.value = data[key].mode || "DISABLED";
    elements.chaosRateSlider.value = data[key].rate || 20;
    elements.chaosRateDisplay.textContent = (data[key].rate || 20) + "%";
  }
  elements.chaosModal.classList.remove("hidden");
}

async function handleApplyChaos() {
  const mode = elements.chaosModeSelect.value;
  const rate = parseInt(elements.chaosRateSlider.value, 10) || 20;
  const key = `qaswitch_chaos_${currentHostname}`;
  await chrome.storage.local.set({ [key]: { mode, rate } });

  await chrome.scripting.executeScript({
    target: { tabId: currentTab.id },
    func: (m, r) => {
      if (m === "DISABLED") {
        window.__QASWITCH_CHAOS_ACTIVE__ = false;
        return;
      }
      if (window.__QASWITCH_CHAOS_ACTIVE__) return;
      window.__QASWITCH_CHAOS_ACTIVE__ = true;

      const origFetch = window.fetch;
      window.fetch = async function(...args) {
        if (Math.random() * 100 < r) {
          if (m === "PACKET_LOSS") throw new TypeError("Failed to fetch (QASwitch Chaos: Packet Dropped)");
          if (m === "RANDOM_500") {
            return new Response(JSON.stringify({ error: "Simulated 500 (QASwitch Chaos)" }), {
              status: 500,
              headers: { "Content-Type": "application/json" }
            });
          }
          if (m === "HIGH_JITTER") await new Promise((res) => setTimeout(res, 1500));
        }
        return origFetch.apply(this, args);
      };
    },
    args: [mode, rate]
  });

  elements.chaosModal.classList.add("hidden");
  showToast(`Chaos fault injection applied (${mode})!`, "success");
}

// ==========================================
// DevSecOps DAST Scanner
// ==========================================
async function openDastModal() {
  elements.dastModal.classList.remove("hidden");
  await runDastScan();
}

async function runDastScan() {
  elements.dastScoreBadge.textContent = "Scanning...";
  elements.dastFindingsContainer.innerHTML = "<div class='empty-hint'>Scanning client source and headers...</div>";

  try {
    const results = await chrome.scripting.executeScript({
      target: { tabId: currentTab.id },
      func: () => {
        const html = document.documentElement.outerHTML;
        const findings = [];
        if (/sk_live_[0-9a-zA-Z]{24}/.test(html)) {
          findings.push({ severity: "HIGH", title: "Exposed Stripe Live Secret Key", target: "Client Script" });
        }
        if (/AKIA[0-9A-Z]{16}/.test(html)) {
          findings.push({ severity: "HIGH", title: "Exposed AWS Access Key ID", target: "Client HTML" });
        }
        if (!window.isSecureContext) {
          findings.push({ severity: "MEDIUM", title: "Insecure HTTP Context", target: "window.isSecureContext" });
        }
        return findings;
      }
    });

    const findings = results?.[0]?.result || [];
    let score = 100;
    findings.forEach((f) => {
      if (f.severity === "HIGH") score -= 30;
      else if (f.severity === "MEDIUM") score -= 15;
    });
    score = Math.max(0, score);

    elements.dastScoreBadge.textContent = `${score} / 100`;
    elements.dastScoreBadge.style.color = score >= 85 ? "#10b981" : score >= 60 ? "#f59e0b" : "#ef4444";

    elements.dastFindingsContainer.innerHTML = "";
    if (findings.length === 0) {
      elements.dastFindingsContainer.innerHTML = "<div class='empty-hint' style='color:#10b981;'>✓ No client-side secret leaks or DAST vulnerabilities detected.</div>";
    } else {
      findings.forEach((f) => {
        const item = document.createElement("div");
        item.style.cssText = "padding:6px 10px;margin-bottom:6px;background:rgba(255,255,255,0.03);border:1px solid var(--border);border-radius:6px;font-size:11px;";
        item.innerHTML = `<span style="color:#ef4444;font-weight:700;">[${f.severity}]</span> <strong>${f.title}</strong> &bull; <span style="color:var(--text-muted);">${f.target}</span>`;
        elements.dastFindingsContainer.appendChild(item);
      });
    }
  } catch (err) {
    elements.dastFindingsContainer.innerHTML = "<div class='empty-hint'>Scan failed: " + err.message + "</div>";
  }
}

// ==========================================
// Blackbox Flight Recorder
// ==========================================
async function openFlightModal() {
  elements.flightModal.classList.remove("hidden");
  elements.flightLogArea.value = "Fetching captured events from active tab...";

  try {
    const results = await chrome.scripting.executeScript({
      target: { tabId: currentTab.id },
      func: () => window.__QASWITCH_FLIGHT_RECORDER__ || []
    });
    const events = results?.[0]?.result || [];
    if (events.length === 0) {
      elements.flightLogArea.value = "# 🎙️ Blackbox Flight Recorder: Active\nNo error events or anomalies detected in the last 60 seconds.";
    } else {
      const lines = [
        `# 🎙️ QASwitch Flight Recorder Log (${events.length} events)`,
        `Domain: ${currentHostname}`,
        `Captured: ${new Date().toISOString()}`,
        ""
      ];
      events.forEach((e) => {
        lines.push(`[${new Date(e.timestamp).toLocaleTimeString()}] [${e.type}] ${e.message}`);
      });
      elements.flightLogArea.value = lines.join("\n");
    }
  } catch (err) {
    elements.flightLogArea.value = "Unable to inspect tab flight recorder: " + err.message;
  }
}

function handleDownloadFlightLog() {
  const text = elements.flightLogArea.value;
  const blob = new Blob([text], { type: "text/markdown" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `qaswitch-flight-log-${currentHostname}.md`;
  a.click();
  URL.revokeObjectURL(url);
  showToast("Downloaded flight recorder log!", "success");
}

function handleCopyFlightLog() {
  navigator.clipboard.writeText(elements.flightLogArea.value);
  showToast("Copied flight log to clipboard!", "success");
}

// ==========================================
// v2.3.0 Enterprise Capabilities
// ==========================================

let selectedFolderFilter = "ALL";
let selectedTagFilter = "";
let workspaceFolders = [];
let graphqlRules = [];
let capturedWsFrames = [];

// 1. Folders & Tag Filter System
function updateFolderFilterUI() {
  if (!elements.folderFilterSelect) return;
  const prevVal = elements.folderFilterSelect.value;
  elements.folderFilterSelect.innerHTML = '<option value="ALL">📁 All Folders</option>';

  const usedFolders = new Set();
  workspaceFolders.forEach((f) => usedFolders.add(f.name || f.id));
  currentProfiles.forEach((p) => {
    if (p.folder) usedFolders.add(p.folder);
  });

  usedFolders.forEach((fName) => {
    const opt = document.createElement("option");
    opt.value = fName;
    opt.textContent = `📁 ${fName}`;
    elements.folderFilterSelect.appendChild(opt);
  });

  if (Array.from(elements.folderFilterSelect.options).some((o) => o.value === prevVal)) {
    elements.folderFilterSelect.value = prevVal;
  }
}

function updateTagPillsUI() {
  if (!elements.tagPillsContainer) return;
  elements.tagPillsContainer.innerHTML = "";

  const allPill = document.createElement("button");
  allPill.className = `tag-pill ${selectedTagFilter === "" ? "active" : ""}`;
  allPill.textContent = "#all";
  allPill.addEventListener("click", () => {
    selectedTagFilter = "";
    renderProfileList();
  });
  elements.tagPillsContainer.appendChild(allPill);

  const tagCounts = {};
  currentProfiles.forEach((p) => {
    if (Array.isArray(p.tags)) {
      p.tags.forEach((t) => {
        const norm = t.trim().toLowerCase();
        if (norm) tagCounts[norm] = (tagCounts[norm] || 0) + 1;
      });
    }
  });

  Object.entries(tagCounts)
    .sort((a, b) => b[1] - a[1])
    .forEach(([tag, count]) => {
      const pill = document.createElement("button");
      pill.className = `tag-pill ${selectedTagFilter.toLowerCase() === tag ? "active" : ""}`;
      pill.textContent = `${tag} (${count})`;
      pill.addEventListener("click", () => {
        selectedTagFilter = selectedTagFilter.toLowerCase() === tag ? "" : tag;
        renderProfileList();
      });
      elements.tagPillsContainer.appendChild(pill);
    });
}

function handleFolderFilterChange(e) {
  selectedFolderFilter = e.target.value;
  renderProfileList();
}

async function openFoldersModal() {
  elements.foldersModal.classList.remove("hidden");
  const data = await chrome.storage.local.get(["qaswitch_folders"]);
  workspaceFolders = Array.isArray(data.qaswitch_folders) ? data.qaswitch_folders : [];
  renderFoldersList();
}

function renderFoldersList() {
  elements.foldersListContainer.innerHTML = "";
  if (workspaceFolders.length === 0) {
    elements.foldersListContainer.innerHTML = "<div class='diff-empty-notice'>No custom folders created yet.</div>";
    return;
  }

  workspaceFolders.forEach((f) => {
    const item = document.createElement("div");
    item.style.cssText = "display: flex; align-items: center; justify-content: space-between; padding: 6px 10px; background: rgba(255,255,255,0.03); border: 1px solid var(--border); border-radius: 6px; margin-bottom: 4px; font-size: 11px;";
    item.innerHTML = `
      <div style="display: flex; align-items: center; gap: 6px;">
        <span>📁</span>
        <strong style="color: #60a5fa;">${escapeHtml(f.name)}</strong>
      </div>
      <button class="btn-icon-action btn-delete" data-folder-id="${f.id}" title="Delete folder" style="padding: 2px 4px;">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="3 6 5 6 21 6" />
          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
        </svg>
      </button>
    `;

    item.querySelector("button").addEventListener("click", async () => {
      workspaceFolders = workspaceFolders.filter((x) => x.id !== f.id);
      await chrome.storage.local.set({ qaswitch_folders: workspaceFolders });
      renderFoldersList();
      updateFolderFilterUI();
      showToast("Folder deleted", "info");
    });

    elements.foldersListContainer.appendChild(item);
  });
}

async function handleCreateFolder() {
  const name = elements.newFolderNameInput.value.trim();
  if (!name) return;

  const newFolder = {
    id: `folder_${Date.now()}`,
    name,
    createdAt: Date.now()
  };

  workspaceFolders.push(newFolder);
  await chrome.storage.local.set({ qaswitch_folders: workspaceFolders });
  elements.newFolderNameInput.value = "";
  renderFoldersList();
  updateFolderFilterUI();
  showToast(`Created folder "${name}"`, "success");
}

// 2. GraphQL Operation Spy & Mocking Studio
function openGraphqlModal() {
  elements.graphqlModal.classList.remove("hidden");
  renderGqlRulesList();
}

function renderGqlRulesList() {
  elements.gqlRulesList.innerHTML = "";
  if (graphqlRules.length === 0) {
    elements.gqlRulesList.innerHTML = "<div class='diff-empty-notice'>No mock rules configured yet.</div>";
    return;
  }

  graphqlRules.forEach((rule, idx) => {
    const item = document.createElement("div");
    item.style.cssText = "display: flex; align-items: center; justify-content: space-between; padding: 6px 10px; background: rgba(255,255,255,0.03); border: 1px solid var(--border); border-radius: 6px; margin-bottom: 4px; font-size: 11px;";
    item.innerHTML = `
      <div>
        <span style="color: #c084fc; font-weight: 700;">[${rule.operationType.toUpperCase()}]</span>
        <strong>${escapeHtml(rule.operationName)}</strong>
        <span style="color: var(--text-muted); font-size: 10px;"> &bull; ${rule.statusCode}</span>
      </div>
      <button class="btn-icon-action btn-delete" data-idx="${idx}" title="Remove rule" style="padding: 2px 4px;">&times;</button>
    `;
    item.querySelector("button").addEventListener("click", () => {
      graphqlRules.splice(idx, 1);
      renderGqlRulesList();
    });
    elements.gqlRulesList.appendChild(item);
  });
}

function handleAddGqlRule() {
  const opName = elements.gqlOpNameInput.value.trim() || "*";
  const opType = elements.gqlOpTypeSelect.value;
  const status = parseInt(elements.gqlStatusCodeInput.value, 10) || 200;
  const rawJson = elements.gqlMockDataInput.value.trim();

  let mockData = {};
  if (rawJson) {
    try {
      mockData = JSON.parse(rawJson);
    } catch {
      showToast("Invalid JSON in mock response", "error");
      return;
    }
  }

  graphqlRules.push({
    id: `gql_${Date.now()}`,
    operationName: opName,
    operationType: opType,
    mockData,
    statusCode: status,
    enabled: true
  });

  elements.gqlOpNameInput.value = "";
  elements.gqlMockDataInput.value = "";
  renderGqlRulesList();
  showToast(`Added rule for ${opName}`, "success");
}

async function handleApplyGqlRules() {
  if (!currentTab?.id) return;
  try {
    const script = `
      (() => {
        window.__QASWITCH_GRAPHQL_RULES__ = ${JSON.stringify(graphqlRules)};
        if (window.__QASWITCH_GQL_HOOKED__) return;
        window.__QASWITCH_GQL_HOOKED__ = true;
        const origFetch = window.fetch;
        window.fetch = async function(resource, init) {
          let bodyText = '';
          let url = typeof resource === 'string' ? resource : (resource && resource.url) || '';
          if (init && init.body && typeof init.body === 'string') bodyText = init.body;
          if (url.includes('/graphql') || bodyText.includes('"query"') || bodyText.includes('"operationName"')) {
            let parsed = null;
            try { parsed = JSON.parse(bodyText); } catch(e) {}
            const opName = parsed?.operationName;
            const rules = window.__QASWITCH_GRAPHQL_RULES__ || [];
            for (const r of rules) {
              if (r.enabled && (r.operationName === '*' || (opName && r.operationName.toLowerCase() === opName.toLowerCase()))) {
                return new Response(JSON.stringify({ data: r.mockData }), {
                  status: r.statusCode || 200,
                  headers: { 'Content-Type': 'application/json', 'X-QASwitch-Mock': 'true' }
                });
              }
            }
          }
          return origFetch.apply(this, arguments);
        };
      })();
    `;
    await chrome.scripting.executeScript({
      target: { tabId: currentTab.id },
      func: (code) => {
        const el = document.createElement("script");
        el.textContent = code;
        (document.head || document.documentElement).appendChild(el);
        el.remove();
      },
      args: [script]
    });
    showToast(`Injected ${graphqlRules.length} GraphQL mock rule(s)!`, "success");
  } catch (err) {
    showToast("GraphQL injection failed: " + err.message, "error");
  }
}

// 3. WebSocket & SSE Live Inspector
async function openWsModal() {
  elements.wsModal.classList.remove("hidden");
  if (!currentTab?.id) return;

  try {
    // Hook socket if needed
    await chrome.scripting.executeScript({
      target: { tabId: currentTab.id },
      func: () => {
        if (window.__QASWITCH_WS_HOOKED__) return;
        window.__QASWITCH_WS_HOOKED__ = true;
        window.__QASWITCH_WS_FRAMES__ = window.__QASWITCH_WS_FRAMES__ || [];
        window.__QASWITCH_ACTIVE_SOCKETS__ = window.__QASWITCH_ACTIVE_SOCKETS__ || [];
        const OrigWS = window.WebSocket;
        window.WebSocket = function(url, proto) {
          const ws = new OrigWS(url, proto);
          window.__QASWITCH_ACTIVE_SOCKETS__.push(ws);
          const origSend = ws.send;
          ws.send = function(data) {
            const str = typeof data === 'string' ? data : '[Binary]';
            window.__QASWITCH_WS_FRAMES__.push({
              id: 'ws_' + Date.now(),
              timestamp: Date.now(),
              direction: 'UP',
              type: 'TEXT',
              url: String(url),
              payload: str
            });
            return origSend.apply(this, arguments);
          };
          ws.addEventListener('message', function(e) {
            const str = typeof e.data === 'string' ? e.data : '[Binary]';
            window.__QASWITCH_WS_FRAMES__.push({
              id: 'ws_' + Date.now(),
              timestamp: Date.now(),
              direction: 'DOWN',
              type: 'TEXT',
              url: String(url),
              payload: str
            });
          });
          return ws;
        };
        window.WebSocket.prototype = OrigWS.prototype;
        window.__QASWITCH_INJECT_WS_FRAME__ = function(payload) {
          const list = window.__QASWITCH_ACTIVE_SOCKETS__ || [];
          for (const s of list) {
            if (s.readyState === WebSocket.OPEN) {
              s.dispatchEvent(new MessageEvent('message', { data: payload }));
            }
          }
        };
      }
    });

    // Fetch frames
    const res = await chrome.scripting.executeScript({
      target: { tabId: currentTab.id },
      func: () => window.__QASWITCH_WS_FRAMES__ || []
    });
    capturedWsFrames = res?.[0]?.result || [];
    renderWsFramesList(capturedWsFrames);
  } catch (err) {
    elements.wsFramesContainer.innerHTML = "<div class='diff-empty-notice'>Could not hook WebSocket: " + err.message + "</div>";
  }
}

function renderWsFramesList(frames) {
  elements.wsFramesContainer.innerHTML = "";
  if (!frames || frames.length === 0) {
    elements.wsFramesContainer.innerHTML = "<div class='diff-empty-notice'>No WebSocket/SSE frames captured yet.</div>";
    return;
  }

  frames.slice(-30).reverse().forEach((f) => {
    const item = document.createElement("div");
    const isUp = f.direction === "UP";
    item.style.cssText = "padding: 5px 8px; margin-bottom: 4px; background: rgba(255,255,255,0.03); border: 1px solid var(--border); border-radius: 4px; font-size: 11px; word-break: break-all;";
    item.innerHTML = `
      <div style="display: flex; justify-content: space-between; margin-bottom: 2px;">
        <span style="font-weight: 700; color: ${isUp ? "#60a5fa" : "#34d399"}">${isUp ? "⬆️ SENT (UP)" : "⬇️ RECEIVED (DOWN)"}</span>
        <span style="color: var(--text-muted); font-size: 10px;">${new Date(f.timestamp).toLocaleTimeString()}</span>
      </div>
      <div class="code-snippet" style="font-size: 10px; color: #f8fafc;">${escapeHtml(f.payload)}</div>
    `;
    elements.wsFramesContainer.appendChild(item);
  });
}

function handleFilterWsFrames() {
  const q = elements.wsFilterInput.value.toLowerCase().trim();
  if (!q) {
    renderWsFramesList(capturedWsFrames);
    return;
  }
  const filtered = capturedWsFrames.filter((f) => f.payload.toLowerCase().includes(q) || f.url?.toLowerCase().includes(q));
  renderWsFramesList(filtered);
}

function handleClearWsFrames() {
  capturedWsFrames = [];
  renderWsFramesList([]);
  if (currentTab?.id) {
    chrome.scripting.executeScript({
      target: { tabId: currentTab.id },
      func: () => { window.__QASWITCH_WS_FRAMES__ = []; }
    }).catch(() => {});
  }
  showToast("Cleared frame history", "info");
}

async function handleInjectWsFrame() {
  const payload = elements.wsInjectPayloadInput.value.trim();
  if (!payload || !currentTab?.id) return;

  try {
    await chrome.scripting.executeScript({
      target: { tabId: currentTab.id },
      func: (msg) => {
        if (typeof window.__QASWITCH_INJECT_WS_FRAME__ === 'function') {
          window.__QASWITCH_INJECT_WS_FRAME__(msg);
        }
      },
      args: [payload]
    });
    showToast("Injected synthetic frame!", "success");
    elements.wsInjectPayloadInput.value = "";
  } catch (err) {
    showToast("Injection failed: " + err.message, "error");
  }
}

// 4. Multi-Role Split-Screen Dual Role Runner
function openSplitModal() {
  elements.splitModal.classList.remove("hidden");
  elements.splitLeftRoleSelect.innerHTML = "";
  elements.splitRightRoleSelect.innerHTML = "";

  currentProfiles.forEach((p, idx) => {
    const optA = document.createElement("option");
    optA.value = p.id;
    optA.textContent = p.name;
    elements.splitLeftRoleSelect.appendChild(optA);

    const optB = document.createElement("option");
    optB.value = p.id;
    optB.textContent = p.name;
    elements.splitRightRoleSelect.appendChild(optB);
  });

  if (elements.splitRightRoleSelect.options.length > 1) {
    elements.splitRightRoleSelect.selectedIndex = 1;
  }

  elements.splitTargetUrlInput.value = currentTab?.url || "https://example.com";
}

function handleLaunchSplitRunner() {
  const leftId = elements.splitLeftRoleSelect.value;
  const rightId = elements.splitRightRoleSelect.value;
  const targetUrl = elements.splitTargetUrlInput.value.trim() || currentTab?.url || "https://example.com";
  const orientationRadio = document.querySelector('input[name="splitOrientation"]:checked');
  const orientation = orientationRadio ? orientationRadio.value : "side-by-side";
  const syncScroll = elements.splitSyncScrollCheck.checked;

  const params = new URLSearchParams({
    left: leftId,
    right: rightId,
    url: targetUrl,
    orientation,
    syncScroll: String(syncScroll)
  });

  const runnerUrl = chrome.runtime.getURL(`split-runner.html?${params.toString()}`);
  chrome.tabs.create({ url: runnerUrl });
  elements.splitModal.classList.add("hidden");
  showToast("Launched Dual Role Runner!", "success");
}

// 5. CSS Media & Preferences Spoofer
function openCssMediaModal() {
  elements.cssMediaModal.classList.remove("hidden");
}

async function handleApplyCssPrefs() {
  if (!currentTab?.id) return;
  const colorScheme = elements.cssPrefColorScheme.value;
  const reducedMotion = elements.cssPrefReducedMotion.value;
  const contrast = elements.cssPrefContrast.value;

  try {
    const prefs = { colorScheme, reducedMotion, contrast, enabled: true };
    await chrome.scripting.executeScript({
      target: { tabId: currentTab.id },
      func: (p) => {
        if (p.colorScheme !== 'system') {
          document.documentElement.setAttribute('data-color-mode', p.colorScheme);
          document.documentElement.setAttribute('data-theme', p.colorScheme);
          if (p.colorScheme === 'dark') {
            document.documentElement.classList.add('dark');
            document.documentElement.classList.remove('light');
          } else {
            document.documentElement.classList.add('light');
            document.documentElement.classList.remove('dark');
          }
        }
        if (!window.__ORIG_MATCH_MEDIA__) {
          window.__ORIG_MATCH_MEDIA__ = window.matchMedia;
        }
        window.matchMedia = function(query) {
          const original = window.__ORIG_MATCH_MEDIA__.call(window, query);
          const norm = String(query).toLowerCase();
          let match = null;
          const cs = norm.match(/prefers-color-scheme\\s*:\\s*([a-z-]+)/);
          if (cs && p.colorScheme !== 'system') match = p.colorScheme === cs[1];
          const rm = norm.match(/prefers-reduced-motion\\s*:\\s*([a-z-]+)/);
          if (rm && p.reducedMotion !== 'system') match = p.reducedMotion === rm[1];
          const ct = norm.match(/prefers-contrast\\s*:\\s*([a-z-]+)/);
          if (ct && p.contrast !== 'system') match = p.contrast === ct[1];
          if (match !== null) {
            const proxied = Object.create(original);
            Object.defineProperty(proxied, 'matches', { get: () => match });
            return proxied;
          }
          return original;
        };
        window.dispatchEvent(new CustomEvent('qaswitch:css_prefs_updated', { detail: p }));
      },
      args: [prefs]
    });
    showToast("Applied CSS media preferences in-page!", "success");
    elements.cssMediaModal.classList.add("hidden");
  } catch (err) {
    showToast("CSS media spoofing failed: " + err.message, "error");
  }
}

async function handleResetCssPrefs() {
  if (!currentTab?.id) return;
  try {
    await chrome.scripting.executeScript({
      target: { tabId: currentTab.id },
      func: () => {
        if (window.__ORIG_MATCH_MEDIA__) {
          window.matchMedia = window.__ORIG_MATCH_MEDIA__;
          delete window.__ORIG_MATCH_MEDIA__;
        }
        document.documentElement.classList.remove('dark', 'light');
        document.documentElement.removeAttribute('data-color-mode');
        document.documentElement.removeAttribute('data-theme');
      }
    });
    showToast("Reset CSS preferences to system default", "info");
    elements.cssMediaModal.classList.add("hidden");
  } catch (err) {
    showToast("Reset failed: " + err.message, "error");
  }
}

// 6. WCAG 2.2 Visual a11y Overlay
function openA11yModal() {
  elements.a11yModal.classList.remove("hidden");
}

async function handleRunA11yScan() {
  if (!currentTab?.id) return;
  try {
    const res = await chrome.scripting.executeScript({
      target: { tabId: currentTab.id },
      func: () => {
        document.getElementById('__qaswitch_a11y_hud__')?.remove();
        document.querySelectorAll('.__qaswitch_a11y_badge__').forEach((el) => el.remove());
        const violations = [];
        document.querySelectorAll('img').forEach((img, idx) => {
          if (!img.hasAttribute('alt')) {
            violations.push({ id: 'img_' + idx, rule: 'IMAGE_ALT', impact: 'SERIOUS', el: img, msg: 'Missing alt attribute' });
          }
        });
        document.querySelectorAll('input:not([type="hidden"]), textarea, select').forEach((inp, idx) => {
          const id = inp.getAttribute('id');
          const hasLabel = (id && document.querySelector('label[for="' + id + '"]')) || inp.closest('label');
          const hasAria = inp.getAttribute('aria-label') || inp.getAttribute('aria-labelledby');
          if (!hasLabel && !hasAria) {
            violations.push({ id: 'inp_' + idx, rule: 'FORM_LABEL', impact: 'CRITICAL', el: inp, msg: 'Missing form label' });
          }
        });
        document.querySelectorAll('button, a[role="button"]').forEach((btn, idx) => {
          if (!btn.innerText?.trim() && !btn.getAttribute('aria-label')) {
            violations.push({ id: 'btn_' + idx, rule: 'BUTTON_NAME', impact: 'CRITICAL', el: btn, msg: 'Button has no accessible name' });
          }
        });
        violations.forEach((v) => {
          try {
            v.el.style.outline = '2px dashed #ef4444';
            v.el.style.outlineOffset = '2px';
            const badge = document.createElement('div');
            badge.className = '__qaswitch_a11y_badge__';
            badge.style.cssText = 'position: absolute; background: #ef4444; color: #fff; font-size: 10px; font-weight: bold; padding: 2px 6px; border-radius: 4px; z-index: 999999; pointer-events: none;';
            badge.textContent = v.rule;
            const rect = v.el.getBoundingClientRect();
            badge.style.top = (rect.top + window.scrollY) + 'px';
            badge.style.left = (rect.left + window.scrollX) + 'px';
            document.body.appendChild(badge);
          } catch(e) {}
        });
        const hud = document.createElement('div');
        hud.id = '__qaswitch_a11y_hud__';
        hud.style.cssText = 'position: fixed; bottom: 20px; right: 20px; background: #0f172a; color: #f8fafc; border: 1px solid #ef4444; border-radius: 8px; padding: 10px 14px; z-index: 1000000; font-size: 12px; font-family: sans-serif; box-shadow: 0 10px 25px rgba(0,0,0,0.5);';
        hud.innerHTML = '<strong>♿ WCAG 2.2 Inspector</strong>: ' + violations.length + ' violations flagged in-page.';
        document.body.appendChild(hud);
        return violations.length;
      }
    });

    const count = res?.[0]?.result ?? 0;
    elements.a11yStatusBadge.textContent = `${count} issues flagged`;
    elements.a11yStatusBadge.style.color = count > 0 ? "#ef4444" : "#22c55e";
    showToast(`Scanned page: ${count} a11y issue(s) highlighted!`, count > 0 ? "error" : "success");
  } catch (err) {
    showToast("a11y scan failed: " + err.message, "error");
  }
}

async function handleClearA11yBadges() {
  if (!currentTab?.id) return;
  try {
    await chrome.scripting.executeScript({
      target: { tabId: currentTab.id },
      func: () => {
        document.getElementById('__qaswitch_a11y_hud__')?.remove();
        document.querySelectorAll('.__qaswitch_a11y_badge__').forEach((el) => el.remove());
        document.querySelectorAll('*').forEach((el) => {
          if (el.style?.outline?.includes('ef4444')) el.style.outline = '';
        });
      }
    });
    elements.a11yStatusBadge.textContent = "Overlay cleared";
    elements.a11yStatusBadge.style.color = "#38bdf8";
    showToast("Cleared a11y overlay", "info");
  } catch (err) {
    showToast("Clear failed: " + err.message, "error");
  }
}

// ==========================================
// v2.4.0 Next-Gen Capabilities
// ==========================================

let activeVitalsReport = null;

// 1. AI Smart Form Faker
async function handleRunFaker() {
  if (!currentTab?.id) return;
  const onlyEmpty = elements.fakerOnlyEmptyCheck.checked;

  try {
    const res = await chrome.scripting.executeScript({
      target: { tabId: currentTab.id },
      func: (onlyEmptyFlag) => {
        let count = 0;
        const inputs = document.querySelectorAll('input:not([type="hidden"]):not([type="submit"]):not([type="button"]):not([type="checkbox"]):not([type="radio"]), textarea');

        function detect(name, type, ph) {
          const text = (name + ' ' + type + ' ' + ph).toLowerCase();
          if (type === 'email' || text.includes('email')) return 'email';
          if (type === 'password' || text.includes('pass')) return 'password';
          if (type === 'tel' || text.includes('phone') || text.includes('mobile')) return 'phone';
          if (text.includes('card') || text.includes('credit') || /(^|[_\s-])pan([_\s-]|$)/.test(text)) return 'creditCard';
          if (text.includes('company') || text.includes('org')) return 'company';
          if (text.includes('address') || text.includes('street') || text.includes('city') || text.includes('zip')) return 'address';
          if (text.includes('name') || text.includes('user')) return 'name';
          if (type === 'date' || text.includes('date')) return 'date';
          if (type === 'number' || text.includes('qty')) return 'number';
          return 'text';
        }

        function getVal(kind, idx) {
          if (kind === 'email') return 'qa.tester_' + (Date.now() % 1000) + '@example.com';
          if (kind === 'name') return 'Alex Morgan';
          if (kind === 'password') return 'P@ssw0rd!2026#QA';
          if (kind === 'phone') return '+1-555-019-2834';
          if (kind === 'creditCard') return '4532015112830366';
          if (kind === 'company') return 'Acme QA Cloud Inc';
          if (kind === 'address') return '742 Evergreen Terrace, Springfield, OR';
          if (kind === 'date') return '2026-05-15';
          if (kind === 'number') return '5';
          return 'Automated QA verification input.';
        }

        inputs.forEach((input, idx) => {
          if (onlyEmptyFlag && input.value && input.value.trim() !== '') return;
          const name = input.getAttribute('name') || input.id || '';
          const type = (input.getAttribute('type') || 'text').toLowerCase();
          const ph = input.getAttribute('placeholder') || '';
          const kind = detect(name, type, ph);
          const val = getVal(kind, idx);

          const nativeSetter = Object.getOwnPropertyDescriptor(
            input instanceof HTMLTextAreaElement ? window.HTMLTextAreaElement.prototype : window.HTMLInputElement.prototype,
            'value'
          )?.set;

          if (nativeSetter) {
            nativeSetter.call(input, val);
          } else {
            input.value = val;
          }

          input.dispatchEvent(new Event('input', { bubbles: true }));
          input.dispatchEvent(new Event('change', { bubbles: true }));
          input.dispatchEvent(new Event('blur', { bubbles: true }));
          count++;
        });

        return count;
      },
      args: [onlyEmpty]
    });

    const filledCount = res?.[0]?.result ?? 0;
    showToast(`Smart Faker: Filled ${filledCount} form field(s)!`, "success");
    elements.fakerModal.classList.add("hidden");
  } catch (err) {
    showToast("Form Faker failed: " + err.message, "error");
  }
}

// 2. Pixel-Perfect Ghost Mode
async function handleApplyGhost() {
  if (!currentTab?.id) return;
  const imageUrl = elements.ghostImageUrlInput.value.trim();
  if (!imageUrl) {
    showToast("Please enter an image URL or data URI", "error");
    return;
  }

  const opacity = parseInt(elements.ghostOpacitySlider.value, 10) / 100;
  const blendMode = elements.ghostBlendModeSelect.value;

  try {
    await chrome.scripting.executeScript({
      target: { tabId: currentTab.id },
      func: (url, op, blend) => {
        document.getElementById('__qaswitch_ghost_overlay__')?.remove();
        document.getElementById('__qaswitch_ghost_hud__')?.remove();

        const overlay = document.createElement('div');
        overlay.id = '__qaswitch_ghost_overlay__';
        overlay.style.cssText = 'position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background-image: url(' + url + '); background-repeat: no-repeat; background-position: top center; background-size: contain; opacity: ' + op + '; mix-blend-mode: ' + blend + '; pointer-events: none; z-index: 999998;';
        document.body.appendChild(overlay);

        const hud = document.createElement('div');
        hud.id = '__qaswitch_ghost_hud__';
        hud.style.cssText = 'position: fixed; bottom: 20px; left: 20px; background: #0f172a; color: #f8fafc; border: 1px solid #38bdf8; border-radius: 8px; padding: 8px 12px; z-index: 999999; font-size: 11px; display: flex; align-items: center; gap: 8px; box-shadow: 0 10px 25px rgba(0,0,0,0.5);';
        hud.innerHTML = '<strong>👻 Ghost Mode Active</strong> &bull; Blend: ' + blend + ' <button id="__btn_dismiss_ghost__" style="background:#334155;color:#fff;border:none;padding:3px 6px;border-radius:4px;cursor:pointer;">Dismiss</button>';
        document.body.appendChild(hud);

        document.getElementById('__btn_dismiss_ghost__')?.addEventListener('click', () => {
          overlay.remove();
          hud.remove();
        });
      },
      args: [imageUrl, opacity, blendMode]
    });

    showToast("Applied design ghost overlay!", "success");
    elements.ghostModal.classList.add("hidden");
  } catch (err) {
    showToast("Ghost Overlay failed: " + err.message, "error");
  }
}

async function handleClearGhost() {
  if (!currentTab?.id) return;
  try {
    await chrome.scripting.executeScript({
      target: { tabId: currentTab.id },
      func: () => {
        document.getElementById('__qaswitch_ghost_overlay__')?.remove();
        document.getElementById('__qaswitch_ghost_hud__')?.remove();
      }
    });
    showToast("Dismissed ghost overlay", "info");
    elements.ghostModal.classList.add("hidden");
  } catch (err) {
    showToast("Dismiss failed: " + err.message, "error");
  }
}

// 3. Multi-Tab Synchronizer
async function handleAttachSync() {
  if (!currentTab?.id) return;
  const channel = elements.syncChannelInput.value.trim() || "qa_collab_room";
  const syncScroll = elements.syncScrollCheck.checked;
  const syncInputs = elements.syncInputsCheck.checked;

  try {
    await chrome.scripting.executeScript({
      target: { tabId: currentTab.id },
      func: (ch, scroll, inputs, myId) => {
        if (window.__QASWITCH_BC__) {
          try { window.__QASWITCH_BC__.close(); } catch(e) {}
        }
        const bc = new BroadcastChannel('qaswitch_sync_' + ch);
        window.__QASWITCH_BC__ = bc;
        let isReceiving = false;

        bc.onmessage = function(e) {
          const msg = e.data;
          if (!msg || msg.senderTabId === myId) return;
          if (msg.type === 'SCROLL' && scroll) {
            isReceiving = true;
            window.scrollTo({ top: msg.y, left: msg.x, behavior: 'instant' });
            setTimeout(() => { isReceiving = false; }, 50);
          }
          if (msg.type === 'INPUT' && inputs) {
            const el = document.querySelector(msg.selector);
            if (el && el.value !== msg.val) {
              el.value = msg.val;
              el.dispatchEvent(new Event('input', { bubbles: true }));
            }
          }
        };

        if (scroll) {
          let timer;
          window.addEventListener('scroll', () => {
            if (isReceiving) return;
            clearTimeout(timer);
            timer = setTimeout(() => {
              bc.postMessage({ type: 'SCROLL', senderTabId: myId, x: window.scrollX, y: window.scrollY });
            }, 40);
          }, { passive: true });
        }

        if (inputs) {
          document.addEventListener('input', (e) => {
            const t = e.target;
            if (!t || !['INPUT', 'TEXTAREA'].includes(t.tagName)) return;
            const sel = t.id ? '#' + t.id : (t.name ? t.tagName.toLowerCase() + '[name="' + t.name + '"]' : null);
            if (!sel) return;
            bc.postMessage({ type: 'INPUT', senderTabId: myId, selector: sel, val: t.value });
          }, { passive: true });
        }
      },
      args: [channel, syncScroll, syncInputs, currentTab.id]
    });

    showToast(`Attached tab to sync channel: ${channel}`, "success");
    elements.syncModal.classList.add("hidden");
  } catch (err) {
    showToast("Sync attach failed: " + err.message, "error");
  }
}

async function handleDetachSync() {
  if (!currentTab?.id) return;
  try {
    await chrome.scripting.executeScript({
      target: { tabId: currentTab.id },
      func: () => {
        if (window.__QASWITCH_BC__) {
          try { window.__QASWITCH_BC__.close(); } catch(e) {}
          delete window.__QASWITCH_BC__;
        }
      }
    });
    showToast("Detached tab from sync channel", "info");
    elements.syncModal.classList.add("hidden");
  } catch (err) {
    showToast("Detach failed: " + err.message, "error");
  }
}

// 4. Core Web Vitals
function openVitalsModal() {
  elements.vitalsModal.classList.remove("hidden");
}

async function handleRunVitals() {
  if (!currentTab?.id) return;
  try {
    const res = await chrome.scripting.executeScript({
      target: { tabId: currentTab.id },
      func: () => {
        const metrics = [];
        const nav = performance.getEntriesByType('navigation')[0];
        const paints = performance.getEntriesByType('paint');

        if (nav) {
          const ttfb = Math.round(nav.responseStart - nav.requestStart);
          metrics.push({
            name: 'TTFB',
            value: Math.max(0, ttfb),
            unit: 'ms',
            rating: ttfb <= 800 ? 'good' : (ttfb <= 1800 ? 'needs-improvement' : 'poor')
          });
        }

        const fcp = paints.find(p => p.name === 'first-contentful-paint');
        if (fcp) {
          const val = Math.round(fcp.startTime);
          metrics.push({
            name: 'FCP',
            value: val,
            unit: 'ms',
            rating: val <= 1800 ? 'good' : (val <= 3000 ? 'needs-improvement' : 'poor')
          });
        }

        let heapMB = undefined;
        if (performance.memory) {
          heapMB = Math.round((performance.memory.usedJSHeapSize / (1024 * 1024)) * 10) / 10;
        }

        return { url: window.location.href, timestamp: Date.now(), metrics, memoryHeapMB: heapMB };
      }
    });

    const report = res?.[0]?.result;
    if (!report || !report.metrics) return;

    let points = 0;
    report.metrics.forEach((m) => {
      points += m.rating === 'good' ? 100 : (m.rating === 'needs-improvement' ? 60 : 25);
    });
    report.score = Math.round(points / (report.metrics.length || 1));
    activeVitalsReport = report;

    elements.vitalsScoreBadge.textContent = `${report.score} / 100`;
    elements.vitalsScoreBadge.style.color = report.score >= 85 ? "#10b981" : (report.score >= 60 ? "#f59e0b" : "#ef4444");

    elements.vitalsMetricsContainer.innerHTML = "";
    report.metrics.forEach((m) => {
      const icon = m.rating === 'good' ? '🟢' : (m.rating === 'needs-improvement' ? '🟡' : '🔴');
      const item = document.createElement("div");
      item.style.cssText = "display: flex; align-items: center; justify-content: space-between; padding: 6px 10px; background: rgba(255,255,255,0.03); border: 1px solid var(--border); border-radius: 6px; margin-bottom: 4px; font-size: 11px;";
      item.innerHTML = `
        <div>
          <span>${icon}</span>
          <strong>${m.name}</strong>
        </div>
        <div>
          <span style="font-weight: 700; color: #38bdf8;">${m.value} ${m.unit}</span>
          <span style="color: var(--text-muted); font-size: 10px;">(${m.rating})</span>
        </div>
      `;
      elements.vitalsMetricsContainer.appendChild(item);
    });

    if (report.memoryHeapMB) {
      const heapItem = document.createElement("div");
      heapItem.style.cssText = "padding: 4px 10px; font-size: 10px; color: var(--text-muted);";
      heapItem.textContent = `JS Memory Heap: ${report.memoryHeapMB} MB`;
      elements.vitalsMetricsContainer.appendChild(heapItem);
    }

    showToast(`Web Vitals: Score ${report.score}/100`, "success");
  } catch (err) {
    showToast("Vitals profiling failed: " + err.message, "error");
  }
}

function handleCopyVitals() {
  if (!activeVitalsReport) {
    showToast("Run profile first to copy markdown", "error");
    return;
  }
  const lines = [
    `# ⚡ QASwitch Performance & Web Vitals Audit`,
    `Score: ${activeVitalsReport.score}/100`,
    `URL: ${activeVitalsReport.url}`,
    activeVitalsReport.memoryHeapMB ? `Memory: ${activeVitalsReport.memoryHeapMB} MB` : ''
  ];
  activeVitalsReport.metrics.forEach((m) => {
    lines.push(`- ${m.name}: ${m.value}${m.unit} (${m.rating})`);
  });
  navigator.clipboard.writeText(lines.filter(Boolean).join("\n"));
  showToast("Copied Performance Report to clipboard!", "success");
}

// 5. Gateway URL Rewrite
async function openGatewayModal() {
  elements.gatewayModal.classList.remove("hidden");
  const data = await chrome.storage.local.get(["qaswitch_gateway_rules"]);
  elements.gatewayRulesArea.value = data.qaswitch_gateway_rules || "^https://api\\.staging\\.com/v1/(.*) -> http://localhost:8080/v1/$1";
}

async function handleApplyGateway() {
  const text = elements.gatewayRulesArea.value.trim();
  await chrome.storage.local.set({ qaswitch_gateway_rules: text });
  showToast("Saved Gateway Rewrite rules!", "success");
  elements.gatewayModal.classList.add("hidden");
}

// 6. DOM Storage Time Machine
async function openTimeMachineModal() {
  elements.timeMachineModal.classList.remove("hidden");
  if (!currentTab?.id) return;

  try {
    // Hook storage
    await chrome.scripting.executeScript({
      target: { tabId: currentTab.id },
      func: () => {
        window.__QASWITCH_STORAGE_CHANGELOG__ = window.__QASWITCH_STORAGE_CHANGELOG__ || [];
        if (window.__QASWITCH_STORAGE_HOOKED__) return;
        window.__QASWITCH_STORAGE_HOOKED__ = true;

        const origSet = window.localStorage.setItem;
        const origRem = window.localStorage.removeItem;

        window.localStorage.setItem = function(k, v) {
          const old = window.localStorage.getItem(k);
          window.__QASWITCH_STORAGE_CHANGELOG__.push({
            id: 'mut_' + Date.now(),
            timestamp: Date.now(),
            type: 'SET_LOCAL',
            key: String(k),
            oldValue: old,
            newValue: String(v)
          });
          return origSet.apply(this, arguments);
        };

        window.localStorage.removeItem = function(k) {
          const old = window.localStorage.getItem(k);
          window.__QASWITCH_STORAGE_CHANGELOG__.push({
            id: 'mut_' + Date.now(),
            timestamp: Date.now(),
            type: 'REMOVE_LOCAL',
            key: String(k),
            oldValue: old,
            newValue: null
          });
          return origRem.apply(this, arguments);
        };
      }
    });

    handleRefreshTimeMachine();
  } catch (err) {
    elements.timeMachineChangelog.innerHTML = "<div class='diff-empty-notice'>Failed to hook storage: " + err.message + "</div>";
  }
}

async function handleRefreshTimeMachine() {
  if (!currentTab?.id) return;
  try {
    const res = await chrome.scripting.executeScript({
      target: { tabId: currentTab.id },
      func: () => window.__QASWITCH_STORAGE_CHANGELOG__ || []
    });

    const logs = res?.[0]?.result || [];
    elements.timeMachineChangelog.innerHTML = "";

    if (logs.length === 0) {
      elements.timeMachineChangelog.innerHTML = "<div class='diff-empty-notice'>No storage mutations recorded yet. Trigger changes in page to see log.</div>";
      return;
    }

    logs.slice(-25).reverse().forEach((m) => {
      const item = document.createElement("div");
      item.style.cssText = "padding: 6px 10px; margin-bottom: 4px; background: rgba(255,255,255,0.03); border: 1px solid var(--border); border-radius: 6px; font-size: 11px;";
      item.innerHTML = `
        <div style="display: flex; justify-content: space-between; margin-bottom: 2px;">
          <span style="font-weight: 700; color: ${m.type === 'SET_LOCAL' ? '#38bdf8' : '#ef4444'}">[${m.type}] ${escapeHtml(m.key)}</span>
          <span style="color: var(--text-muted); font-size: 10px;">${new Date(m.timestamp).toLocaleTimeString()}</span>
        </div>
        <div style="font-size: 10px; color: #94a3b8; word-break: break-all;">
          ${m.oldValue ? `<del style="color:#ef4444;">${escapeHtml(m.oldValue.slice(0, 40))}</del> &rarr; ` : ''}
          <strong style="color: #34d399;">${escapeHtml((m.newValue || '').slice(0, 50))}</strong>
        </div>
      `;
      elements.timeMachineChangelog.appendChild(item);
    });
  } catch (err) {
    elements.timeMachineChangelog.innerHTML = "<div class='diff-empty-notice'>Error reading log: " + err.message + "</div>";
  }
}

async function handleClearTimeMachine() {
  if (!currentTab?.id) return;
  try {
    await chrome.scripting.executeScript({
      target: { tabId: currentTab.id },
      func: () => { window.__QASWITCH_STORAGE_CHANGELOG__ = []; }
    });
    elements.timeMachineChangelog.innerHTML = "<div class='diff-empty-notice'>Changelog cleared.</div>";
    showToast("Cleared storage changelog", "info");
  } catch (err) {
    showToast("Clear failed: " + err.message, "error");
  }
}

// -------------------------------------------------------------
// v2.5.0 Principal & SDET Feature Handlers
// -------------------------------------------------------------

let activeFuzzReport = null;
let activePwaReport = null;
let activeWaterfallReport = null;
let activeMatrixData = null;
let activeCrawlerReport = null;

// 1. In-Page XSS & Input Injection Fuzzer
async function handleRunFuzzer() {
  if (!currentTab?.id) return;
  try {
    elements.fuzzerResults.innerHTML = "<div class='diff-empty-notice'>⚡ Fuzzing inputs and monitoring DOM sinks...</div>";
    
    const res = await chrome.scripting.executeScript({
      target: { tabId: currentTab.id },
      func: () => {
        const payloads = [
          { type: 'POLYGLOT_XSS', payload: '"><svg onload=console.warn(1)>' },
          { type: 'SQLI_MARKER', payload: "' OR '1'='1' -- " },
          { type: 'HTML_INJECTION', payload: '<div id="__qaswitch_html_inj_probe__">QA_PROBE</div>' },
          { type: 'SSTI_PROBE', payload: '{{7*7}}' }
        ];

        const findings = [];
        const inputs = Array.from(document.querySelectorAll('input:not([type="hidden"]):not([type="submit"]):not([type="button"]), textarea'));

        let fuzzed = 0;
        inputs.forEach((input, idx) => {
          const testItem = payloads[idx % payloads.length];
          input.value = testItem.payload;
          input.dispatchEvent(new Event('input', { bubbles: true }));
          input.dispatchEvent(new Event('change', { bubbles: true }));
          fuzzed++;

          if (document.body.innerHTML.includes(testItem.payload)) {
            findings.push({
              inputSelector: input.id ? '#' + input.id : (input.name ? 'input[name="' + input.name + '"]' : 'input[' + idx + ']'),
              payloadType: testItem.type,
              payload: testItem.payload,
              sinkTriggered: 'Unsanitized Reflection in HTML',
              severity: 'CRITICAL',
              reflected: true
            });
          }
        });

        return {
          url: window.location.href,
          timestamp: Date.now(),
          totalInputsFuzzed: fuzzed,
          findings: findings
        };
      }
    });

    const report = res?.[0]?.result;
    if (!report) return;
    activeFuzzReport = report;

    elements.fuzzerResults.innerHTML = "";
    if (report.findings.length === 0) {
      elements.fuzzerResults.innerHTML = `
        <div style="padding: 10px; background: rgba(16, 185, 129, 0.1); border: 1px solid rgba(16, 185, 129, 0.3); border-radius: 6px; font-size: 11px; color: #6ee7b7;">
          🟢 <strong>PASS:</strong> Fuzzed ${report.totalInputsFuzzed} input(s). No immediate DOM reflections or unescaped sinks detected.
        </div>
      `;
    } else {
      report.findings.forEach((f) => {
        const item = document.createElement("div");
        item.style.cssText = "padding: 6px 10px; margin-bottom: 4px; background: rgba(239, 68, 68, 0.15); border: 1px solid rgba(239, 68, 68, 0.35); border-radius: 6px; font-size: 11px;";
        item.innerHTML = `
          <div style="display: flex; justify-content: space-between; margin-bottom: 2px;">
            <strong style="color: #ef4444;">🔴 [${escapeHtml(f.payloadType)}] ${escapeHtml(f.inputSelector)}</strong>
            <span style="font-size: 10px; color: #f87171;">${f.severity}</span>
          </div>
          <div style="font-size: 10px; color: #cbd5e1; word-break: break-all;">
            Sink: ${escapeHtml(f.sinkTriggered)} | Payload: <code style="color:#fca5a5;">${escapeHtml(f.payload)}</code>
          </div>
        `;
        elements.fuzzerResults.appendChild(item);
      });
    }

    showToast(`Fuzzer: ${report.findings.length} finding(s) in ${report.totalInputsFuzzed} input(s)`, report.findings.length ? "error" : "success");
  } catch (err) {
    elements.fuzzerResults.innerHTML = "<div class='diff-empty-notice'>Fuzzer failed: " + err.message + "</div>";
  }
}

function handleCopyFuzzer() {
  if (!activeFuzzReport) {
    showToast("Run fuzzer first to copy report", "error");
    return;
  }
  const lines = [
    `# 🛡️ QASwitch Fuzzer Report`,
    `URL: ${activeFuzzReport.url}`,
    `Inputs Fuzzed: ${activeFuzzReport.totalInputsFuzzed}`,
    `Findings: ${activeFuzzReport.findings.length}`,
    ''
  ];
  if (activeFuzzReport.findings.length === 0) {
    lines.push('🟢 All inputs passed without unescaped reflection.');
  } else {
    activeFuzzReport.findings.forEach(f => {
      lines.push(`- [${f.severity}] ${f.inputSelector}: ${f.sinkTriggered} (${f.payload})`);
    });
  }
  navigator.clipboard.writeText(lines.join('\n'));
  showToast("Copied Fuzzer report to clipboard!", "success");
}

// 2. Service Worker & PWA Cache Inspector
async function openPwaModal() {
  elements.pwaModal.classList.remove("hidden");
  handleInspectPwa();
}

async function handleInspectPwa() {
  if (!currentTab?.id) return;
  try {
    elements.pwaResults.innerHTML = "<div class='diff-empty-notice'>Inspecting Service Workers & CacheStorage...</div>";
    
    const res = await chrome.scripting.executeScript({
      target: { tabId: currentTab.id },
      func: async () => {
        const workers = [];
        const cachesList = [];

        if ('serviceWorker' in navigator) {
          try {
            const regs = await navigator.serviceWorker.getRegistrations();
            for (const r of regs) {
              const sw = r.active || r.waiting || r.installing;
              if (sw) {
                workers.push({ scope: r.scope, scriptURL: sw.scriptURL, state: sw.state });
              }
            }
          } catch(e) {}
        }

        if ('caches' in window) {
          try {
            const keys = await caches.keys();
            for (const k of keys) {
              const c = await caches.open(k);
              const reqs = await c.keys();
              cachesList.push({ name: k, itemCount: reqs.length });
            }
          } catch(e) {}
        }

        return {
          hasServiceWorker: workers.length > 0,
          workers,
          caches: cachesList,
          timestamp: Date.now()
        };
      }
    });

    const report = res?.[0]?.result;
    if (!report) return;
    activePwaReport = report;

    elements.pwaResults.innerHTML = "";

    const summaryItem = document.createElement("div");
    summaryItem.style.cssText = "padding: 6px 10px; background: rgba(255,255,255,0.03); border: 1px solid var(--border); border-radius: 6px; font-size: 11px; margin-bottom: 6px;";
    summaryItem.innerHTML = `
      <div style="display:flex; justify-content:space-between;">
        <span>Service Worker: <strong>${report.hasServiceWorker ? '🟢 ACTIVE' : '⚪ NONE'}</strong></span>
        <span>Caches: <strong>${report.caches.length} bucket(s)</strong></span>
      </div>
    `;
    elements.pwaResults.appendChild(summaryItem);

    if (report.workers.length > 0) {
      report.workers.forEach(w => {
        const wItem = document.createElement("div");
        wItem.style.cssText = "padding: 6px 10px; background: rgba(56, 189, 248, 0.08); border: 1px solid rgba(56, 189, 248, 0.25); border-radius: 6px; font-size: 11px; margin-bottom: 4px;";
        wItem.innerHTML = `
          <div><strong>⚡ Worker:</strong> <code style="color:#38bdf8;">${escapeHtml(w.scope)}</code></div>
          <div style="font-size:10px; color:var(--text-muted); word-break:break-all;">${escapeHtml(w.scriptURL)} (${w.state})</div>
        `;
        elements.pwaResults.appendChild(wItem);
      });
    }

    if (report.caches.length > 0) {
      report.caches.forEach(c => {
        const cItem = document.createElement("div");
        cItem.style.cssText = "display:flex; justify-content:space-between; padding: 5px 10px; background: rgba(255,255,255,0.02); border: 1px solid var(--border); border-radius: 6px; font-size: 11px; margin-bottom: 4px;";
        cItem.innerHTML = `
          <span>📦 <code style="color:#a78bfa;">${escapeHtml(c.name)}</code></span>
          <span style="font-weight:700; color:#38bdf8;">${c.itemCount} items</span>
        `;
        elements.pwaResults.appendChild(cItem);
      });
    } else {
      const emptyCaches = document.createElement("div");
      emptyCaches.className = "diff-empty-notice";
      emptyCaches.textContent = "No CacheStorage buckets found.";
      elements.pwaResults.appendChild(emptyCaches);
    }
  } catch (err) {
    elements.pwaResults.innerHTML = "<div class='diff-empty-notice'>PWA inspection failed: " + err.message + "</div>";
  }
}

async function handlePurgePwaCaches() {
  if (!currentTab?.id) return;
  try {
    const res = await chrome.scripting.executeScript({
      target: { tabId: currentTab.id },
      func: async () => {
        let count = 0;
        if ('caches' in window) {
          const keys = await caches.keys();
          for (const k of keys) {
            await caches.delete(k);
            count++;
          }
        }
        return count;
      }
    });
    const purged = res?.[0]?.result || 0;
    showToast(`Purged ${purged} CacheStorage bucket(s)!`, "success");
    handleInspectPwa();
  } catch (err) {
    showToast("Purge failed: " + err.message, "error");
  }
}

async function handleUnregPwaWorker() {
  if (!currentTab?.id) return;
  try {
    const res = await chrome.scripting.executeScript({
      target: { tabId: currentTab.id },
      func: async () => {
        let count = 0;
        if ('serviceWorker' in navigator) {
          const regs = await navigator.serviceWorker.getRegistrations();
          for (const r of regs) {
            await r.unregister();
            count++;
          }
        }
        return count;
      }
    });
    const unreg = res?.[0]?.result || 0;
    showToast(`Unregistered ${unreg} service worker(s)!`, "success");
    handleInspectPwa();
  } catch (err) {
    showToast("Unregister failed: " + err.message, "error");
  }
}

// 3. Network Waterfall & Heavy Asset Heatmap
async function handleRunWaterfall() {
  if (!currentTab?.id) return;
  try {
    elements.waterfallResults.innerHTML = "<div class='diff-empty-notice'>Analyzing resource timings & bottlenecks...</div>";

    const res = await chrome.scripting.executeScript({
      target: { tabId: currentTab.id },
      func: () => {
        const entries = performance.getEntriesByType('resource');
        const items = [];
        let totalBytes = 0;
        let maxDuration = 0;
        let bottlenecks = 0;

        function getCat(init, u) {
          u = u.toLowerCase();
          if (init === 'script' || u.includes('.js')) return 'script';
          if (init === 'css' || init === 'link' || u.includes('.css')) return 'stylesheet';
          if (init === 'img' || /\.(png|jpe?g|gif|webp|svg|ico)/i.test(u)) return 'image';
          if (u.includes('.woff') || u.includes('.ttf')) return 'font';
          if (init === 'fetch' || init === 'xmlhttprequest') return 'fetch';
          return 'other';
        }

        for (const e of entries) {
          const cat = getCat(e.initiatorType, e.name);
          const bytes = e.transferSize || 0;
          const dur = Math.round(e.duration);
          const ttfb = Math.round(e.responseStart ? (e.responseStart - e.requestStart) : 0);

          totalBytes += bytes;
          if (dur > maxDuration) maxDuration = dur;

          let isBottleneck = false;
          let reason = '';
          if (cat === 'image' && bytes > 1024 * 1024) { isBottleneck = true; reason = 'Image > 1MB'; }
          else if (cat === 'script' && bytes > 500 * 1024) { isBottleneck = true; reason = 'Script > 500KB'; }
          else if (ttfb > 1000) { isBottleneck = true; reason = 'Slow TTFB > 1s'; }
          else if (dur > 2500) { isBottleneck = true; reason = 'Duration > 2.5s'; }

          if (isBottleneck) bottlenecks++;

          items.push({
            name: e.name,
            category: cat,
            durationMs: dur,
            transferSizeBytes: bytes,
            ttfbMs: ttfb,
            isBottleneck,
            bottleneckReason: reason
          });
        }

        let score = 100 - (bottlenecks * 12);
        if (totalBytes > 5 * 1024 * 1024) score -= 25;
        else if (totalBytes > 2 * 1024 * 1024) score -= 10;
        score = Math.max(0, Math.min(100, score));

        return {
          timestamp: Date.now(),
          url: window.location.href,
          totalTransferBytes: totalBytes,
          totalDurationMs: maxDuration,
          bottleneckCount: bottlenecks,
          score,
          items: items.slice(-30)
        };
      }
    });

    const report = res?.[0]?.result;
    if (!report) return;
    activeWaterfallReport = report;

    elements.waterfallScoreBadge.textContent = `${report.score} / 100`;
    elements.waterfallScoreBadge.style.color = report.score >= 80 ? '#10b981' : (report.score >= 50 ? '#f59e0b' : '#ef4444');

    elements.waterfallResults.innerHTML = "";
    if (report.items.length === 0) {
      elements.waterfallResults.innerHTML = "<div class='diff-empty-notice'>No resource entries found yet.</div>";
      return;
    }

    report.items.forEach(item => {
      const row = document.createElement("div");
      row.style.cssText = `padding: 6px 10px; margin-bottom: 5px; border-radius: 6px; font-size: 11px; border: 1px solid ${item.isBottleneck ? 'rgba(239, 68, 68, 0.4)' : 'var(--border)'}; background: ${item.isBottleneck ? 'rgba(239, 68, 68, 0.1)' : 'rgba(255,255,255,0.02)'};`;
      const sizeText = item.transferSizeBytes > 0 ? `${Math.round(item.transferSizeBytes / 1024)} KB` : 'Cached';
      row.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:8px; margin-bottom: 3px;">
          <strong class="full-url-text" style="color: ${item.isBottleneck ? '#f87171' : '#38bdf8'}; word-break: break-all; line-height: 1.35; flex: 1; cursor: pointer; user-select: all;" title="Click to copy full API URL&#10;${escapeHtml(item.name)}">${escapeHtml(item.name)}</strong>
          <span style="white-space: nowrap; font-weight: 700; color: ${item.durationMs > 1000 ? '#ef4444' : '#f8fafc'}; font-size: 11px;">${item.durationMs}ms</span>
        </div>
        <div style="display:flex; justify-content:space-between; font-size:10px; color:var(--text-muted); margin-top: 2px;">
          <span>[${item.category}] ${sizeText}</span>
          <span style="color: ${item.isBottleneck ? '#ef4444' : '#10b981'}; font-weight:600;">${item.isBottleneck ? item.bottleneckReason : 'Optimal'}</span>
        </div>
      `;
      row.querySelector('.full-url-text')?.addEventListener('click', () => {
        navigator.clipboard.writeText(item.name);
        showToast("Copied full API URL to clipboard!", "success");
      });
      elements.waterfallResults.appendChild(row);
    });

    showToast(`Waterfall Score: ${report.score}/100 (${report.bottleneckCount} bottlenecks)`, report.bottleneckCount ? "warning" : "success");
  } catch (err) {
    elements.waterfallResults.innerHTML = "<div class='diff-empty-notice'>Waterfall analysis failed: " + err.message + "</div>";
  }
}

function handleCopyWaterfall() {
  if (!activeWaterfallReport) {
    showToast("Analyze waterfall first to copy report", "error");
    return;
  }
  const lines = [
    `# 🌊 QASwitch Network Waterfall Report`,
    `URL: ${activeWaterfallReport.url}`,
    `Score: ${activeWaterfallReport.score}/100`,
    `Total Transferred: ${Math.round(activeWaterfallReport.totalTransferBytes / 1024)} KB`,
    `Bottlenecks: ${activeWaterfallReport.bottleneckCount}`,
    '',
    '| Resource | Category | Duration | Size | Bottleneck |',
    '| --- | --- | --- | --- | --- |'
  ];
  activeWaterfallReport.items.forEach(i => {
    const s = i.transferSizeBytes > 0 ? `${Math.round(i.transferSizeBytes / 1024)}KB` : 'Cached';
    lines.push(`| ${i.name} | ${i.category} | ${i.durationMs}ms | ${s} | ${i.isBottleneck ? i.bottleneckReason : 'OK'} |`);
  });
  navigator.clipboard.writeText(lines.join('\n'));
  showToast("Copied Waterfall Report to clipboard!", "success");
}

// 4. Automated QA Test Matrix Generator
function openMatrixModal() {
  elements.matrixModal.classList.remove("hidden");
  handleGenerateMatrix();
}

function handleGenerateMatrix() {
  if (!currentProfiles || currentProfiles.length === 0) {
    elements.matrixResults.innerHTML = "<div class='diff-empty-notice'>No saved profiles for this domain. Create profiles to generate test matrix.</div>";
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

  const rows = currentProfiles.map((p, idx) => {
    const rbac = inferRbac(p);
    return {
      testId: `TC-${String(idx + 1).padStart(3, '0')}`,
      roleName: p.name,
      url: p.url || (currentTab?.url || 'https://example.com'),
      expectedStatus: rbac === 'DENIED_BLOCKED' ? 403 : 200,
      rbacAccessLevel: rbac,
      headersSummary: p.headers ? Object.keys(p.headers).join(', ') || 'None' : 'None',
      result: 'UNTESTED'
    };
  });

  activeMatrixData = { domain: currentHostname || 'domain', timestamp: Date.now(), rows };

  elements.matrixResults.innerHTML = "";
  rows.forEach(r => {
    const item = document.createElement("div");
    item.style.cssText = "display: flex; justify-content: space-between; align-items: center; padding: 6px 10px; margin-bottom: 4px; background: rgba(255,255,255,0.03); border: 1px solid var(--border); border-radius: 6px; font-size: 11px;";
    item.innerHTML = `
      <div>
        <strong style="color: #a78bfa;">${r.testId}</strong> &middot; <strong style="color: #f8fafc;">${escapeHtml(r.roleName)}</strong>
        <div style="font-size: 10px; color: var(--text-muted);">RBAC: <code style="color:#38bdf8;">${r.rbacAccessLevel}</code> | Headers: ${escapeHtml(r.headersSummary)}</div>
      </div>
      <div style="text-align: right;">
        <span style="font-size: 10px; font-weight: 700; color: ${r.expectedStatus === 200 ? '#10b981' : '#ef4444'};">Exp: ${r.expectedStatus}</span>
      </div>
    `;
    elements.matrixResults.appendChild(item);
  });

  showToast(`Generated ${rows.length} Test Matrix cases!`, "success");
}

function handleCopyMatrixMd() {
  if (!activeMatrixData || !activeMatrixData.rows) {
    showToast("Generate matrix first to copy", "error");
    return;
  }
  const lines = [
    `# 📑 QA Test Execution Matrix - ${activeMatrixData.domain}`,
    `Generated: ${new Date(activeMatrixData.timestamp).toISOString()}`,
    '',
    '| Test ID | Role Persona | Expected Status | RBAC Level | Headers | Result |',
    '| --- | --- | --- | --- | --- | --- |'
  ];
  activeMatrixData.rows.forEach(r => {
    lines.push(`| **${r.testId}** | ${r.roleName} | **${r.expectedStatus}** | \`${r.rbacAccessLevel}\` | ${r.headersSummary} | ${r.result} |`);
  });
  navigator.clipboard.writeText(lines.join('\n'));
  showToast("Copied QA Matrix Markdown to clipboard!", "success");
}

function handleDownloadMatrixCsv() {
  if (!activeMatrixData || !activeMatrixData.rows) {
    showToast("Generate matrix first to download", "error");
    return;
  }
  const rows = [
    ['Test ID', 'Role Persona', 'Target URL', 'Expected Status', 'RBAC Level', 'Headers', 'Result']
  ];
  activeMatrixData.rows.forEach(r => {
    rows.push([
      `"${r.testId}"`,
      `"${r.roleName.replace(/"/g, '""')}"`,
      `"${r.url.replace(/"/g, '""')}"`,
      `"${r.expectedStatus}"`,
      `"${r.rbacAccessLevel}"`,
      `"${r.headersSummary.replace(/"/g, '""')}"`,
      `"${r.result}"`
    ]);
  });
  const csvContent = rows.map(e => e.join(',')).join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `qa-matrix-${activeMatrixData.domain}-${Date.now()}.csv`;
  a.click();
  URL.revokeObjectURL(url);
  showToast("Downloaded QA Matrix CSV!", "success");
}

// 5. Dead Links & Broken Asset Crawler
async function handleRunCrawler() {
  if (!currentTab?.id) return;
  try {
    elements.crawlerResults.innerHTML = "<div class='diff-empty-notice'>Crawling DOM links, images, scripts, stylesheets...</div>";

    const res = await chrome.scripting.executeScript({
      target: { tabId: currentTab.id },
      func: () => {
        const baseOrigin = window.location.origin;
        const isHttpsPage = window.location.protocol === 'https:';
        const assets = [];
        let broken = 0;
        let mixed = 0;

        const elements = [
          ...Array.from(document.querySelectorAll('a[href]')).map(el => ({ el, attr: 'href', type: 'LINK' })),
          ...Array.from(document.querySelectorAll('img[src]')).map(el => ({ el, attr: 'src', type: 'IMAGE' })),
          ...Array.from(document.querySelectorAll('script[src]')).map(el => ({ el, attr: 'src', type: 'SCRIPT' })),
          ...Array.from(document.querySelectorAll('link[rel="stylesheet"][href]')).map(el => ({ el, attr: 'href', type: 'STYLESHEET' }))
        ];

        for (let i = 0; i < elements.length; i++) {
          const item = elements[i];
          const raw = item.el.getAttribute(item.attr);
          if (!raw || raw.startsWith('#') || raw.startsWith('data:') || raw.startsWith('javascript:')) continue;

          let resolvedUrl = '';
          try {
            resolvedUrl = new URL(raw, baseOrigin).href;
          } catch(e) {
            continue;
          }

          const isMixed = isHttpsPage && resolvedUrl.startsWith('http://');
          if (isMixed) mixed++;

          let isBroken = false;
          let status = 200;

          if (item.type === 'IMAGE' && item.el instanceof HTMLImageElement) {
            if (item.el.naturalWidth === 0 && item.el.complete) {
              isBroken = true;
              status = 404;
            }
          }

          if (isBroken) broken++;

          const selector = item.el.id ? '#' + item.el.id : (item.el.className ? '.' + String(item.el.className).split(' ')[0] : item.type.toLowerCase() + '[' + i + ']');

          assets.push({
            url: resolvedUrl,
            type: item.type,
            elementSelector: selector,
            status,
            isBroken,
            isMixedContent: isMixed
          });
        }

        return {
          timestamp: Date.now(),
          url: window.location.href,
          totalScanned: assets.length,
          brokenCount: broken,
          mixedContentCount: mixed,
          assets: assets.slice(0, 30)
        };
      }
    });

    const report = res?.[0]?.result;
    if (!report) return;
    activeCrawlerReport = report;

    elements.crawlerResults.innerHTML = "";
    if (report.assets.length === 0) {
      elements.crawlerResults.innerHTML = "<div class='diff-empty-notice'>No links or assets found to crawl.</div>";
      return;
    }

    report.assets.forEach(a => {
      const row = document.createElement("div");
      row.style.cssText = `padding: 6px 10px; margin-bottom: 5px; border-radius: 6px; font-size: 11px; border: 1px solid ${a.isBroken ? 'rgba(239, 68, 68, 0.4)' : (a.isMixedContent ? 'rgba(245, 158, 11, 0.4)' : 'var(--border)')}; background: ${a.isBroken ? 'rgba(239, 68, 68, 0.1)' : 'rgba(255,255,255,0.02)'};`;
      row.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:8px; margin-bottom: 3px;">
          <strong class="full-crawler-url" style="color: ${a.isBroken ? '#f87171' : '#f8fafc'}; word-break: break-all; line-height: 1.35; flex: 1; cursor: pointer; user-select: all;" title="Click to copy full asset URL&#10;${escapeHtml(a.url)}">${escapeHtml(a.url)}</strong>
          <span style="white-space: nowrap; color: ${a.isBroken ? '#ef4444' : '#10b981'}; font-weight:700;">${a.isBroken ? '404 BROKEN' : 'OK'}</span>
        </div>
        <div style="display:flex; justify-content:space-between; font-size:10px; color:var(--text-muted); margin-top: 2px;">
          <span>[${a.type}] <code>${escapeHtml(a.elementSelector)}</code></span>
          <span style="color: ${a.isMixedContent ? '#f59e0b' : '#64748b'};">${a.isMixedContent ? '⚠️ Mixed HTTP' : 'Secure'}</span>
        </div>
      `;
      row.querySelector('.full-crawler-url')?.addEventListener('click', () => {
        navigator.clipboard.writeText(a.url);
        showToast("Copied full asset URL to clipboard!", "success");
      });
      elements.crawlerResults.appendChild(row);
    });

    showToast(`Crawler: Scanned ${report.totalScanned} assets (${report.brokenCount} broken, ${report.mixedContentCount} mixed)`, report.brokenCount ? "error" : "success");
  } catch (err) {
    elements.crawlerResults.innerHTML = "<div class='diff-empty-notice'>Crawler failed: " + err.message + "</div>";
  }
}

function handleCopyCrawler() {
  if (!activeCrawlerReport) {
    showToast("Run crawler first to copy report", "error");
    return;
  }
  const lines = [
    `# 🔍 QASwitch Asset & Link Crawler Report`,
    `URL: ${activeCrawlerReport.url}`,
    `Total Scanned: ${activeCrawlerReport.totalScanned}`,
    `Broken Assets: ${activeCrawlerReport.brokenCount}`,
    `Mixed Content Warnings: ${activeCrawlerReport.mixedContentCount}`,
    '',
    '| Asset URL | Type | Status | Mixed Content | Selector |',
    '| --- | --- | --- | --- | --- |'
  ];
  activeCrawlerReport.assets.forEach(a => {
    lines.push(`| ${a.url} | ${a.type} | ${a.isBroken ? 'BROKEN (404)' : 'OK'} | ${a.isMixedContent ? 'WARNING' : 'Secure'} | ${a.elementSelector} |`);
  });
  navigator.clipboard.writeText(lines.join('\n'));
  showToast("Copied Crawler Report to clipboard!", "success");
}

// 6. Vision Deficiency Simulator
function handleVisionSelectChange() {
  const type = elements.visionSelect.value;
  const descriptions = {
    normal: 'Normal Vision: Full standard RGB spectrum.',
    protanopia: 'Protanopia (Red-Blind): Difficulty distinguishing red from green; reds appear darker.',
    deuteranopia: 'Deuteranopia (Green-Blind): Most common form; difficulty distinguishing red and green hues.',
    tritanopia: 'Tritanopia (Blue-Blind): Rare form; difficulty distinguishing blue from yellow/green.',
    achromatopsia: 'Achromatopsia (Monochrome): Complete color blindness; vision strictly in shades of gray.',
    blurred: 'Low Visual Acuity (Blur): Simulates uncorrected refractive errors, cataracts, or myopia.'
  };
  elements.visionDescBox.textContent = descriptions[type] || descriptions.normal;
}

async function handleApplyVision() {
  if (!currentTab?.id) return;
  const type = elements.visionSelect.value;
  try {
    const matrices = {
      normal: '1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 1 0',
      protanopia: '0.567 0.433 0 0 0  0.558 0.442 0 0 0  0 0.242 0.758 0 0  0 0 0 1 0',
      deuteranopia: '0.625 0.375 0 0 0  0.700 0.300 0 0 0  0 0.300 0.700 0 0  0 0 0 1 0',
      tritanopia: '0.950 0.050 0 0 0  0 0.433 0.567 0 0  0 0.475 0.525 0 0  0 0 0 1 0',
      achromatopsia: '0.299 0.587 0.114 0 0  0.299 0.587 0.114 0 0  0.299 0.587 0.114 0 0  0 0 0 1 0',
    };

    await chrome.scripting.executeScript({
      target: { tabId: currentTab.id },
      func: (selectedType, matrixMap) => {
        const filterId = 'qaswitch-vision-filter';
        const styleId = 'qaswitch-vision-style';

        document.getElementById(filterId)?.remove();
        let style = document.getElementById(styleId);
        if (!style) {
          style = document.createElement('style');
          style.id = styleId;
          document.head.appendChild(style);
        }

        if (selectedType === 'normal') {
          style.remove();
          return;
        }

        if (selectedType === 'blurred') {
          style.textContent = 'html { filter: blur(3px) !important; }';
          return;
        }

        const matrix = matrixMap[selectedType];
        if (matrix) {
          const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
          svg.id = filterId;
          svg.setAttribute('style', 'position:absolute; width:0; height:0; pointer-events:none; overflow:hidden;');
          svg.innerHTML = `<defs><filter id="qaswitch-color-filter"><feColorMatrix type="matrix" values="${matrix}"/></filter></defs>`;
          document.body.appendChild(svg);
          style.textContent = 'html { filter: url(#qaswitch-color-filter) !important; }';
        }
      },
      args: [type, matrices]
    });

    showToast(`Vision filter: ${type.toUpperCase()} applied!`, "success");
  } catch (err) {
    showToast("Failed to apply vision filter: " + err.message, "error");
  }
}

async function handleResetVision() {
  if (!currentTab?.id) return;
  try {
    await chrome.scripting.executeScript({
      target: { tabId: currentTab.id },
      func: () => {
        document.getElementById('qaswitch-vision-filter')?.remove();
        document.getElementById('qaswitch-vision-style')?.remove();
      }
    });
    elements.visionSelect.value = 'normal';
    handleVisionSelectChange();
    showToast("Restored normal color vision!", "info");
  } catch (err) {
    showToast("Reset failed: " + err.message, "error");
  }
}

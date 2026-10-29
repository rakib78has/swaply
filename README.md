# Swaply - Chrome Extension (Manifest V3 - Principal SDET Edition v2.5.0)

> **Role & Purpose:** Swaply is a principal-grade Chrome Extension (Manifest V3) targeted at QA engineers, SDETs, and web developers to save, switch, inspect, and export authenticated sessions, user roles, security audits, and performance profiles without logging out.

---

## ⚡ What's New in v2.5.0 (Principal SDET & Enterprise Security Suite)

1. **🛡️ In-Page XSS & Input Injection Fuzzer (`src/core/xssFuzzerEngine.ts`)**:
   - Injects OWASP standard polyglots, SQLi markers, SSTI probes, and HTML injection markers into active page inputs.
   - Overrides `Element.prototype.innerHTML` descriptor setter to trap unescaped DOM sinks synchronously in-page.
   - Formats comprehensive markdown audit tables with input selectors and severity levels.
2. **📦 Service Worker & PWA Cache Inspector (`src/core/serviceWorkerEngine.ts`)**:
   - Inspects registered Service Workers (`navigator.serviceWorker.getRegistrations()`), script URLs, and lifecycle states (`installing`, `waiting`, `active`, `redundant`).
   - Audits `CacheStorage` buckets (`caches.keys()`) with entry counts, 1-click bucket purge, and worker unregistration.
3. **🌊 Network Waterfall & Heavy Asset Heatmap (`src/core/waterfallProfiler.ts`)**:
   - Analyzes Resource Timing entries (`performance.getEntriesByType('resource')`) and categorizes assets into Script, Stylesheet, Image, Font, Fetch.
   - Flags performance bottlenecks: heavy uncompressed images (>1MB), oversized JS bundles (>500KB), slow TTFB (>1000ms), and high latency (>2500ms).
   - Computes weighted performance scores (0-100) and formats markdown audit tables.
4. **📑 Automated QA Test Matrix & Step Generator (`src/core/qaMatrixGenerator.ts`)**:
   - Transforms saved domain profiles and roles into complete execution matrices with inferred RBAC access levels (`SUPER_ADMIN`, `ADMIN_ACCESS`, `VIP_PREMIUM`, `DENIED_BLOCKED`, `STANDARD_USER`).
   - Exports formatted Markdown execution matrices and downloadable CSV files (`.csv`).
5. **🔍 Dead Links & Broken Asset Crawler (`src/core/assetCrawlerEngine.ts`)**:
   - Scans DOM `<a>`, `<img>`, `<script>`, `<link>` elements to detect broken assets (404 / `img.naturalWidth === 0 && complete`).
   - Detects insecure HTTP mixed content loaded on HTTPS origins with element selector tracking.
6. **👁️ Vision Deficiency & Color Blindness Simulator (`src/core/colorBlindnessEngine.ts`)**:
   - Injects pure SVG `<feColorMatrix>` filters and CSS rules into `<html style="filter: ...">` to simulate Protanopia (red-blind), Deuteranopia (green-blind), Tritanopia (blue-blind), Achromatopsia (monochrome), and Low Visual Acuity (Blur).
   - Zero runtime dependencies, instant rendering without page reloads.

---

## ⚡ Existing Capabilities (v2.4.0 & Baseline)

7. **🎭 AI Smart Form Filler & Realistic Seed Data Generator (`src/core/formFakerEngine.ts`)**
8. **👻 Pixel-Perfect Figma Overlay & Ghost Mode (`src/core/pixelDiffEngine.ts`)**
9. **🔄 Real-Time Multi-Tab Action Synchronizer (`src/core/tabSyncEngine.ts`)**
10. **⚡ Core Web Vitals & Performance Budget Profiler (`src/core/webVitalsEngine.ts`)**
11. **🔀 Dynamic URL & Microservice Gateway Rewrite Studio (`src/core/urlRewriteEngine.ts`)**
12. **⏳ DOM Storage & Cookie State Time Machine (`src/core/storageTimeMachine.ts`)**
13. **🕸️ GraphQL Operation Spy & Mocking Studio (`src/core/graphqlEngine.ts`)**
14. **⚡ WebSocket & SSE Live Frame Inspector + Mock Injector (`src/core/websocketEngine.ts`)**
15. **🪟 Multi-Role Split-Screen Dual Role Runner (`src/core/splitScreenEngine.ts`)**
16. **🎨 CSS Media & a11y Preferences Spoofer (`src/core/cssMediaEngine.ts`)**
17. **♿ WCAG 2.2 Visual a11y Overlay & Contrast Heatmap (`src/core/a11yHeatmapEngine.ts`)**
18. **📁 Profile Folders, Tags & Workspace Collections (`src/core/folderManager.ts`)**
19. **🔑 Built-in 2FA / TOTP Authenticator & Auto-Fill (`src/core/totpEngine.ts`)**
20. **🚩 Feature Flags & A/B Experiment Overrides (`src/core/featureFlagEngine.ts`)**
21. **🌍 Role-Linked Geo-Location & Timezone Spoofer (`src/core/geoSpoofEngine.ts`)**
22. **🐒 Chaos Engineering & Flaky Network Simulator (`src/core/chaosEngine.ts`)**
23. **🛡️ GDPR & PII Data Masker / Privacy Scrubber (`src/core/piiScrubber.ts`)**
24. **🛡️ DevSecOps DAST Scanner (`src/core/dastScanner.ts`)**
25. **🎙️ Blackbox Flight Recorder (`src/core/flightRecorder.ts`)**
26. **📊 HAR (HTTP Archive) Session Traffic Recorder (`src/core/harRecorder.ts`)**
27. **🎬 Action Recorder to Playwright Spec Generator (`src/core/playwrightRecorder.ts`)**
28. **📱 Role-Linked Device & Viewport Emulator (`src/core/viewportEmulator.ts`)**
29. **🤖 AI Test Persona Synthesizer (`src/core/roleSynthesizer.ts`)**
30. **⚡ Role-Linked Network Throttler (`src/core/networkThrottler.ts`)**
31. **🔀 Multi-Tab Container Mode (`src/core/tabContainerEngine.ts`)**
32. **🛡️ OWASP Cookie & Session Security Auditor (`src/core/securityAuditor.ts`)**
33. **🧪 Automated Test Suite Exporters (`src/core/testSuiteExporter.ts`)**
34. **👁️ In-Page Visual Role Watermark & Colored Border (`src/core/watermarkEngine.ts`)**
35. **⏱️ Session Rollback ("Undo Switch") & Time Machine (`src/core/sessionRollback.ts`)**
36. **🌐 Declarative Net Request HTTP Header Engine (`src/core/headerRuleEngine.ts`)**
37. **🔐 AES-GCM 256-bit Encrypted Session Sharing (`src/core/cryptoUtils.ts`)**
38. **🔍 Role Diff Inspector (`src/core/sessionDiff.ts`)**
39. **🌐 Cross-Environment Domain Cloning (`src/core/domainCloner.ts`)**
40. **⌨️ Global Keyboard Shortcuts**: `Alt+Shift+Q`, `Alt+Shift+X`, `Alt+Shift+W`.

---

## 🧪 Comprehensive Testing & Quality Assurance

### 1. Zero-Dependency Unit & Regression Suite (213 Tests / 54 Suites)

Runs natively in Node.js 20, 22, and 24 in `<600ms`:

```bash
npm test
# 213 tests passing across 54 suites in ~580ms
```

### 2. Chrome Web Store Packaging

```bash
npm run package
# Produces: C:\Users\USER\AppData\Local\Temp\swaply-v2.5.0.zip
```

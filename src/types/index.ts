/**
 * Core type definitions for QASwitch (Enterprise v1.6.0)
 */

export interface SessionCookie {
  name: string;
  value: string;
  domain: string;
  hostOnly?: boolean;
  path: string;
  secure?: boolean;
  httpOnly?: boolean;
  sameSite?: "no_restriction" | "lax" | "strict" | "unspecified";
  session?: boolean;
  expirationDate?: number;
  storeId?: string;
}

export interface DOMStorageSnapshot {
  local: Record<string, string>;
  session: Record<string, string>;
}

export interface ProfileRecord {
  id: string;
  name: string;
  createdAt: number;
  domain: string;
  url: string;
  cookies: SessionCookie[];
  storage: DOMStorageSnapshot;
  headers?: Record<string, string>; // Custom HTTP Request Headers (e.g. Authorization, X-Role)
  ttlMinutes?: number | null;
  expiresAt?: number | null;
  colorTheme?: "red" | "blue" | "purple" | "green" | "amber" | "slate";
  networkProfile?: NetworkProfileId;
  syntheticTemplateId?: string;
  macro?: ProfileMacro;
  folder?: string; // Folder ID or name
  tags?: string[]; // Tag pills e.g. ["#admin", "#staging"]
  graphqlMocks?: GraphQLMockRule[];
  cssPreferences?: CssPreferenceOverrides;
}

export interface PlaywrightCookie {
  name: string;
  value: string;
  domain: string;
  path: string;
  expires: number;
  httpOnly: boolean;
  secure: boolean;
  sameSite: "Lax" | "Strict" | "None";
}

export interface PlaywrightStorageOrigin {
  origin: string;
  localStorage: Array<{ name: string; value: string }>;
}

export interface PlaywrightStorageState {
  cookies: PlaywrightCookie[];
  origins: PlaywrightStorageOrigin[];
}

export interface PostmanVariable {
  key: string;
  value: string;
  type?: string;
  enabled: boolean;
}

export interface PostmanEnvironment {
  id: string;
  name: string;
  values: PostmanVariable[];
  _postman_variable_scope: "environment";
}

export interface RollbackSnapshot {
  id: string;
  timestamp: number;
  domain: string;
  previousProfileName: string;
  cookies: SessionCookie[];
  storage: DOMStorageSnapshot;
}

export interface ExportPayload {
  version: string;
  exportedAt: string;
  domain: string;
  profiles: ProfileRecord[];
}

export interface CookieSetDetails {
  url: string;
  name: string;
  value: string;
  domain?: string;
  path: string;
  secure: boolean;
  httpOnly: boolean;
  sameSite?: "no_restriction" | "lax" | "strict";
  expirationDate?: number;
  storeId?: string;
}

export interface DNRHeaderAction {
  header: string;
  operation: "set" | "append" | "remove";
  value?: string;
}

export interface DynamicHeaderRule {
  id: number;
  priority: number;
  action: {
    type: "modifyHeaders";
    requestHeaders: DNRHeaderAction[];
  };
  condition: {
    urlFilter: string;
    resourceTypes: Array<"main_frame" | "sub_frame" | "xmlhttprequest">;
  };
}

export type SecuritySeverity = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" | "PASS";

export interface SecurityFinding {
  id: string;
  severity: SecuritySeverity;
  category: "COOKIE_HTTPONLY" | "COOKIE_SECURE" | "COOKIE_SAMESITE" | "COOKIE_DOMAIN" | "STORAGE_PLAINTEXT" | "JWT_VALIDITY";
  title: string;
  target: string;
  description: string;
  remediation: string;
}

export interface SecurityAuditReport {
  domain: string;
  timestamp: number;
  grade: "A+" | "A" | "B" | "C" | "F";
  score: number; // 0 - 100
  totalCookiesScanned: number;
  totalStorageKeysScanned: number;
  findings: SecurityFinding[];
  summary: {
    criticalCount: number;
    highCount: number;
    mediumCount: number;
    lowCount: number;
    passCount: number;
  };
}

export interface ApiMockRule {
  id: string;
  name: string;
  urlPattern: string;
  statusCode: number; // e.g. 500, 403, 429, 200
  mockResponseJson?: string;
  enabled: boolean;
}

export interface BugReportOptions {
  title: string;
  description?: string;
  domain: string;
  currentUrl: string;
  activeRoleName?: string;
  userAgent: string;
  timestamp?: number;
  cookiesCount: number;
  storageKeysCount: number;
  headers?: Record<string, string>;
  jwtSummary?: string;
  consoleErrors?: string[];
  screenshotDataUri?: string;
}

export type NetworkProfileId = "BROADBAND" | "FAST_4G" | "SLOW_3G" | "HIGH_LATENCY" | "OFFLINE";

export interface NetworkProfile {
  id: NetworkProfileId;
  name: string;
  latencyMs: number;
  downloadKbps: number;
  uploadKbps: number;
  offline: boolean;
  icon: string;
}

export interface PersonaTemplate {
  id: string;
  name: string;
  category: "ECOMMERCE" | "SAAS" | "SECURITY" | "FINTECH";
  roleName: string;
  description: string;
  colorTheme: "red" | "blue" | "purple" | "green" | "amber" | "slate";
  mockJwtClaims: Record<string, unknown>;
  cookies: Array<{ name: string; value: string; httpOnly?: boolean; secure?: boolean }>;
  localStorage: Record<string, string>;
  headers?: Record<string, string>;
}

export interface TabRoleBinding {
  tabId: number;
  domain: string;
  profileId: string;
  profileName: string;
  colorTheme: string;
  boundAt: number;
}

export interface ProfileMacro {
  autoNavigateUrl?: string;
  delayMs?: number;
  autoFillSelectors?: Record<string, string>;
  autoClickSelector?: string;
}

export interface WebhookConfig {
  url: string;
  channel?: string;
  platform: "slack" | "discord" | "generic";
  enabled: boolean;
}

export interface HeartbeatStatus {
  domain: string;
  lastChecked: number;
  isExpired: boolean;
  statusCode?: number;
  unauthorizedCount: number;
}

export interface TotpConfig {
  secret: string;
  issuer?: string;
  label?: string;
}

export interface FeatureFlagOverride {
  key: string;
  value: boolean | string | number;
  enabled: boolean;
}

export interface GeoLocationProfile {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  timezone: string;
  countryCode: string;
  currency: string;
}

export type ChaosMode = "DISABLED" | "PACKET_LOSS" | "RANDOM_500" | "HIGH_JITTER";

export interface ChaosConfig {
  mode: ChaosMode;
  ratePercent: number; // e.g. 10 to 100
  delayMs?: number;
}

export interface FlightRecorderEvent {
  timestamp: number;
  type: "LOG" | "ERROR" | "NETWORK" | "CLICK" | "NAV";
  message: string;
  details?: Record<string, unknown>;
}

export interface HarEntry {
  startedDateTime: string;
  time: number;
  request: {
    method: string;
    url: string;
    headers: Array<{ name: string; value: string }>;
  };
  response: {
    status: number;
    statusText: string;
    headers: Array<{ name: string; value: string }>;
    content: {
      size: number;
      mimeType: string;
      text?: string;
    };
  };
}

export interface RecordedAction {
  action: "click" | "fill" | "navigate" | "switch_role";
  selector?: string;
  value?: string;
  timestamp: number;
}

export interface DevicePreset {
  id: string;
  name: string;
  width: number;
  height: number;
  userAgent: string;
  isMobile: boolean;
  deviceScaleFactor: number;
}

export interface DastFinding {
  id: string;
  type: "SECRET_LEAK" | "CORS_MISCONFIG" | "CLICKJACKING" | "INSECURE_HEADER";
  severity: "HIGH" | "MEDIUM" | "LOW";
  description: string;
  target: string;
  remediation: string;
}

export interface DastReport {
  domain: string;
  scannedAt: number;
  findings: DastFinding[];
  score: number;
}

// -------------------------------------------------------------
// v2.3.0 Enterprise Capabilities
// -------------------------------------------------------------

export type GraphQLOperationType = "query" | "mutation" | "subscription" | "any";

export interface GraphQLMockRule {
  id: string;
  operationName: string;
  operationType?: GraphQLOperationType;
  variablesMatch?: Record<string, unknown>;
  mockData: Record<string, unknown>;
  statusCode?: number;
  enabled: boolean;
}

export interface GraphQLCapturedOperation {
  id: string;
  timestamp: number;
  operationName?: string;
  operationType: GraphQLOperationType;
  query?: string;
  variables?: Record<string, unknown>;
  response?: unknown;
  mocked: boolean;
}

export type WebSocketFrameDirection = "UP" | "DOWN";
export type WebSocketFrameType = "TEXT" | "BINARY" | "PING" | "PONG" | "CLOSE" | "SSE";

export interface WebSocketFrame {
  id: string;
  timestamp: number;
  direction: WebSocketFrameDirection;
  type: WebSocketFrameType;
  url: string;
  payload: string;
  size: number;
}

export interface WebSocketInjectRequest {
  urlPattern?: string;
  direction: "DOWN";
  payload: string;
}

export type SplitScreenOrientation = "side-by-side" | "stacked";

export interface SplitScreenConfig {
  leftProfileId: string;
  rightProfileId: string;
  orientation: SplitScreenOrientation;
  targetUrl: string;
  syncScroll?: boolean;
  syncNavigation?: boolean;
}

export type ColorSchemePref = "system" | "light" | "dark";
export type ReducedMotionPref = "system" | "reduce" | "no-preference";
export type ContrastPref = "system" | "more" | "less" | "no-preference";
export type ForcedColorsPref = "system" | "active" | "none";

export interface CssPreferenceOverrides {
  colorScheme?: ColorSchemePref;
  reducedMotion?: ReducedMotionPref;
  contrast?: ContrastPref;
  forcedColors?: ForcedColorsPref;
  enabled: boolean;
}

export type A11yRule =
  | "IMAGE_ALT"
  | "FORM_LABEL"
  | "CONTRAST_RATIO"
  | "BUTTON_NAME"
  | "ARIA_VALIDITY"
  | "HEADING_HIERARCHY";

export type A11yImpact = "CRITICAL" | "SERIOUS" | "MODERATE" | "MINOR";

export interface A11yViolation {
  id: string;
  rule: A11yRule;
  impact: A11yImpact;
  selector: string;
  message: string;
  wcagCriteria: string;
  elementSnippet?: string;
  contrastRatio?: number;
  requiredRatio?: number;
}

export interface A11yAuditSummary {
  timestamp: number;
  url: string;
  violations: A11yViolation[];
  score: number; // 0 - 100
  criticalCount: number;
  seriousCount: number;
  moderateCount: number;
  minorCount: number;
}

export interface ProfileFolder {
  id: string;
  name: string;
  color?: string;
  description?: string;
  icon?: string;
  createdAt: number;
}

// -------------------------------------------------------------
// v2.4.0 Next-Gen Capabilities
// -------------------------------------------------------------

export type FakerFieldType =
  | "name"
  | "email"
  | "phone"
  | "creditCard"
  | "address"
  | "company"
  | "uuid"
  | "password"
  | "date"
  | "number"
  | "text";

export interface FakerGeneratedData {
  field: FakerFieldType;
  value: string;
}

export type PixelDiffBlendMode = "normal" | "difference" | "overlay" | "multiply";

export interface PixelDiffConfig {
  imageUrl: string;
  opacity: number; // 0 to 1
  blendMode: PixelDiffBlendMode;
  offsetX: number; // px nudge
  offsetY: number; // px nudge
  splitMode: boolean; // curtain slider
  splitPercent: number; // 0 to 100
  enabled: boolean;
}

export type TabSyncEventType = "SCROLL" | "INPUT" | "NAV";

export interface TabSyncMessage {
  type: TabSyncEventType;
  channel: string;
  senderTabId: number;
  timestamp: number;
  payload: Record<string, unknown>;
}

export interface TabSyncConfig {
  channel: string;
  syncScroll: boolean;
  syncInputs: boolean;
  syncNav: boolean;
  enabled: boolean;
}

export type MetricRating = "good" | "needs-improvement" | "poor";

export interface WebVitalMetric {
  name: "LCP" | "INP" | "CLS" | "FID" | "TTFB" | "FCP";
  value: number;
  unit: string;
  rating: MetricRating;
}

export interface PerformanceBudgetReport {
  timestamp: number;
  url: string;
  roleName?: string;
  score: number; // 0 to 100
  metrics: WebVitalMetric[];
  memoryHeapMB?: number;
}

export interface UrlRewriteRule {
  id: number;
  name: string;
  regexFilter: string;
  substitution: string;
  enabled: boolean;
}

export type StorageMutationType =
  | "SET_LOCAL"
  | "REMOVE_LOCAL"
  | "SET_SESSION"
  | "REMOVE_SESSION"
  | "SET_COOKIE";

export interface StorageMutationRecord {
  id: string;
  timestamp: number;
  type: StorageMutationType;
  key: string;
  oldValue: string | null;
  newValue: string | null;
  caller?: string;
}

// -------------------------------------------------------------
// v2.5.0 Principal & SDET Capabilities
// -------------------------------------------------------------

export type FuzzPayloadType =
  | "POLYGLOT_XSS"
  | "SQLI_MARKER"
  | "HTML_INJECTION"
  | "SSTI_PROBE";

export interface FuzzResult {
  id: string;
  inputSelector: string;
  payloadType: FuzzPayloadType;
  payload: string;
  sinkTriggered?: string;
  severity: "CRITICAL" | "HIGH" | "INFO";
  reflected: boolean;
}

export interface FuzzReport {
  timestamp: number;
  url: string;
  totalInputsFuzzed: number;
  findings: FuzzResult[];
}

export interface ServiceWorkerInfo {
  scope: string;
  scriptURL: string;
  state: "installing" | "waiting" | "active" | "redundant";
}

export interface CacheBucketInfo {
  name: string;
  itemCount: number;
}

export interface PwaAuditReport {
  hasServiceWorker: boolean;
  workers: ServiceWorkerInfo[];
  caches: CacheBucketInfo[];
  timestamp: number;
}

export type ResourceCategory =
  | "script"
  | "stylesheet"
  | "image"
  | "font"
  | "fetch"
  | "other";

export interface WaterfallItem {
  name: string;
  category: ResourceCategory;
  durationMs: number;
  transferSizeBytes: number;
  ttfbMs: number;
  isBottleneck: boolean;
  bottleneckReason?: string;
}

export interface WaterfallReport {
  timestamp: number;
  url: string;
  totalTransferBytes: number;
  totalDurationMs: number;
  bottleneckCount: number;
  score: number; // 0 - 100
  items: WaterfallItem[];
}

export interface QAMatrixRow {
  testId: string;
  roleName: string;
  url: string;
  authState: string;
  headersSummary: string;
  rbacAccessLevel: string;
  expectedStatus: number | string;
  result: "PASS" | "FAIL" | "UNTESTED";
}

export interface QAMatrixExport {
  timestamp: number;
  domain: string;
  rows: QAMatrixRow[];
}

export type AssetType = "LINK" | "IMAGE" | "SCRIPT" | "STYLESHEET";

export interface CrawledAsset {
  url: string;
  type: AssetType;
  elementSelector: string;
  status?: number;
  isBroken: boolean;
  isMixedContent: boolean;
  errorMessage?: string;
}

export interface AssetCrawlReport {
  timestamp: number;
  url: string;
  totalScanned: number;
  brokenCount: number;
  mixedContentCount: number;
  assets: CrawledAsset[];
}

export type VisionDeficiencyType =
  | "normal"
  | "protanopia"
  | "deuteranopia"
  | "tritanopia"
  | "achromatopsia"
  | "blurred";

export interface VisionFilterConfig {
  type: VisionDeficiencyType;
  intensity: number; // 0 to 1
  enabled: boolean;
}




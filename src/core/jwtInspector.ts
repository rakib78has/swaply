/**
 * JWT Decoder & Inspection Utility for QASwitch
 * Decodes, validates, and analyzes JSON Web Tokens completely offline for QA audits.
 */

export interface DecodedJWT<T = Record<string, unknown>> {
  header: Record<string, unknown>;
  payload: T & {
    exp?: number;
    iat?: number;
    nbf?: number;
    sub?: string;
    iss?: string;
    aud?: string | string[];
    role?: string;
    roles?: string[];
    email?: string;
  };
  signature: string;
  isExpired: boolean;
  expiresInSeconds?: number;
  formattedExpiration?: string;
}

function base64UrlDecode(str: string): string {
  let base64 = str.replace(/-/g, "+").replace(/_/g, "/");
  while (base64.length % 4) {
    base64 += "=";
  }
  return decodeURIComponent(
    atob(base64)
      .split("")
      .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
      .join("")
  );
}

/**
 * Checks if a string has standard JWT structure (xxx.yyy.zzz)
 */
export function isJWT(tokenStr?: string | null): boolean {
  if (!tokenStr || typeof tokenStr !== "string") return false;
  const parts = tokenStr.trim().split(".");
  return parts.length === 3 && parts[0].length > 0 && parts[1].length > 0;
}

/**
 * Decodes and inspects a JWT token
 */
export function inspectJWT<T = Record<string, unknown>>(tokenStr: string): DecodedJWT<T> | null {
  if (!isJWT(tokenStr)) return null;

  try {
    const [headerB64, payloadB64, signature] = tokenStr.trim().split(".");
    const header = JSON.parse(base64UrlDecode(headerB64));
    const payload = JSON.parse(base64UrlDecode(payloadB64));

    let isExpired = false;
    let expiresInSeconds: number | undefined;
    let formattedExpiration: string | undefined;

    if (typeof payload.exp === "number") {
      const nowSec = Math.floor(Date.now() / 1000);
      expiresInSeconds = payload.exp - nowSec;
      isExpired = expiresInSeconds <= 0;

      const expDate = new Date(payload.exp * 1000);
      if (isExpired) {
        const agoMin = Math.abs(Math.floor(expiresInSeconds / 60));
        formattedExpiration = `Expired ${agoMin < 60 ? `${agoMin}m ago` : `${Math.floor(agoMin / 60)}h ago`}`;
      } else {
        const leftMin = Math.floor(expiresInSeconds / 60);
        formattedExpiration = leftMin < 60 ? `Expires in ${leftMin}m` : `Expires in ${Math.floor(leftMin / 60)}h ${leftMin % 60}m`;
      }
    }

    return {
      header,
      payload,
      signature,
      isExpired,
      expiresInSeconds,
      formattedExpiration
    };
  } catch {
    return null;
  }
}

/**
 * Scans a profile's cookies and localStorage for any JWT tokens
 */
export function extractJWTsFromSession(
  cookies: Array<{ name: string; value: string }> = [],
  storageLocal: Record<string, string> = {}
): Array<{ source: "cookie" | "storage"; name: string; token: string; decoded: DecodedJWT }> {
  const found: Array<{ source: "cookie" | "storage"; name: string; token: string; decoded: DecodedJWT }> = [];

  for (const c of cookies) {
    if (isJWT(c.value)) {
      const decoded = inspectJWT(c.value);
      if (decoded) found.push({ source: "cookie", name: c.name, token: c.value, decoded });
    }
  }

  for (const [k, v] of Object.entries(storageLocal)) {
    if (typeof v === "string" && isJWT(v)) {
      const decoded = inspectJWT(v);
      if (decoded) found.push({ source: "storage", name: k, token: v, decoded });
    }
  }

  return found;
}


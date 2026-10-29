/**
 * AI Test Persona Synthesizer & Synthetic Role Generator
 * Instantly synthesizes complex, production-grade test roles (E-Commerce, SaaS, Security) with realistic JWTs and storage.
 */

import type { PersonaTemplate, ProfileRecord, SessionCookie } from '../types/index.ts';

export const PERSONA_TEMPLATES: PersonaTemplate[] = [
  {
    id: 'ecommerce_vip',
    name: '👑 VIP Gold Member (E-Commerce)',
    category: 'ECOMMERCE',
    roleName: 'VIP Shopper',
    description: 'High-tier buyer with $2,500 store credits, Gold loyalty status, and free express shipping.',
    colorTheme: 'purple',
    mockJwtClaims: {
      sub: 'usr_vip_88492',
      email: 'vip.shopper@example.com',
      tier: 'gold',
      loyalty_points: 12500,
      balance_cents: 250000,
      free_shipping: true,
      roles: ['customer', 'vip_gold']
    },
    cookies: [
      { name: 'shopper_tier', value: 'gold', secure: true, httpOnly: false },
      { name: 'preferred_currency', value: 'USD', secure: true, httpOnly: false }
    ],
    localStorage: {
      user_tier: 'gold',
      cart_currency: 'USD',
      loyalty_tier_name: 'VIP Gold Elite'
    },
    headers: {
      'X-Customer-Tier': 'VIP-Gold',
      'X-Feature-Early-Access': 'true'
    }
  },
  {
    id: 'ecommerce_banned',
    name: '🚫 Suspended / Banned Account',
    category: 'ECOMMERCE',
    roleName: 'Banned User',
    description: 'Account flagged for chargebacks / fraud. Checkout and payment methods disabled.',
    colorTheme: 'red',
    mockJwtClaims: {
      sub: 'usr_banned_0012',
      email: 'fraud.flagged@example.com',
      account_status: 'suspended',
      is_banned: true,
      fraud_risk_score: 98,
      roles: ['customer']
    },
    cookies: [
      { name: 'account_flag', value: 'suspended_fraud', secure: true, httpOnly: true }
    ],
    localStorage: {
      account_status: 'SUSPENDED',
      checkout_locked: 'true'
    },
    headers: {
      'X-Account-Status': 'SUSPENDED'
    }
  },
  {
    id: 'saas_tenant_admin',
    name: '🏢 Tenant Super Admin (SaaS)',
    category: 'SAAS',
    roleName: 'Tenant Admin',
    description: 'Organization administrator with wild-card permissions, billing, and team management.',
    colorTheme: 'red',
    mockJwtClaims: {
      sub: 'usr_admin_org_99',
      email: 'admin@acme-corp.com',
      org_id: 'org_acme_enterprise',
      org_tier: 'enterprise_annual',
      permissions: ['*'],
      roles: ['org_admin', 'billing_admin', 'security_officer']
    },
    cookies: [
      { name: 'tenant_id', value: 'org_acme_enterprise', secure: true, httpOnly: true },
      { name: 'role_badge', value: 'superadmin', secure: true, httpOnly: false }
    ],
    localStorage: {
      active_tenant: 'org_acme_enterprise',
      admin_access_level: 'ROOT'
    },
    headers: {
      'X-Tenant-ID': 'org_acme_enterprise',
      'X-Admin-Role': 'SuperAdmin'
    }
  },
  {
    id: 'saas_auditor',
    name: '🔍 Read-Only Compliance Auditor (SaaS)',
    category: 'SAAS',
    roleName: 'Compliance Auditor',
    description: 'Third-party auditor with view-only permissions for SOC2/ISO audit logs and financial reports.',
    colorTheme: 'green',
    mockJwtClaims: {
      sub: 'usr_auditor_extern',
      email: 'auditor@big4-compliance.com',
      org_id: 'org_acme_enterprise',
      permissions: ['reports:read', 'audit_logs:read', 'billing:view'],
      roles: ['auditor']
    },
    cookies: [
      { name: 'auditor_session', value: 'readonly_audit_pass', secure: true, httpOnly: true }
    ],
    localStorage: {
      audit_mode: 'READ_ONLY_STRICT',
      compliance_standard: 'SOC2_TYPE_II'
    },
    headers: {
      'X-Role-Permissions': 'read_only'
    }
  },
  {
    id: 'security_sqli',
    name: '💉 SQL Injection Probe Persona',
    category: 'SECURITY',
    roleName: "SQLi ' OR '1'='1",
    description: "Penetration test persona with SQL syntax injection payloads in username and tokens.",
    colorTheme: 'amber',
    mockJwtClaims: {
      sub: "usr_' OR '1'='1' --",
      username: "admin' OR 1=1; DROP TABLE users; --",
      role: "admin' UNION SELECT 1,2,3 --"
    },
    cookies: [
      { name: 'probe_session', value: "' OR '1'='1", secure: true, httpOnly: false }
    ],
    localStorage: {
      display_name: "Test' OR 1=1--"
    }
  },
  {
    id: 'security_xss',
    name: '☣️ XSS Payload Persona',
    category: 'SECURITY',
    roleName: '<script>alert(1)</script>',
    description: 'Penetration test persona with script tags in profile fields to test frontend escaping.',
    colorTheme: 'amber',
    mockJwtClaims: {
      sub: '<script>console.log("XSS_TOKEN")</script>',
      display_name: '"><img src=x onerror=alert(1)>'
    },
    cookies: [
      { name: 'xss_test', value: '<script>alert(document.cookie)</script>', secure: true, httpOnly: false }
    ],
    localStorage: {
      user_nick: '"><svg onload=alert(1)>'
    }
  }
];

export function getAvailablePersonaTemplates(): PersonaTemplate[] {
  return PERSONA_TEMPLATES;
}

/**
 * Creates a synthetic, self-contained ProfileRecord from a PersonaTemplate
 */
export function synthesizeRoleFromTemplate(
  domain: string,
  templateId: string,
  targetUrl?: string
): ProfileRecord {
  const template = PERSONA_TEMPLATES.find((t) => t.id === templateId) || PERSONA_TEMPLATES[0];
  const cleanDomain = domain.startsWith('.') ? domain.slice(1) : domain;
  const url = targetUrl || `https://${cleanDomain}/`;

  // 1. Generate realistic synthetic JWT token
  const syntheticJwt = encodeMockJwt({
    ...template.mockJwtClaims,
    iss: `https://${cleanDomain}`,
    aud: cleanDomain,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 7 * 86400
  });

  // 2. Build Cookies
  const cookies: SessionCookie[] = [
    {
      name: 'app_session',
      value: syntheticJwt,
      domain: cleanDomain,
      path: '/',
      secure: true,
      httpOnly: true,
      sameSite: 'lax',
      expirationDate: Math.floor(Date.now() / 1000) + 7 * 86400
    },
    ...template.cookies.map((c) => ({
      name: c.name,
      value: c.value,
      domain: cleanDomain,
      path: '/',
      secure: c.secure !== false,
      httpOnly: Boolean(c.httpOnly),
      sameSite: 'lax' as const
    }))
  ];

  // 3. Build LocalStorage
  const localStorage: Record<string, string> = {
    auth_token: syntheticJwt,
    ...template.localStorage
  };

  // 4. Build Custom Headers
  const headers: Record<string, string> = {
    Authorization: `Bearer ${syntheticJwt}`,
    ...(template.headers || {})
  };

  return {
    id: `prof_syn_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    name: template.roleName,
    createdAt: Date.now(),
    domain: cleanDomain,
    url,
    cookies,
    storage: {
      local: localStorage,
      session: {
        session_initialized: 'true',
        persona_synthetic: 'true'
      }
    },
    headers,
    colorTheme: template.colorTheme,
    syntheticTemplateId: template.id
  };
}

/**
 * Generates a standard base64url encoded mock JWT string
 */
export function encodeMockJwt(claims: Record<string, unknown>): string {
  const header = { alg: 'HS256', typ: 'JWT' };
  const hBase64 = base64UrlEncode(JSON.stringify(header));
  const pBase64 = base64UrlEncode(JSON.stringify(claims));
  const sig = base64UrlEncode('mock_synthetic_signature_qaswitch_v2');

  return `${hBase64}.${pBase64}.${sig}`;
}

function base64UrlEncode(str: string): string {
  return Buffer.from(str, 'utf8')
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

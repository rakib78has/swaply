/**
 * Mock Chrome APIs for regression and unit test suites
 */

import type { SessionCookie, CookieSetDetails } from "../src/types/index.ts";

export interface ChromeStorageMock {
  store: Record<string, unknown>;
  get: (keys: string[]) => Promise<Record<string, unknown>>;
  set: (items: Record<string, unknown>) => Promise<void>;
  remove: (keys: string[]) => Promise<void>;
  clear: () => Promise<void>;
}

export interface ChromeCookiesMock {
  cookieStore: SessionCookie[];
  getAll: (details: { url?: string; domain?: string }) => Promise<SessionCookie[]>;
  set: (details: CookieSetDetails) => Promise<CookieSetDetails>;
  remove: (details: { url: string; name: string; storeId?: string }) => Promise<{ url: string; name: string }>;
}

export function createChromeStorageMock(): ChromeStorageMock {
  const store: Record<string, unknown> = {};

  return {
    store,
    get: async (keys: string[]) => {
      const result: Record<string, unknown> = {};
      for (const k of keys) {
        if (k in store) {
          result[k] = store[k];
        }
      }
      return result;
    },
    set: async (items: Record<string, unknown>) => {
      Object.assign(store, items);
    },
    remove: async (keys: string[]) => {
      for (const k of keys) {
        delete store[k];
      }
    },
    clear: async () => {
      for (const k of Object.keys(store)) {
        delete store[k];
      }
    }
  };
}

export function createChromeCookiesMock(initialCookies: SessionCookie[] = []): ChromeCookiesMock {
  let cookieStore: SessionCookie[] = [...initialCookies];

  return {
    get cookieStore() {
      return cookieStore;
    },
    getAll: async (details: { url?: string; domain?: string }) => {
      return cookieStore.filter((c) => {
        if (details.domain && c.domain !== details.domain && !c.domain.endsWith(`.${details.domain}`)) {
          return false;
        }
        return true;
      });
    },
    set: async (details: CookieSetDetails) => {
      // Remove existing matching cookie
      cookieStore = cookieStore.filter(
        (c) => !(c.name === details.name && c.path === details.path && (c.domain === details.domain || !details.domain))
      );

      const newCookie: SessionCookie = {
        name: details.name,
        value: details.value,
        domain: details.domain || "localhost",
        path: details.path || "/",
        secure: details.secure,
        httpOnly: details.httpOnly,
        sameSite: details.sameSite,
        expirationDate: details.expirationDate,
        hostOnly: !details.domain
      };

      cookieStore.push(newCookie);
      return details;
    },
    remove: async (details: { url: string; name: string; storeId?: string }) => {
      cookieStore = cookieStore.filter((c) => c.name !== details.name);
      return { url: details.url, name: details.name };
    }
  };
}


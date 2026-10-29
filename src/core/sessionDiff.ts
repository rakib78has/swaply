/**
 * Session Diff & Inspection Engine
 * Computes deep differences between two role profiles (e.g. Admin vs Regular User)
 */

import type { ProfileRecord, SessionCookie } from "../types/index.ts";

export interface DiffEntry<T = string> {
  key: string;
  valueA?: T;
  valueB?: T;
  status: "added" | "removed" | "modified" | "identical";
}

export interface SessionComparisonResult {
  profileAName: string;
  profileBName: string;
  cookieDiffs: DiffEntry<string>[];
  localStorageDiffs: DiffEntry<string>[];
  sessionStorageDiffs: DiffEntry<string>[];
  totalDifferences: number;
}

export function compareKeyValues(
  dictA: Record<string, string> = {},
  dictB: Record<string, string> = {}
): DiffEntry<string>[] {
  const allKeys = Array.from(new Set([...Object.keys(dictA), ...Object.keys(dictB)])).sort();
  const diffs: DiffEntry<string>[] = [];

  for (const k of allKeys) {
    const valA = dictA[k];
    const valB = dictB[k];

    if (valA !== undefined && valB === undefined) {
      diffs.push({ key: k, valueA: valA, status: "removed" });
    } else if (valA === undefined && valB !== undefined) {
      diffs.push({ key: k, valueB: valB, status: "added" });
    } else if (valA !== valB) {
      diffs.push({ key: k, valueA: valA, valueB: valB, status: "modified" });
    } else {
      diffs.push({ key: k, valueA: valA, valueB: valB, status: "identical" });
    }
  }

  return diffs;
}

export function compareCookieLists(cookiesA: SessionCookie[] = [], cookiesB: SessionCookie[] = []): DiffEntry<string>[] {
  const mapA = new Map(cookiesA.map((c) => [c.name, c.value]));
  const mapB = new Map(cookiesB.map((c) => [c.name, c.value]));

  const allNames = Array.from(new Set([...mapA.keys(), ...mapB.keys()])).sort();
  const diffs: DiffEntry<string>[] = [];

  for (const name of allNames) {
    const valA = mapA.get(name);
    const valB = mapB.get(name);

    if (valA !== undefined && valB === undefined) {
      diffs.push({ key: name, valueA: valA, status: "removed" });
    } else if (valA === undefined && valB !== undefined) {
      diffs.push({ key: name, valueB: valB, status: "added" });
    } else if (valA !== valB) {
      diffs.push({ key: name, valueA: valA, valueB: valB, status: "modified" });
    } else {
      diffs.push({ key: name, valueA: valA, valueB: valB, status: "identical" });
    }
  }

  return diffs;
}

export function compareProfiles(profileA: ProfileRecord, profileB: ProfileRecord): SessionComparisonResult {
  const cookieDiffs = compareCookieLists(profileA.cookies, profileB.cookies);
  const localStorageDiffs = compareKeyValues(profileA.storage?.local, profileB.storage?.local);
  const sessionStorageDiffs = compareKeyValues(profileA.storage?.session, profileB.storage?.session);

  const nonIdenticalCount = [
    ...cookieDiffs,
    ...localStorageDiffs,
    ...sessionStorageDiffs
  ].filter((d) => d.status !== "identical").length;

  return {
    profileAName: profileA.name,
    profileBName: profileB.name,
    cookieDiffs,
    localStorageDiffs,
    sessionStorageDiffs,
    totalDifferences: nonIdenticalCount
  };
}


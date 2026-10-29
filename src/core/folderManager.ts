/**
 * Profile Folders, Tags & Workspace Collections Engine
 * Manages hierarchical collections, categorizations, and multi-tag filtering for role profiles.
 */

import type { ProfileFolder, ProfileRecord } from '../types/index.ts';

export const UNCATEGORIZED_FOLDER_ID = '__uncategorized__';

/**
 * Creates a new ProfileFolder record.
 */
export function createFolder(
  name: string,
  options?: Partial<ProfileFolder>
): ProfileFolder {
  const trimmed = name.trim();
  const id = options?.id || `folder_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

  return {
    id,
    name: trimmed || 'Untitled Collection',
    color: options?.color || '#3b82f6',
    description: options?.description || '',
    icon: options?.icon || '📁',
    createdAt: options?.createdAt || Date.now(),
  };
}

/**
 * Groups a list of profiles by their assigned folders.
 */
export function groupProfilesByFolder(
  profiles: ProfileRecord[],
  folders: ProfileFolder[]
): Map<string, { folder: ProfileFolder; profiles: ProfileRecord[] }> {
  const grouped = new Map<string, { folder: ProfileFolder; profiles: ProfileRecord[] }>();

  // Initialize known folders
  for (const f of folders) {
    grouped.set(f.id, { folder: f, profiles: [] });
  }

  // Ensure uncategorized folder exists
  if (!grouped.has(UNCATEGORIZED_FOLDER_ID)) {
    grouped.set(UNCATEGORIZED_FOLDER_ID, {
      folder: {
        id: UNCATEGORIZED_FOLDER_ID,
        name: 'General / Uncategorized',
        color: '#64748b',
        icon: '📂',
        createdAt: 0,
      },
      profiles: [],
    });
  }

  // Populate profiles
  for (const p of profiles) {
    const fId = p.folder && grouped.has(p.folder) ? p.folder : UNCATEGORIZED_FOLDER_ID;
    grouped.get(fId)!.profiles.push(p);
  }

  return grouped;
}

/**
 * Extracts and counts all tags across all profiles.
 */
export function extractAllTags(profiles: ProfileRecord[]): Array<{ tag: string; count: number }> {
  const counts: Record<string, number> = {};

  for (const p of profiles) {
    if (Array.isArray(p.tags)) {
      for (const t of p.tags) {
        const norm = t.trim().toLowerCase();
        if (norm) {
          counts[norm] = (counts[norm] || 0) + 1;
        }
      }
    }
  }

  return Object.entries(counts)
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag));
}

/**
 * Filters profiles based on folder, tag, and search query.
 */
export function filterProfiles(
  profiles: ProfileRecord[],
  filter: {
    folderId?: string;
    tag?: string;
    search?: string;
  }
): ProfileRecord[] {
  if (!profiles || !Array.isArray(profiles)) return [];

  return profiles.filter((p) => {
    // 1. Folder match
    if (filter.folderId && filter.folderId !== 'ALL') {
      if (filter.folderId === UNCATEGORIZED_FOLDER_ID) {
        if (p.folder && p.folder !== UNCATEGORIZED_FOLDER_ID) return false;
      } else {
        if (p.folder !== filter.folderId) return false;
      }
    }

    // 2. Tag match
    if (filter.tag) {
      const targetTag = filter.tag.trim().toLowerCase();
      if (!p.tags || !p.tags.some((t) => t.toLowerCase() === targetTag)) {
        return false;
      }
    }

    // 3. Search text
    if (filter.search) {
      const q = filter.search.trim().toLowerCase();
      const matchName = p.name.toLowerCase().includes(q);
      const matchDomain = p.domain.toLowerCase().includes(q);
      const matchTag = p.tags?.some((t) => t.toLowerCase().includes(q));
      if (!matchName && !matchDomain && !matchTag) return false;
    }

    return true;
  });
}

/**
 * Assigns or unassigns a profile to a folder.
 */
export function assignProfileToFolder(
  profile: ProfileRecord,
  folderId: string | null
): ProfileRecord {
  return {
    ...profile,
    folder: folderId && folderId !== UNCATEGORIZED_FOLDER_ID ? folderId : undefined,
  };
}

/**
 * Adds a tag to a profile (avoids duplicates).
 */
export function addTagToProfile(profile: ProfileRecord, rawTag: string): ProfileRecord {
  const norm = rawTag.trim().startsWith('#') ? rawTag.trim() : `#${rawTag.trim()}`;
  const existing = profile.tags || [];

  if (existing.some((t) => t.toLowerCase() === norm.toLowerCase())) {
    return profile;
  }

  return {
    ...profile,
    tags: [...existing, norm],
  };
}

/**
 * Removes a tag from a profile.
 */
export function removeTagFromProfile(profile: ProfileRecord, rawTag: string): ProfileRecord {
  const norm = rawTag.trim().toLowerCase();
  const existing = profile.tags || [];

  return {
    ...profile,
    tags: existing.filter((t) => t.toLowerCase() !== norm && t.replace(/^#/, '').toLowerCase() !== norm.replace(/^#/, '')),
  };
}

/**
 * Returns summary stats for each folder.
 */
export function getFolderStats(
  profiles: ProfileRecord[],
  folders: ProfileFolder[]
): Array<{ folderId: string; folderName: string; profileCount: number }> {
  const grouped = groupProfilesByFolder(profiles, folders);
  const result: Array<{ folderId: string; folderName: string; profileCount: number }> = [];

  for (const [folderId, data] of grouped.entries()) {
    result.push({
      folderId,
      folderName: data.folder.name,
      profileCount: data.profiles.length,
    });
  }

  return result;
}

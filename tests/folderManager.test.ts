import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  createFolder,
  groupProfilesByFolder,
  extractAllTags,
  filterProfiles,
  assignProfileToFolder,
  addTagToProfile,
  removeTagFromProfile,
  getFolderStats,
  UNCATEGORIZED_FOLDER_ID,
} from '../src/core/folderManager.ts';
import type { ProfileFolder, ProfileRecord } from '../src/types/index.ts';

describe('Profile Folders, Tags & Collections Engine Tests', () => {
  const mockProfiles: ProfileRecord[] = [
    {
      id: 'p1',
      name: 'Super Admin',
      createdAt: 1,
      domain: 'app.example.com',
      url: 'https://app.example.com',
      cookies: [],
      storage: { local: {}, session: {} },
      folder: 'fld_auth',
      tags: ['#admin', '#auth', '#critical'],
    },
    {
      id: 'p2',
      name: 'Guest User',
      createdAt: 2,
      domain: 'app.example.com',
      url: 'https://app.example.com',
      cookies: [],
      storage: { local: {}, session: {} },
      folder: 'fld_auth',
      tags: ['#guest', '#public'],
    },
    {
      id: 'p3',
      name: 'Checkout Tester',
      createdAt: 3,
      domain: 'shop.example.com',
      url: 'https://shop.example.com',
      cookies: [],
      storage: { local: {}, session: {} },
      // no folder assigned -> uncategorized
      tags: ['#checkout', '#critical'],
    },
  ];

  const mockFolders: ProfileFolder[] = [
    createFolder('Authentication Tests', { id: 'fld_auth', color: '#8b5cf6' }),
    createFolder('Billing Suite', { id: 'fld_billing', color: '#10b981' }),
  ];

  test('should create folder record with normalized fields', () => {
    const fld = createFolder('Sprint 42 Regression', { color: '#ef4444', icon: '🚀' });
    assert.equal(fld.name, 'Sprint 42 Regression');
    assert.equal(fld.color, '#ef4444');
    assert.equal(fld.icon, '🚀');
    assert.ok(fld.id.startsWith('folder_'));
  });

  test('should group profiles by folder accurately including uncategorized group', () => {
    const grouped = groupProfilesByFolder(mockProfiles, mockFolders);
    assert.equal(grouped.has('fld_auth'), true);
    assert.equal(grouped.has(UNCATEGORIZED_FOLDER_ID), true);

    const authProfiles = grouped.get('fld_auth')!.profiles;
    assert.equal(authProfiles.length, 2);
    assert.equal(authProfiles[0].name, 'Super Admin');

    const uncategorizedProfiles = grouped.get(UNCATEGORIZED_FOLDER_ID)!.profiles;
    assert.equal(uncategorizedProfiles.length, 1);
    assert.equal(uncategorizedProfiles[0].name, 'Checkout Tester');
  });

  test('should extract and sort all unique tags by occurrence frequency', () => {
    const tags = extractAllTags(mockProfiles);
    assert.equal(tags.length, 6);
    // '#critical' occurs twice (p1 and p3) -> highest frequency
    assert.equal(tags[0].tag, '#critical');
    assert.equal(tags[0].count, 2);
  });

  test('should filter profiles by folderId, tag, and search query', () => {
    // 1. By folder
    const authOnly = filterProfiles(mockProfiles, { folderId: 'fld_auth' });
    assert.equal(authOnly.length, 2);

    // 2. By uncategorized
    const uncatOnly = filterProfiles(mockProfiles, { folderId: UNCATEGORIZED_FOLDER_ID });
    assert.equal(uncatOnly.length, 1);
    assert.equal(uncatOnly[0].id, 'p3');

    // 3. By tag
    const criticalOnly = filterProfiles(mockProfiles, { tag: '#critical' });
    assert.equal(criticalOnly.length, 2);

    // 4. By search query
    const searchRes = filterProfiles(mockProfiles, { search: 'Checkout' });
    assert.equal(searchRes.length, 1);
    assert.equal(searchRes[0].name, 'Checkout Tester');
  });

  test('should assign, reassign, and unassign profile folders', () => {
    const p = mockProfiles[0];
    const reassigned = assignProfileToFolder(p, 'fld_billing');
    assert.equal(reassigned.folder, 'fld_billing');

    const unassigned = assignProfileToFolder(reassigned, null);
    assert.equal(unassigned.folder, undefined);
  });

  test('should add and remove tags preventing duplicates and normalizing prefixes', () => {
    const p = mockProfiles[1]; // has ['#guest', '#public']

    // Add new tag with or without #
    const added = addTagToProfile(p, 'staging');
    assert.deepEqual(added.tags, ['#guest', '#public', '#staging']);

    // Duplicate tag ignored
    const dup = addTagToProfile(added, '#staging');
    assert.equal(dup.tags?.length, 3);

    // Remove tag
    const removed = removeTagFromProfile(added, 'guest');
    assert.deepEqual(removed.tags, ['#public', '#staging']);
  });

  test('should compute folder statistics accurately', () => {
    const stats = getFolderStats(mockProfiles, mockFolders);
    const authStat = stats.find((s) => s.folderId === 'fld_auth');
    assert.equal(authStat?.profileCount, 2);

    const billingStat = stats.find((s) => s.folderId === 'fld_billing');
    assert.equal(billingStat?.profileCount, 0);

    const uncatStat = stats.find((s) => s.folderId === UNCATEGORIZED_FOLDER_ID);
    assert.equal(uncatStat?.profileCount, 1);
  });
});

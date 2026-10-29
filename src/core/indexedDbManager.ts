/**
 * IndexedDB snapshotting and restoration logic
 * Supports Firebase, Supabase, Dexie, and modern PWAs storing auth tokens in IndexedDB.
 */

export interface IDBStoreData {
  storeName: string;
  records: Array<{ key?: unknown; value: unknown }>;
}

export interface IDBDatabaseSnapshot {
  dbName: string;
  version: number;
  stores: IDBStoreData[];
}

/**
 * Sanitizes raw IndexedDB dumps
 */
export function sanitizeIDBSnapshot(raw?: unknown): IDBDatabaseSnapshot[] {
  if (!Array.isArray(raw)) return [];

  const validated: IDBDatabaseSnapshot[] = [];

  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const db = item as Partial<IDBDatabaseSnapshot>;

    if (typeof db.dbName !== "string" || !db.dbName) continue;

    const stores: IDBStoreData[] = [];
    if (Array.isArray(db.stores)) {
      for (const s of db.stores) {
        if (!s || typeof s !== "object" || typeof s.storeName !== "string") continue;
        const records = Array.isArray(s.records) ? s.records : [];
        stores.push({
          storeName: s.storeName,
          records
        });
      }
    }

    validated.push({
      dbName: db.dbName,
      version: typeof db.version === "number" ? db.version : 1,
      stores
    });
  }

  return validated;
}

/**
 * In-page script to snapshot all IndexedDB databases on the current origin
 */
export async function inPageIDBSnapshot(): Promise<IDBDatabaseSnapshot[]> {
  const result: IDBDatabaseSnapshot[] = [];

  try {
    if (!("indexedDB" in window) || typeof window.indexedDB.databases !== "function") {
      return result;
    }

    const dbs = await window.indexedDB.databases();

    for (const dbInfo of dbs) {
      if (!dbInfo.name) continue;

      try {
        const snapshot = await new Promise<IDBDatabaseSnapshot>((resolve, reject) => {
          const req = window.indexedDB.open(dbInfo.name!, dbInfo.version);

          req.onerror = () => reject(req.error);
          req.onsuccess = async () => {
            const db = req.result;
            const storeNames = Array.from(db.objectStoreNames);
            const stores: IDBStoreData[] = [];

            if (storeNames.length === 0) {
              db.close();
              resolve({ dbName: dbInfo.name!, version: db.version, stores: [] });
              return;
            }

            const tx = db.transaction(storeNames, "readonly");

            for (const sName of storeNames) {
              try {
                const store = tx.objectStore(sName);
                const records = await new Promise<Array<{ key?: unknown; value: unknown }>>((res) => {
                  const getAllReq = store.getAll();
                  const getKeysReq = store.getAllKeys();

                  getAllReq.onsuccess = () => {
                    getKeysReq.onsuccess = () => {
                      const vals = getAllReq.result || [];
                      const keys = getKeysReq.result || [];
                      const recs = vals.map((v, i) => ({ key: keys[i], value: v }));
                      res(recs);
                    };
                    getKeysReq.onerror = () => res([]);
                  };
                  getAllReq.onerror = () => res([]);
                });

                stores.push({ storeName: sName, records });
              } catch {}
            }

            db.close();
            resolve({ dbName: dbInfo.name!, version: db.version, stores });
          };
        });

        result.push(snapshot);
      } catch {}
    }
  } catch {}

  return result;
}

/**
 * In-page script to restore IndexedDB databases
 */
export async function inPageIDBRestore(dbs: IDBDatabaseSnapshot[]): Promise<void> {
  if (!Array.isArray(dbs) || dbs.length === 0) return;

  for (const dbSnapshot of dbs) {
    if (!dbSnapshot.dbName) continue;

    try {
      await new Promise<void>((resolve, reject) => {
        const req = window.indexedDB.open(dbSnapshot.dbName, dbSnapshot.version);

        req.onerror = () => reject(req.error);
        req.onsuccess = async () => {
          const db = req.result;
          const storeNames = Array.from(db.objectStoreNames);
          const matchedStores = dbSnapshot.stores.filter((s) => storeNames.includes(s.storeName));

          if (matchedStores.length === 0) {
            db.close();
            resolve();
            return;
          }

          const tx = db.transaction(
            matchedStores.map((s) => s.storeName),
            "readwrite"
          );

          for (const s of matchedStores) {
            try {
              const store = tx.objectStore(s.storeName);
              store.clear();

              for (const record of s.records) {
                if (record.key !== undefined && record.key !== null) {
                  store.put(record.value, record.key as IDBValidKey);
                } else {
                  store.put(record.value);
                }
              }
            } catch {}
          }

          tx.oncomplete = () => {
            db.close();
            resolve();
          };
          tx.onerror = () => {
            db.close();
            resolve();
          };
        };
      });
    } catch {}
  }
}


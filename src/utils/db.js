/**
 * IndexedDB wrapper for Invoisify
 * Provides permanent local storage that survives browser cache clears.
 *
 * Database : invoisify_db (v1)
 * Stores:
 *   company_profiles – all company/brand profiles
 *   app_settings     – misc key/value config
 */

const DB_NAME = 'invoisify_db';
const DB_VERSION = 1;

let _db = null;

/** Open (or reuse) the IndexedDB database. */
export function openDB() {
  if (_db) return Promise.resolve(_db);

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;

      // company_profiles store
      if (!db.objectStoreNames.contains('company_profiles')) {
        const store = db.createObjectStore('company_profiles', { keyPath: 'id' });
        store.createIndex('by_default', 'is_default', { unique: false });
      }

      // app_settings store (key/value pairs)
      if (!db.objectStoreNames.contains('app_settings')) {
        db.createObjectStore('app_settings', { keyPath: 'key' });
      }
    };

    request.onsuccess = (event) => {
      _db = event.target.result;
      resolve(_db);
    };

    request.onerror = (event) => {
      console.error('IndexedDB open error:', event.target.error);
      reject(event.target.error);
    };
  });
}

// ── Internal helpers ────────────────────────────────────────────────────────

function getStore(storeName, mode = 'readonly') {
  return openDB().then((db) => {
    const transaction = db.transaction(storeName, mode);
    return transaction.objectStore(storeName);
  });
}

function wrap(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror  = () => reject(request.error);
  });
}

// ── COMPANY PROFILES ────────────────────────────────────────────────────────

/** Get all company profiles. Default profile is listed first. */
export async function getAllProfiles() {
  const store = await getStore('company_profiles', 'readonly');
  const all = await wrap(store.getAll());
  return all.sort((a, b) => {
    if (a.is_default && !b.is_default) return -1;
    if (!a.is_default && b.is_default) return 1;
    return new Date(a.created_at) - new Date(b.created_at);
  });
}

/** Get a single profile by id. */
export async function getProfile(id) {
  const store = await getStore('company_profiles', 'readonly');
  return wrap(store.get(id));
}

/** Create a new company profile. Returns the saved profile object. */
export async function createProfile(fields) {
  const now = new Date().toISOString();
  const profile = {
    id: `prof-${Date.now()}`,
    company_name: '',
    gst_number: '',
    email: '',
    phone: '',
    website: '',
    address: '',
    logo_url: '',
    is_default: false,
    created_at: now,
    updated_at: now,
    ...fields,
  };
  const store = await getStore('company_profiles', 'readwrite');
  await wrap(store.add(profile));
  return profile;
}

/** Update an existing profile by id (partial update). */
export async function updateProfile(id, fields) {
  const store = await getStore('company_profiles', 'readwrite');
  const existing = await wrap(store.get(id));
  if (!existing) throw new Error(`Profile "${id}" not found in IndexedDB`);
  const updated = { ...existing, ...fields, id, updated_at: new Date().toISOString() };
  await wrap(store.put(updated));
  return updated;
}

/** Delete a profile by id. */
export async function deleteProfile(id) {
  const store = await getStore('company_profiles', 'readwrite');
  await wrap(store.delete(id));
}

/**
 * Set a profile as the default (clears is_default on all others).
 * Returns the full updated list sorted with default first.
 */
export async function setDefaultProfile(id) {
  const store = await getStore('company_profiles', 'readwrite');
  const all = await wrap(store.getAll());
  const now = new Date().toISOString();
  await Promise.all(
    all.map((p) => wrap(store.put({ ...p, is_default: p.id === id, updated_at: now })))
  );
  const updated = await wrap(store.getAll());
  return updated.sort((a, b) => {
    if (a.is_default && !b.is_default) return -1;
    if (!a.is_default && b.is_default) return 1;
    return new Date(a.created_at) - new Date(b.created_at);
  });
}

/** Remove all profiles from IndexedDB. */
export async function clearAllProfiles() {
  const store = await getStore('company_profiles', 'readwrite');
  await wrap(store.clear());
}

// ── APP SETTINGS (key/value) ────────────────────────────────────────────────

/** Read a setting by key. Returns null if not found. */
export async function getSetting(key) {
  const store = await getStore('app_settings', 'readonly');
  const row = await wrap(store.get(key));
  return row ? row.value : null;
}

/** Write (upsert) a setting. */
export async function setSetting(key, value) {
  const store = await getStore('app_settings', 'readwrite');
  await wrap(store.put({ key, value }));
}

/** Delete a setting by key. */
export async function deleteSetting(key) {
  const store = await getStore('app_settings', 'readwrite');
  await wrap(store.delete(key));
}

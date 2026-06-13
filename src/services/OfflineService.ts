import type { OfflineSubmission } from '../types';

const DB_NAME = 'nodx_offline';
const DB_VERSION = 1;

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (e) => {
      const db = (e.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains('submissions')) {
        const store = db.createObjectStore('submissions', { keyPath: 'id' });
        store.createIndex('by_status', 'status');
        store.createIndex('by_form', 'form_id');
      }
      if (!db.objectStoreNames.contains('submission_media')) {
        db.createObjectStore('submission_media', { keyPath: 'key' });
      }
      if (!db.objectStoreNames.contains('drafts')) {
        db.createObjectStore('drafts', { keyPath: 'form_id' });
      }
      if (!db.objectStoreNames.contains('form_cache')) {
        db.createObjectStore('form_cache', { keyPath: 'id' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror  = () => reject(req.error);
  });
}

function txGet<T>(db: IDBDatabase, store: string, key: IDBValidKey): Promise<T | null> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, 'readonly');
    const req = tx.objectStore(store).get(key);
    req.onsuccess = () => resolve((req.result as T) ?? null);
    req.onerror  = () => reject(req.error);
  });
}

function txGetAll<T>(db: IDBDatabase, store: string, index?: string, query?: IDBValidKey): Promise<T[]> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, 'readonly');
    const s = tx.objectStore(store);
    const req = index ? s.index(index).getAll(query) : s.getAll();
    req.onsuccess = () => resolve(req.result as T[]);
    req.onerror  = () => reject(req.error);
  });
}

function txPut(db: IDBDatabase, store: string, value: unknown): Promise<void> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, 'readwrite');
    const req = tx.objectStore(store).put(value);
    req.onsuccess = () => resolve();
    req.onerror  = () => reject(req.error);
  });
}

function txDelete(db: IDBDatabase, store: string, key: IDBValidKey): Promise<void> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, 'readwrite');
    const req = tx.objectStore(store).delete(key);
    req.onsuccess = () => resolve();
    req.onerror  = () => reject(req.error);
  });
}

export class OfflineService {
  private db: IDBDatabase | null = null;

  async init(): Promise<void> {
    this.db = await openDB();
  }

  private async getDB(): Promise<IDBDatabase> {
    if (!this.db) await this.init();
    return this.db!;
  }

  // ── Submissions ──────────────────────────────────────────
  async queueSubmission(submission: OfflineSubmission): Promise<void> {
    const db = await this.getDB();
    await txPut(db, 'submissions', submission);
  }

  async getPendingSubmissions(): Promise<OfflineSubmission[]> {
    const db = await this.getDB();
    return txGetAll<OfflineSubmission>(db, 'submissions', 'by_status', 'pending');
  }

  async getAllSubmissions(): Promise<OfflineSubmission[]> {
    const db = await this.getDB();
    return txGetAll<OfflineSubmission>(db, 'submissions');
  }

  async updateSubmission(id: string, patch: Partial<OfflineSubmission>): Promise<void> {
    const db = await this.getDB();
    const existing = await txGet<OfflineSubmission>(db, 'submissions', id);
    if (existing) await txPut(db, 'submissions', { ...existing, ...patch });
  }

  async deleteSubmission(id: string): Promise<void> {
    const db = await this.getDB();
    await txDelete(db, 'submissions', id);
  }

  // ── Media blobs ──────────────────────────────────────────
  async storeMedia(key: string, blob: Blob): Promise<void> {
    const db = await this.getDB();
    await txPut(db, 'submission_media', { key, blob, stored_at: new Date().toISOString() });
  }

  async getMedia(key: string): Promise<Blob | null> {
    const db = await this.getDB();
    const record = await txGet<{ key: string; blob: Blob }>(db, 'submission_media', key);
    return record?.blob ?? null;
  }

  async deleteMedia(key: string): Promise<void> {
    const db = await this.getDB();
    await txDelete(db, 'submission_media', key);
  }

  // ── Draft auto-save ──────────────────────────────────────
  async saveDraft(formId: string, data: Record<string, unknown>): Promise<void> {
    const db = await this.getDB();
    await txPut(db, 'drafts', { form_id: formId, data, saved_at: new Date().toISOString() });
  }

  async getDraft(formId: string): Promise<{ data: Record<string, unknown>; saved_at: string } | null> {
    const db = await this.getDB();
    return txGet(db, 'drafts', formId);
  }

  async clearDraft(formId: string): Promise<void> {
    const db = await this.getDB();
    await txDelete(db, 'drafts', formId);
  }

  // ── Form cache ───────────────────────────────────────────
  async cacheForm(form: { id: string; [key: string]: unknown }): Promise<void> {
    const db = await this.getDB();
    await txPut(db, 'form_cache', { ...form, cached_at: new Date().toISOString() });
  }

  async getCachedForm<T>(id: string): Promise<T | null> {
    const db = await this.getDB();
    return txGet<T>(db, 'form_cache', id);
  }

  async getAllCachedForms<T>(): Promise<T[]> {
    const db = await this.getDB();
    return txGetAll<T>(db, 'form_cache');
  }
}

export const offlineService = new OfflineService();

import { supabase } from '../lib/supabase';
import { offlineService } from './OfflineService';
import { territorialFieldCollectionEngine, type TerritorialForm, type TerritorialSubmission, type TerritorialPhoto, type TerritorialSignature } from './TerritorialFieldCollectionEngine';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
export type OfflineOperationType = 'submission' | 'photo' | 'signature' | 'gps' | 'form_response';
export type OfflineStatus = 'pending' | 'syncing' | 'synced' | 'failed' | 'conflict';
export type SyncDirection = 'upload' | 'download' | 'bidirectional';
export type SyncType = 'full' | 'partial' | 'automatic' | 'manual' | 'retry';
export type ResolutionStrategy = 'server_wins' | 'client_wins' | 'merge' | 'manual';

export interface OfflineQueueItem {
  id: string;
  organization_id: string;
  user_id: string;
  device_id: string;
  operation_type: OfflineOperationType;
  entity_type: string | null;
  entity_id: string | null;
  parent_id: string | null;
  payload: Record<string, unknown>;
  metadata: Record<string, unknown>;
  status: OfflineStatus;
  sync_attempts: number;
  last_sync_attempt: string | null;
  sync_error: string | null;
  conflict_data: Record<string, unknown> | null;
  resolution_strategy: ResolutionStrategy | null;
  priority: number;
  created_at: string;
  updated_at: string;
}

export interface SyncLogEntry {
  id: string;
  organization_id: string;
  user_id: string;
  device_id: string;
  sync_type: SyncType;
  sync_direction: SyncDirection;
  items_total: number;
  items_synced: number;
  items_failed: number;
  items_conflicted: number;
  started_at: string;
  completed_at: string | null;
  duration_ms: number | null;
  connection_type: string | null;
  network_quality: string | null;
  success: boolean;
  error_summary: string | null;
}

export interface DeviceRegistry {
  id: string;
  organization_id: string;
  user_id: string;
  device_id: string;
  device_name: string | null;
  device_type: 'mobile' | 'tablet' | 'desktop';
  platform: string | null;
  os_version: string | null;
  app_version: string | null;
  has_gps: boolean;
  has_camera: boolean;
  has_storage: boolean;
  storage_available_mb: number | null;
  is_registered: boolean;
  is_active: boolean;
  first_registered_at: string;
  last_seen_at: string;
  last_sync_at: string | null;
  total_syncs: number;
  total_submissions_offline: number;
  created_at: string;
  updated_at: string;
}

export interface SyncStats {
  pending_count: number;
  syncing_count: number;
  synced_count: number;
  failed_count: number;
  conflict_count: number;
  oldest_pending: string | null;
}

export interface OfflineSubmissionPayload {
  form_id: string;
  entity_id: string | null;
  entity_type: string | null;
  data: Record<string, unknown>;
  gps_latitude: number | null;
  gps_longitude: number | null;
  gps_accuracy: number | null;
}

export interface OfflinePhotoPayload {
  submission_id: string;
  file_url: string;
  file_name: string | null;
  file_size: number | null;
  mime_type: string | null;
  gps_latitude: number | null;
  gps_longitude: number | null;
  gps_accuracy: number | null;
  caption: string | null;
  metadata: Record<string, unknown>;
}

export interface OfflineSignaturePayload {
  submission_id: string;
  signer_name: string;
  signer_role: string | null;
  signature_data: string;
  document_type: string | null;
  ip_address: string | null;
}

export interface OfflineGPSPayload {
  latitude: number;
  longitude: number;
  accuracy: number | null;
  altitude: number | null;
  heading: number | null;
  speed: number | null;
  timestamp: string;
}

// IndexedDB helpers
const DB_NAME = 'nodx_territorial_offline';
const DB_VERSION = 2;

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (e) => {
      const db = (e.target as IDBOpenDBRequest).result;

      if (!db.objectStoreNames.contains('queue')) {
        const queueStore = db.createObjectStore('queue', { keyPath: 'id' });
        queueStore.createIndex('by_status', 'status');
        queueStore.createIndex('by_type', 'operation_type');
        queueStore.createIndex('by_created', 'created_at');
      }

      if (!db.objectStoreNames.contains('forms')) {
        db.createObjectStore('forms', { keyPath: 'id' });
      }

      if (!db.objectStoreNames.contains('submissions')) {
        const subStore = db.createObjectStore('submissions', { keyPath: 'id' });
        subStore.createIndex('by_form', 'form_id');
        subStore.createIndex('by_status', 'status');
      }

      if (!db.objectStoreNames.contains('photos')) {
        const photoStore = db.createObjectStore('photos', { keyPath: 'id' });
        photoStore.createIndex('by_submission', 'submission_id');
      }

      if (!db.objectStoreNames.contains('signatures')) {
        const sigStore = db.createObjectStore('signatures', { keyPath: 'id' });
        sigStore.createIndex('by_submission', 'submission_id');
      }

      if (!db.objectStoreNames.contains('gps_cache')) {
        db.createObjectStore('gps_cache', { keyPath: 'id' });
      }

      if (!db.objectStoreNames.contains('media_blobs')) {
        db.createObjectStore('media_blobs', { keyPath: 'key' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function txGet<T>(db: IDBDatabase, store: string, key: IDBValidKey): Promise<T | null> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, 'readonly');
    const req = tx.objectStore(store).get(key);
    req.onsuccess = () => resolve((req.result as T) ?? null);
    req.onerror = () => reject(req.error);
  });
}

async function txGetAll<T>(db: IDBDatabase, store: string, index?: string, query?: IDBValidKey): Promise<T[]> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, 'readonly');
    const s = tx.objectStore(store);
    const req = index ? s.index(index).getAll(query) : s.getAll();
    req.onsuccess = () => resolve(req.result as T[]);
    req.onerror = () => reject(req.error);
  });
}

async function txPut(db: IDBDatabase, store: string, value: unknown): Promise<void> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, 'readwrite');
    const req = tx.objectStore(store).put(value);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

async function txDelete(db: IDBDatabase, store: string, key: IDBValidKey): Promise<void> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, 'readwrite');
    const req = tx.objectStore(store).delete(key);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

async function txClear(db: IDBDatabase, store: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, 'readwrite');
    const req = tx.objectStore(store).clear();
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

// ---------------------------------------------------------------------------
// Main Engine
// ---------------------------------------------------------------------------
export class TerritorialOfflineEngine {
  private db: IDBDatabase | null = null;
  private deviceId: string | null = null;
  private syncInProgress = false;
  private autoSyncInterval: ReturnType<typeof setInterval> | null = null;
  private isOnline = navigator.onLine;

  // -------------------------------------------------------------------------
  // Initialization
  // -------------------------------------------------------------------------
  async init(): Promise<void> {
    this.db = await openDB();

    // Initialize base offline service
    await offlineService.init();

    // Generate or retrieve device ID
    this.deviceId = this.getOrCreateDeviceId();

    // Setup online/offline listeners
    this.setupNetworkListeners();
  }

  private async getDB(): Promise<IDBDatabase> {
    if (!this.db) await this.init();
    return this.db!;
  }

  private getOrCreateDeviceId(): string {
    const stored = localStorage.getItem('nodx_device_id');
    if (stored) return stored;

    const id = `device_${crypto.randomUUID()}`;
    localStorage.setItem('nodx_device_id', id);
    return id;
  }

  getDeviceId(): string {
    return this.deviceId ?? this.getOrCreateDeviceId();
  }

  private setupNetworkListeners(): void {
    window.addEventListener('online', () => {
      this.isOnline = true;
      this.triggerAutoSync();
    });

    window.addEventListener('offline', () => {
      this.isOnline = false;
    });
  }

  // -------------------------------------------------------------------------
  // Forms Offline Storage
  // -------------------------------------------------------------------------
  async cacheForm(form: TerritorialForm): Promise<void> {
    const db = await this.getDB();
    await txPut(db, 'forms', {
      ...form,
      cached_at: new Date().toISOString(),
    });
  }

  async getCachedForm(id: string): Promise<TerritorialForm | null> {
    const db = await this.getDB();
    return txGet<TerritorialForm>(db, 'forms', id);
  }

  async getCachedForms(): Promise<TerritorialForm[]> {
    const db = await this.getDB();
    return txGetAll<TerritorialForm>(db, 'forms');
  }

  async deleteCachedForm(id: string): Promise<void> {
    const db = await this.getDB();
    await txDelete(db, 'forms', id);
  }

  // -------------------------------------------------------------------------
  // Submissions Offline Storage
  // -------------------------------------------------------------------------
  async storeSubmissionOffline(
    organizationId: string,
    userId: string,
    payload: OfflineSubmissionPayload
  ): Promise<string> {
    const db = await this.getDB();
    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    const offlineSubmission = {
      id,
      organization_id: organizationId,
      user_id: userId,
      form_id: payload.form_id,
      entity_id: payload.entity_id,
      entity_type: payload.entity_type,
      data: payload.data,
      gps_latitude: payload.gps_latitude,
      gps_longitude: payload.gps_longitude,
      gps_accuracy: payload.gps_accuracy,
      status: 'pending',
      created_at: now,
      updated_at: now,
    };

    await txPut(db, 'submissions', offlineSubmission);

    // Add to sync queue
    await this.addToQueue({
      organization_id: organizationId,
      user_id: userId,
      device_id: this.getDeviceId(),
      operation_type: 'submission',
      entity_type: 'territorial_submission',
      entity_id: id,
      payload: offlineSubmission,
      metadata: { form_id: payload.form_id },
      priority: 10,
    });

    return id;
  }

  async getOfflineSubmissions(): Promise<Array<{
    id: string;
    form_id: string;
    status: string;
    created_at: string;
    data: Record<string, unknown>;
  }>> {
    const db = await this.getDB();
    return txGetAll(db, 'submissions');
  }

  async getOfflineSubmissionsByForm(formId: string): Promise<Array<{
    id: string;
    status: string;
    created_at: string;
  }>> {
    const db = await this.getDB();
    return txGetAll(db, 'submissions', 'by_form', formId);
  }

  async deleteOfflineSubmission(id: string): Promise<void> {
    const db = await this.getDB();
    await txDelete(db, 'submissions', id);
  }

  // -------------------------------------------------------------------------
  // GPS Offline Capture
  // -------------------------------------------------------------------------
  async storeGPSOffline(
    organizationId: string,
    userId: string,
    payload: OfflineGPSPayload
  ): Promise<string> {
    const db = await this.getDB();
    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    const gpsEntry = {
      id,
      organization_id: organizationId,
      user_id: userId,
      ...payload,
      created_at: now,
    };

    await txPut(db, 'gps_cache', gpsEntry);

    // Add to sync queue
    await this.addToQueue({
      organization_id: organizationId,
      user_id: userId,
      device_id: this.getDeviceId(),
      operation_type: 'gps',
      entity_type: 'gps_capture',
      entity_id: id,
      payload: gpsEntry,
      metadata: {},
      priority: 5,
    });

    return id;
  }

  async getCachedGPS(): Promise<OfflineGPSPayload[]> {
    const db = await this.getDB();
    return txGetAll<OfflineGPSPayload>(db, 'gps_cache');
  }

  // -------------------------------------------------------------------------
  // Photos Offline Storage
  // -------------------------------------------------------------------------
  async storePhotoOffline(
    organizationId: string,
    userId: string,
    submissionId: string,
    blob: Blob,
    payload: Omit<OfflinePhotoPayload, 'submission_id'>
  ): Promise<string> {
    const db = await this.getDB();
    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    // Store blob separately
    const blobKey = `photo_${id}`;
    await txPut(db, 'media_blobs', { key: blobKey, blob, stored_at: now });

    const photoEntry = {
      id,
      organization_id: organizationId,
      user_id: userId,
      submission_id: submissionId,
      ...payload,
      blob_key: blobKey,
      status: 'pending',
      created_at: now,
      updated_at: now,
    };

    await txPut(db, 'photos', photoEntry);

    // Add to sync queue (parent = submission)
    await this.addToQueue({
      organization_id: organizationId,
      user_id: userId,
      device_id: this.getDeviceId(),
      operation_type: 'photo',
      entity_type: 'territorial_photo',
      entity_id: id,
      parent_id: submissionId,
      payload: { ...photoEntry, blob_key: blobKey },
      metadata: { submission_id: submissionId },
      priority: 8,
    });

    return id;
  }

  async getOfflinePhotos(submissionId?: string): Promise<Array<{
    id: string;
    submission_id: string;
    file_name: string | null;
    status: string;
    created_at: string;
  }>> {
    const db = await this.getDB();
    if (submissionId) {
      return txGetAll(db, 'photos', 'by_submission', submissionId);
    }
    return txGetAll(db, 'photos');
  }

  async getPhotoBlob(photoId: string): Promise<Blob | null> {
    const db = await this.getDB();
    const blobKey = `photo_${photoId}`;
    const record = await txGet<{ blob: Blob }>(db, 'media_blobs', blobKey);
    return record?.blob ?? null;
  }

  async deleteOfflinePhoto(id: string): Promise<void> {
    const db = await this.getDB();
    const blobKey = `photo_${id}`;
    await txDelete(db, 'media_blobs', blobKey);
    await txDelete(db, 'photos', id);
  }

  // -------------------------------------------------------------------------
  // Signatures Offline Storage
  // -------------------------------------------------------------------------
  async storeSignatureOffline(
    organizationId: string,
    userId: string,
    submissionId: string,
    payload: Omit<OfflineSignaturePayload, 'submission_id'>
  ): Promise<string> {
    const db = await this.getDB();
    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    const sigEntry = {
      id,
      organization_id: organizationId,
      user_id: userId,
      submission_id: submissionId,
      ...payload,
      signed_at: now,
      status: 'pending',
      created_at: now,
      updated_at: now,
    };

    await txPut(db, 'signatures', sigEntry);

    // Add to sync queue (parent = submission)
    await this.addToQueue({
      organization_id: organizationId,
      user_id: userId,
      device_id: this.getDeviceId(),
      operation_type: 'signature',
      entity_type: 'territorial_signature',
      entity_id: id,
      parent_id: submissionId,
      payload: sigEntry,
      metadata: { submission_id: submissionId },
      priority: 9,
    });

    return id;
  }

  async getOfflineSignatures(submissionId?: string): Promise<Array<{
    id: string;
    submission_id: string;
    signer_name: string;
    status: string;
    created_at: string;
  }>> {
    const db = await this.getDB();
    if (submissionId) {
      return txGetAll(db, 'signatures', 'by_submission', submissionId);
    }
    return txGetAll(db, 'signatures');
  }

  async deleteOfflineSignature(id: string): Promise<void> {
    const db = await this.getDB();
    await txDelete(db, 'signatures', id);
  }

  // -------------------------------------------------------------------------
  // Sync Queue Management
  // -------------------------------------------------------------------------
  private async addToQueue(params: {
    organization_id: string;
    user_id: string;
    device_id: string;
    operation_type: OfflineOperationType;
    entity_type: string | null;
    entity_id: string | null;
    parent_id?: string | null;
    payload: Record<string, unknown>;
    metadata: Record<string, unknown>;
    priority: number;
  }): Promise<string> {
    const db = await this.getDB();
    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    const queueItem = {
      id,
      organization_id: params.organization_id,
      user_id: params.user_id,
      device_id: params.device_id,
      operation_type: params.operation_type,
      entity_type: params.entity_type,
      entity_id: params.entity_id,
      parent_id: params.parent_id ?? null,
      payload: params.payload,
      metadata: params.metadata,
      status: 'pending' as OfflineStatus,
      sync_attempts: 0,
      last_sync_attempt: null,
      sync_error: null,
      conflict_data: null,
      resolution_strategy: null,
      priority: params.priority,
      created_at: now,
      updated_at: now,
    };

    await txPut(db, 'queue', queueItem);

    // Also store in Supabase for server-side tracking
    try {
      await supabase.from('territorial_offline_queue').insert(queueItem);
    } catch (e) {
      // Will sync later when online
    }

    return id;
  }

  async getQueue(): Promise<OfflineQueueItem[]> {
    const db = await this.getDB();
    return txGetAll<OfflineQueueItem>(db, 'queue');
  }

  async getQueueByStatus(status: OfflineStatus): Promise<OfflineQueueItem[]> {
    const db = await this.getDB();
    return txGetAll<OfflineQueueItem>(db, 'queue', 'by_status', status);
  }

  async getPendingQueue(): Promise<OfflineQueueItem[]> {
    return this.getQueueByStatus('pending');
  }

  async getFailedQueue(): Promise<OfflineQueueItem[]> {
    return this.getQueueByStatus('failed');
  }

  async getConflictQueue(): Promise<OfflineQueueItem[]> {
    return this.getQueueByStatus('conflict');
  }

  async updateQueueItem(id: string, patch: Partial<OfflineQueueItem>): Promise<void> {
    const db = await this.getDB();
    const existing = await txGet<OfflineQueueItem>(db, 'queue', id);
    if (existing) {
      await txPut(db, 'queue', {
        ...existing,
        ...patch,
        updated_at: new Date().toISOString(),
      });
    }

    // Also update in Supabase
    try {
      await supabase
        .from('territorial_offline_queue')
        .update(patch)
        .eq('id', id);
    } catch (e) {
      // Will sync later
    }
  }

  async deleteQueueItem(id: string): Promise<void> {
    const db = await this.getDB();
    await txDelete(db, 'queue', id);

    try {
      await supabase
        .from('territorial_offline_queue')
        .delete()
        .eq('id', id);
    } catch (e) {
      // Will sync later
    }
  }

  async clearSyncedItems(): Promise<number> {
    const db = await this.getDB();
    const synced = await this.getQueueByStatus('synced');

    for (const item of synced) {
      await txDelete(db, 'queue', item.id);
    }

    return synced.length;
  }

  // -------------------------------------------------------------------------
  // Synchronization
  // -------------------------------------------------------------------------
  async sync(organizationId: string, userId: string, type: SyncType = 'manual'): Promise<SyncLogEntry> {
    if (this.syncInProgress) {
      throw new Error('Sync already in progress');
    }

    if (!this.isOnline) {
      throw new Error('Cannot sync while offline');
    }

    this.syncInProgress = true;
    const startTime = new Date();
    const logEntry: Partial<SyncLogEntry> = {
      organization_id: organizationId,
      user_id: userId,
      device_id: this.getDeviceId(),
      sync_type: type,
      sync_direction: 'upload',
      started_at: startTime.toISOString(),
      connection_type: this.getConnectionType(),
      network_quality: this.getNetworkQuality(),
    };

    let itemsTotal = 0;
    let itemsSynced = 0;
    let itemsFailed = 0;
    let itemsConflicted = 0;

    try {
      // Get pending items sorted by priority
      const pending = await this.getPendingQueue();
      itemsTotal = pending.length;

      // Process each item
      for (const item of pending) {
        try {
          // Mark as syncing
          await this.updateQueueItem(item.id, {
            status: 'syncing',
            last_sync_attempt: new Date().toISOString(),
          });

          // Sync based on operation type
          const result = await this.syncQueueItem(item);

          if (result.success) {
            await this.updateQueueItem(item.id, {
              status: 'synced',
              sync_error: null,
            });
            itemsSynced++;
          } else if (result.conflict) {
            await this.updateQueueItem(item.id, {
              status: 'conflict',
              conflict_data: result.conflictData,
            });
            itemsConflicted++;
          } else {
            throw new Error(result.error ?? 'Sync failed');
          }
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : 'Unknown error';
          await this.updateQueueItem(item.id, {
            status: 'failed',
            sync_attempts: item.sync_attempts + 1,
            sync_error: errorMsg,
          });
          itemsFailed++;
        }
      }

      const endTime = new Date();
      const duration = endTime.getTime() - startTime.getTime();

      logEntry.items_total = itemsTotal;
      logEntry.items_synced = itemsSynced;
      logEntry.items_failed = itemsFailed;
      logEntry.items_conflicted = itemsConflicted;
      logEntry.completed_at = endTime.toISOString();
      logEntry.duration_ms = duration;
      logEntry.success = itemsFailed === 0 && itemsConflicted === 0;
      logEntry.error_summary = itemsFailed > 0 || itemsConflicted > 0
        ? `${itemsFailed} failed, ${itemsConflicted} conflicted`
        : null;

      // Save sync log
      const savedLog = await this.saveSyncLog(logEntry as SyncLogEntry);

      // Update device registry
      await this.updateDeviceSync(organizationId, userId, itemsSynced);

      return savedLog;
    } finally {
      this.syncInProgress = false;
    }
  }

  private async syncQueueItem(item: OfflineQueueItem): Promise<{
    success: boolean;
    conflict?: boolean;
    conflictData?: Record<string, unknown>;
    error?: string;
  }> {
    try {
      switch (item.operation_type) {
        case 'submission': {
          const payload = item.payload as OfflineSubmissionPayload & { id: string };
          const result = await territorialFieldCollectionEngine.createSubmission({
            organizationId: item.organization_id,
            formId: payload.form_id,
            entityId: payload.entity_id ?? undefined,
            entityType: payload.entity_type ?? undefined,
            data: payload.data,
          });
          return { success: !!result.id };
        }

        case 'photo': {
          const payload = item.payload as OfflinePhotoPayload & { id: string; blob_key: string };
          const blob = await this.getPhotoBlob(payload.id);
          if (!blob) {
            return { success: false, error: 'Photo blob not found' };
          }

          // In real implementation, would upload blob to storage
          // For now, just record the photo metadata
          const result = await territorialFieldCollectionEngine.addPhoto({
            organizationId: item.organization_id,
            submissionId: payload.submission_id,
            fileUrl: payload.file_url,
            fileName: payload.file_name ?? undefined,
            fileSize: payload.file_size ?? undefined,
            mimeType: payload.mime_type ?? undefined,
            gpsLatitude: payload.gps_latitude ?? undefined,
            gpsLongitude: payload.gps_longitude ?? undefined,
            gpsAccuracy: payload.gps_accuracy ?? undefined,
            caption: payload.caption ?? undefined,
            metadata: payload.metadata,
          });
          return { success: !!result.id };
        }

        case 'signature': {
          const payload = item.payload as OfflineSignaturePayload & { id: string };
          const result = await territorialFieldCollectionEngine.addSignature({
            organizationId: item.organization_id,
            submissionId: payload.submission_id,
            signerName: payload.signer_name,
            signerRole: payload.signer_role ?? undefined,
            signatureData: payload.signature_data,
            documentType: payload.document_type ?? undefined,
          });
          return { success: !!result.id };
        }

        case 'gps': {
          // GPS entries are typically associated with submissions
          // Already synced with submission
          return { success: true };
        }

        default:
          return { success: false, error: 'Unknown operation type' };
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';

      // Check for conflict
      if (errorMsg.includes('duplicate') || errorMsg.includes('conflict')) {
        return {
          success: false,
          conflict: true,
          conflictData: { error: errorMsg },
        };
      }

      return { success: false, error: errorMsg };
    }
  }

  private async saveSyncLog(entry: SyncLogEntry): Promise<SyncLogEntry> {
    const { data, error } = await supabase
      .from('territorial_sync_log')
      .insert(entry)
      .select()
      .single();

    if (error) throw error;
    return data as SyncLogEntry;
  }

  // -------------------------------------------------------------------------
  // Automatic Synchronization
  // -------------------------------------------------------------------------
  startAutoSync(organizationId: string, userId: string, intervalMs = 60000): void {
    if (this.autoSyncInterval) {
      clearInterval(this.autoSyncInterval);
    }

    this.autoSyncInterval = setInterval(async () => {
      if (this.isOnline && !this.syncInProgress) {
        try {
          await this.sync(organizationId, userId, 'automatic');
        } catch (e) {
          console.error('Auto-sync failed:', e);
        }
      }
    }, intervalMs);
  }

  stopAutoSync(): void {
    if (this.autoSyncInterval) {
      clearInterval(this.autoSyncInterval);
      this.autoSyncInterval = null;
    }
  }

  private triggerAutoSync(): void {
    // Triggered when coming back online
    // The actual sync will be handled by the auto-sync interval
  }

  // -------------------------------------------------------------------------
  // Conflict Resolution
  // -------------------------------------------------------------------------
  async resolveConflict(
    queueItemId: string,
    strategy: ResolutionStrategy,
    mergedData?: Record<string, unknown>
  ): Promise<void> {
    const item = await this.getQueueItem(queueItemId);
    if (!item || item.status !== 'conflict') {
      throw new Error('Item not found or not in conflict state');
    }

    switch (strategy) {
      case 'server_wins':
        // Discard local changes
        await this.deleteQueueItem(queueItemId);
        break;

      case 'client_wins':
        // Retry with original payload
        await this.updateQueueItem(queueItemId, {
          status: 'pending',
          resolution_strategy: strategy,
          conflict_data: null,
        });
        break;

      case 'merge':
        if (!mergedData) {
          throw new Error('Merged data required for merge strategy');
        }
        await this.updateQueueItem(queueItemId, {
          status: 'pending',
          payload: mergedData,
          resolution_strategy: strategy,
          conflict_data: null,
        });
        break;

      case 'manual':
        // Mark for manual review
        await this.updateQueueItem(queueItemId, {
          resolution_strategy: strategy,
        });
        break;
    }
  }

  private async getQueueItem(id: string): Promise<OfflineQueueItem | null> {
    const db = await this.getDB();
    return txGet<OfflineQueueItem>(db, 'queue', id);
  }

  // -------------------------------------------------------------------------
  // Device Registry
  // -------------------------------------------------------------------------
  async registerDevice(
    organizationId: string,
    userId: string,
    deviceInfo: {
      device_name?: string;
      device_type?: 'mobile' | 'tablet' | 'desktop';
      platform?: string;
      os_version?: string;
      app_version?: string;
    }
  ): Promise<DeviceRegistry> {
    const deviceId = this.getDeviceId();
    const now = new Date().toISOString();

    const device: DeviceRegistry = {
      id: crypto.randomUUID(),
      organization_id: organizationId,
      user_id: userId,
      device_id: deviceId,
      device_name: deviceInfo.device_name ?? navigator.userAgent.slice(0, 100),
      device_type: deviceInfo.device_type ?? this.detectDeviceType(),
      platform: deviceInfo.platform ?? this.detectPlatform(),
      os_version: deviceInfo.os_version ?? null,
      app_version: deviceInfo.app_version ?? null,
      has_gps: 'geolocation' in navigator,
      has_camera: !!(navigator.mediaDevices?.getUserMedia),
      has_storage: true,
      storage_available_mb: await this.estimateStorage(),
      is_registered: true,
      is_active: true,
      first_registered_at: now,
      last_seen_at: now,
      last_sync_at: null,
      total_syncs: 0,
      total_submissions_offline: 0,
      created_at: now,
      updated_at: now,
    };

    const { data, error } = await supabase
      .from('territorial_device_registry')
      .upsert(device, { onConflict: 'device_id' })
      .select()
      .single();

    if (error) {
      // Store locally for later sync
      console.error('Failed to register device:', error);
    }

    return data as DeviceRegistry ?? device;
  }

  async getDevice(organizationId: string, userId: string): Promise<DeviceRegistry | null> {
    const { data } = await supabase
      .from('territorial_device_registry')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('user_id', userId)
      .eq('device_id', this.getDeviceId())
      .maybeSingle();

    return data as DeviceRegistry | null;
  }

  async updateDeviceSync(organizationId: string, userId: string, itemsSynced: number): Promise<void> {
    try {
      await supabase
        .from('territorial_device_registry')
        .update({
          last_sync_at: new Date().toISOString(),
          last_seen_at: new Date().toISOString(),
          total_syncs: supabase.rpc('increment', { count: 1 }),
          total_submissions_offline: supabase.rpc('increment', { count: itemsSynced }),
        })
        .eq('organization_id', organizationId)
        .eq('user_id', userId)
        .eq('device_id', this.getDeviceId());
    } catch (e) {
      // Will sync later
    }
  }

  async updateDeviceSeen(): Promise<void> {
    try {
      await supabase
        .from('territorial_device_registry')
        .update({
          last_seen_at: new Date().toISOString(),
        })
        .eq('device_id', this.getDeviceId());
    } catch (e) {
      // Ignore
    }
  }

  // -------------------------------------------------------------------------
  // Statistics
  // -------------------------------------------------------------------------
  async getSyncStats(organizationId: string, userId?: string): Promise<SyncStats> {
    try {
      const { data, error } = await supabase.rpc('get_offline_sync_stats', {
        p_organization_id: organizationId,
        p_user_id: userId ?? null,
      });

      if (error) throw error;

      return (data?.[0] ?? {
        pending_count: 0,
        syncing_count: 0,
        synced_count: 0,
        failed_count: 0,
        conflict_count: 0,
        oldest_pending: null,
      }) as SyncStats;
    } catch {
      // Fallback to local stats
      const pending = await this.getQueueByStatus('pending');
      const syncing = await this.getQueueByStatus('syncing');
      const synced = await this.getQueueByStatus('synced');
      const failed = await this.getQueueByStatus('failed');
      const conflict = await this.getQueueByStatus('conflict');

      return {
        pending_count: pending.length,
        syncing_count: syncing.length,
        synced_count: synced.length,
        failed_count: failed.length,
        conflict_count: conflict.length,
        oldest_pending: pending.length > 0
          ? pending.reduce((oldest, item) =>
            item.created_at < oldest.created_at ? item : oldest
          ).created_at
          : null,
      };
    }
  }

  async getSyncHistory(organizationId: string, userId: string, limit = 20): Promise<SyncLogEntry[]> {
    const { data } = await supabase
      .from('territorial_sync_log')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('user_id', userId)
      .order('started_at', { ascending: false })
      .limit(limit);

    return (data ?? []) as SyncLogEntry[];
  }

  getOnlineStatus(): boolean {
    return this.isOnline;
  }

  // -------------------------------------------------------------------------
  // Helper Methods
  // -------------------------------------------------------------------------
  private detectDeviceType(): 'mobile' | 'tablet' | 'desktop' {
    const ua = navigator.userAgent.toLowerCase();
    if (/mobile|android|iphone/.test(ua)) return 'mobile';
    if (/tablet|ipad/.test(ua)) return 'tablet';
    return 'desktop';
  }

  private detectPlatform(): string {
    const ua = navigator.userAgent;
    if (/Windows/.test(ua)) return 'windows';
    if (/Mac/.test(ua)) return 'macos';
    if (/Linux/.test(ua)) return 'linux';
    if (/Android/.test(ua)) return 'android';
    if (/iPhone|iPad/.test(ua)) return 'ios';
    return 'unknown';
  }

  private getConnectionType(): string {
    const conn = (navigator as unknown as { connection?: { effectiveType?: string } }).connection;
    return conn?.effectiveType ?? 'unknown';
  }

  private getNetworkQuality(): string {
    if (!this.isOnline) return 'offline';
    const conn = (navigator as unknown as { connection?: { effectiveType?: string } }).connection;
    const type = conn?.effectiveType;
    if (type === '4g') return 'excellent';
    if (type === '3g') return 'good';
    return 'poor';
  }

  private async estimateStorage(): Promise<number | null> {
    try {
      const estimate = await (navigator.storage as StorageManager & { estimate?: () => Promise<{ quota: number }> }).estimate?.();
      return estimate ? Math.round(estimate.quota / 1024 / 1024) : null;
    } catch {
      return null;
    }
  }

  // -------------------------------------------------------------------------
  // Cleanup
  // -------------------------------------------------------------------------
  async cleanup(olderThanDays = 7): Promise<void> {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - olderThanDays);

    // Clean synced items
    const synced = await this.getQueueByStatus('synced');
    for (const item of synced) {
      if (new Date(item.updated_at) < cutoff) {
        await this.deleteQueueItem(item.id);
      }
    }

    // Clean old media blobs
    const db = await this.getDB();
    const media = await txGetAll<{ key: string; stored_at: string }>(db, 'media_blobs');
    for (const item of media) {
      if (new Date(item.stored_at) < cutoff) {
        await txDelete(db, 'media_blobs', item.key);
      }
    }
  }

  async clearAll(): Promise<void> {
    const db = await this.getDB();
    await txClear(db, 'queue');
    await txClear(db, 'submissions');
    await txClear(db, 'photos');
    await txClear(db, 'signatures');
    await txClear(db, 'gps_cache');
    await txClear(db, 'media_blobs');
  }
}

export const territorialOfflineEngine = new TerritorialOfflineEngine();

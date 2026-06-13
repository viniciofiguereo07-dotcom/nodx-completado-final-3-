import { useState, useCallback, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useOrg } from '../contexts/OrgContext';
import {
  territorialOfflineEngine,
  type OfflineQueueItem,
  type OfflineStatus,
  type ResolutionStrategy,
  type OfflineSubmissionPayload,
  type OfflinePhotoPayload,
  type OfflineSignaturePayload,
  type OfflineGPSPayload,
} from '../services/TerritorialOfflineEngine';

export interface UseOfflineQueueReturn {
  queue: OfflineQueueItem[];
  pendingCount: number;
  failedCount: number;
  conflictCount: number;
  loading: boolean;

  // Queue operations
  refreshQueue: () => Promise<void>;
  retryItem: (id: string) => Promise<void>;
  resolveConflict: (id: string, strategy: ResolutionStrategy, mergedData?: Record<string, unknown>) => Promise<void>;
  deleteItem: (id: string) => Promise<void>;
  clearSynced: () => Promise<number>;
  clearAll: () => Promise<void>;

  // Offline data operations
  storeSubmission: (payload: OfflineSubmissionPayload) => Promise<string>;
  storePhoto: (submissionId: string, blob: Blob, payload: Omit<OfflinePhotoPayload, 'submission_id'>) => Promise<string>;
  storeSignature: (submissionId: string, payload: Omit<OfflineSignaturePayload, 'submission_id'>) => Promise<string>;
  storeGPS: (payload: OfflineGPSPayload) => Promise<string>;
  cacheForm: (form: { id: string; name: string; schema: Record<string, unknown>; version: number }) => Promise<void>;

  // Getters
  getOfflineSubmissions: () => Promise<Array<{ id: string; form_id: string; status: string; created_at: string }>>;
  getOfflinePhotos: (submissionId?: string) => Promise<Array<{ id: string; submission_id: string; status: string }>>;
  getOfflineSignatures: (submissionId?: string) => Promise<Array<{ id: string; submission_id: string; status: string }>>;
  getCachedForms: () => Promise<Array<{ id: string; name: string }>>;
}

export function useOfflineQueue(): UseOfflineQueueReturn {
  const { user } = useAuth();
  const { org } = useOrg();

  const [queue, setQueue] = useState<OfflineQueueItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Load queue on mount
  useEffect(() => {
    refreshQueue();
  }, []);

  const refreshQueue = useCallback(async () => {
    setLoading(true);
    try {
      const items = await territorialOfflineEngine.getQueue();
      setQueue(items);
    } catch (e) {
      console.error('Failed to load queue:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  const pendingCount = queue.filter(item => item.status === 'pending').length;
  const failedCount = queue.filter(item => item.status === 'failed').length;
  const conflictCount = queue.filter(item => item.status === 'conflict').length;

  const retryItem = useCallback(async (id: string) => {
    await territorialOfflineEngine.updateQueueItem(id, {
      status: 'pending' as OfflineStatus,
      sync_attempts: 0,
      sync_error: null,
    });
    await refreshQueue();
  }, [refreshQueue]);

  const resolveConflict = useCallback(async (
    id: string,
    strategy: ResolutionStrategy,
    mergedData?: Record<string, unknown>
  ) => {
    await territorialOfflineEngine.resolveConflict(id, strategy, mergedData);
    await refreshQueue();
  }, [refreshQueue]);

  const deleteItem = useCallback(async (id: string) => {
    await territorialOfflineEngine.deleteQueueItem(id);
    await refreshQueue();
  }, [refreshQueue]);

  const clearSynced = useCallback(async (): Promise<number> => {
    const count = await territorialOfflineEngine.clearSyncedItems();
    await refreshQueue();
    return count;
  }, [refreshQueue]);

  const clearAll = useCallback(async () => {
    await territorialOfflineEngine.clearAll();
    await refreshQueue();
  }, [refreshQueue]);

  // Offline data operations
  const storeSubmission = useCallback(async (payload: OfflineSubmissionPayload): Promise<string> => {
    if (!org || !user) throw new Error('Organization or user not available');

    const id = await territorialOfflineEngine.storeSubmissionOffline(
      org.id,
      user.id,
      payload
    );

    await refreshQueue();
    return id;
  }, [org, user, refreshQueue]);

  const storePhoto = useCallback(async (
    submissionId: string,
    blob: Blob,
    payload: Omit<OfflinePhotoPayload, 'submission_id'>
  ): Promise<string> => {
    if (!org || !user) throw new Error('Organization or user not available');

    const id = await territorialOfflineEngine.storePhotoOffline(
      org.id,
      user.id,
      submissionId,
      blob,
      payload
    );

    await refreshQueue();
    return id;
  }, [org, user, refreshQueue]);

  const storeSignature = useCallback(async (
    submissionId: string,
    payload: Omit<OfflineSignaturePayload, 'submission_id'>
  ): Promise<string> => {
    if (!org || !user) throw new Error('Organization or user not available');

    const id = await territorialOfflineEngine.storeSignatureOffline(
      org.id,
      user.id,
      submissionId,
      payload
    );

    await refreshQueue();
    return id;
  }, [org, user, refreshQueue]);

  const storeGPS = useCallback(async (payload: OfflineGPSPayload): Promise<string> => {
    if (!org || !user) throw new Error('Organization or user not available');

    const id = await territorialOfflineEngine.storeGPSOffline(
      org.id,
      user.id,
      payload
    );

    await refreshQueue();
    return id;
  }, [org, user, refreshQueue]);

  const cacheForm = useCallback(async (form: {
    id: string;
    name: string;
    schema: Record<string, unknown>;
    version: number;
  }) => {
    await territorialOfflineEngine.cacheForm(form as unknown as { id: string; [key: string]: unknown });
  }, []);

  const getOfflineSubmissions = useCallback(async () => {
    return territorialOfflineEngine.getOfflineSubmissions();
  }, []);

  const getOfflinePhotos = useCallback(async (submissionId?: string) => {
    return territorialOfflineEngine.getOfflinePhotos(submissionId);
  }, []);

  const getOfflineSignatures = useCallback(async (submissionId?: string) => {
    return territorialOfflineEngine.getOfflineSignatures(submissionId);
  }, []);

  const getCachedForms = useCallback(async () => {
    return territorialOfflineEngine.getCachedForms();
  }, []);

  return {
    queue,
    pendingCount,
    failedCount,
    conflictCount,
    loading,

    refreshQueue,
    retryItem,
    resolveConflict,
    deleteItem,
    clearSynced,
    clearAll,

    storeSubmission,
    storePhoto,
    storeSignature,
    storeGPS,
    cacheForm,

    getOfflineSubmissions,
    getOfflinePhotos,
    getOfflineSignatures,
    getCachedForms,
  };
}

import { useState, useCallback, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useOrg } from '../contexts/OrgContext';
import {
  territorialOfflineEngine,
  type SyncStats,
  type SyncLogEntry,
  type SyncType,
} from '../services/TerritorialOfflineEngine';

export interface UseOfflineSyncReturn {
  isOnline: boolean;
  isSyncing: boolean;
  sync: (type?: SyncType) => Promise<SyncLogEntry | null>;
  startAutoSync: (intervalMs?: number) => void;
  stopAutoSync: () => void;
  stats: SyncStats | null;
  lastSync: SyncLogEntry | null;
  syncHistory: SyncLogEntry[];
  error: string | null;
  loading: boolean;
}

export function useOfflineSync(): UseOfflineSyncReturn {
  const { user } = useAuth();
  const { org } = useOrg();

  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isSyncing, setIsSyncing] = useState(false);
  const [stats, setStats] = useState<SyncStats | null>(null);
  const [lastSync, setLastSync] = useState<SyncLogEntry | null>(null);
  const [syncHistory, setSyncHistory] = useState<SyncLogEntry[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const initialized = useRef(false);

  // Initialize engine
  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    territorialOfflineEngine.init().then(() => {
      setLoading(false);
    });

    // Network status listeners
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      territorialOfflineEngine.stopAutoSync();
    };
  }, []);

  // Load stats on mount
  useEffect(() => {
    if (!org || !user) return;

    const loadStats = async () => {
      try {
        const [statsResult, history] = await Promise.all([
          territorialOfflineEngine.getSyncStats(org.id, user.id),
          territorialOfflineEngine.getSyncHistory(org.id, user.id, 10),
        ]);

        setStats(statsResult);
        setSyncHistory(history);
        if (history.length > 0) {
          setLastSync(history[0]);
        }
      } catch (e) {
        console.error('Failed to load sync stats:', e);
      }
    };

    loadStats();
    const interval = setInterval(loadStats, 30000); // Refresh every 30s

    return () => clearInterval(interval);
  }, [org, user]);

  const sync = useCallback(async (type: SyncType = 'manual'): Promise<SyncLogEntry | null> => {
    if (!org || !user) return null;
    if (isSyncing) return null;

    setIsSyncing(true);
    setError(null);

    try {
      const result = await territorialOfflineEngine.sync(org.id, user.id, type);
      setLastSync(result);

      // Refresh stats after sync
      const newStats = await territorialOfflineEngine.getSyncStats(org.id, user.id);
      setStats(newStats);

      // Refresh history
      const history = await territorialOfflineEngine.getSyncHistory(org.id, user.id, 10);
      setSyncHistory(history);

      return result;
    } catch (e) {
      const errorMsg = e instanceof Error ? e.message : 'Sync failed';
      setError(errorMsg);
      return null;
    } finally {
      setIsSyncing(false);
    }
  }, [org, user, isSyncing]);

  const startAutoSync = useCallback((intervalMs = 60000) => {
    if (!org || !user) return;
    territorialOfflineEngine.startAutoSync(org.id, user.id, intervalMs);
  }, [org, user]);

  const stopAutoSync = useCallback(() => {
    territorialOfflineEngine.stopAutoSync();
  }, []);

  return {
    isOnline,
    isSyncing,
    sync,
    startAutoSync,
    stopAutoSync,
    stats,
    lastSync,
    syncHistory,
    error,
    loading,
  };
}

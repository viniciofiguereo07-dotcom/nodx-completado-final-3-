import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useOrg } from '../contexts/OrgContext';
import {
  territorialOfflineEngine,
  type DeviceRegistry,
  type SyncStats,
} from '../services/TerritorialOfflineEngine';

export interface OfflineStatus {
  isOnline: boolean;
  isInitialized: boolean;
  deviceId: string | null;
  device: DeviceRegistry | null;
  stats: SyncStats | null;
}

export interface UseOfflineStatusReturn {
  status: OfflineStatus;
  registerDevice: (deviceInfo?: {
    device_name?: string;
    device_type?: 'mobile' | 'tablet' | 'desktop';
    platform?: string;
    os_version?: string;
    app_version?: string;
  }) => Promise<DeviceRegistry | null>;
  refreshStatus: () => Promise<void>;
  isOfflineCapable: boolean;
}

export function useOfflineStatus(): UseOfflineStatusReturn {
  const { user } = useAuth();
  const { org } = useOrg();

  const [status, setStatus] = useState<OfflineStatus>({
    isOnline: navigator.onLine,
    isInitialized: false,
    deviceId: null,
    device: null,
    stats: null,
  });

  // Initialize and listen for status changes
  useEffect(() => {
    let mounted = true;

    const init = async () => {
      await territorialOfflineEngine.init();

      if (!mounted) return;

      setStatus(prev => ({
        ...prev,
        isInitialized: true,
        deviceId: territorialOfflineEngine.getDeviceId(),
        isOnline: territorialOfflineEngine.getOnlineStatus(),
      }));
    };

    init();

    // Listener for online/offline
    const handleOnline = () => {
      setStatus(prev => ({ ...prev, isOnline: true }));
    };

    const handleOffline = () => {
      setStatus(prev => ({ ...prev, isOnline: false }));
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Update device seen periodically
    const seenInterval = setInterval(() => {
      territorialOfflineEngine.updateDeviceSeen().catch(() => {});
    }, 60000);

    return () => {
      mounted = false;
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(seenInterval);
    };
  }, []);

  // Load device and stats when org/user available
  useEffect(() => {
    if (!org || !user || !status.isInitialized) return;

    const loadDeviceData = async () => {
      try {
        const [device, stats] = await Promise.all([
          territorialOfflineEngine.getDevice(org.id, user.id),
          territorialOfflineEngine.getSyncStats(org.id, user.id),
        ]);

        setStatus(prev => ({
          ...prev,
          device,
          stats,
        }));
      } catch (e) {
        console.error('Failed to load device data:', e);
      }
    };

    loadDeviceData();
  }, [org, user, status.isInitialized]);

  const registerDevice = useCallback(async (deviceInfo?: {
    device_name?: string;
    device_type?: 'mobile' | 'tablet' | 'desktop';
    platform?: string;
    os_version?: string;
    app_version?: string;
  }): Promise<DeviceRegistry | null> => {
    if (!org || !user) return null;

    try {
      const device = await territorialOfflineEngine.registerDevice(
        org.id,
        user.id,
        deviceInfo ?? {}
      );

      setStatus(prev => ({ ...prev, device }));
      return device;
    } catch (e) {
      console.error('Failed to register device:', e);
      return null;
    }
  }, [org, user]);

  const refreshStatus = useCallback(async () => {
    if (!org || !user) return;

    try {
      const [stats, device] = await Promise.all([
        territorialOfflineEngine.getSyncStats(org.id, user.id),
        territorialOfflineEngine.getDevice(org.id, user.id),
      ]);

      setStatus(prev => ({
        ...prev,
        stats,
        device,
        isOnline: territorialOfflineEngine.getOnlineStatus(),
      }));
    } catch (e) {
      console.error('Failed to refresh status:', e);
    }
  }, [org, user]);

  // Check if device is offline capable
  const isOfflineCapable = status.device?.has_gps === true &&
    status.device?.has_storage === true;

  return {
    status,
    registerDevice,
    refreshStatus,
    isOfflineCapable: isOfflineCapable ?? true, // Default to true
  };
}

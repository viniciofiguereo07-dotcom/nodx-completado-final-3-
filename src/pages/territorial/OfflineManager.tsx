import { useState, useEffect } from 'react';
import {
  Wifi, WifiOff, RefreshCw, Clock, CheckCircle, XCircle, AlertTriangle,
  Smartphone, MapPin, Camera, FileText, PenTool, HardDrive, Settings,
  ChevronDown, ChevronRight, Trash2, Play, Pause, Download, Upload,
  Monitor, Tablet, AlertCircle, CheckCircle2, X, Archive,
  Merge, Server, User, History,
} from 'lucide-react';
import { useOrg } from '../../contexts/OrgContext';
import { useAuth } from '../../contexts/AuthContext';
import { PageHeader } from '../../components/common/PageHeader';
import { EmptyState } from '../../components/common/EmptyState';
import { Modal } from '../../components/common/Modal';
import { useOfflineSync } from '../../hooks/useOfflineSync';
import { useOfflineQueue } from '../../hooks/useOfflineQueue';
import { useOfflineStatus } from '../../hooks/useOfflineStatus';
import type { OfflineQueueItem, SyncLogEntry, ResolutionStrategy } from '../../services/TerritorialOfflineEngine';

const STATUS_COLORS = {
  pending: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200', dot: 'bg-blue-500' },
  syncing: { bg: 'bg-yellow-50', text: 'text-yellow-700', border: 'border-yellow-200', dot: 'bg-yellow-500' },
  synced: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', dot: 'bg-emerald-500' },
  failed: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200', dot: 'bg-red-500' },
  conflict: { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200', dot: 'bg-orange-500' },
};

const OPERATION_ICONS = {
  submission: FileText,
  photo: Camera,
  signature: PenTool,
  gps: MapPin,
  form_response: FileText,
};

// ChevronUp component
function ChevronUp({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
    </svg>
  );
}

// Connection Status Indicator
function ConnectionStatus({ isOnline, isSyncing }: { isOnline: boolean; isSyncing: boolean }) {
  return (
    <div className={`flex items-center gap-2 px-4 py-2 rounded-xl ${isOnline ? 'bg-emerald-50' : 'bg-gray-100'}`}>
      {isOnline ? (
        <Wifi className="w-5 h-5 text-emerald-600" />
      ) : (
        <WifiOff className="w-5 h-5 text-gray-400" />
      )}
      <div>
        <div className={`text-sm font-semibold ${isOnline ? 'text-emerald-700' : 'text-gray-500'}`}>
          {isOnline ? 'Online' : 'Offline'}
        </div>
        {isSyncing && (
          <div className="text-xs text-yellow-600">Syncing...</div>
        )}
      </div>
    </div>
  );
}

// Queue Item Card
function QueueItemCard({
  item,
  onRetry,
  onDelete,
  onResolve,
}: {
  item: OfflineQueueItem;
  onRetry: () => void;
  onDelete: () => void;
  onResolve: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const colors = STATUS_COLORS[item.status];
  const Icon = OPERATION_ICONS[item.operation_type] || FileText;

  return (
    <div className={`bg-white rounded-lg border ${colors.border}`}>
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${colors.bg}`}>
            <Icon className={`w-4 h-4 ${colors.text}`} />
          </div>
          <div className="text-left">
            <div className="font-medium text-gray-800 capitalize">
              {item.operation_type.replace(/_/g, ' ')}
            </div>
            <div className="text-xs text-gray-500">
              {new Date(item.created_at).toLocaleString()}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${colors.bg} ${colors.text}`}>
            {item.status}
          </span>
          {expanded ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
        </div>
      </button>

      {expanded && (
        <div className="p-4 pt-0 border-t border-gray-100 space-y-3">
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <span className="text-gray-500">Entity Type:</span>
              <span className="ml-1 text-gray-700">{item.entity_type || '-'}</span>
            </div>
            <div>
              <span className="text-gray-500">Entity ID:</span>
              <span className="ml-1 text-gray-700 font-mono">{item.entity_id?.slice(0, 8) || '-'}</span>
            </div>
            <div>
              <span className="text-gray-500">Attempts:</span>
              <span className="ml-1 text-gray-700">{item.sync_attempts}</span>
            </div>
            <div>
              <span className="text-gray-500">Priority:</span>
              <span className="ml-1 text-gray-700">{item.priority}</span>
            </div>
          </div>

          {item.sync_error && (
            <div className="p-2 bg-red-50 rounded text-xs text-red-600">
              {item.sync_error}
            </div>
          )}

          {item.status === 'failed' && (
            <div className="flex gap-2">
              <button
                onClick={onRetry}
                className="flex items-center gap-1 px-3 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700"
              >
                <RefreshCw className="w-3 h-3" /> Retry
              </button>
              <button
                onClick={onDelete}
                className="flex items-center gap-1 px-3 py-1 bg-gray-200 text-gray-700 text-xs rounded hover:bg-gray-300"
              >
                <Trash2 className="w-3 h-3" /> Delete
              </button>
            </div>
          )}

          {item.status === 'conflict' && (
            <button
              onClick={onResolve}
              className="flex items-center gap-1 px-3 py-1 bg-orange-600 text-white text-xs rounded hover:bg-orange-700"
            >
              <Merge className="w-3 h-3" /> Resolve Conflict
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// Sync Log Entry
function SyncLogCard({ log }: { log: SyncLogEntry }) {
  const isSuccess = log.success;
  const duration = log.duration_ms ? `${(log.duration_ms / 1000).toFixed(1)}s` : '-';

  return (
    <div className={`p-3 rounded-lg border ${isSuccess ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200'}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {isSuccess ? (
            <CheckCircle className="w-4 h-4 text-emerald-600" />
          ) : (
            <XCircle className="w-4 h-4 text-red-600" />
          )}
          <span className="text-sm font-medium capitalize">{log.sync_type} sync</span>
        </div>
        <span className="text-xs text-gray-500">{duration}</span>
      </div>
      <div className="mt-1 text-xs text-gray-500">
        {new Date(log.started_at).toLocaleString()} - {log.items_synced}/{log.items_total} synced
        {log.items_conflicted > 0 && <span className="text-orange-600 ml-1">({log.items_conflicted} conflicts)</span>}
      </div>
    </div>
  );
}

// Device Info Card
function DeviceCard({ device, onRegister }: {
  device: {
    device_name?: string | null;
    device_type?: string;
    platform?: string | null;
    has_gps?: boolean;
    has_camera?: boolean;
    has_storage?: boolean;
    storage_available_mb?: number | null;
    is_registered?: boolean;
    last_sync_at?: string | null;
  } | null;
  onRegister: () => void;
}) {
  const DeviceIcon = device?.device_type === 'mobile' ? Smartphone :
                      device?.device_type === 'tablet' ? Tablet : Monitor;

  return (
    <div className="bg-white rounded-xl border border-gray-100 p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
            <DeviceIcon className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <div className="font-medium text-gray-800">{device?.device_name || 'Unknown Device'}</div>
            <div className="text-xs text-gray-500">{device?.platform || 'Unknown platform'}</div>
          </div>
        </div>
        {device?.is_registered ? (
          <span className="px-2 py-1 bg-emerald-50 text-emerald-600 text-xs font-medium rounded">Registered</span>
        ) : (
          <button
            onClick={onRegister}
            className="px-3 py-1 bg-blue-600 text-white text-xs font-medium rounded hover:bg-blue-700"
          >
            Register
          </button>
        )}
      </div>

      <div className="grid grid-cols-3 gap-2">
        <div className={`flex items-center gap-1 text-xs ${device?.has_gps ? 'text-emerald-600' : 'text-gray-400'}`}>
          <MapPin className="w-3 h-3" /> GPS
        </div>
        <div className={`flex items-center gap-1 text-xs ${device?.has_camera ? 'text-emerald-600' : 'text-gray-400'}`}>
          <Camera className="w-3 h-3" /> Camera
        </div>
        <div className={`flex items-center gap-1 text-xs ${device?.has_storage ? 'text-emerald-600' : 'text-gray-400'}`}>
          <HardDrive className="w-3 h-3" /> Storage
        </div>
      </div>

      {device?.last_sync_at && (
        <div className="mt-2 text-xs text-gray-500">
          Last sync: {new Date(device.last_sync_at).toLocaleString()}
        </div>
      )}
    </div>
  );
}

// Conflict Resolution Modal
function ConflictResolutionModal({
  item,
  onClose,
  onResolve,
}: {
  item: OfflineQueueItem;
  onClose: () => void;
  onResolve: (strategy: ResolutionStrategy) => void;
}) {
  return (
    <Modal
      open={true}
      onClose={onClose}
      title="Resolve Conflict"
      footer={
        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg text-sm">
            Cancel
          </button>
        </div>
      }
    >
      <div className="space-y-4">
        <p className="text-sm text-gray-600">
          A conflict was detected while syncing this {item.operation_type}. Choose how to resolve:
        </p>

        <div className="space-y-2">
          <button
            onClick={() => onResolve('server_wins')}
            className="w-full flex items-center gap-3 p-3 border-2 border-gray-200 rounded-lg hover:border-blue-500 transition-colors text-left"
          >
            <Server className="w-5 h-5 text-blue-600" />
            <div>
              <div className="font-medium text-gray-800">Use Server Version</div>
              <div className="text-xs text-gray-500">Discard local changes and use server data</div>
            </div>
          </button>

          <button
            onClick={() => onResolve('client_wins')}
            className="w-full flex items-center gap-3 p-3 border-2 border-gray-200 rounded-lg hover:border-blue-500 transition-colors text-left"
          >
            <Smartphone className="w-5 h-5 text-blue-600" />
            <div>
              <div className="font-medium text-gray-800">Use Local Version</div>
              <div className="text-xs text-gray-500">Overwrite server with local data</div>
            </div>
          </button>

          <button
            onClick={() => onResolve('manual')}
            className="w-full flex items-center gap-3 p-3 border-2 border-gray-200 rounded-lg hover:border-blue-500 transition-colors text-left"
          >
            <User className="w-5 h-5 text-blue-600" />
            <div>
              <div className="font-medium text-gray-800">Manual Review</div>
              <div className="text-xs text-gray-500">Mark for manual inspection</div>
            </div>
          </button>
        </div>
      </div>
    </Modal>
  );
}

// Settings Panel
function SettingsPanel({
  autoSyncEnabled,
  onToggleAutoSync,
  autoSyncInterval,
  onSetInterval,
}: {
  autoSyncEnabled: boolean;
  onToggleAutoSync: () => void;
  autoSyncInterval: number;
  onSetInterval: (ms: number) => void;
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 p-4">
      <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
        <Settings className="w-5 h-5" /> Sync Settings
      </h3>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="font-medium text-gray-700">Automatic Sync</div>
            <div className="text-xs text-gray-500">Sync automatically when online</div>
          </div>
          <button
            onClick={onToggleAutoSync}
            className={`relative w-12 h-6 rounded-full transition-colors ${
              autoSyncEnabled ? 'bg-blue-600' : 'bg-gray-200'
            }`}
          >
            <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
              autoSyncEnabled ? 'left-7' : 'left-1'
            }`} />
          </button>
        </div>

        {autoSyncEnabled && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Sync Interval</label>
            <select
              value={autoSyncInterval}
              onChange={(e) => onSetInterval(Number(e.target.value))}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value={30000}>30 seconds</option>
              <option value={60000}>1 minute</option>
              <option value={300000}>5 minutes</option>
              <option value={600000}>10 minutes</option>
            </select>
          </div>
        )}
      </div>
    </div>
  );
}

// Main Page
export function OfflineManager() {
  const { org } = useOrg();
  const { user } = useAuth();

  const {
    isOnline,
    isSyncing,
    sync,
    startAutoSync,
    stopAutoSync,
    stats,
    syncHistory,
    error: syncError,
    loading: syncLoading,
  } = useOfflineSync();

  const {
    queue,
    pendingCount,
    failedCount,
    conflictCount,
    loading: queueLoading,
    refreshQueue,
    retryItem,
    resolveConflict,
    deleteItem,
    clearSynced,
  } = useOfflineQueue();

  const {
    status,
    registerDevice,
    refreshStatus,
  } = useOfflineStatus();

  const [autoSyncEnabled, setAutoSyncEnabled] = useState(false);
  const [autoSyncInterval, setAutoSyncInterval] = useState(60000);
  const [conflictItem, setConflictItem] = useState<OfflineQueueItem | null>(null);
  const [activeTab, setActiveTab] = useState<'pending' | 'failed' | 'conflict'>('pending');

  // Handle auto sync toggle
  useEffect(() => {
    if (autoSyncEnabled && org && user) {
      startAutoSync(autoSyncInterval);
    } else {
      stopAutoSync();
    }

    return () => stopAutoSync();
  }, [autoSyncEnabled, autoSyncInterval, org, user, startAutoSync, stopAutoSync]);

  const handleSync = async () => {
    await sync('manual');
    await refreshQueue();
    await refreshStatus();
  };

  const handleResolveConflict = async (strategy: ResolutionStrategy) => {
    if (!conflictItem) return;
    await resolveConflict(conflictItem.id, strategy);
    setConflictItem(null);
  };

  // Filter queue by status
  const filteredQueue = queue.filter(item => {
    if (activeTab === 'pending') return item.status === 'pending' || item.status === 'syncing';
    return item.status === activeTab;
  });

  return (
    <div>
      <PageHeader
        title="Offline Manager"
        subtitle="Manage offline data, synchronization, and device status"
        actions={
          <div className="flex items-center gap-3">
            <ConnectionStatus isOnline={isOnline} isSyncing={isSyncing} />
            <button
              onClick={handleSync}
              disabled={!isOnline || isSyncing}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 disabled:opacity-50"
            >
              {isSyncing ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" /> Syncing...
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4" /> Sync Now
                </>
              )}
            </button>
          </div>
        }
      />

      {syncError && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-600" />
          <span className="text-sm text-red-700">{syncError}</span>
        </div>
      )}

      <div className="space-y-6">
        {/* Stats Overview */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="bg-white rounded-xl border border-gray-100 p-4 text-center">
            <div className="w-8 h-8 mx-auto bg-blue-50 rounded-lg flex items-center justify-center mb-2">
              <Clock className="w-4 h-4 text-blue-600" />
            </div>
            <div className="text-2xl font-bold text-gray-900">{pendingCount}</div>
            <div className="text-xs text-gray-500">Pending</div>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 p-4 text-center">
            <div className="w-8 h-8 mx-auto bg-red-50 rounded-lg flex items-center justify-center mb-2">
              <XCircle className="w-4 h-4 text-red-600" />
            </div>
            <div className="text-2xl font-bold text-gray-900">{failedCount}</div>
            <div className="text-xs text-gray-500">Failed</div>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 p-4 text-center">
            <div className="w-8 h-8 mx-auto bg-orange-50 rounded-lg flex items-center justify-center mb-2">
              <AlertTriangle className="w-4 h-4 text-orange-600" />
            </div>
            <div className="text-2xl font-bold text-gray-900">{conflictCount}</div>
            <div className="text-xs text-gray-500">Conflicts</div>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 p-4 text-center">
            <div className="w-8 h-8 mx-auto bg-emerald-50 rounded-lg flex items-center justify-center mb-2">
              <CheckCircle className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="text-2xl font-bold text-gray-900">{stats?.synced_count ?? 0}</div>
            <div className="text-xs text-gray-500">Synced</div>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 p-4 text-center">
            <div className="w-8 h-8 mx-auto bg-gray-50 rounded-lg flex items-center justify-center mb-2">
              <Archive className="w-4 h-4 text-gray-600" />
            </div>
            <button onClick={clearSynced} className="text-sm font-medium text-blue-600 hover:text-blue-700">
              Clear Synced
            </button>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Queue Section */}
          <div className="lg:col-span-2 space-y-4">
            {/* Queue Tabs */}
            <div className="flex gap-2 border-b border-gray-200">
              {[
                { key: 'pending', label: 'Pending', count: pendingCount },
                { key: 'failed', label: 'Failed', count: failedCount },
                { key: 'conflict', label: 'Conflicts', count: conflictCount },
              ].map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key as 'pending' | 'failed' | 'conflict')}
                  className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === tab.key
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {tab.label}
                  {tab.count > 0 && (
                    <span className={`px-2 py-0.5 text-xs rounded-full ${
                      tab.key === 'pending' ? 'bg-blue-100 text-blue-700' :
                      tab.key === 'failed' ? 'bg-red-100 text-red-700' :
                      'bg-orange-100 text-orange-700'
                    }`}>
                      {tab.count}
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* Queue List */}
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {filteredQueue.length === 0 ? (
                <EmptyState
                  icon={<CheckCircle2 className="w-6 h-6" />}
                  title="Queue Empty"
                  description={`No ${activeTab} items to display`}
                />
              ) : (
                filteredQueue.map((item) => (
                  <QueueItemCard
                    key={item.id}
                    item={item}
                    onRetry={() => retryItem(item.id)}
                    onDelete={() => deleteItem(item.id)}
                    onResolve={() => setConflictItem(item)}
                  />
                ))
              )}
            </div>
          </div>

          {/* Right Sidebar */}
          <div className="space-y-4">
            {/* Device Info */}
            <DeviceCard device={status.device} onRegister={() => registerDevice()} />

            {/* Settings */}
            <SettingsPanel
              autoSyncEnabled={autoSyncEnabled}
              onToggleAutoSync={() => setAutoSyncEnabled(!autoSyncEnabled)}
              autoSyncInterval={autoSyncInterval}
              onSetInterval={(ms) => {
                setAutoSyncInterval(ms);
                if (autoSyncEnabled) {
                  stopAutoSync();
                  startAutoSync(ms);
                }
              }}
            />

            {/* Sync History */}
            <div className="bg-white rounded-xl border border-gray-100 p-4">
              <h3 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
                <History className="w-5 h-5" /> Recent Syncs
              </h3>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {syncHistory.length === 0 ? (
                  <div className="text-sm text-gray-500 text-center py-4">No sync history</div>
                ) : (
                  syncHistory.slice(0, 5).map((log) => (
                    <SyncLogCard key={log.id} log={log} />
                  ))
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Offline Capabilities Info */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl border border-gray-100 p-4">
            <div className="flex items-center gap-3 mb-2">
              <FileText className="w-5 h-5 text-blue-500" />
              <span className="font-medium text-gray-800">Forms</span>
            </div>
            <p className="text-xs text-gray-500">Cache forms for offline completion</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 p-4">
            <div className="flex items-center gap-3 mb-2">
              <MapPin className="w-5 h-5 text-green-500" />
              <span className="font-medium text-gray-800">GPS</span>
            </div>
            <p className="text-xs text-gray-500">Capture coordinates offline</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 p-4">
            <div className="flex items-center gap-3 mb-2">
              <Camera className="w-5 h-5 text-purple-500" />
              <span className="font-medium text-gray-800">Photos</span>
            </div>
            <p className="text-xs text-gray-500">Store photos locally for later sync</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 p-4">
            <div className="flex items-center gap-3 mb-2">
              <PenTool className="w-5 h-5 text-orange-500" />
              <span className="font-medium text-gray-800">Signatures</span>
            </div>
            <p className="text-xs text-gray-500">Capture signatures offline</p>
          </div>
        </div>
      </div>

      {/* Conflict Resolution Modal */}
      {conflictItem && (
        <ConflictResolutionModal
          item={conflictItem}
          onClose={() => setConflictItem(null)}
          onResolve={handleResolveConflict}
        />
      )}
    </div>
  );
}

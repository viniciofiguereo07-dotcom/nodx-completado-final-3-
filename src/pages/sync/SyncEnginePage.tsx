import { useState, useEffect, useCallback } from 'react';
import { RefreshCw, AlertTriangle, CheckCircle, XCircle, Clock, Wifi, WifiOff, Filter, Trash2, RotateCcw, Upload, Plus, Smartphone, Activity, TrendingUp, HardDrive, MapPin, Calendar, CreditCard as Edit2, User, Building2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useOrg } from '../../contexts/OrgContext';
import { useAuth } from '../../contexts/AuthContext';
import { PageHeader } from '../../components/common/PageHeader';
import { StatusBadge } from '../../components/common/StatusBadge';
import { EmptyState } from '../../components/common/EmptyState';
import { Modal } from '../../components/common/Modal';
import { useI18n } from '../../hooks/useI18n';
import type { SupportedLanguage, SyncQueueItem } from '../../types';

const DEVICE_TYPES = [
  { key: 'mobile_android', label: 'Android Mobile', labelEs: 'Movil Android' },
  { key: 'mobile_ios', label: 'iOS Mobile', labelEs: 'Movil iOS' },
  { key: 'tablet_android', label: 'Android Tablet', labelEs: 'Tablet Android' },
  { key: 'tablet_ios', label: 'iOS Tablet', labelEs: 'Tablet iOS' },
  { key: 'desktop', label: 'Desktop', labelEs: 'Escritorio' },
  { key: 'laptop', label: 'Laptop', labelEs: 'Portatil' },
];

const DEVICE_STATUSES = [
  { key: 'available', label: 'Available', labelEs: 'Disponible', color: '#22c55e' },
  { key: 'assigned', label: 'Assigned', labelEs: 'Asignado', color: '#3b82f6' },
  { key: 'maintenance', label: 'Maintenance', labelEs: 'Mantenimiento', color: '#f59e0b' },
  { key: 'suspended', label: 'Suspended', labelEs: 'Suspendido', color: '#ef4444' },
];

const UI: Record<SupportedLanguage, {
  title: string;
  subtitle: string;
  devices: string;
  syncQueue: string;
  addDevice: string;
  type: string;
  model: string;
  serial: string;
  user: string;
  organization: string;
  status: string;
  lastSync: string;
  actions: string;
  save: string;
  cancel: string;
  online: string;
  offline: string;
}> = {
  es: {
    title: 'Dispositivos',
    subtitle: 'Gestion de dispositivos y cola de sincronizacion',
    devices: 'Dispositivos',
    syncQueue: 'Cola de Sincronizacion',
    addDevice: 'Nuevo Dispositivo',
    type: 'Tipo',
    model: 'Modelo',
    serial: 'Serial',
    user: 'Usuario Asignado',
    organization: 'Organizacion',
    status: 'Estado',
    lastSync: 'Ultima Sincronizacion',
    actions: 'Acciones',
    save: 'Guardar',
    cancel: 'Cancelar',
    online: 'En linea',
    offline: 'Fuera de linea',
  },
  en: {
    title: 'Devices',
    subtitle: 'Device management and sync queue',
    devices: 'Devices',
    syncQueue: 'Sync Queue',
    addDevice: 'New Device',
    type: 'Type',
    model: 'Model',
    serial: 'Serial',
    user: 'Assigned User',
    organization: 'Organization',
    status: 'Status',
    lastSync: 'Last Sync',
    actions: 'Actions',
    save: 'Save',
    cancel: 'Cancel',
    online: 'Online',
    offline: 'Offline',
  },
  fr: {
    title: 'Appareils',
    subtitle: 'Gestion des appareils et file de synchronisation',
    devices: 'Appareils',
    syncQueue: 'File de Synchronisation',
    addDevice: 'Nouvel Appareil',
    type: 'Type',
    model: 'Modele',
    serial: 'Serial',
    user: 'Utilisateur Assigne',
    organization: 'Organisation',
    status: 'Statut',
    lastSync: 'Derniere Sync',
    actions: 'Actions',
    save: 'Enregistrer',
    cancel: 'Annuler',
    online: 'En ligne',
    offline: 'Hors ligne',
  },
  de: {
    title: 'Gerate',
    subtitle: 'Gerateverwaltung und Sync-Warteschlange',
    devices: 'Gerate',
    syncQueue: 'Sync-Warteschlange',
    addDevice: 'Neues Gerat',
    type: 'Typ',
    model: 'Modell',
    serial: 'Seriennummer',
    user: 'Zugewiesener Benutzer',
    organization: 'Organisation',
    status: 'Status',
    lastSync: 'Letzte Sync',
    actions: 'Aktionen',
    save: 'Speichern',
    cancel: 'Abbrechen',
    online: 'Online',
    offline: 'Offline',
  },
  pt: {
    title: 'Dispositivos',
    subtitle: 'Gestao de dispositivos e fila de sincronizacao',
    devices: 'Dispositivos',
    syncQueue: 'Fila de Sincronizacao',
    addDevice: 'Novo Dispositivo',
    type: 'Tipo',
    model: 'Modelo',
    serial: 'Serial',
    user: 'Usuario Atribuido',
    organization: 'Organizacao',
    status: 'Estado',
    lastSync: 'Ultima Sync',
    actions: 'Acoes',
    save: 'Salvar',
    cancel: 'Cancelar',
    online: 'Online',
    offline: 'Offline',
  },
  zh: {
    title: '设备',
    subtitle: '设备管理和同步队列',
    devices: '设备',
    syncQueue: '同步队列',
    addDevice: '新设备',
    type: '类型',
    model: '型号',
    serial: '序列号',
    user: '分配用户',
    organization: '组织',
    status: '状态',
    lastSync: '上次同步',
    actions: '操作',
    save: '保存',
    cancel: '取消',
    online: '在线',
    offline: '离线',
  },
  ja: {
    title: 'デバイス',
    subtitle: 'デバイス管理と同期キュー',
    devices: 'デバイス',
    syncQueue: '同期キュー',
    addDevice: '新規デバイス',
    type: 'タイプ',
    model: 'モデル',
    serial: 'シリアル',
    user: '割り当てユーザー',
    organization: '組織',
    status: 'ステータス',
    lastSync: '最終同期',
    actions: '操作',
    save: '保存',
    cancel: 'キャンセル',
    online: 'オンライン',
    offline: 'オフライン',
  },
};

const STATUS_COLORS: Record<string, string> = {
  pending: 'text-amber-500',
  processing: 'text-blue-500',
  synced: 'text-emerald-500',
  conflict: 'text-orange-500',
  failed: 'text-red-500',
};

const STATUS_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  pending: Clock,
  processing: RefreshCw,
  synced: CheckCircle,
  conflict: AlertTriangle,
  failed: XCircle,
};

export function SyncEnginePage() {
  const { org } = useOrg();
  const { user } = useAuth();
  const { lang } = useI18n();
  const t = UI[lang];

  const [items, setItems] = useState<SyncQueueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<SyncQueueItem['status'] | 'all'>('all');
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [showDeviceForm, setShowDeviceForm] = useState(false);
  const [deviceForm, setDeviceForm] = useState({ type: 'mobile_android', model: '', serial: '', user_id: '', status: 'available' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => { window.removeEventListener('online', handleOnline); window.removeEventListener('offline', handleOffline); };
  }, []);

  const load = useCallback(async () => {
    if (!org) return;
    const { data } = await supabase
      .from('sync_queue')
      .select('*')
      .eq('organization_id', org.id)
      .order('created_at', { ascending: false })
      .limit(100);
    setItems((data ?? []) as SyncQueueItem[]);
    setLoading(false);
  }, [org]);

  useEffect(() => { load(); }, [load]);

  async function retryItem(item: SyncQueueItem) {
    await supabase.from('sync_queue').update({ status: 'pending', retry_count: item.retry_count + 1, error_message: null }).eq('id', item.id);
    await load();
  }

  async function deleteItem(id: string) {
    await supabase.from('sync_queue').delete().eq('id', id);
    await load();
  }

  async function createDemoItem() {
    if (!org || !user) return;
    await supabase.from('sync_queue').insert({
      organization_id: org.id,
      user_id: user.id,
      operation: 'insert',
      resource_type: 'visits',
      payload: { demo: true, status: 'completed', notes: 'Offline visit recorded' },
      status: 'pending',
    });
    await load();
  }

  async function handleAddDevice() {
    if (!org) return;
    setSaving(true);
    await supabase.from('sync_queue').insert({
      organization_id: org.id,
      user_id: deviceForm.user_id || null,
      operation: 'insert',
      resource_type: 'device',
      payload: {
        type: deviceForm.type,
        model: deviceForm.model,
        serial: deviceForm.serial,
        device_status: deviceForm.status,
      },
      status: 'pending',
      device_id: deviceForm.serial || undefined,
    });
    setSaving(false);
    setShowDeviceForm(false);
    setDeviceForm({ type: 'mobile_android', model: '', serial: '', user_id: '', status: 'available' });
    await load();
  }

  const filtered = filter === 'all' ? items : items.filter(i => i.status === filter);

  const stats = {
    total: items.length,
    pending: items.filter(i => i.status === 'pending').length,
    synced: items.filter(i => i.status === 'synced').length,
    failed: items.filter(i => i.status === 'failed').length,
    conflict: items.filter(i => i.status === 'conflict').length,
  };

  const getDeviceStatus = (status: string) => {
    const s = DEVICE_STATUSES.find(ds => ds.key === status);
    return lang === 'es' ? s?.labelEs : s?.label;
  };

  return (
    <div>
      <PageHeader
        title={t.title}
        subtitle={t.subtitle}
        actions={
          <div className="flex items-center gap-3">
            <div className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-sm font-medium ${isOnline ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-red-200 bg-red-50 text-red-700'}`}>
              {isOnline ? <Wifi className="w-4 h-4" /> : <WifiOff className="w-4 h-4" />}
              {isOnline ? t.online : t.offline}
            </div>
            <button onClick={() => setShowDeviceForm(true)} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700">
              <Plus className="w-4 h-4" />
              {t.addDevice}
            </button>
          </div>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
        {[
          { label: lang === 'es' ? 'Total' : 'Total', value: stats.total, color: '#6b7280', icon: Activity },
          { label: lang === 'es' ? 'Pendiente' : 'Pending', value: stats.pending, color: '#f59e0b', icon: Clock },
          { label: lang === 'es' ? 'Sincronizado' : 'Synced', value: stats.synced, color: '#22c55e', icon: CheckCircle },
          { label: lang === 'es' ? 'Fallido' : 'Failed', value: stats.failed, color: '#ef4444', icon: XCircle },
          { label: lang === 'es' ? 'Conflictos' : 'Conflicts', value: stats.conflict, color: '#f97316', icon: AlertTriangle },
        ].map(({ label, value, color, icon: Icon }) => (
          <div key={label} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
            <div className="flex items-center gap-2 mb-1">
              <Icon className="w-4 h-4" style={{ color }} />
              <span className="text-xs text-gray-500">{label}</span>
            </div>
            <div className="text-2xl font-bold text-gray-900">{value}</div>
          </div>
        ))}
      </div>

      {/* Filter tabs */}
      <div className="flex items-center gap-2 mb-4 overflow-x-auto">
        {(['all', 'pending', 'synced', 'failed', 'conflict'] as const).map(s => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`px-3 py-1.5 rounded-xl text-sm font-medium whitespace-nowrap transition-colors ${filter === s ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'}`}
          >
            {s === 'all' ? `${lang === 'es' ? 'Todos' : 'All'} (${stats.total})` : `${s.charAt(0).toUpperCase() + s.slice(1)} (${stats[s as keyof typeof stats]})`}
          </button>
        ))}
      </div>

      {/* Queue table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-400">{lang === 'es' ? 'Cargando...' : 'Loading...'}</div>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={<RefreshCw className="w-6 h-6" />}
            title={lang === 'es' ? 'Cola vacia' : 'Queue is empty'}
            description={lang === 'es' ? 'Todas las operaciones estan sincronizadas.' : 'All operations are synced.'}
          />
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">{lang === 'es' ? 'Estado' : 'Status'}</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">{lang === 'es' ? 'Operacion' : 'Operation'}</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">{lang === 'es' ? 'Recurso' : 'Resource'}</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">{lang === 'es' ? 'Dispositivo' : 'Device'}</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">{lang === 'es' ? 'Reintentos' : 'Retries'}</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">{lang === 'es' ? 'Fecha' : 'Date'}</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map(item => {
                const StatusIcon = STATUS_ICONS[item.status] ?? Clock;
                const statusColor = STATUS_COLORS[item.status] ?? 'text-gray-400';
                return (
                  <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <StatusIcon className={`w-4 h-4 ${statusColor} ${item.status === 'processing' ? 'animate-spin' : ''}`} />
                        <StatusBadge status={item.status} />
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-lg text-xs font-mono font-bold ${
                        item.operation === 'insert' ? 'bg-emerald-50 text-emerald-700' :
                        item.operation === 'update' ? 'bg-blue-50 text-blue-700' :
                        'bg-red-50 text-red-700'
                      }`}>{item.operation.toUpperCase()}</span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 font-medium">{item.resource_type}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 text-xs text-gray-400">
                        <Smartphone className="w-3.5 h-3.5" />
                        {item.device_id ? item.device_id.slice(0, 12) + '...' : 'web'}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">{item.retry_count}</td>
                    <td className="px-4 py-3 text-xs text-gray-400">{new Date(item.created_at).toLocaleString()}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 justify-end">
                        {(item.status === 'failed' || item.status === 'conflict') && (
                          <button onClick={() => retryItem(item)} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg" title="Retry">
                            <RotateCcw className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <button onClick={() => deleteItem(item.id)} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Device Form Modal */}
      <Modal
        open={showDeviceForm}
        onClose={() => setShowDeviceForm(false)}
        title={t.addDevice}
        footer={
          <div className="flex justify-end gap-3">
            <button onClick={() => setShowDeviceForm(false)} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-xl">{t.cancel}</button>
            <button onClick={handleAddDevice} disabled={saving || !deviceForm.model} className="px-4 py-2 text-sm bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 disabled:opacity-50">
              {saving ? (lang === 'es' ? 'Guardando...' : 'Saving...') : t.save}
            </button>
          </div>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t.type}</label>
            <select
              value={deviceForm.type}
              onChange={e => setDeviceForm({ ...deviceForm, type: e.target.value })}
              className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {DEVICE_TYPES.map(dt => (
                <option key={dt.key} value={dt.key}>{lang === 'es' ? dt.labelEs : dt.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t.model}</label>
            <input
              type="text"
              value={deviceForm.model}
              onChange={e => setDeviceForm({ ...deviceForm, model: e.target.value })}
              placeholder="Samsung Galaxy S23, iPhone 15, etc."
              className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t.serial}</label>
            <input
              type="text"
              value={deviceForm.serial}
              onChange={e => setDeviceForm({ ...deviceForm, serial: e.target.value })}
              placeholder="IMEI or Serial Number"
              className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t.status}</label>
            <select
              value={deviceForm.status}
              onChange={e => setDeviceForm({ ...deviceForm, status: e.target.value })}
              className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {DEVICE_STATUSES.map(ds => (
                <option key={ds.key} value={ds.key}>{lang === 'es' ? ds.labelEs : ds.label}</option>
              ))}
            </select>
          </div>
        </div>
      </Modal>
    </div>
  );
}

import { useState, useEffect, useCallback } from 'react';
import { Route as RouteIcon, Plus, MapPin, Clock, Gauge, Users, CreditCard as Edit2, Trash2, Play, Archive, CheckCircle, Circle, GripVertical, ChevronDown, ChevronUp, AlertCircle, User, Calendar, Target, Activity, Map } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useOrg } from '../../contexts/OrgContext';
import { PageHeader } from '../../components/common/PageHeader';
import { Modal } from '../../components/common/Modal';
import { StatusBadge } from '../../components/common/StatusBadge';
import { EmptyState } from '../../components/common/EmptyState';
import { useI18n } from '../../hooks/useI18n';
import type { SupportedLanguage, Route, Territory, Waypoint, Profile } from '../../types';

const UI: Record<SupportedLanguage, {
  title: string;
  subtitle: string;
  newRoute: string;
  noRoutes: string;
  buildFirst: string;
  active: string;
  draft: string;
  archived: string;
  stops: string;
  km: string;
  minEst: string;
  complete: string;
  waypoints: string;
  selectRoute: string;
  clickToView: string;
  name: string;
  territory: string;
  recurrence: string;
  status: string;
  none: string;
  daily: string;
  weekly: string;
  monthly: string;
  activate: string;
  save: string;
  cancel: string;
  saving: string;
  delete: string;
  deleteRoute: string;
  deleteWarning: string;
  supervisor: string;
  coverage: string;
  establishments: string;
  lastVisit: string;
  nextVisit: string;
  details: string;
  addWaypoint: string;
  label: string;
  lat: string;
  lng: string;
}> = {
  es: {
    title: 'Rutas',
    subtitle: 'Planificacion, optimizacion y asignacion de rutas de campo',
    newRoute: 'Nueva Ruta',
    noRoutes: 'Sin rutas',
    buildFirst: 'Construya su primera ruta de campo',
    active: 'activas',
    draft: 'borrador',
    archived: 'archivadas',
    stops: 'paradas',
    km: 'km',
    minEst: 'min est.',
    complete: 'completado',
    waypoints: 'Puntos de Ruta',
    selectRoute: 'Seleccione una ruta',
    clickToView: 'Haga clic en una ruta para ver detalles',
    name: 'Nombre',
    territory: 'Territorio',
    recurrence: 'Recurrencia',
    status: 'Estado',
    none: 'ninguna',
    daily: 'diaria',
    weekly: 'semanal',
    monthly: 'mensual',
    activate: 'Activar',
    save: 'Guardar',
    cancel: 'Cancelar',
    saving: 'Guardando...',
    delete: 'Eliminar',
    deleteRoute: 'Eliminar Ruta',
    deleteWarning: 'Esto no se puede deshacer.',
    supervisor: 'Supervisor',
    coverage: 'Cobertura',
    establishments: 'Establecimientos',
    lastVisit: 'Ultima Visita',
    nextVisit: 'Proxima Visita',
    details: 'Detalles',
    addWaypoint: 'Agregar Punto',
    label: 'Etiqueta',
    lat: 'Lat',
    lng: 'Lng',
  },
  en: {
    title: 'Routes',
    subtitle: 'Field route planning, optimization, and assignment',
    newRoute: 'New Route',
    noRoutes: 'No routes',
    buildFirst: 'Build your first field route',
    active: 'active',
    draft: 'draft',
    archived: 'archived',
    stops: 'stops',
    km: 'km',
    minEst: 'min est.',
    complete: 'complete',
    waypoints: 'Waypoints',
    selectRoute: 'Select a route',
    clickToView: 'Click any route to view details',
    name: 'Name',
    territory: 'Territory',
    recurrence: 'Recurrence',
    status: 'Status',
    none: 'none',
    daily: 'daily',
    weekly: 'weekly',
    monthly: 'monthly',
    activate: 'Activate',
    save: 'Save',
    cancel: 'Cancel',
    saving: 'Saving...',
    delete: 'Delete',
    deleteRoute: 'Delete Route',
    deleteWarning: 'This cannot be undone.',
    supervisor: 'Supervisor',
    coverage: 'Coverage',
    establishments: 'Establishments',
    lastVisit: 'Last Visit',
    nextVisit: 'Next Visit',
    details: 'Details',
    addWaypoint: 'Add Waypoint',
    label: 'Label',
    lat: 'Lat',
    lng: 'Lng',
  },
  fr: {
    title: 'Itineraires',
    subtitle: 'Planification, optimisation et affectation des itineraires terrain',
    newRoute: 'Nouvel Itineraire',
    noRoutes: 'Pas d\'itineraires',
    buildFirst: 'Construisez votre premier itineraire terrain',
    active: 'actifs',
    draft: 'brouillon',
    archived: 'archives',
    stops: 'arrets',
    km: 'km',
    minEst: 'min est.',
    complete: 'complet',
    waypoints: 'Points de Passage',
    selectRoute: 'Selectionnez un itineraire',
    clickToView: 'Cliquez sur un itineraire pour voir les details',
    name: 'Nom',
    territory: 'Territoire',
    recurrence: 'Recurrence',
    status: 'Statut',
    none: 'aucun',
    daily: 'quotidien',
    weekly: 'hebdomadaire',
    monthly: 'mensuel',
    activate: 'Activer',
    save: 'Enregistrer',
    cancel: 'Annuler',
    saving: 'Enregistrement...',
    delete: 'Supprimer',
    deleteRoute: 'Supprimer Itineraire',
    deleteWarning: 'Cela ne peut pas etre annule.',
    supervisor: 'Superviseur',
    coverage: 'Couverture',
    establishments: 'Etablissements',
    lastVisit: 'Derniere Visite',
    nextVisit: 'Prochaine Visite',
    details: 'Details',
    addWaypoint: 'Ajouter Point',
    label: 'Libelle',
    lat: 'Lat',
    lng: 'Lng',
  },
  de: {
    title: 'Routen',
    subtitle: 'Feldroutenplanung, -optimierung und -zuweisung',
    newRoute: 'Neue Route',
    noRoutes: 'Keine Routen',
    buildFirst: 'Erstellen Sie Ihre erste Feldroute',
    active: 'aktiv',
    draft: 'Entwurf',
    archived: 'archiviert',
    stops: 'Stopps',
    km: 'km',
    minEst: 'Min ges.',
    complete: 'abgeschlossen',
    waypoints: 'Wegpunkte',
    selectRoute: 'Route auswahlen',
    clickToView: 'Klicken Sie auf eine Route fur Details',
    name: 'Name',
    territory: 'Gebiet',
    recurrence: 'Wiederholung',
    status: 'Status',
    none: 'keine',
    daily: 'taglich',
    weekly: 'wochentlich',
    monthly: 'monatlich',
    activate: 'Aktivieren',
    save: 'Speichern',
    cancel: 'Abbrechen',
    saving: 'Speichern...',
    delete: 'Loschen',
    deleteRoute: 'Route Loschen',
    deleteWarning: 'Dies kann nicht ruckgangig gemacht werden.',
    supervisor: 'Supervisor',
    coverage: 'Abdeckung',
    establishments: 'Einrichtungen',
    lastVisit: 'Letzter Besuch',
    nextVisit: 'Nachster Besuch',
    details: 'Details',
    addWaypoint: 'Wegpunkt Hinzufugen',
    label: 'Bezeichnung',
    lat: 'Lat',
    lng: 'Lng',
  },
  pt: {
    title: 'Rotas',
    subtitle: 'Planejamento, otimizacao e atribuicao de rotas de campo',
    newRoute: 'Nova Rota',
    noRoutes: 'Sem rotas',
    buildFirst: 'Construa sua primeira rota de campo',
    active: 'ativas',
    draft: 'rascunho',
    archived: 'arquivadas',
    stops: 'paradas',
    km: 'km',
    minEst: 'min est.',
    complete: 'completo',
    waypoints: 'Pontos de Rota',
    selectRoute: 'Selecione uma rota',
    clickToView: 'Clique em uma rota para ver detalhes',
    name: 'Nome',
    territory: 'Territorio',
    recurrence: 'Recorrencia',
    status: 'Status',
    none: 'nenhum',
    daily: 'diario',
    weekly: 'semanal',
    monthly: 'mensal',
    activate: 'Ativar',
    save: 'Salvar',
    cancel: 'Cancelar',
    saving: 'Salvando...',
    delete: 'Excluir',
    deleteRoute: 'Excluir Rota',
    deleteWarning: 'Isso nao pode ser desfeito.',
    supervisor: 'Supervisor',
    coverage: 'Cobertura',
    establishments: 'Estabelecimentos',
    lastVisit: 'Ultima Visita',
    nextVisit: 'Proxima Visita',
    details: 'Detalhes',
    addWaypoint: 'Adicionar Ponto',
    label: 'Rotulo',
    lat: 'Lat',
    lng: 'Lng',
  },
  zh: {
    title: '路线',
    subtitle: '现场路线规划、优化和分配',
    newRoute: '新建路线',
    noRoutes: '无路线',
    buildFirst: '构建您的第一条现场路线',
    active: '活动',
    draft: '草稿',
    archived: '已归档',
    stops: '站点',
    km: '公里',
    minEst: '预计分钟',
    complete: '完成',
    waypoints: '航点',
    selectRoute: '选择路线',
    clickToView: '点击任意路线查看详情',
    name: '名称',
    territory: '区域',
    recurrence: '重复',
    status: '状态',
    none: '无',
    daily: '每日',
    weekly: '每周',
    monthly: '每月',
    activate: '激活',
    save: '保存',
    cancel: '取消',
    saving: '保存中...',
    delete: '删除',
    deleteRoute: '删除路线',
    deleteWarning: '此操作无法撤销。',
    supervisor: '主管',
    coverage: '覆盖',
    establishments: '机构',
    lastVisit: '上次访问',
    nextVisit: '下次访问',
    details: '详情',
    addWaypoint: '添加航点',
    label: '标签',
    lat: '纬度',
    lng: '经度',
  },
  ja: {
    title: 'ルート',
    subtitle: 'フィールドルートの計画、最適化、割り当て',
    newRoute: '新規ルート',
    noRoutes: 'ルートなし',
    buildFirst: '最初のフィールドルートを作成',
    active: 'アクティブ',
    draft: '下書き',
    archived: 'アーカイブ',
    stops: '停留所',
    km: 'km',
    minEst: '推定分',
    complete: '完了',
    waypoints: 'ウェイポイント',
    selectRoute: 'ルートを選択',
    clickToView: 'ルートをクリックして詳細を表示',
    name: '名前',
    territory: '領域',
    recurrence: '繰り返し',
    status: 'ステータス',
    none: 'なし',
    daily: '毎日',
    weekly: '毎週',
    monthly: '毎月',
    activate: '有効化',
    save: '保存',
    cancel: 'キャンセル',
    saving: '保存中...',
    delete: '削除',
    deleteRoute: 'ルート削除',
    deleteWarning: 'この操作は元に戻せません。',
    supervisor: 'スーパーバイザー',
    coverage: 'カバレッジ',
    establishments: '施設',
    lastVisit: '前回訪問',
    nextVisit: '次回訪問',
    details: '詳細',
    addWaypoint: 'ウェイポイント追加',
    label: 'ラベル',
    lat: '緯度',
    lng: '経度',
  },
};

function RouteMap({ waypoints }: { waypoints: Waypoint[] }) {
  if (waypoints.length === 0) {
    return (
      <div className="w-full h-48 bg-gray-50 rounded-xl flex items-center justify-center text-gray-400 text-sm">
        No waypoints added
      </div>
    );
  }

  const lats = waypoints.map(w => w.lat);
  const lngs = waypoints.map(w => w.lng);
  const minLat = Math.min(...lats), maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs), maxLng = Math.max(...lngs);
  const padLat = (maxLat - minLat) * 0.2 || 0.01;
  const padLng = (maxLng - minLng) * 0.2 || 0.01;

  const toX = (lng: number) => ((lng - (minLng - padLng)) / ((maxLng + padLng) - (minLng - padLng))) * 100;
  const toY = (lat: number) => 100 - ((lat - (minLat - padLat)) / ((maxLat + padLat) - (minLat - padLat))) * 100;

  const points = waypoints.map(w => ({ x: toX(w.lng), y: toY(w.lat), ...w }));

  return (
    <div className="w-full h-48 bg-gradient-to-br from-blue-50 to-slate-50 rounded-xl relative overflow-hidden border border-blue-100">
      <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
        {points.length > 1 && (
          <polyline
            points={points.map(p => `${p.x},${p.y}`).join(' ')}
            fill="none"
            stroke="#3b82f6"
            strokeWidth="1.5"
            strokeDasharray="4 2"
            vectorEffect="non-scaling-stroke"
          />
        )}
        {points.map((p, i) => (
          <g key={i}>
            <circle cx={p.x} cy={p.y} r="3" fill={i === 0 ? '#22c55e' : i === points.length - 1 ? '#ef4444' : '#3b82f6'} vectorEffect="non-scaling-stroke" />
            <circle cx={p.x} cy={p.y} r="1.5" fill="white" vectorEffect="non-scaling-stroke" />
          </g>
        ))}
      </svg>
      <div className="absolute top-2 left-2 flex gap-2 text-xs">
        <span className="flex items-center gap-1 bg-white/80 rounded-lg px-2 py-1 shadow-sm"><span className="w-2 h-2 rounded-full bg-green-500" />Start</span>
        <span className="flex items-center gap-1 bg-white/80 rounded-lg px-2 py-1 shadow-sm"><span className="w-2 h-2 rounded-full bg-red-500" />End</span>
      </div>
    </div>
  );
}

export function RouteBuilderPage() {
  const { org } = useOrg();
  const { lang } = useI18n();
  const t = UI[lang];

  const [routes, setRoutes] = useState<Route[]>([]);
  const [territories, setTerritories] = useState<Territory[]>([]);
  const [supervisors, setSupervisors] = useState<Profile[]>([]);
  const [selected, setSelected] = useState<Route | null>(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editTarget, setEditTarget] = useState<Route | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Route | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    territory_id: '',
    assigned_to: '',
    recurrence: 'none',
    status: 'draft',
    waypoints: [] as Waypoint[],
    coverage_target: 0,
    establishment_count: 0,
  });
  const [newWaypoint, setNewWaypoint] = useState({ label: '', lat: '', lng: '' });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!org) return;
    const [{ data: r }, { data: t }, { data: members }] = await Promise.all([
      supabase.from('routes').select('*, territories(name, color)').eq('organization_id', org.id).order('created_at', { ascending: false }),
      supabase.from('territories').select('id, name, color, level').eq('organization_id', org.id).order('name'),
      supabase.from('organization_members').select('*, profiles(id, full_name, email)').eq('organization_id', org.id).eq('is_active', true),
    ]);
    setRoutes((r ?? []) as Route[]);
    setTerritories((t ?? []) as Territory[]);
    const profiles = (members ?? [])
      .map(m => (m as unknown as { profiles: Profile }).profiles)
      .filter(Boolean) as Profile[];
    setSupervisors(profiles);
    setLoading(false);
  }, [org]);

  useEffect(() => { load(); }, [load]);

  function openCreate() {
    setEditTarget(null);
    setFormData({
      name: '',
      description: '',
      territory_id: '',
      assigned_to: '',
      recurrence: 'none',
      status: 'draft',
      waypoints: [],
      coverage_target: 0,
      establishment_count: 0,
    });
    setShowForm(true);
  }

  function openEdit(route: Route) {
    setEditTarget(route);
    setFormData({
      name: route.name,
      description: route.description ?? '',
      territory_id: route.territory_id ?? '',
      assigned_to: route.assigned_to ?? '',
      recurrence: route.recurrence,
      status: route.status,
      waypoints: route.waypoints,
      coverage_target: (route.metadata?.coverage_target as number) ?? 0,
      establishment_count: (route.metadata?.establishment_count as number) ?? 0,
    });
    setShowForm(true);
  }

  function addWaypoint() {
    const lat = parseFloat(newWaypoint.lat);
    const lng = parseFloat(newWaypoint.lng);
    if (!newWaypoint.label || isNaN(lat) || isNaN(lng)) return;
    const wp: Waypoint = { index: formData.waypoints.length, lat, lng, label: newWaypoint.label };
    setFormData(p => ({ ...p, waypoints: [...p.waypoints, wp] }));
    setNewWaypoint({ label: '', lat: '', lng: '' });
  }

  function removeWaypoint(i: number) {
    setFormData(p => ({ ...p, waypoints: p.waypoints.filter((_, idx) => idx !== i).map((w, idx) => ({ ...w, index: idx })) }));
  }

  function moveWaypoint(i: number, dir: -1 | 1) {
    const wps = [...formData.waypoints];
    const j = i + dir;
    if (j < 0 || j >= wps.length) return;
    [wps[i], wps[j]] = [wps[j], wps[i]];
    setFormData(p => ({ ...p, waypoints: wps.map((w, idx) => ({ ...w, index: idx })) }));
  }

  async function handleSave() {
    if (!org) return;
    setSaving(true);
    const dist = formData.waypoints.length > 1
      ? formData.waypoints.slice(1).reduce((sum, wp, i) => {
          const prev = formData.waypoints[i];
          const dLat = (wp.lat - prev.lat) * 111;
          const dLng = (wp.lng - prev.lng) * 111 * Math.cos(prev.lat * Math.PI / 180);
          return sum + Math.sqrt(dLat * dLat + dLng * dLng);
        }, 0)
      : 0;

    const payload = {
      organization_id: org.id,
      name: formData.name,
      description: formData.description || null,
      territory_id: formData.territory_id || null,
      assigned_to: formData.assigned_to || null,
      recurrence: formData.recurrence,
      status: formData.status,
      waypoints: formData.waypoints,
      distance_km: Math.round(dist * 100) / 100,
      estimated_duration_minutes: formData.waypoints.length * 30,
      metadata: {
        coverage_target: formData.coverage_target,
        establishment_count: formData.establishment_count,
      },
    };

    if (editTarget) {
      await supabase.from('routes').update(payload).eq('id', editTarget.id);
    } else {
      await supabase.from('routes').insert(payload);
    }
    setSaving(false);
    setShowForm(false);
    await load();
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    await supabase.from('routes').delete().eq('id', deleteTarget.id);
    if (selected?.id === deleteTarget.id) setSelected(null);
    setDeleteTarget(null);
    await load();
  }

  async function changeStatus(route: Route, status: Route['status']) {
    await supabase.from('routes').update({ status }).eq('id', route.id);
    if (selected?.id === route.id) setSelected({ ...route, status });
    await load();
  }

  const statusGroups = {
    active: routes.filter(r => r.status === 'active'),
    draft: routes.filter(r => r.status === 'draft'),
    archived: routes.filter(r => r.status === 'archived'),
  };

  const recLabel = (rec: string) => {
    const map: Record<string, string> = {
      none: t.none, daily: t.daily, weekly: t.weekly, monthly: t.monthly,
    };
    return map[rec] ?? rec;
  };

  return (
    <div className="h-[calc(100vh-7rem)]">
      <PageHeader
        title={t.title}
        subtitle={t.subtitle}
        actions={
          <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 transition-colors">
            <Plus className="w-4 h-4" /> {t.newRoute}
          </button>
        }
      />

      <div className="flex gap-6 h-[calc(100%-4rem)]">
        {/* Route list */}
        <div className="w-80 flex-shrink-0 overflow-y-auto space-y-4">
          {loading ? (
            <div className="bg-white rounded-2xl p-8 text-center text-gray-400 text-sm">{lang === 'es' ? 'Cargando...' : 'Loading...'}</div>
          ) : routes.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
              <EmptyState icon={<RouteIcon className="w-6 h-6" />} title={t.noRoutes} description={t.buildFirst} action={
                <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-xl">
                  <Plus className="w-4 h-4" /> {t.newRoute}
                </button>
              } />
            </div>
          ) : (
            (['active', 'draft', 'archived'] as const).map(status => {
              const group = statusGroups[status];
              if (group.length === 0) return null;
              const label = status === 'active' ? t.active : status === 'draft' ? t.draft : t.archived;
              return (
                <div key={status}>
                  <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-1 mb-2">{label} ({group.length})</div>
                  <div className="space-y-2">
                    {group.map(route => (
                      <div
                        key={route.id}
                        onClick={() => setSelected(route)}
                        className={`bg-white rounded-xl border cursor-pointer p-4 transition-all ${selected?.id === route.id ? 'border-blue-300 shadow-md shadow-blue-100' : 'border-gray-100 hover:border-gray-200 shadow-sm'}`}
                      >
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div className="font-semibold text-gray-900 text-sm truncate">{route.name}</div>
                          <StatusBadge status={route.status} />
                        </div>
                        <div className="flex items-center gap-3 text-xs text-gray-400">
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3 h-3" />{route.waypoints.length} {t.stops}
                          </span>
                          <span className="flex items-center gap-1">
                            <Gauge className="w-3 h-3" />{route.distance_km} {t.km}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />{route.estimated_duration_minutes}{t.minEst}
                          </span>
                        </div>
                        {route.completion_percentage > 0 && (
                          <div className="mt-2">
                            <div className="w-full bg-gray-100 rounded-full h-1.5">
                              <div className="bg-blue-500 h-1.5 rounded-full" style={{ width: `${route.completion_percentage}%` }} />
                            </div>
                            <div className="text-xs text-gray-400 mt-1">{route.completion_percentage}% {t.complete}</div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Route detail */}
        <div className="flex-1 overflow-y-auto">
          {selected ? (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <div className="flex items-start justify-between mb-6">
                <div>
                  <h2 className="text-xl font-bold text-gray-900 mb-1">{selected.name}</h2>
                  <div className="flex items-center gap-2">
                    <StatusBadge status={selected.status} />
                    <span className="text-sm text-gray-500">{recLabel(selected.recurrence)}</span>
                  </div>
                </div>
                <div className="flex gap-2">
                  {selected.status === 'draft' && (
                    <button onClick={() => changeStatus(selected, 'active')} className="flex items-center gap-1.5 px-3 py-2 text-sm bg-emerald-600 text-white rounded-xl hover:bg-emerald-700">
                      <Play className="w-4 h-4" /> {t.activate}
                    </button>
                  )}
                  {selected.status === 'active' && (
                    <button onClick={() => changeStatus(selected, 'archived')} className="flex items-center gap-1.5 px-3 py-2 text-sm border border-gray-200 rounded-xl hover:bg-gray-50">
                      <Archive className="w-4 h-4" /> {lang === 'es' ? 'Archivar' : 'Archive'}
                    </button>
                  )}
                  <button onClick={() => openEdit(selected)} className="flex items-center gap-1.5 px-3 py-2 text-sm border border-gray-200 rounded-xl hover:bg-gray-50">
                    <Edit2 className="w-4 h-4" /> {lang === 'es' ? 'Editar' : 'Edit'}
                  </button>
                  <button onClick={() => setDeleteTarget(selected)} className="flex items-center gap-1.5 px-3 py-2 text-sm border border-red-200 text-red-600 rounded-xl hover:bg-red-50">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <RouteMap waypoints={selected.waypoints} />

              <div className="grid grid-cols-4 gap-3 mt-4 mb-6">
                <div className="p-3 bg-gray-50 rounded-xl text-center">
                  <div className="text-xl font-bold text-gray-900">{selected.waypoints.length}</div>
                  <div className="text-xs text-gray-500">{t.waypoints}</div>
                </div>
                <div className="p-3 bg-gray-50 rounded-xl text-center">
                  <div className="text-xl font-bold text-gray-900">{selected.distance_km}</div>
                  <div className="text-xs text-gray-500">{t.km}</div>
                </div>
                <div className="p-3 bg-gray-50 rounded-xl text-center">
                  <div className="text-xl font-bold text-gray-900">{selected.estimated_duration_minutes}</div>
                  <div className="text-xs text-gray-500">{t.minEst}</div>
                </div>
                <div className="p-3 bg-gray-50 rounded-xl text-center">
                  <div className="text-xl font-bold text-gray-900">{selected.completion_percentage}%</div>
                  <div className="text-xs text-gray-500">{t.complete}</div>
                </div>
              </div>

              {/* Route Details */}
              <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="p-4 bg-gray-50 rounded-xl">
                  <div className="text-xs text-gray-500 mb-1">{t.territory}</div>
                  <div className="font-semibold text-gray-900">
                    {(selected as unknown as { territories?: { name: string } }).territories?.name ?? '—'}
                  </div>
                </div>
                <div className="p-4 bg-gray-50 rounded-xl">
                  <div className="text-xs text-gray-500 mb-1">{t.supervisor}</div>
                  <div className="font-semibold text-gray-900">
                    {selected.assigned_to
                      ? supervisors.find(s => s.id === selected.assigned_to)?.full_name ?? '—'
                      : '—'}
                  </div>
                </div>
                <div className="p-4 bg-gray-50 rounded-xl">
                  <div className="text-xs text-gray-500 mb-1">{t.establishments}</div>
                  <div className="font-semibold text-gray-900">
                    {(selected.metadata?.establishment_count as number) ?? 0}
                  </div>
                </div>
              </div>

              {/* Waypoints list */}
              <div>
                <div className="text-sm font-semibold text-gray-700 mb-3">{t.waypoints}</div>
                {selected.waypoints.length === 0 ? (
                  <div className="text-sm text-gray-400 text-center py-4">{lang === 'es' ? 'Sin puntos de ruta definidos' : 'No waypoints defined'}</div>
                ) : (
                  <div className="space-y-2">
                    {selected.waypoints.map((wp, i) => (
                      <div key={i} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                        <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0 ${i === 0 ? 'bg-emerald-500' : i === selected.waypoints.length - 1 ? 'bg-red-500' : 'bg-blue-500'}`}>
                          {i + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm text-gray-800 truncate">{wp.label}</div>
                          <div className="text-xs text-gray-400">{wp.lat.toFixed(4)}, {wp.lng.toFixed(4)}</div>
                        </div>
                        {wp.expected_duration_minutes && (
                          <div className="text-xs text-gray-400 flex items-center gap-1">
                            <Clock className="w-3 h-3" />{wp.expected_duration_minutes}m
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm h-64 flex items-center justify-center">
              <EmptyState icon={<RouteIcon className="w-6 h-6" />} title={t.selectRoute} description={t.clickToView} />
            </div>
          )}
        </div>
      </div>

      {/* Create/Edit Modal */}
      <Modal
        open={showForm}
        onClose={() => setShowForm(false)}
        title={editTarget ? (lang === 'es' ? 'Editar Ruta' : 'Edit Route') : t.newRoute}
        size="xl"
        footer={
          <div className="flex justify-end gap-3">
            <button onClick={() => setShowForm(false)} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-xl">{t.cancel}</button>
            <button onClick={handleSave} disabled={saving || !formData.name} className="px-4 py-2 text-sm bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 disabled:opacity-50">
              {saving ? t.saving : t.save}
            </button>
          </div>
        }
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">{t.name} *</label>
              <input type="text" value={formData.name} onChange={e => setFormData(p => ({ ...p, name: e.target.value }))} placeholder={t.name} className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t.territory}</label>
              <select value={formData.territory_id} onChange={e => setFormData(p => ({ ...p, territory_id: e.target.value }))} className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">—</option>
                {territories.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t.supervisor}</label>
              <select value={formData.assigned_to} onChange={e => setFormData(p => ({ ...p, assigned_to: e.target.value }))} className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">—</option>
                {supervisors.map(s => <option key={s.id} value={s.id}>{s.full_name ?? s.email}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t.recurrence}</label>
              <select value={formData.recurrence} onChange={e => setFormData(p => ({ ...p, recurrence: e.target.value }))} className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="none">{t.none}</option>
                <option value="daily">{t.daily}</option>
                <option value="weekly">{t.weekly}</option>
                <option value="monthly">{t.monthly}</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t.establishments}</label>
              <input type="number" value={formData.establishment_count} onChange={e => setFormData(p => ({ ...p, establishment_count: parseInt(e.target.value) || 0 }))} className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>

          {/* Waypoints */}
          <div>
            <div className="text-sm font-semibold text-gray-700 mb-2">{t.waypoints}</div>
            {formData.waypoints.length > 0 && (
              <div className="space-y-1 mb-3 max-h-40 overflow-y-auto">
                {formData.waypoints.map((wp, i) => (
                  <div key={i} className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg text-sm">
                    <GripVertical className="w-4 h-4 text-gray-300" />
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold text-white ${i === 0 ? 'bg-green-500' : i === formData.waypoints.length - 1 ? 'bg-red-500' : 'bg-blue-500'}`}>{i + 1}</div>
                    <span className="flex-1 truncate font-medium">{wp.label}</span>
                    <span className="text-gray-400 text-xs">{wp.lat.toFixed(3)}, {wp.lng.toFixed(3)}</span>
                    <button onClick={() => moveWaypoint(i, -1)} className="p-0.5 text-gray-400 hover:text-gray-600" disabled={i === 0}><ChevronUp className="w-3 h-3" /></button>
                    <button onClick={() => moveWaypoint(i, 1)} className="p-0.5 text-gray-400 hover:text-gray-600" disabled={i === formData.waypoints.length - 1}><ChevronDown className="w-3 h-3" /></button>
                    <button onClick={() => removeWaypoint(i)} className="p-0.5 text-red-400 hover:text-red-600"><Trash2 className="w-3 h-3" /></button>
                  </div>
                ))}
              </div>
            )}
            <div className="flex gap-2">
              <input type="text" placeholder={t.label} value={newWaypoint.label} onChange={e => setNewWaypoint(p => ({ ...p, label: e.target.value }))} className="flex-1 px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              <input type="number" step="0.0001" placeholder={t.lat} value={newWaypoint.lat} onChange={e => setNewWaypoint(p => ({ ...p, lat: e.target.value }))} className="w-24 px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              <input type="number" step="0.0001" placeholder={t.lng} value={newWaypoint.lng} onChange={e => setNewWaypoint(p => ({ ...p, lng: e.target.value }))} className="w-24 px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              <button onClick={addWaypoint} className="px-3 py-2 bg-blue-600 text-white rounded-xl text-sm hover:bg-blue-700">
                <Plus className="w-4 h-4" />
              </button>
            </div>
            <RouteMap waypoints={formData.waypoints} />
          </div>
        </div>
      </Modal>

      <Modal open={!!deleteTarget} onClose={() => setDeleteTarget(null)} title={t.deleteRoute}
        footer={<div className="flex justify-end gap-3"><button onClick={() => setDeleteTarget(null)} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-xl">{t.cancel}</button><button onClick={handleDelete} className="px-4 py-2 text-sm bg-red-600 text-white font-semibold rounded-xl hover:bg-red-700">{t.delete}</button></div>}
      >
        <div className="flex items-start gap-3 text-sm text-gray-600"><AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />{t.deleteWarning}</div>
      </Modal>
    </div>
  );
}

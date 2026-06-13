import { useState, useEffect, useCallback } from 'react';
import {
  Key, Plus, CheckCircle, Package, Users, HardDrive, MapPin,
  Smartphone, Globe, FileText, BarChart2, Brain, RefreshCw,
  Lock, GitBranch, Shield, Calendar, AlertCircle, Clock, Zap
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useOrg } from '../../contexts/OrgContext';
import { PageHeader } from '../../components/common/PageHeader';
import { StatusBadge } from '../../components/common/StatusBadge';
import { Modal } from '../../components/common/Modal';
import { useI18n } from '../../hooks/useI18n';
import type { SupportedLanguage, Plan, License, Module, OrgModule } from '../../types';

const MODULE_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  iam: Shield, dashboard: BarChart2, territories: MapPin, routes: Globe,
  forms: FileText, geospatial: Globe, workflows: GitBranch, analytics: BarChart2,
  ai: Brain, sync: RefreshCw, permissions: Lock, licensing: Key,
  inventory: Package, visits: Calendar, audit: FileText,
};

const UI: Record<SupportedLanguage, {
  title: string;
  subtitle: string;
  currentLicense: string;
  noLicense: string;
  usageLimits: string;
  maxMembers: string;
  maxDevices: string;
  maxTerritories: string;
  storage: string;
  unlimited: string;
  moduleActivation: string;
  modulesActive: string;
  core: string;
  included: string;
  availablePlans: string;
  plansAssigned: string;
  current: string;
  activeSince: string;
  expires: string;
  neverExpires: string;
  newLicense: string;
  editLicense: string;
  plan: string;
  startDate: string;
  expirationDate: string;
  status: string;
  save: string;
  cancel: string;
  type: string;
  capacity: string;
}> = {
  es: {
    title: 'Licencias',
    subtitle: 'Gestion de licencias, planes y modulos organizacionales',
    currentLicense: 'Licencia Actual',
    noLicense: 'Sin licencia',
    usageLimits: 'Limites de Uso',
    maxMembers: 'Max. Usuarios',
    maxDevices: 'Max. Dispositivos',
    maxTerritories: 'Max. Territorios',
    storage: 'Almacenamiento',
    unlimited: 'Ilimitado',
    moduleActivation: 'Activacion de Modulos',
    modulesActive: 'modulos activos',
    core: 'Nucleo',
    included: 'Incluido',
    availablePlans: 'Planes Disponibles',
    plansAssigned: 'Los planes se asignan administrativamente. Contacte soporte para cambiar.',
    current: 'Actual',
    activeSince: 'Activa desde',
    expires: 'Expira',
    neverExpires: 'Nunca expira',
    newLicense: 'Nueva Licencia',
    editLicense: 'Editar Licencia',
    plan: 'Plan',
    startDate: 'Fecha de Inicio',
    expirationDate: 'Fecha de Expiracion',
    status: 'Estado',
    save: 'Guardar',
    cancel: 'Cancelar',
    type: 'Tipo',
    capacity: 'Capacidad',
  },
  en: {
    title: 'Licensing',
    subtitle: 'License management, plans, and organizational modules',
    currentLicense: 'Current License',
    noLicense: 'No license',
    usageLimits: 'Usage Limits',
    maxMembers: 'Max Members',
    maxDevices: 'Max Devices',
    maxTerritories: 'Max Territories',
    storage: 'Storage',
    unlimited: 'Unlimited',
    moduleActivation: 'Module Activation',
    modulesActive: 'modules active',
    core: 'Core',
    included: 'Included',
    availablePlans: 'Available Plans',
    plansAssigned: 'Plans are assigned administratively. Contact support to change.',
    current: 'Current',
    activeSince: 'Active since',
    expires: 'Expires',
    neverExpires: 'Never expires',
    newLicense: 'New License',
    editLicense: 'Edit License',
    plan: 'Plan',
    startDate: 'Start Date',
    expirationDate: 'Expiration Date',
    status: 'Status',
    save: 'Save',
    cancel: 'Cancel',
    type: 'Type',
    capacity: 'Capacity',
  },
  fr: {
    title: 'Licences',
    subtitle: 'Gestion des licences, plans et modules organisationnels',
    currentLicense: 'Licence Actuelle',
    noLicense: 'Pas de licence',
    usageLimits: "Limites d'Utilisation",
    maxMembers: 'Max Membres',
    maxDevices: 'Max Appareils',
    maxTerritories: 'Max Territoires',
    storage: 'Stockage',
    unlimited: 'Illimite',
    moduleActivation: 'Activation des Modules',
    modulesActive: 'modules actifs',
    core: 'Noyau',
    included: 'Inclus',
    availablePlans: 'Plans Disponibles',
    plansAssigned: 'Les plans sont attribues administrativement. Contactez le support.',
    current: 'Actuel',
    activeSince: 'Actif depuis',
    expires: 'Expire',
    neverExpires: "N'expire jamais",
    newLicense: 'Nouvelle Licence',
    editLicense: 'Modifier Licence',
    plan: 'Plan',
    startDate: 'Date de Debut',
    expirationDate: "Date d'Expiration",
    status: 'Statut',
    save: 'Enregistrer',
    cancel: 'Annuler',
    type: 'Type',
    capacity: 'Capacite',
  },
  de: {
    title: 'Lizenzierung',
    subtitle: 'Lizenzverwaltung, Plane und organisationale Module',
    currentLicense: 'Aktuelle Lizenz',
    noLicense: 'Keine Lizenz',
    usageLimits: 'Nutzungsgrenzen',
    maxMembers: 'Max Mitglieder',
    maxDevices: 'Max Gerate',
    maxTerritories: 'Max Gebiete',
    storage: 'Speicher',
    unlimited: 'Unbegrenzt',
    moduleActivation: 'Modulaktivierung',
    modulesActive: 'Module aktiv',
    core: 'Kern',
    included: 'Inklusive',
    availablePlans: 'Verfugbare Plane',
    plansAssigned: 'Plane werden administrativ zugewiesen. Kontaktieren Sie den Support.',
    current: 'Aktuell',
    activeSince: 'Aktiv seit',
    expires: 'Lauft ab',
    neverExpires: 'Lauft nie ab',
    newLicense: 'Neue Lizenz',
    editLicense: 'Lizenz bearbeiten',
    plan: 'Plan',
    startDate: 'Startdatum',
    expirationDate: 'Ablaufdatum',
    status: 'Status',
    save: 'Speichern',
    cancel: 'Abbrechen',
    type: 'Typ',
    capacity: 'Kapazitat',
  },
  pt: {
    title: 'Licenciamento',
    subtitle: 'Gestao de licencas, planos e modulos organizacionais',
    currentLicense: 'Licenca Atual',
    noLicense: 'Sem licenca',
    usageLimits: 'Limites de Uso',
    maxMembers: 'Max Membros',
    maxDevices: 'Max Dispositivos',
    maxTerritories: 'Max Territorios',
    storage: 'Armazenamento',
    unlimited: 'Ilimitado',
    moduleActivation: 'Ativacao de Modulos',
    modulesActive: 'modulos ativos',
    core: 'Nucleo',
    included: 'Incluido',
    availablePlans: 'Planos Disponiveis',
    plansAssigned: 'Os planos sao atribuidos administrativamente. Contate o suporte.',
    current: 'Atual',
    activeSince: 'Ativo desde',
    expires: 'Expira',
    neverExpires: 'Nunca expira',
    newLicense: 'Nova Licenca',
    editLicense: 'Editar Licenca',
    plan: 'Plano',
    startDate: 'Data de Inicio',
    expirationDate: 'Data de Expiracao',
    status: 'Status',
    save: 'Salvar',
    cancel: 'Cancelar',
    type: 'Tipo',
    capacity: 'Capacidade',
  },
  zh: {
    title: '许可',
    subtitle: '许可证、计划和模块管理',
    currentLicense: '当前许可证',
    noLicense: '无许可证',
    usageLimits: '使用限制',
    maxMembers: '最大成员',
    maxDevices: '最大设备',
    maxTerritories: '最大区域',
    storage: '存储',
    unlimited: '无限',
    moduleActivation: '模块激活',
    modulesActive: '个模块已激活',
    core: '核心',
    included: '包含',
    availablePlans: '可用计划',
    plansAssigned: '计划由管理员分配。联系支持团队更改。',
    current: '当前',
    activeSince: '开始于',
    expires: '到期',
    neverExpires: '永不过期',
    newLicense: '新许可证',
    editLicense: '编辑许可证',
    plan: '计划',
    startDate: '开始日期',
    expirationDate: '到期日期',
    status: '状态',
    save: '保存',
    cancel: '取消',
    type: '类型',
    capacity: '容量',
  },
  ja: {
    title: 'ライセンス',
    subtitle: 'ライセンス、プラン、組織モジュールの管理',
    currentLicense: '現在のライセンス',
    noLicense: 'ライセンスなし',
    usageLimits: '使用制限',
    maxMembers: '最大メンバー',
    maxDevices: '最大デバイス',
    maxTerritories: '最大エリア',
    storage: 'ストレージ',
    unlimited: '無制限',
    moduleActivation: 'モジュール有効化',
    modulesActive: 'モジュールが有効',
    core: 'コア',
    included: '含む',
    availablePlans: '利用可能なプラン',
    plansAssigned: 'プランは管理によって割り当てられます。サポートにお問い合わせください。',
    current: '現在',
    activeSince: '有効開始',
    expires: '有効期限',
    neverExpires: '有効期限なし',
    newLicense: '新規ライセンス',
    editLicense: 'ライセンス編集',
    plan: 'プラン',
    startDate: '開始日',
    expirationDate: '有効期限日',
    status: 'ステータス',
    save: '保存',
    cancel: 'キャンセル',
    type: 'タイプ',
    capacity: '容量',
  },
};

export function LicensingEnginePage() {
  const { org } = useOrg();
  const { lang } = useI18n();
  const t = UI[lang];

  const [plans, setPlans] = useState<Plan[]>([]);
  const [license, setLicense] = useState<License | null>(null);
  const [allModules, setAllModules] = useState<Module[]>([]);
  const [orgModules, setOrgModules] = useState<OrgModule[]>([]);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!org) return;
    const [{ data: p }, { data: lic }, { data: mods }, { data: orgMods }] = await Promise.all([
      supabase.from('plans').select('*').eq('is_active', true).order('max_members'),
      supabase.from('licenses').select('*, plans(*)').eq('organization_id', org.id).maybeSingle(),
      supabase.from('modules').select('*').order('is_core', { ascending: false }).order('name'),
      supabase.from('organization_modules').select('*').eq('organization_id', org.id),
    ]);
    setPlans((p ?? []) as Plan[]);
    setLicense(lic as License | null);
    setAllModules((mods ?? []) as Module[]);
    setOrgModules((orgMods ?? []) as OrgModule[]);
    setLoading(false);
  }, [org]);

  useEffect(() => { load(); }, [load]);

  async function toggleModule(moduleKey: string, currentlyActive: boolean) {
    if (!org) return;
    setToggling(moduleKey);
    const existing = orgModules.find(m => m.module_key === moduleKey);
    if (existing) {
      await supabase.from('organization_modules').update({ is_active: !currentlyActive }).eq('id', existing.id);
    } else {
      await supabase.from('organization_modules').insert({ organization_id: org.id, module_key: moduleKey, is_active: true });
    }
    setToggling(null);
    await load();
  }

  async function handleCreateLicense() {
    if (!org) return;
    setSaving(true);
    // For demo: create a trial license with the first available plan
    const trialPlan = plans[0];
    if (!trialPlan) {
      setSaving(false);
      return;
    }
    await supabase.from('licenses').insert({
      organization_id: org.id,
      plan_id: trialPlan.id,
      status: 'trial',
      starts_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    });
    setSaving(false);
    setShowForm(false);
    await load();
  }

  const currentPlan = (license as unknown as { plans: Plan } | null)?.plans ?? null;
  const activeModuleKeys = orgModules.filter(m => m.is_active).map(m => m.module_key);

  const limits = currentPlan ? {
    members: currentPlan.max_members,
    devices: currentPlan.max_devices,
    territories: currentPlan.max_territories,
    storage: `${currentPlan.max_storage_gb} GB`,
  } : null;

  return (
    <div>
      <PageHeader
        title={t.title}
        subtitle={t.subtitle}
        actions={
          !license && (
            <button
              onClick={() => setShowForm(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              {t.newLicense}
            </button>
          )
        }
      />

      {loading ? (
        <div className="text-center py-12 text-gray-400">{lang === 'es' ? 'Cargando...' : 'Loading...'}</div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Current license + modules */}
          <div className="lg:col-span-2 space-y-6">
            {/* Current license */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">{t.currentLicense}</div>
                  <h2 className="text-2xl font-bold text-gray-900">{currentPlan?.name ?? t.noLicense}</h2>
                  {currentPlan?.description && <p className="text-sm text-gray-500 mt-1">{currentPlan.description}</p>}
                </div>
                {license && <StatusBadge status={license.status} />}
              </div>

              {limits && (
                <div className="mb-4">
                  <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">{t.usageLimits}</div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {[
                      { label: t.maxMembers, value: limits.members === 999 ? t.unlimited : limits.members, icon: Users },
                      { label: t.maxDevices, value: limits.devices === 999 ? t.unlimited : limits.devices, icon: Smartphone },
                      { label: t.maxTerritories, value: limits.territories === 999 ? t.unlimited : limits.territories, icon: MapPin },
                      { label: t.storage, value: limits.storage, icon: HardDrive },
                    ].map(({ label, value, icon: Icon }) => (
                      <div key={label} className="p-3 bg-gray-50 rounded-xl">
                        <Icon className="w-4 h-4 text-gray-400 mb-1" />
                        <div className="text-lg font-bold text-gray-900">{value}</div>
                        <div className="text-xs text-gray-500">{label}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {license && (
                <div className="flex items-center gap-4 text-xs text-gray-400 pt-3 border-t border-gray-100">
                  <span className="flex items-center gap-1">
                    <Zap className="w-3 h-3" />
                    {t.activeSince} {new Date(license.starts_at).toLocaleDateString()}
                  </span>
                  {license.expires_at ? (
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {t.expires} {new Date(license.expires_at).toLocaleDateString()}
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-emerald-600">
                      <CheckCircle className="w-3 h-3" />
                      {t.neverExpires}
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Module management */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <div className="text-sm font-semibold text-gray-800">{t.moduleActivation}</div>
                  <div className="text-xs text-gray-400 mt-0.5">{activeModuleKeys.length} {t.modulesActive} / {allModules.length}</div>
                </div>
                <div className="w-24 h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-500 rounded-full transition-all" style={{ width: `${(activeModuleKeys.length / allModules.length) * 100}%` }} />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {allModules.map(mod => {
                  const isActive = activeModuleKeys.includes(mod.key);
                  const isCore = mod.is_core;
                  const inPlan = currentPlan?.included_modules?.includes(mod.key) ?? false;
                  const Icon = MODULE_ICONS[mod.key] ?? Package;
                  const isToggling = toggling === mod.key;

                  return (
                    <div
                      key={mod.id}
                      className={`flex items-start gap-3 p-4 rounded-xl border transition-all ${
                        isActive ? 'border-blue-200 bg-blue-50/30' : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${isActive ? 'bg-blue-100' : 'bg-gray-100'}`}>
                        <Icon className={`w-4 h-4 ${isActive ? 'text-blue-600' : 'text-gray-400'}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 mb-0.5">
                          <span className="text-sm font-semibold text-gray-800 truncate">{mod.name}</span>
                          {isCore && <span className="text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-md">{t.core}</span>}
                          {inPlan && !isCore && <span className="text-xs bg-emerald-100 text-emerald-600 px-1.5 py-0.5 rounded-md">{t.included}</span>}
                        </div>
                        {mod.description && <div className="text-xs text-gray-400 truncate">{mod.description}</div>}
                      </div>
                      {!isCore && (
                        <button
                          onClick={() => toggleModule(mod.key, isActive)}
                          disabled={isToggling}
                          className={`relative w-10 h-5 rounded-full transition-colors flex-shrink-0 ${isActive ? 'bg-blue-600' : 'bg-gray-200'} ${isToggling ? 'opacity-50' : ''}`}
                        >
                          <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${isActive ? 'translate-x-5' : 'translate-x-0.5'}`} />
                        </button>
                      )}
                      {isCore && <CheckCircle className="w-5 h-5 text-emerald-500 flex-shrink-0" />}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Right: Available plans */}
          <div className="space-y-4">
            <div className="text-sm font-semibold text-gray-700">{t.availablePlans}</div>
            <div className="text-xs text-gray-400 flex items-start gap-1">
              <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
              {t.plansAssigned}
            </div>
            {plans.map(plan => {
              const isCurrent = currentPlan?.id === plan.id;
              return (
                <div
                  key={plan.id}
                  className={`bg-white rounded-2xl border shadow-sm p-5 transition-all ${isCurrent ? 'border-blue-300 ring-2 ring-blue-100' : 'border-gray-100'}`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <div className="font-bold text-gray-900">{plan.name}</div>
                      <div className="text-xs text-gray-400 mt-0.5">{plan.description}</div>
                    </div>
                    {isCurrent && (
                      <span className="flex items-center gap-1 text-xs font-semibold text-blue-700 bg-blue-50 px-2 py-1 rounded-lg">
                        <CheckCircle className="w-3.5 h-3.5" /> {t.current}
                      </span>
                    )}
                  </div>

                  <div className="space-y-1.5 text-xs text-gray-600 mb-3">
                    <div className="flex items-center gap-2">
                      <Users className="w-3.5 h-3.5 text-gray-400" />
                      {plan.max_members === 999 ? t.unlimited : plan.max_members} {lang === 'es' ? 'usuarios' : 'members'}
                    </div>
                    <div className="flex items-center gap-2">
                      <Smartphone className="w-3.5 h-3.5 text-gray-400" />
                      {plan.max_devices === 999 ? t.unlimited : plan.max_devices} {lang === 'es' ? 'dispositivos' : 'devices'}
                    </div>
                    <div className="flex items-center gap-2">
                      <HardDrive className="w-3.5 h-3.5 text-gray-400" />
                      {plan.max_storage_gb === 999 ? t.unlimited : plan.max_storage_gb} GB {lang === 'es' ? 'almacenamiento' : 'storage'}
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-1">
                    {plan.included_modules.slice(0, 6).map(mk => (
                      <span key={mk} className="px-1.5 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-md">{mk}</span>
                    ))}
                    {plan.included_modules.length > 6 && (
                      <span className="px-1.5 py-0.5 bg-gray-100 text-gray-400 text-xs rounded-md">+{plan.included_modules.length - 6}</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* New License Modal */}
      <Modal
        open={showForm}
        onClose={() => setShowForm(false)}
        title={t.newLicense}
        footer={
          <div className="flex justify-end gap-3">
            <button onClick={() => setShowForm(false)} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-xl transition-colors">
              {t.cancel}
            </button>
            <button
              onClick={handleCreateLicense}
              disabled={saving || plans.length === 0}
              className="px-4 py-2 text-sm bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {saving ? (lang === 'es' ? 'Guardando...' : 'Saving...') : t.save}
            </button>
          </div>
        }
      >
        <div className="space-y-4">
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-sm text-blue-700">
            {lang === 'es'
              ? 'Se creara una licencia de prueba por 30 dias con el plan basico disponible.'
              : 'A 30-day trial license will be created with the first available plan.'}
          </div>
          {plans.length > 0 && (
            <div className="p-3 bg-gray-50 rounded-xl">
              <div className="text-xs text-gray-500 mb-1">{t.plan}</div>
              <div className="text-sm font-semibold text-gray-900">{plans[0].name}</div>
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}

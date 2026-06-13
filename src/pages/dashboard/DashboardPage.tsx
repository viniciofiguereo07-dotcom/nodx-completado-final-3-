import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, MapPin, Route as RouteIcon, FileText, Globe,
  GitBranch, BarChart2, Brain, RefreshCw, Package, CalendarCheck,
  List, Users, Smartphone, TrendingUp, TrendingDown, ArrowRight,
  Building2, Key, AlertTriangle, Eye, Activity, Layers, Cpu,
  Shield, Droplets, Heart, GraduationCap, PieChart,
  Database, Zap, Link2, Target, Clock
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useOrg } from '../../contexts/OrgContext';
import { useAuth } from '../../contexts/AuthContext';
import { useModules } from '../../hooks/useModules';
import { StatusBadge } from '../../components/common/StatusBadge';
import { useI18n } from '../../hooks/useI18n';
import type { SupportedLanguage } from '../../types';

interface KPI {
  label: string;
  labelEs: string;
  value: number | string;
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  color: string;
  path: string;
  moduleKey: string;
}

const DOMAINS = [
  { key: 'CORE', name: 'CORE', icon: Layers, color: '#3b82f6', status: 'active' },
  { key: 'PLAIGT', name: 'PLAIGT', icon: Shield, color: '#22c55e', status: 'active' },
  { key: 'HUB', name: 'HUB', icon: Database, color: '#f59e0b', status: 'active' },
  { key: 'ATLAS', name: 'ATLAS', icon: Globe, color: '#8b5cf6', status: 'active' },
  { key: 'AI', name: 'AI', icon: Brain, color: '#06b6d4', status: 'active' },
  { key: 'FLOW', name: 'FLOW', icon: Zap, color: '#ec4899', status: 'active' },
];

const UI: Record<SupportedLanguage, {
  operationalMetrics: string;
  ecosystemDomains: string;
  recentActivity: string;
  quickActions: string;
}> = {
  es: { operationalMetrics: 'Metricas Operativas', ecosystemDomains: 'Dominios del Ecosistema', recentActivity: 'Actividad Reciente', quickActions: 'Acciones Rapidas' },
  en: { operationalMetrics: 'Operational Metrics', ecosystemDomains: 'Ecosystem Domains', recentActivity: 'Recent Activity', quickActions: 'Quick Actions' },
  fr: { operationalMetrics: 'Metriques Operationnelles', ecosystemDomains: 'Domaines de l\'Ecosysteme', recentActivity: 'Activite Recente', quickActions: 'Actions Rapides' },
  de: { operationalMetrics: 'Betriebsmetriken', ecosystemDomains: 'Okosystem-Domains', recentActivity: 'Neueste Aktivitat', quickActions: 'Schnelle Aktionen' },
  pt: { operationalMetrics: 'Metricas Operacionais', ecosystemDomains: 'Dominios do Ecossistema', recentActivity: 'Atividade Recente', quickActions: 'Acoes Rapidas' },
  zh: { operationalMetrics: '运营指标', ecosystemDomains: '生态系统域', recentActivity: '最近活动', quickActions: '快速操作' },
  ja: { operationalMetrics: '運用指標', ecosystemDomains: 'エコシステムドメイン', recentActivity: '最近のアクティビティ', quickActions: 'クイックアクション' },
};

export function DashboardPage() {
  const { org } = useOrg();
  const { profile } = useAuth();
  const { isActive } = useModules();
  const navigate = useNavigate();
  const { lang } = useI18n();
  const t = UI[lang];

  const [stats, setStats] = useState<Record<string, number>>({});
  const [recentActivity, setRecentActivity] = useState<Array<{ type: string; label: string; date: string; color: string }>>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!org) return;

    const [
      { count: organizations },
      { count: members },
      { count: devicesSync },
      { count: licenses },
      { count: territories },
      { count: routes },
      { count: visits },
      { count: completedVisits },
      { count: submissions },
      { count: inventory },
      { count: alerts },
      { count: pendingSync },
    ] = await Promise.all([
      supabase.from('organizations').select('*', { count: 'exact', head: true }),
      supabase.from('organization_members').select('*', { count: 'exact', head: true }).eq('organization_id', org.id),
      supabase.from('sync_queue').select('*', { count: 'exact', head: true }).eq('organization_id', org.id),
      supabase.from('licenses').select('*', { count: 'exact', head: true }).eq('organization_id', org.id),
      supabase.from('territories').select('*', { count: 'exact', head: true }).eq('organization_id', org.id),
      supabase.from('routes').select('*', { count: 'exact', head: true }).eq('organization_id', org.id),
      supabase.from('visits').select('*', { count: 'exact', head: true }).eq('organization_id', org.id),
      supabase.from('visits').select('*', { count: 'exact', head: true }).eq('organization_id', org.id).eq('status', 'completed'),
      supabase.from('form_submissions').select('*', { count: 'exact', head: true }).eq('organization_id', org.id),
      supabase.from('inventory_items').select('*', { count: 'exact', head: true }).eq('organization_id', org.id),
      supabase.from('alerts').select('*', { count: 'exact', head: true }).eq('organization_id', org.id),
      supabase.from('sync_queue').select('*', { count: 'exact', head: true }).eq('organization_id', org.id).eq('status', 'pending'),
    ]);

    setStats({
      organizations: organizations ?? 1,
      members: members ?? 0,
      devices: devicesSync ?? 0,
      licenses: licenses ?? 0,
      territories: territories ?? 0,
      routes: routes ?? 0,
      visits: visits ?? 0,
      completedVisits: completedVisits ?? 0,
      submissions: submissions ?? 0,
      inventory: inventory ?? 0,
      alerts: alerts ?? 0,
      pendingSync: pendingSync ?? 0,
    });

    // Build recent activity from recent data
    const activities: typeof recentActivity = [];
    if ((territories ?? 0) > 0) activities.push({ type: 'territory', label: lang === 'es' ? `${territories} territorios configurados` : `${territories} territories configured`, date: new Date().toISOString(), color: '#22c55e' });
    if ((routes ?? 0) > 0) activities.push({ type: 'route', label: lang === 'es' ? `${routes} rutas desplegadas` : `${routes} routes deployed`, date: new Date().toISOString(), color: '#f59e0b' });
    if ((visits ?? 0) > 0) activities.push({ type: 'visit', label: lang === 'es' ? `${visits} visitas realizadas` : `${visits} visits completed`, date: new Date().toISOString(), color: '#8b5cf6' });
    if ((submissions ?? 0) > 0) activities.push({ type: 'form', label: lang === 'es' ? `${submissions} formularios procesados` : `${submissions} forms processed`, date: new Date().toISOString(), color: '#06b6d4' });
    if ((members ?? 0) > 0) activities.push({ type: 'user', label: lang === 'es' ? `${members} usuarios activos` : `${members} active users`, date: new Date().toISOString(), color: '#3b82f6' });

    setRecentActivity(activities);
    setLoading(false);
  }, [org, lang]);

  useEffect(() => { load(); }, [load]);

  const kpis: KPI[] = [
    { label: 'Organizations', labelEs: 'Organizaciones', value: stats.organizations ?? 1, icon: Building2, color: '#3b82f6', path: '/organizations', moduleKey: 'iam' },
    { label: 'Users', labelEs: 'Usuarios', value: stats.members ?? 0, icon: Users, color: '#8b5cf6', path: '/members', moduleKey: 'iam' },
    { label: 'Devices', labelEs: 'Dispositivos', value: stats.devices ?? 0, icon: Smartphone, color: '#06b6d4', path: '/sync', moduleKey: 'sync' },
    { label: 'Licenses', labelEs: 'Licencias', value: stats.licenses ?? 0, icon: Key, color: '#ec4899', path: '/licensing', moduleKey: 'licensing' },
    { label: 'Territories', labelEs: 'Territorios', value: stats.territories ?? 0, icon: MapPin, color: '#22c55e', path: '/territories', moduleKey: 'territories' },
    { label: 'Routes', labelEs: 'Rutas', value: stats.routes ?? 0, icon: RouteIcon, color: '#f59e0b', path: '/routes', moduleKey: 'routes' },
    { label: 'Visits', labelEs: 'Visitas', value: stats.visits ?? 0, icon: CalendarCheck, color: '#6366f1', path: '/visits', moduleKey: 'visits' },
    { label: 'Forms', labelEs: 'Formularios', value: stats.submissions ?? 0, icon: FileText, color: '#14b8a6', path: '/forms', moduleKey: 'forms' },
    { label: 'Evidence', labelEs: 'Evidencias', value: stats.inventory ?? 0, icon: Eye, color: '#f97316', path: '/evidence', moduleKey: 'evidence' },
    { label: 'Alerts', labelEs: 'Alertas', value: stats.alerts ?? 0, icon: AlertTriangle, color: '#ef4444', path: '/alerts', moduleKey: 'alerts' },
  ].filter(k => k.moduleKey === 'iam' || k.moduleKey === 'sync' || k.moduleKey === 'licensing' || isActive(k.moduleKey));

  const completionRate = stats.visits > 0 ? Math.round(((stats.completedVisits ?? 0) / stats.visits) * 100) : 0;

  const hour = new Date().getHours();
  const greeting = hour < 12 ? (lang === 'es' ? 'Buenos dias' : 'Good morning') : hour < 17 ? (lang === 'es' ? 'Buenas tardes' : 'Good afternoon') : (lang === 'es' ? 'Buenas noches' : 'Good evening');

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <div className="text-sm text-gray-400 mb-1">{greeting},</div>
        <h1 className="text-3xl font-bold text-gray-900">{profile?.full_name ?? 'Welcome back'}</h1>
        <p className="text-gray-500 mt-1">
          {org?.name ?? ''} · {lang === 'es' ? 'Centro de Operaciones Territoriales' : 'Territorial Operations Center'} · {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </p>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-400">{lang === 'es' ? 'Cargando centro de operaciones...' : 'Loading operations center...'}</div>
      ) : (
        <>
          {/* Operational Metrics Grid */}
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-4">
              <Activity className="w-4 h-4 text-blue-600" />
              <h2 className="text-lg font-semibold text-gray-800">{t.operationalMetrics}</h2>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
              {kpis.map(kpi => (
                <div key={kpi.label} onClick={() => navigate(kpi.path)}
                  className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 cursor-pointer hover:shadow-md hover:border-gray-200 transition-all group">
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center mb-3" style={{ backgroundColor: kpi.color + '15' }}>
                    <kpi.icon className="w-4 h-4" style={{ color: kpi.color }} />
                  </div>
                  <div className="text-2xl font-bold text-gray-900 mb-1">{kpi.value}</div>
                  <div className="text-xs text-gray-500 group-hover:text-blue-600 transition-colors">{lang === 'es' ? kpi.labelEs : kpi.label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Two Column Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
            {/* Completion Status */}
            <div className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-2xl p-6 text-white">
              <div className="flex items-center justify-between mb-4">
                <div className="text-sm font-medium text-blue-200">{lang === 'es' ? 'Completitud Operativa' : 'Operational Completion'}</div>
                <div className={`flex items-center gap-1 text-sm font-semibold ${completionRate > 50 ? 'text-emerald-300' : 'text-red-300'}`}>
                  {completionRate > 50 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                  {completionRate}%
                </div>
              </div>
              <div className="text-4xl font-bold mb-2">{stats.completedVisits ?? 0}</div>
              <div className="text-blue-200 text-sm">{lang === 'es' ? `de ${stats.visits ?? 0} operaciones completadas` : `of ${stats.visits ?? 0} operations completed`}</div>
              <div className="mt-4 w-full bg-blue-500 rounded-full h-2">
                <div className="bg-white h-2 rounded-full transition-all" style={{ width: `${completionRate}%` }} />
              </div>
            </div>

            {/* Sync Status */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <div className="flex items-center gap-2 mb-4">
                <RefreshCw className="w-4 h-4 text-gray-400" />
                <div className="text-sm font-semibold text-gray-700">{lang === 'es' ? 'Estado de Sincronizacion' : 'Sync Status'}</div>
              </div>
              <div className="text-3xl font-bold text-gray-900 mb-1">{stats.pendingSync ?? 0}</div>
              <div className="text-sm text-gray-500">{lang === 'es' ? 'elementos pendientes' : 'items pending sync'}</div>
              <button onClick={() => navigate('/sync')} className="mt-4 flex items-center gap-1.5 text-xs text-blue-600 font-medium hover:text-blue-700">
                {lang === 'es' ? 'Ver cola' : 'View queue'} <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Ecosystem Domains */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <div className="flex items-center gap-2 mb-4">
                <Cpu className="w-4 h-4 text-gray-400" />
                <div className="text-sm font-semibold text-gray-700">{t.ecosystemDomains}</div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {DOMAINS.map(domain => (
                  <div key={domain.key} className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
                    <div className="w-6 h-6 rounded-md flex items-center justify-center" style={{ backgroundColor: domain.color + '20' }}>
                      <domain.icon className="w-3 h-3" style={{ color: domain.color }} />
                    </div>
                    <span className="text-xs font-medium text-gray-700">{domain.key}</span>
                    <div className="ml-auto w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Recent Activity */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="text-sm font-semibold text-gray-700">{t.recentActivity}</div>
              </div>
              {recentActivity.length === 0 ? (
                <div className="text-sm text-gray-400 text-center py-6">{lang === 'es' ? 'Sin actividad reciente' : 'No recent activity'}</div>
              ) : (
                <div className="space-y-2">
                  {recentActivity.map((activity, i) => (
                    <div key={i} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                      <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: activity.color }} />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-gray-800">{activity.label}</div>
                      </div>
                      <div className="text-xs text-gray-400">{new Date(activity.date).toLocaleDateString()}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Quick Actions */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <div className="text-sm font-semibold text-gray-700 mb-4">{t.quickActions}</div>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: lang === 'es' ? 'Territorios' : 'Territories', icon: MapPin, path: '/territories', color: '#3b82f6' },
                  { label: lang === 'es' ? 'Rutas' : 'Routes', icon: RouteIcon, path: '/routes', color: '#f59e0b' },
                  { label: lang === 'es' ? 'Visitas' : 'Visits', icon: CalendarCheck, path: '/visits', color: '#22c55e' },
                  { label: lang === 'es' ? 'Formularios' : 'Forms', icon: FileText, path: '/forms', color: '#8b5cf6' },
                  { label: lang === 'es' ? 'Mapas' : 'Maps', icon: Globe, path: '/geospatial', color: '#06b6d4' },
                  { label: lang === 'es' ? 'Analitica' : 'Analytics', icon: BarChart2, path: '/analytics', color: '#6366f1' },
                  { label: lang === 'es' ? 'IA' : 'AI', icon: Brain, path: '/ai', color: '#ec4899' },
                  { label: lang === 'es' ? 'Alertas' : 'Alerts', icon: AlertTriangle, path: '/alerts', color: '#ef4444' },
                ].map(action => (
                  <button key={action.path} onClick={() => navigate(action.path)}
                    className="flex items-center gap-2.5 p-3 border border-gray-100 hover:border-gray-200 rounded-xl hover:bg-gray-50 transition-all group text-left">
                    <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: action.color + '15' }}>
                      <action.icon className="w-4 h-4" style={{ color: action.color }} />
                    </div>
                    <span className="text-xs font-medium text-gray-700 group-hover:text-blue-600 transition-colors leading-tight">{action.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

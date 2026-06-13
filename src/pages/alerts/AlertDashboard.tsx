import { useState, useMemo } from 'react';
import {
  Bell, BellRing, AlertTriangle, CheckCircle2, XCircle,
  RefreshCw, Search, ChevronLeft, ChevronRight, Clock,
  Activity, TrendingUp, BarChart2, Zap,
} from 'lucide-react';
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  LineChart, Line,
} from 'recharts';
import { useOrg } from '../../contexts/OrgContext';
import { useAuth } from '../../contexts/AuthContext';
import { useAlerts, useAlertMetrics } from '../../hooks/useAlerts';
import { alertEngine } from '../../services/AlertEngine';
import type { AlertSeverity, AlertSourceEngine, AlertEventStatus } from '../../types';

const SEVERITY_CONFIG: Record<AlertSeverity, { label: string; color: string; bg: string; icon: React.ElementType }> = {
  critical: { label: 'Critical', color: 'text-red-700',    bg: 'bg-red-50',    icon: XCircle },
  high:     { label: 'High',     color: 'text-orange-700', bg: 'bg-orange-50', icon: AlertTriangle },
  medium:   { label: 'Medium',   color: 'text-amber-700',  bg: 'bg-amber-50',  icon: Bell },
  low:      { label: 'Low',      color: 'text-blue-700',   bg: 'bg-blue-50',   icon: BellRing },
  info:     { label: 'Info',     color: 'text-gray-600',   bg: 'bg-gray-50',   icon: Activity },
};

const SEVERITY_COLORS: Record<string, string> = {
  critical: '#dc2626', high: '#ea580c', medium: '#d97706', low: '#2563eb', info: '#6b7280',
};

const SOURCE_LABELS: Record<string, string> = {
  indicator: 'Indicators', semaphore: 'Semaphore', diagnostic: 'Diagnostics',
  reporting: 'Reporting', data_quality: 'Data Quality', route_performance: 'Route Perf.',
  coverage: 'Coverage', risk: 'Risk', territorial: 'Territorial', custom: 'Custom',
};

const STATUS_BADGES: Record<string, { bg: string; color: string }> = {
  active:       { bg: 'bg-red-100',    color: 'text-red-700' },
  acknowledged: { bg: 'bg-amber-100',  color: 'text-amber-700' },
  resolved:     { bg: 'bg-emerald-100',color: 'text-emerald-700' },
  dismissed:    { bg: 'bg-gray-100',   color: 'text-gray-500' },
};

const PAGE_SIZE = 8;

export function AlertDashboard() {
  const { org } = useOrg();
  const orgId = org?.id;
  const { user } = useAuth();
  const { alerts, loading: alertsLoading, reload: reloadAlerts, acknowledge, resolve, dismiss } = useAlerts({ limit: 200 });
  const { metrics, reload: reloadMetrics } = useAlertMetrics();

  const [severityFilter, setSeverityFilter]         = useState<AlertSeverity | 'all'>('all');
  const [statusFilter, setStatusFilter]             = useState<AlertEventStatus | 'all'>('all');
  const [sourceFilter, setSourceFilter]             = useState<AlertSourceEngine | 'all'>('all');
  const [searchQuery, setSearchQuery]               = useState('');
  const [page, setPage]                             = useState(0);
  const [tab, setTab]                               = useState<'active' | 'history'>('active');

  const handleRefresh = () => { reloadAlerts(); reloadMetrics(); };

  // Filtered
  const filtered = useMemo(() => {
    let result = alerts;
    if (severityFilter !== 'all') result = result.filter(a => a.severity === severityFilter);
    if (statusFilter !== 'all') result = result.filter(a => a.status === statusFilter);
    if (sourceFilter !== 'all') result = result.filter(a => a.source_engine === sourceFilter);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(a =>
        a.title.toLowerCase().includes(q) ||
        (a.description ?? '').toLowerCase().includes(q)
      );
    }
    return result.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }, [alerts, severityFilter, statusFilter, sourceFilter, searchQuery]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  // Reset page on filter change
  const updateSeverity = (v: AlertSeverity | 'all') => { setSeverityFilter(v); setPage(0); };
  const updateStatus = (v: AlertEventStatus | 'all') => { setStatusFilter(v); setPage(0); };
  const updateSource = (v: AlertSourceEngine | 'all') => { setSourceFilter(v); setPage(0); };

  // KPIs
  const activeCount = metrics?.activeCount ?? 0;
  const criticalCount = metrics?.criticalCount ?? 0;
  const resolvedCount = metrics?.resolvedCount ?? 0;
  const alertRate = metrics?.alertRate ?? 0;

  // Charts
  const severityChartData = useMemo(() => {
    if (!metrics?.bySeverity) return [];
    return Object.entries(metrics.bySeverity).map(([key, value]) => ({
      name: SEVERITY_CONFIG[key as AlertSeverity]?.label ?? key,
      value,
      color: SEVERITY_COLORS[key] ?? '#6b7280',
    }));
  }, [metrics]);

  const sourceChartData = useMemo(() => {
    if (!metrics?.bySource) return [];
    return Object.entries(metrics.bySource).map(([key, value]) => ({
      name: SOURCE_LABELS[key] ?? key,
      value,
    }));
  }, [metrics]);

  const trendChartData = useMemo(() => metrics?.trend ?? [], [metrics]);

  return (
    <div className="p-6 max-w-screen-xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Alert Engine</h1>
          <p className="text-sm text-gray-500 mt-0.5">Intelligent alerting across indicators, semaphores, diagnostics, and more</p>
        </div>
        <button onClick={handleRefresh} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
          <RefreshCw size={18} />
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Active Alerts', value: activeCount, color: 'text-red-600', bg: 'bg-red-50', icon: BellRing },
          { label: 'Critical / High', value: criticalCount, color: 'text-orange-600', bg: 'bg-orange-50', icon: AlertTriangle },
          { label: 'Resolved', value: resolvedCount, color: 'text-emerald-600', bg: 'bg-emerald-50', icon: CheckCircle2 },
          { label: 'Alert Rate / Day', value: alertRate, color: 'text-blue-600', bg: 'bg-blue-50', icon: TrendingUp },
        ].map(kpi => {
          const Icon = kpi.icon;
          return (
            <div key={kpi.label} className="bg-white border border-gray-200 rounded-xl p-4 flex items-center gap-4">
              <div className={`p-2.5 rounded-xl ${kpi.bg}`}>
                <Icon size={20} className={kpi.color} />
              </div>
              <div>
                <p className="text-xs text-gray-500">{kpi.label}</p>
                <p className={`text-2xl font-bold ${kpi.color}`}>{kpi.value}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Severity Distribution */}
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <h3 className="font-semibold text-gray-800 mb-3">Severity Distribution</h3>
          {severityChartData.length === 0 ? (
            <div className="text-center py-8 text-gray-400 text-sm">No data</div>
          ) : (
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie data={severityChartData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} innerRadius={40} strokeWidth={2} stroke="#fff">
                  {severityChartData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Pie>
                <Tooltip />
                <Legend layout="horizontal" verticalAlign="bottom" iconType="circle" wrapperStyle={{ fontSize: '11px' }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Alerts By Source Engine */}
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <h3 className="font-semibold text-gray-800 mb-3">Alerts by Source</h3>
          {sourceChartData.length === 0 ? (
            <div className="text-center py-8 text-gray-400 text-sm">No data</div>
          ) : (
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={sourceChartData} layout="vertical" margin={{ left: 0, right: 16, top: 0, bottom: 0 }}>
                <XAxis type="number" hide />
                <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="value" fill="#3b82f6" radius={[0, 4, 4, 0]} barSize={18} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Alert Trend */}
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <h3 className="font-semibold text-gray-800 mb-3">Alert Trend</h3>
          {trendChartData.length === 0 ? (
            <div className="text-center py-8 text-gray-400 text-sm">No trend data</div>
          ) : (
            <ResponsiveContainer width="100%" height={180}>
              <LineChart data={trendChartData} margin={{ left: 0, right: 16, top: 4, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                <Tooltip />
                <Line type="monotone" dataKey="count" stroke="#3b82f6" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Resolution Time */}
      {metrics?.avgResolutionHours !== null && metrics?.avgResolutionHours !== undefined && (
        <div className="bg-white border border-gray-200 rounded-xl p-5 flex items-center gap-4">
          <div className="p-2.5 rounded-xl bg-emerald-50">
            <Clock size={20} className="text-emerald-600" />
          </div>
          <div>
            <p className="text-xs text-gray-500">Avg. Resolution Time</p>
            <p className="text-2xl font-bold text-emerald-600">{metrics.avgResolutionHours}h</p>
          </div>
        </div>
      )}

      {/* Tab + Filters */}
      <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-3">
        <div className="flex items-center gap-4">
          {(['active', 'history'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-4 py-2 text-sm font-medium capitalize rounded-lg transition-colors ${tab === t ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-100'}`}>
              {t === 'active' ? 'Active Alerts' : 'Alert History'}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search alerts..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <select value={severityFilter} onChange={e => updateSeverity(e.target.value as AlertSeverity | 'all')}
            className="px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="all">All Severity</option>
            {Object.entries(SEVERITY_CONFIG).map(([key, cfg]) => <option key={key} value={key}>{cfg.label}</option>)}
          </select>
          <select value={statusFilter} onChange={e => updateStatus(e.target.value as AlertEventStatus | 'all')}
            className="px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="acknowledged">Acknowledged</option>
            <option value="resolved">Resolved</option>
            <option value="dismissed">Dismissed</option>
          </select>
          <select value={sourceFilter} onChange={e => updateSource(e.target.value as AlertSourceEngine | 'all')}
            className="px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="all">All Sources</option>
            {Object.entries(SOURCE_LABELS).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
          </select>
          <span className="text-xs text-gray-400">{filtered.length} result{filtered.length !== 1 ? 's' : ''}</span>
        </div>
      </div>

      {/* Alerts Table */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        {alertsLoading ? (
          <div className="text-center py-16 text-gray-400">Loading alerts...</div>
        ) : paginated.length === 0 ? (
          <div className="text-center py-16">
            <CheckCircle2 size={36} className="text-emerald-400 mx-auto mb-3" />
            <p className="font-medium text-gray-500">No alerts match your filters</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase">Severity</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase">Alert</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase">Source</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase">Status</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase">Date</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {paginated.map(alert => {
                  const sevCfg = SEVERITY_CONFIG[alert.severity] ?? SEVERITY_CONFIG.info;
                  const statusBadge = STATUS_BADGES[alert.status] ?? STATUS_BADGES.active;
                  const SevIcon = sevCfg.icon;
                  return (
                    <tr key={alert.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2 py-0.5 rounded-full ${sevCfg.bg} ${sevCfg.color}`}>
                          <SevIcon size={12} /> {sevCfg.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 max-w-xs">
                        <p className="font-medium text-gray-800">{alert.title}</p>
                        {alert.description && <p className="text-xs text-gray-500 truncate mt-0.5">{alert.description}</p>}
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs font-medium text-gray-600">{SOURCE_LABELS[alert.source_engine] ?? alert.source_engine}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${statusBadge.bg} ${statusBadge.color}`}>{alert.status}</span>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-400 whitespace-nowrap">
                        {new Date(alert.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3">
                        {alert.status === 'active' && (
                          <div className="flex gap-1">
                            <button onClick={() => user && acknowledge(alert.id, user.id)} className="px-2 py-1 text-xs border border-amber-200 text-amber-700 rounded-lg hover:bg-amber-50 transition-colors">Ack</button>
                            <button onClick={() => user && resolve(alert.id, user.id)} className="px-2 py-1 text-xs border border-emerald-200 text-emerald-700 rounded-lg hover:bg-emerald-50 transition-colors">Resolve</button>
                            <button onClick={() => dismiss(alert.id)} className="px-2 py-1 text-xs border border-gray-200 text-gray-500 rounded-lg hover:bg-gray-50 transition-colors">Dismiss</button>
                          </div>
                        )}
                        {alert.status === 'acknowledged' && (
                          <button onClick={() => user && resolve(alert.id, user.id)} className="px-2 py-1 text-xs border border-emerald-200 text-emerald-700 rounded-lg hover:bg-emerald-50 transition-colors">Resolve</button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        {totalPages > 1 && (
          <div className="px-5 py-3 border-t border-gray-100 flex items-center justify-between">
            <span className="text-xs text-gray-400">Page {page + 1} of {totalPages}</span>
            <div className="flex gap-1">
              <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0} className="p-1.5 rounded-lg border border-gray-200 disabled:opacity-40 hover:bg-gray-50 transition-colors">
                <ChevronLeft size={14} />
              </button>
              <button onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1} className="p-1.5 rounded-lg border border-gray-200 disabled:opacity-40 hover:bg-gray-50 transition-colors">
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

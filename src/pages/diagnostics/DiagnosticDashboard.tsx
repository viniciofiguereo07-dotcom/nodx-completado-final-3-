import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Activity, AlertTriangle, XCircle, CheckCircle2, Lightbulb,
  RefreshCw, Search, ChevronLeft, ChevronRight, Clock,
  TrendingDown, Eye, FileWarning, ShieldCheck, Zap,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, CartesianGrid, Legend,
} from 'recharts';
import { useOrg } from '../../contexts/OrgContext';
import { useAuth } from '../../contexts/AuthContext';
import { diagnosticEngine } from '../../services/DiagnosticEngine';
import type {
  DiagnosticFinding, DiagnosticSeverity, DiagnosticFindingType,
  RecommendationInstance, DiagnosticExecution,
} from '../../types';

const SEVERITY_CONFIG: Record<DiagnosticSeverity, { label: string; color: string; bg: string; border: string; icon: React.ElementType }> = {
  critical: { label: 'Critical', color: 'text-red-700', bg: 'bg-red-50',  border: 'border-red-200', icon: XCircle },
  high:     { label: 'High',     color: 'text-orange-700', bg: 'bg-orange-50', border: 'border-orange-200', icon: AlertTriangle },
  medium:   { label: 'Medium',   color: 'text-amber-700',  bg: 'bg-amber-50',  border: 'border-amber-200', icon: AlertTriangle },
  low:      { label: 'Low',      color: 'text-blue-700',   bg: 'bg-blue-50',   border: 'border-blue-200', icon: Activity },
  info:     { label: 'Info',     color: 'text-gray-600',   bg: 'bg-gray-50',   border: 'border-gray-200', icon: CheckCircle2 },
};

const SEVERITY_COLORS_CHART: Record<string, string> = {
  critical: '#dc2626', high: '#ea580c', medium: '#d97706', low: '#2563eb', info: '#6b7280',
};

const FINDING_TYPE_LABELS: Record<DiagnosticFindingType, { label: string; icon: React.ElementType; color: string }> = {
  threshold_violation: { label: 'Threshold', icon: Zap, color: 'text-orange-600' },
  anomaly:            { label: 'Anomaly', icon: AlertTriangle, color: 'text-red-600' },
  negative_trend:     { label: 'Neg. Trend', icon: TrendingDown, color: 'text-amber-600' },
  missing_evidence:   { label: 'Missing Evidence', icon: FileWarning, color: 'text-blue-600' },
  compliance_gap:     { label: 'Compliance Gap', icon: ShieldCheck, color: 'text-purple-600' },
  custom:             { label: 'Custom', icon: Activity, color: 'text-gray-600' },
};

const STATUS_BADGES: Record<string, { bg: string; color: string }> = {
  open:         { bg: 'bg-red-100', color: 'text-red-700' },
  acknowledged: { bg: 'bg-amber-100', color: 'text-amber-700' },
  resolved:     { bg: 'bg-emerald-100', color: 'text-emerald-700' },
  dismissed:    { bg: 'bg-gray-100', color: 'text-gray-500' },
};

const REC_STATUS_BADGES: Record<string, { bg: string; color: string }> = {
  pending:     { bg: 'bg-blue-100', color: 'text-blue-700' },
  in_progress: { bg: 'bg-amber-100', color: 'text-amber-700' },
  completed:   { bg: 'bg-emerald-100', color: 'text-emerald-700' },
  dismissed:   { bg: 'bg-gray-100', color: 'text-gray-500' },
};

const PAGE_SIZE = 10;

export function DiagnosticDashboard() {
  const { org } = useOrg();
  const orgId = org?.id;
  const { user } = useAuth();

  // Data
  const [findings, setFindings]           = useState<DiagnosticFinding[]>([]);
  const [recommendations, setRecommendations] = useState<RecommendationInstance[]>([]);
  const [executions, setExecutions]       = useState<DiagnosticExecution[]>([]);
  const [stats, setStats]                 = useState<{
    bySeverity: Record<string, number>;
    byStatus: Record<string, number>;
    byType: Record<string, number>;
    unresolvedCount: number;
    recentTrend: Array<{ date: string; count: number }>;
  } | null>(null);
  const [loading, setLoading]             = useState(true);

  // Filters
  const [severityFilter, setSeverityFilter]     = useState<DiagnosticSeverity | 'all'>('all');
  const [statusFilter, setStatusFilter]         = useState<DiagnosticFinding['status'] | 'all'>('all');
  const [typeFilter, setTypeFilter]             = useState<DiagnosticFindingType | 'all'>('all');
  const [searchQuery, setSearchQuery]           = useState('');
  const [page, setPage]                         = useState(0);

  const loadAll = useCallback(async () => {
    if (!orgId) return;
    setLoading(true);
    const [f, r, e, s] = await Promise.allSettled([
      diagnosticEngine.getFindings(orgId, { limit: 200 }),
      diagnosticEngine.getRecommendations(orgId),
      diagnosticEngine.getExecutions(orgId),
      diagnosticEngine.getFindingStats(orgId),
    ]);
    if (f.status === 'fulfilled') setFindings(f.value);
    if (r.status === 'fulfilled') setRecommendations(r.value);
    if (e.status === 'fulfilled') setExecutions(e.value);
    if (s.status === 'fulfilled') setStats(s.value);
    setLoading(false);
  }, [orgId]);

  useEffect(() => { loadAll(); }, [loadAll]);

  // Filtered findings
  const filtered = useMemo(() => {
    let result = findings;
    if (severityFilter !== 'all') result = result.filter(f => f.severity === severityFilter);
    if (statusFilter !== 'all') result = result.filter(f => f.status === statusFilter);
    if (typeFilter !== 'all') result = result.filter(f => f.finding_type === typeFilter);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(f =>
        f.title.toLowerCase().includes(q) ||
        (f.description ?? '').toLowerCase().includes(q) ||
        (f.recommendation ?? '').toLowerCase().includes(q)
      );
    }
    return result.sort((a, b) => (b.priority_score ?? 0) - (a.priority_score ?? 0));
  }, [findings, severityFilter, statusFilter, typeFilter, searchQuery]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  // KPIs
  const openFindings = findings.filter(f => f.status === 'open');
  const criticalHigh = findings.filter(f => f.severity === 'critical' || f.severity === 'high');
  const unresolved = findings.filter(f => f.status === 'open' || f.status === 'acknowledged');
  const pendingRecs = recommendations.filter(r => r.status === 'pending' || r.status === 'in_progress');

  // Actions
  const handleAcknowledge = async (id: string) => {
    if (!user) return;
    await diagnosticEngine.acknowledgeFinding(id, user.id);
    setFindings(prev => prev.map(f => f.id === id ? { ...f, status: 'acknowledged' as const } : f));
  };

  const handleResolve = async (id: string) => {
    if (!user) return;
    await diagnosticEngine.resolveFinding(id, user.id);
    setFindings(prev => prev.map(f => f.id === id ? { ...f, status: 'resolved' as const } : f));
  };

  const handleDismiss = async (id: string) => {
    await diagnosticEngine.dismissFinding(id);
    setFindings(prev => prev.map(f => f.id === id ? { ...f, status: 'dismissed' as const } : f));
  };

  const handleRecAction = async (id: string, status: RecommendationInstance['status']) => {
    await diagnosticEngine.updateRecommendation(id, { status });
    setRecommendations(prev => prev.map(r => r.id === id ? { ...r, status } : r));
  };

  // Reset page on filter change
  useEffect(() => { setPage(0); }, [severityFilter, statusFilter, typeFilter, searchQuery]);

  // Chart data
  const severityChartData = useMemo(() => {
    if (!stats?.bySeverity) return [];
    return Object.entries(stats.bySeverity).map(([key, value]) => ({ name: SEVERITY_CONFIG[key as DiagnosticSeverity]?.label ?? key, value, color: SEVERITY_COLORS_CHART[key] ?? '#6b7280' }));
  }, [stats]);

  const typeChartData = useMemo(() => {
    if (!stats?.byType) return [];
    return Object.entries(stats.byType).map(([key, value]) => ({ name: FINDING_TYPE_LABELS[key as DiagnosticFindingType]?.label ?? key, value }));
  }, [stats]);

  const trendChartData = useMemo(() => stats?.recentTrend ?? [], [stats]);

  if (loading) {
    return (
      <div className="p-6 max-w-screen-xl mx-auto">
        <div className="text-center py-20 text-gray-400">Loading diagnostic intelligence...</div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-screen-xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Diagnostic Intelligence</h1>
          <p className="text-sm text-gray-500 mt-0.5">Automated diagnostics, anomaly detection, and recommendation engine</p>
        </div>
        <button onClick={loadAll} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
          <RefreshCw size={18} />
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Unresolved Findings', value: unresolved.length, color: 'text-red-600', bg: 'bg-red-50', icon: XCircle },
          { label: 'Critical / High', value: criticalHigh.length, color: 'text-orange-600', bg: 'bg-orange-50', icon: AlertTriangle },
          { label: 'Open Findings', value: openFindings.length, color: 'text-amber-600', bg: 'bg-amber-50', icon: Eye },
          { label: 'Pending Recommendations', value: pendingRecs.length, color: 'text-emerald-600', bg: 'bg-emerald-50', icon: Lightbulb },
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
        {/* Severity Breakdown */}
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <h3 className="font-semibold text-gray-800 mb-3">Findings by Severity</h3>
          {severityChartData.length === 0 ? (
            <div className="text-center py-8 text-gray-400 text-sm">No findings data</div>
          ) : (
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie data={severityChartData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} innerRadius={40} strokeWidth={2} stroke="#fff">
                  {severityChartData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Pie>
                <Tooltip />
                <Legend layout="horizontal" verticalAlign="bottom" iconType="circle" wrapperStyle={{ fontSize: '12px' }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Finding Types */}
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <h3 className="font-semibold text-gray-800 mb-3">Findings by Type</h3>
          {typeChartData.length === 0 ? (
            <div className="text-center py-8 text-gray-400 text-sm">No findings data</div>
          ) : (
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={typeChartData} layout="vertical" margin={{ left: 0, right: 16, top: 0, bottom: 0 }}>
                <XAxis type="number" hide />
                <YAxis type="category" dataKey="name" width={110} tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="value" fill="#3b82f6" radius={[0, 4, 4, 0]} barSize={20} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Trend */}
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <h3 className="font-semibold text-gray-800 mb-3">Findings Trend</h3>
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

      {/* Filters + Search */}
      <div className="bg-white border border-gray-200 rounded-xl p-4">
        <div className="flex flex-wrap items-center gap-3">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px]">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search findings..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Severity filter */}
          <select
            value={severityFilter}
            onChange={e => setSeverityFilter(e.target.value as DiagnosticSeverity | 'all')}
            className="px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Severity</option>
            {Object.entries(SEVERITY_CONFIG).map(([key, cfg]) => (
              <option key={key} value={key}>{cfg.label}</option>
            ))}
          </select>

          {/* Status filter */}
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value as DiagnosticFinding['status'] | 'all')}
            className="px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Status</option>
            <option value="open">Open</option>
            <option value="acknowledged">Acknowledged</option>
            <option value="resolved">Resolved</option>
            <option value="dismissed">Dismissed</option>
          </select>

          {/* Type filter */}
          <select
            value={typeFilter}
            onChange={e => setTypeFilter(e.target.value as DiagnosticFindingType | 'all')}
            className="px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Types</option>
            {Object.entries(FINDING_TYPE_LABELS).map(([key, cfg]) => (
              <option key={key} value={key}>{cfg.label}</option>
            ))}
          </select>

          <span className="text-xs text-gray-400">{filtered.length} result{filtered.length !== 1 ? 's' : ''}</span>
        </div>
      </div>

      {/* Findings Table */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
          <h3 className="font-semibold text-gray-800">Findings</h3>
        </div>
        {paginated.length === 0 ? (
          <div className="text-center py-16">
            <CheckCircle2 size={36} className="text-emerald-400 mx-auto mb-3" />
            <p className="font-medium text-gray-500">No findings match your filters</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase">Severity</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase">Finding</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase">Type</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase">Status</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase">Priority</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase">Date</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {paginated.map(f => {
                  const sevCfg = SEVERITY_CONFIG[f.severity] ?? SEVERITY_CONFIG.info;
                  const typeCfg = FINDING_TYPE_LABELS[f.finding_type] ?? FINDING_TYPE_LABELS.custom;
                  const statusBadge = STATUS_BADGES[f.status] ?? STATUS_BADGES.open;
                  const SevIcon = sevCfg.icon;
                  const priorityPct = Math.round((f.priority_score ?? 0) * 100);
                  return (
                    <tr key={f.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2 py-0.5 rounded-full ${sevCfg.bg} ${sevCfg.color}`}>
                          <SevIcon size={12} />
                          {sevCfg.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 max-w-xs">
                        <p className="font-medium text-gray-800 truncate">{f.title}</p>
                        {f.description && <p className="text-xs text-gray-500 truncate mt-0.5">{f.description}</p>}
                        {f.recommendation && (
                          <p className="text-xs text-amber-600 flex items-center gap-1 mt-0.5">
                            <Lightbulb size={10} /> {f.recommendation}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs font-medium ${typeCfg.color}`}>{typeCfg.label}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${statusBadge.bg} ${statusBadge.color}`}>{f.status}</span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-16 bg-gray-100 rounded-full h-1.5">
                            <div className="h-full rounded-full bg-blue-500" style={{ width: `${priorityPct}%` }} />
                          </div>
                          <span className="text-xs text-gray-500">{priorityPct}%</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-400 whitespace-nowrap">
                        {new Date(f.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3">
                        {f.status === 'open' && (
                          <div className="flex gap-1">
                            <button onClick={() => handleAcknowledge(f.id)} className="px-2 py-1 text-xs border border-amber-200 text-amber-700 rounded-lg hover:bg-amber-50 transition-colors">Ack</button>
                            <button onClick={() => handleResolve(f.id)} className="px-2 py-1 text-xs border border-emerald-200 text-emerald-700 rounded-lg hover:bg-emerald-50 transition-colors">Resolve</button>
                            <button onClick={() => handleDismiss(f.id)} className="px-2 py-1 text-xs border border-gray-200 text-gray-500 rounded-lg hover:bg-gray-50 transition-colors">Dismiss</button>
                          </div>
                        )}
                        {f.status === 'acknowledged' && (
                          <button onClick={() => handleResolve(f.id)} className="px-2 py-1 text-xs border border-emerald-200 text-emerald-700 rounded-lg hover:bg-emerald-50 transition-colors">Resolve</button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
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

      {/* Recommendations + Recent Executions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Priority Recommendations */}
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100">
            <h3 className="font-semibold text-gray-800">Priority Recommendations</h3>
          </div>
          {pendingRecs.length === 0 ? (
            <div className="text-center py-12">
              <Lightbulb size={32} className="text-gray-300 mx-auto mb-2" />
              <p className="text-sm text-gray-400">No pending recommendations</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50 max-h-80 overflow-y-auto">
              {pendingRecs.map(rec => {
                const badge = REC_STATUS_BADGES[rec.status] ?? REC_STATUS_BADGES.pending;
                return (
                  <div key={rec.id} className="px-5 py-3 flex items-start gap-3">
                    <div className="p-2 bg-amber-50 rounded-lg flex-shrink-0">
                      <Lightbulb size={14} className="text-amber-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="font-medium text-gray-800 text-sm truncate">{rec.title}</span>
                        <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${badge.bg} ${badge.color}`}>{rec.status}</span>
                      </div>
                      {rec.description && <p className="text-xs text-gray-500 truncate">{rec.description}</p>}
                      {rec.due_date && (
                        <span className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
                          <Clock size={10} /> Due {rec.due_date}
                        </span>
                      )}
                    </div>
                    <div className="flex gap-1 flex-shrink-0">
                      {rec.status === 'pending' && (
                        <>
                          <button onClick={() => handleRecAction(rec.id, 'in_progress')} className="px-2 py-1 text-xs border border-blue-200 text-blue-700 rounded-lg hover:bg-blue-50 transition-colors">Start</button>
                          <button onClick={() => handleRecAction(rec.id, 'dismissed')} className="px-2 py-1 text-xs border border-gray-200 text-gray-500 rounded-lg hover:bg-gray-50 transition-colors">Dismiss</button>
                        </>
                      )}
                      {rec.status === 'in_progress' && (
                        <button onClick={() => handleRecAction(rec.id, 'completed')} className="px-2 py-1 text-xs border border-emerald-200 text-emerald-700 rounded-lg hover:bg-emerald-50 transition-colors">Complete</button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Recent Executions */}
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100">
            <h3 className="font-semibold text-gray-800">Recent Executions</h3>
          </div>
          {executions.length === 0 ? (
            <div className="text-center py-12">
              <Activity size={32} className="text-gray-300 mx-auto mb-2" />
              <p className="text-sm text-gray-400">No executions recorded</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50 max-h-80 overflow-y-auto">
              {executions.map(exec => {
                const statusColor = exec.status === 'completed' ? 'text-emerald-600' : exec.status === 'failed' ? 'text-red-600' : 'text-amber-600';
                return (
                  <div key={exec.id} className="px-5 py-3 flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full flex-shrink-0 ${exec.status === 'completed' ? 'bg-emerald-400' : exec.status === 'failed' ? 'bg-red-400' : 'bg-amber-400'}`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-gray-700 capitalize">{exec.execution_type} run</span>
                        <span className={`text-xs font-medium ${statusColor}`}>{exec.status}</span>
                      </div>
                      <p className="text-xs text-gray-400">
                        {exec.rules_evaluated} rules evaluated · {exec.findings_count} findings
                        {exec.duration_ms != null && ` · ${exec.duration_ms}ms`}
                      </p>
                    </div>
                    <span className="text-xs text-gray-400 whitespace-nowrap">{new Date(exec.started_at).toLocaleString()}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Trend Alerts */}
      {findings.filter(f => f.finding_type === 'negative_trend').length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <TrendingDown size={18} className="text-amber-600" />
            <h3 className="font-semibold text-amber-800">Trend Alerts</h3>
          </div>
          <div className="space-y-2">
            {findings.filter(f => f.finding_type === 'negative_trend' && f.status !== 'dismissed').slice(0, 5).map(f => (
              <div key={f.id} className="flex items-start gap-3 bg-white rounded-lg p-3 border border-amber-100">
                <TrendingDown size={14} className="text-amber-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800">{f.title}</p>
                  {f.description && <p className="text-xs text-gray-500 mt-0.5">{f.description}</p>}
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_BADGES[f.status]?.bg ?? 'bg-gray-100'} ${STATUS_BADGES[f.status]?.color ?? 'text-gray-500'}`}>{f.status}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

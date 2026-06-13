import { useState, useMemo } from 'react';
import {
  FileText, RefreshCw, Plus, Clock, CheckCircle2, XCircle,
  Loader2, Search, ChevronLeft, ChevronRight, Eye,
  BarChart2, Activity, ShieldCheck, TrendingUp, Zap,
} from 'lucide-react';
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend,
  BarChart, Bar, XAxis, YAxis,
} from 'recharts';
import { useOrg } from '../../contexts/OrgContext';
import { useAuth } from '../../contexts/AuthContext';
import { useReportInstances, useReportGeneration, useReportStats, useReportTemplates } from '../../hooks/useReporting';
import type { ReportType, ReportInstance } from '../../types';

const REPORT_TYPES: Record<ReportType, { label: string; icon: React.ElementType; color: string }> = {
  executive_summary:  { label: 'Executive Summary',  icon: FileText,    color: 'text-blue-600' },
  detailed_findings:  { label: 'Detailed Findings',  icon: Activity,   color: 'text-orange-600' },
  kpi_dashboard:      { label: 'KPI Dashboard',      icon: BarChart2,  color: 'text-emerald-600' },
  compliance_audit:   { label: 'Compliance Audit',   icon: ShieldCheck, color: 'text-red-600' },
  indicator_progress: { label: 'Indicator Progress', icon: TrendingUp,  color: 'text-teal-600' },
  diagnostic_overview:{ label: 'Diagnostic Overview',icon: Zap,         color: 'text-amber-600' },
  custom:             { label: 'Custom Report',      icon: FileText,   color: 'text-gray-600' },
};

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; icon: React.ElementType }> = {
  pending:    { label: 'Pending',    color: 'text-gray-600',   bg: 'bg-gray-100',   icon: Clock },
  generating: { label: 'Generating', color: 'text-blue-600',   bg: 'bg-blue-100',   icon: Loader2 },
  completed:  { label: 'Completed',  color: 'text-emerald-600',bg: 'bg-emerald-100', icon: CheckCircle2 },
  failed:     { label: 'Failed',     color: 'text-red-600',    bg: 'bg-red-100',     icon: XCircle },
};

const TYPE_COLORS: Record<string, string> = {
  executive_summary: '#2563eb', detailed_findings: '#ea580c', kpi_dashboard: '#059669',
  compliance_audit: '#dc2626', indicator_progress: '#0d9488', diagnostic_overview: '#d97706', custom: '#6b7280',
};

const PAGE_SIZE = 8;

export function ReportDashboard() {
  const { org } = useOrg();
  const orgId = org?.id;
  const { user } = useAuth();
  const { reports, loading: reportsLoading, reload: reloadReports } = useReportInstances({ limit: 100 });
  const { templates } = useReportTemplates();
  const { generate, generating, error: genError } = useReportGeneration();
  const { stats, reload: reloadStats } = useReportStats();

  const [showGenerate, setShowGenerate] = useState(false);
  const [selectedType, setSelectedType] = useState<ReportType>('executive_summary');
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [reportName, setReportName] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(0);
  const [viewReport, setViewReport] = useState<ReportInstance | null>(null);

  const filtered = useMemo(() => {
    if (!searchQuery.trim()) return reports;
    const q = searchQuery.toLowerCase();
    return reports.filter(r => r.name.toLowerCase().includes(q) || r.report_type.toLowerCase().includes(q));
  }, [reports, searchQuery]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const handleGenerate = async () => {
    const name = reportName.trim() || `${REPORT_TYPES[selectedType].label} — ${new Date().toLocaleDateString()}`;
    const result = await generate(selectedTemplate || null, selectedType, name, {});
    if (result) {
      setShowGenerate(false);
      setReportName('');
      reloadReports();
      reloadStats();
    }
  };

  const handleRefresh = () => { reloadReports(); reloadStats(); };

  // Chart data
  const typeChartData = useMemo(() => {
    if (!stats?.byType) return [];
    return Object.entries(stats.byType).map(([key, value]) => ({
      name: REPORT_TYPES[key as ReportType]?.label ?? key,
      value,
      color: TYPE_COLORS[key] ?? '#6b7280',
    }));
  }, [stats]);

  const statusChartData = useMemo(() => {
    if (!stats?.byStatus) return [];
    return Object.entries(stats.byStatus).map(([key, value]) => ({
      name: STATUS_CONFIG[key]?.label ?? key,
      value,
    }));
  }, [stats]);

  const completedCount = reports.filter(r => r.status === 'completed').length;
  const failedCount = reports.filter(r => r.status === 'failed').length;
  const pendingCount = reports.filter(r => r.status === 'pending' || r.status === 'generating').length;

  // Report detail view
  if (viewReport) {
    const sections = (viewReport.sections_data ?? []) as Array<{ key: string; title: string; type: string; data: Record<string, unknown>; sort_order: number }>;
    return (
      <div className="p-6 max-w-screen-xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <button onClick={() => setViewReport(null)} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
            <ChevronLeft size={18} />
          </button>
          <div className="flex-1">
            <h1 className="text-xl font-bold text-gray-900">{viewReport.name}</h1>
            <p className="text-sm text-gray-500">
              {REPORT_TYPES[viewReport.report_type]?.label ?? viewReport.report_type}
              {viewReport.generated_at && ` · Generated ${new Date(viewReport.generated_at).toLocaleString()}`}
              {viewReport.generation_ms != null && ` · ${viewReport.generation_ms}ms`}
            </p>
          </div>
          <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${STATUS_CONFIG[viewReport.status]?.bg ?? 'bg-gray-100'} ${STATUS_CONFIG[viewReport.status]?.color ?? 'text-gray-600'}`}>
            {STATUS_CONFIG[viewReport.status]?.label ?? viewReport.status}
          </span>
        </div>

        {/* Summary */}
        {viewReport.summary && (
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
            <p className="text-sm text-blue-800">{viewReport.summary}</p>
          </div>
        )}

        {/* Sections */}
        <div className="space-y-4">
          {sections.sort((a, b) => a.sort_order - b.sort_order).map(section => (
            <div key={section.key} className="bg-white border border-gray-200 rounded-xl p-5">
              <h3 className="font-semibold text-gray-800 mb-3">{section.title}</h3>
              <pre className="text-xs text-gray-600 bg-gray-50 rounded-lg p-3 overflow-x-auto max-h-64 overflow-y-auto">
                {JSON.stringify(section.data, null, 2)}
              </pre>
            </div>
          ))}
          {sections.length === 0 && (
            <div className="text-center py-12 text-gray-400">No sections in this report</div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-screen-xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reporting Engine</h1>
          <p className="text-sm text-gray-500 mt-0.5">Compose, generate, and distribute intelligence reports</p>
        </div>
        <div className="flex gap-2">
          <button onClick={handleRefresh} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
            <RefreshCw size={18} />
          </button>
          <button
            onClick={() => setShowGenerate(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors"
          >
            <Plus size={14} /> Generate Report
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Reports', value: reports.length, color: 'text-blue-600', bg: 'bg-blue-50', icon: FileText },
          { label: 'Completed', value: completedCount, color: 'text-emerald-600', bg: 'bg-emerald-50', icon: CheckCircle2 },
          { label: 'In Progress', value: pendingCount, color: 'text-amber-600', bg: 'bg-amber-50', icon: Loader2 },
          { label: 'Failed', value: failedCount, color: 'text-red-600', bg: 'bg-red-50', icon: XCircle },
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

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <h3 className="font-semibold text-gray-800 mb-3">Reports by Type</h3>
          {typeChartData.length === 0 ? (
            <div className="text-center py-8 text-gray-400 text-sm">No data</div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={typeChartData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} innerRadius={40} strokeWidth={2} stroke="#fff">
                  {typeChartData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Pie>
                <Tooltip />
                <Legend layout="horizontal" verticalAlign="bottom" iconType="circle" wrapperStyle={{ fontSize: '11px' }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <h3 className="font-semibold text-gray-800 mb-3">Reports by Status</h3>
          {statusChartData.length === 0 ? (
            <div className="text-center py-8 text-gray-400 text-sm">No data</div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={statusChartData} layout="vertical" margin={{ left: 0, right: 16, top: 0, bottom: 0 }}>
                <XAxis type="number" hide />
                <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="value" fill="#3b82f6" radius={[0, 4, 4, 0]} barSize={20} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Search */}
      <div className="bg-white border border-gray-200 rounded-xl p-4">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search reports..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Reports Table */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100">
          <h3 className="font-semibold text-gray-800">Reports</h3>
        </div>
        {reportsLoading ? (
          <div className="text-center py-16 text-gray-400">Loading...</div>
        ) : paginated.length === 0 ? (
          <div className="text-center py-16">
            <FileText size={36} className="text-gray-300 mx-auto mb-3" />
            <p className="font-medium text-gray-500">No reports generated yet</p>
            <p className="text-sm text-gray-400 mt-1">Generate your first report to see it here</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase">Report</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase">Type</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase">Status</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase">Sections</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase">Generated</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {paginated.map(report => {
                  const typeCfg = REPORT_TYPES[report.report_type as ReportType] ?? REPORT_TYPES.custom;
                  const statusCfg = STATUS_CONFIG[report.status] ?? STATUS_CONFIG.pending;
                  const TypeIcon = typeCfg.icon;
                  const StatusIcon = statusCfg.icon;
                  return (
                    <tr key={report.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-4 py-3">
                        <p className="font-medium text-gray-800">{report.name}</p>
                        {report.summary && <p className="text-xs text-gray-500 truncate max-w-xs mt-0.5">{report.summary}</p>}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${typeCfg.color}`}>
                          <TypeIcon size={13} /> {typeCfg.label}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${statusCfg.bg} ${statusCfg.color}`}>
                          <StatusIcon size={11} /> {statusCfg.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500">{report.total_sections}</td>
                      <td className="px-4 py-3 text-xs text-gray-400 whitespace-nowrap">
                        {report.generated_at ? new Date(report.generated_at).toLocaleString() : '—'}
                      </td>
                      <td className="px-4 py-3">
                        {report.status === 'completed' && (
                          <button onClick={() => setViewReport(report)} className="flex items-center gap-1 px-2.5 py-1 text-xs border border-blue-200 text-blue-700 rounded-lg hover:bg-blue-50 transition-colors">
                            <Eye size={12} /> View
                          </button>
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

      {/* Generate Modal */}
      {showGenerate && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={() => setShowGenerate(false)}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl" onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-bold text-gray-900 mb-4">Generate Report</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Report Name</label>
                <input
                  type="text"
                  value={reportName}
                  onChange={e => setReportName(e.target.value)}
                  placeholder="Leave blank for auto-name"
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Report Type</label>
                <select
                  value={selectedType}
                  onChange={e => setSelectedType(e.target.value as ReportType)}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {Object.entries(REPORT_TYPES).map(([key, cfg]) => (
                    <option key={key} value={key}>{cfg.label}</option>
                  ))}
                </select>
              </div>

              {templates.length > 0 && (
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Template (optional)</label>
                  <select
                    value={selectedTemplate}
                    onChange={e => setSelectedTemplate(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Default sections</option>
                    {templates.map(t => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                </div>
              )}

              {genError && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-xs text-red-700">{genError}</div>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setShowGenerate(false)}
                  className="flex-1 px-4 py-2.5 text-sm font-medium border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleGenerate}
                  disabled={generating}
                  className="flex-1 px-4 py-2.5 text-sm font-medium bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-60"
                >
                  {generating ? 'Generating...' : 'Generate'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

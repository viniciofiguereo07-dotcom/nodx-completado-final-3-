import { useState, useEffect, useCallback } from 'react';
import { BarChart2, PieChart as PieIcon, Table, AlertTriangle, Shield, AlertCircle, CheckCircle, TrendingUp, Activity, Layers, FileText, RefreshCw, Download, ChevronDown, ChevronRight, X, Plus, Settings, Eye, Hash, Percent, ArrowUp, ArrowDown, Minus, Circle, Grid2x2 as Grid, BarChart, LineChart } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useOrg } from '../../contexts/OrgContext';
import { useAuth } from '../../contexts/AuthContext';
import { PageHeader } from '../../components/common/PageHeader';
import { Modal } from '../../components/common/Modal';
import { EmptyState } from '../../components/common/EmptyState';
import {
  territorialTabulationEngine,
  type TabulationReport,
  type FrequencyDistribution,
  type CrossTabResult,
  type RiskLevel,
  type VulnerabilityLevel,
  type PriorityLevel,
  RISK_LEVEL_LABELS,
  VULNERABILITY_LEVEL_LABELS,
  PRIORITY_LEVEL_LABELS,
} from '../../services/TerritorialTabulationEngine';
import { territorialFieldCollectionEngine, type TerritorialForm } from '../../services/TerritorialFieldCollectionEngine';
import { semaphoreEngine, STATUS_COLORS, type SemaphoreStatus } from '../../services/SemaphoreEngine';
import {
  BarChart as RechartsBarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell,
  LineChart as RechartsLineChart, Line,
} from 'recharts';

// Colors for charts
const CHART_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'];
const RISK_COLORS: Record<RiskLevel, string> = { low: '#10b981', medium: '#f59e0b', high: '#ef4444' };
const VULNERABILITY_COLORS: Record<VulnerabilityLevel, string> = { low: '#10b981', medium: '#f59e0b', high: '#ef4444' };
const PRIORITY_COLORS: Record<PriorityLevel, string> = { level_1: '#ef4444', level_2: '#f59e0b', level_3: '#10b981' };
const SEMAPHORE_COLORS: Record<SemaphoreStatus, string> = {
  green: '#10b981', yellow: '#f59e0b', orange: '#f97316', red: '#ef4444', critical: '#dc2626',
};

// Frequency Table Component
function FrequencyTable({ data, title }: { data: FrequencyDistribution[]; title: string }) {
  if (data.length === 0) return null;

  return (
    <div className="bg-white rounded-xl border border-gray-100 p-4">
      <h4 className="font-semibold text-gray-800 mb-3">{title}</h4>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100">
              <th className="text-left py-2 px-3 font-medium text-gray-600">Value</th>
              <th className="text-right py-2 px-3 font-medium text-gray-600">Count</th>
              <th className="text-right py-2 px-3 font-medium text-gray-600">%</th>
              <th className="text-right py-2 px-3 font-medium text-gray-600">Cumul.</th>
            </tr>
          </thead>
          <tbody>
            {data.slice(0, 10).map((row, i) => (
              <tr key={i} className="border-b border-gray-50 hover:bg-gray-50">
                <td className="py-2 px-3 text-gray-800">{row.value}</td>
                <td className="py-2 px-3 text-right text-gray-600">{row.count}</td>
                <td className="py-2 px-3 text-right text-gray-600">{row.percentage.toFixed(1)}%</td>
                <td className="py-2 px-3 text-right text-gray-400">{row.cumulative_percentage.toFixed(1)}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// Cross Tab Table Component
function CrossTabTable({ data }: { data: CrossTabResult }) {
  const colKeys = Object.keys(data.col_totals).sort();
  const rowKeys = Object.keys(data.row_totals).sort();

  return (
    <div className="bg-white rounded-xl border border-gray-100 p-4">
      <h4 className="font-semibold text-gray-800 mb-3">
        {data.row_field} x {data.col_field}
      </h4>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr>
              <th className="text-left py-2 px-3 font-medium text-gray-600">{data.row_field}</th>
              {colKeys.map((col) => (
                <th key={col} className="text-center py-2 px-3 font-medium text-gray-600">{col}</th>
              ))}
              <th className="text-center py-2 px-3 font-medium text-gray-500 bg-gray-50">Total</th>
            </tr>
          </thead>
          <tbody>
            {rowKeys.map((row) => (
              <tr key={row} className="border-t border-gray-50 hover:bg-gray-50">
                <td className="py-2 px-3 font-medium text-gray-800">{row}</td>
                {colKeys.map((col) => {
                  const cell = data.matrix[row]?.[col];
                  return (
                    <td key={col} className="text-center py-2 px-3 text-gray-600">
                      {cell?.count ?? 0}
                    </td>
                  );
                })}
                <td className="text-center py-2 px-3 font-medium text-gray-500 bg-gray-50">
                  {data.row_totals[row] ?? 0}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t border-gray-200 bg-gray-50">
              <td className="py-2 px-3 font-medium text-gray-500">Total</td>
              {colKeys.map((col) => (
                <td key={col} className="text-center py-2 px-3 font-medium text-gray-500">
                  {data.col_totals[col] ?? 0}
                </td>
              ))}
              <td className="text-center py-2 px-3 font-bold text-gray-600">
                {data.grand_total}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}

// Matrix Card Component
function MatrixCard({
  title,
  data,
  labels,
  colors,
  icon: Icon,
}: {
  title: string;
  data: Record<string, number>;
  labels: Record<string, string>;
  colors: Record<string, string>;
  icon: React.ComponentType<{ className?: string }>;
}) {
  const total = Object.values(data).reduce((a, b) => a + b, 0);
  const chartData = Object.entries(data).map(([key, value]) => ({
    name: labels[key] ?? key,
    value,
    color: colors[key] ?? '#6b7280',
  }));

  return (
    <div className="bg-white rounded-xl border border-gray-100 p-5">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 bg-gray-50 rounded-xl flex items-center justify-center">
          <Icon className="w-5 h-5 text-gray-600" />
        </div>
        <div>
          <h3 className="font-bold text-gray-800">{title}</h3>
          <p className="text-xs text-gray-400">{total} assessments</p>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="w-24 h-24">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius={25}
                outerRadius={40}
                paddingAngle={2}
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="flex-1 space-y-2">
          {Object.entries(data).map(([key, value]) => (
            <div key={key} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: colors[key] ?? '#6b7280' }}
                />
                <span className="text-sm text-gray-600">{labels[key] ?? key}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-gray-800">{value}</span>
                <span className="text-xs text-gray-400">
                  ({total > 0 ? ((value / total) * 100).toFixed(0) : 0}%)
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Semaphore Status Indicator
function SemaphoreIndicator({ status, size = 'md' }: { status: SemaphoreStatus; size?: 'sm' | 'md' | 'lg' }) {
  const colors = STATUS_COLORS[status];
  const sizeClasses = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-6 h-6',
  };

  return (
    <div
      className={`${sizeClasses[size]} rounded-full ${colors.dot} shadow-sm`}
      title={status.charAt(0).toUpperCase() + status.slice(1)}
    />
  );
}

// Semaphore Summary Card
function SemaphoreSummaryCard({
  distribution,
  overall,
}: {
  distribution: Record<SemaphoreStatus, number>;
  overall: SemaphoreStatus;
}) {
  const total = Object.values(distribution).reduce((a, b) => a + b, 0);
  const chartData = Object.entries(distribution)
    .filter(([, v]) => v > 0)
    .map(([status, value]) => ({
      name: status.charAt(0).toUpperCase() + status.slice(1),
      value,
      color: SEMAPHORE_COLORS[status as SemaphoreStatus],
    }));

  return (
    <div className="bg-white rounded-xl border border-gray-100 p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gray-50 rounded-xl flex items-center justify-center">
            <Activity className="w-5 h-5 text-gray-600" />
          </div>
          <div>
            <h3 className="font-bold text-gray-800">System Semaphore</h3>
            <p className="text-xs text-gray-400">Overall health indicator</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <SemaphoreIndicator status={overall} size="lg" />
          <span className="text-lg font-bold text-gray-800 capitalize">{overall}</span>
        </div>
      </div>

      <div className="grid grid-cols-5 gap-2">
        {(Object.entries(distribution) as [SemaphoreStatus, number][])
          .filter(([, v]) => v > 0)
          .map(([status, count]) => (
            <div
              key={status}
              className={`text-center p-2 rounded-lg ${STATUS_COLORS[status].bg} ${STATUS_COLORS[status].border} border`}
            >
              <SemaphoreIndicator status={status} />
              <div className="mt-1 text-lg font-bold text-gray-800">{count}</div>
              <div className="text-xs text-gray-500 capitalize">{status}</div>
            </div>
          ))}
      </div>
    </div>
  );
}

// Quick Stats Card
function QuickStatCard({
  label,
  value,
  change,
  icon: Icon,
  color = 'blue',
}: {
  label: string;
  value: number | string;
  change?: number;
  icon: React.ComponentType<{ className?: string }>;
  color?: string;
}) {
  const colorClasses: Record<string, string> = {
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-emerald-50 text-emerald-600',
    amber: 'bg-amber-50 text-amber-600',
    red: 'bg-red-50 text-red-600',
    purple: 'bg-purple-50 text-purple-600',
  };

  return (
    <div className="bg-white rounded-xl border border-gray-100 p-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-gray-500 uppercase tracking-wider">{label}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
        </div>
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${colorClasses[color]}`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
      {change !== undefined && (
        <div className={`flex items-center gap-1 mt-2 text-xs ${change >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
          {change >= 0 ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />}
          <span>{Math.abs(change).toFixed(1)}%</span>
        </div>
      )}
    </div>
  );
}

// Report Modal
function ReportDetailModal({
  report,
  onClose,
}: {
  report: TabulationReport | null;
  onClose: () => void;
}) {
  const [activeSection, setActiveSection] = useState<'freq' | 'crosstab' | 'stats'>('freq');

  if (!report) return null;

  const freqKeys = Object.keys(report.frequencies);
  const crossTabKeys = report.cross_tabs;
  const statKeys = Object.keys(report.numeric_stats);

  return (
    <Modal
      open={!!report}
      onClose={onClose}
      title={report.name}
      footer={
        <button
          onClick={onClose}
          className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-xl"
        >
          Close
        </button>
      }
    >
      <div className="space-y-4">
        <div className="flex items-center gap-4 text-xs text-gray-500">
          <span>{new Date(report.generated_at).toLocaleString()}</span>
          <span>·</span>
          <span>{report.total_records} records</span>
          <span>·</span>
          <div className="flex items-center gap-1">
            <SemaphoreIndicator status={report.semaphore_status} />
            <span className="capitalize">{report.semaphore_status}</span>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-3 gap-3">
          {report.risk_assessment && (
            <div className="bg-red-50 rounded-lg p-3">
              <div className="text-xs text-gray-500">Risk Level</div>
              <div className="text-lg font-bold text-red-700 capitalize">
                {RISK_LEVEL_LABELS[report.risk_assessment.level]}
              </div>
              <div className="text-xs text-gray-400">Score: {report.risk_assessment.score.toFixed(1)}</div>
            </div>
          )}
          {report.vulnerability_assessment && (
            <div className="bg-amber-50 rounded-lg p-3">
              <div className="text-xs text-gray-500">Vulnerability Level</div>
              <div className="text-lg font-bold text-amber-700 capitalize">
                {VULNERABILITY_LEVEL_LABELS[report.vulnerability_assessment.level]}
              </div>
              <div className="text-xs text-gray-400">Score: {report.vulnerability_assessment.score.toFixed(1)}</div>
            </div>
          )}
          {report.priority_assessment && (
            <div className="bg-purple-50 rounded-lg p-3">
              <div className="text-xs text-gray-500">Priority Level</div>
              <div className="text-lg font-bold text-purple-700">
                {PRIORITY_LEVEL_LABELS[report.priority_assessment.level]}
              </div>
              <div className="text-xs text-gray-400">Score: {report.priority_assessment.score.toFixed(1)}</div>
            </div>
          )}
        </div>

        {/* Section Tabs */}
        <div className="flex gap-2 border-b border-gray-100">
          {[
            { key: 'freq', label: 'Frequencies', count: freqKeys.length },
            { key: 'crosstab', label: 'Cross Tabs', count: crossTabKeys.length },
            { key: 'stats', label: 'Statistics', count: statKeys.length },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveSection(tab.key as 'freq' | 'crosstab' | 'stats')}
              className={`px-3 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeSection === tab.key
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.label} ({tab.count})
            </button>
          ))}
        </div>

        {/* Section Content */}
        <div className="max-h-96 overflow-y-auto space-y-4">
          {activeSection === 'freq' && freqKeys.map((key) => (
            <FrequencyTable
              key={key}
              data={report.frequencies[key]}
              title={key.replace(/_/g, ' ')}
            />
          ))}

          {activeSection === 'crosstab' && crossTabKeys.map((ct, i) => (
            <CrossTabTable key={i} data={ct} />
          ))}

          {activeSection === 'stats' && statKeys.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-100 p-4">
              <h4 className="font-semibold text-gray-800 mb-3">Numeric Statistics</h4>
              <div className="grid grid-cols-2 gap-4">
                {statKeys.map((key) => {
                  const stats = report.numeric_stats[key];
                  return (
                    <div key={key} className="p-3 bg-gray-50 rounded-lg">
                      <div className="text-xs font-medium text-gray-500 mb-2">
                        {key.replace(/_/g, ' ')}
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div><span className="text-gray-400">Min:</span> <span className="font-medium">{stats.min.toFixed(2)}</span></div>
                        <div><span className="text-gray-400">Max:</span> <span className="font-medium">{stats.max.toFixed(2)}</span></div>
                        <div><span className="text-gray-400">Mean:</span> <span className="font-medium">{stats.mean.toFixed(2)}</span></div>
                        <div><span className="text-gray-400">Median:</span> <span className="font-medium">{stats.median.toFixed(2)}</span></div>
                        <div><span className="text-gray-400">Std Dev:</span> <span className="font-medium">{stats.std_dev.toFixed(2)}</span></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {activeSection === 'freq' && freqKeys.length === 0 && (
            <div className="text-center py-8 text-gray-400 text-sm">No frequency data</div>
          )}
          {activeSection === 'crosstab' && crossTabKeys.length === 0 && (
            <div className="text-center py-8 text-gray-400 text-sm">No cross-tabulation data</div>
          )}
          {activeSection === 'stats' && statKeys.length === 0 && (
            <div className="text-center py-8 text-gray-400 text-sm">No numeric statistics</div>
          )}
        </div>
      </div>
    </Modal>
  );
}

// Generate Report Modal
function GenerateReportModal({
  forms,
  onSelect,
  onClose,
}: {
  forms: TerritorialForm[];
  onSelect: (formId: string) => void;
  onClose: () => void;
}) {
  return (
    <Modal
      open={true}
      onClose={onClose}
      title="Generate Tabulation Report"
      footer={
        <button
          onClick={onClose}
          className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-xl"
        >
          Cancel
        </button>
      }
    >
      <p className="text-sm text-gray-600 mb-4">
        Select a form to analyze:
      </p>
      <div className="space-y-2 max-h-64 overflow-y-auto">
        {forms.map((form) => (
          <button
            key={form.id}
            onClick={() => onSelect(form.id)}
            className="w-full text-left p-3 bg-white border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-colors"
          >
            <div className="font-medium text-gray-800">{form.name}</div>
            {form.description && (
              <div className="text-xs text-gray-500 mt-0.5">{form.description}</div>
            )}
          </button>
        ))}
      </div>
    </Modal>
  );
}

// Main Page
export function TabulationDashboard() {
  const { org } = useOrg();
  const { user } = useAuth();

  // Data state
  const [forms, setForms] = useState<TerritorialForm[]>([]);
  const [reports, setReports] = useState<TabulationReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  // Matrices
  const [riskMatrix, setRiskMatrix] = useState<{
    matrix: Record<RiskLevel, number>;
    by_entity: Array<{ entity_id: string; risk_level: RiskLevel; score: number }>;
  } | null>(null);
  const [vulnerabilityMatrix, setVulnerabilityMatrix] = useState<{
    matrix: Record<VulnerabilityLevel, number>;
    by_entity: Array<{ entity_id: string; vulnerability_level: VulnerabilityLevel; score: number }>;
  } | null>(null);
  const [priorityMatrix, setPriorityMatrix] = useState<{
    matrix: Record<PriorityLevel, number>;
    by_entity: Array<{ entity_id: string; priority_level: PriorityLevel; score: number }>;
  } | null>(null);
  const [semaphoreSummary, setSemaphoreSummary] = useState<{
    overall: SemaphoreStatus;
    distribution: Record<SemaphoreStatus, number>;
  } | null>(null);

  // Modals
  const [selectedReport, setSelectedReport] = useState<TabulationReport | null>(null);
  const [showGenerateModal, setShowGenerateModal] = useState(false);

  // Load initial data
  const load = useCallback(async () => {
    if (!org) return;
    setLoading(true);

    try {
      // Load forms
      const formsData = await territorialFieldCollectionEngine.getForms(org.id);
      setForms(formsData);

      // Load reports
      const reportsData = await territorialTabulationEngine.getReports(org.id);
      setReports(reportsData);

      // Load matrices in parallel
      const [risk, vuln, prio, sem] = await Promise.all([
        territorialTabulationEngine.getRiskMatrix(org.id),
        territorialTabulationEngine.getVulnerabilityMatrix(org.id),
        territorialTabulationEngine.getPriorityMatrix(org.id),
        territorialTabulationEngine.getSemaphoreSummary(org.id),
      ]);

      setRiskMatrix(risk);
      setVulnerabilityMatrix(vuln);
      setPriorityMatrix(prio);
      setSemaphoreSummary(sem);
    } catch (e) {
      console.error('Failed to load tabulation data:', e);
    } finally {
      setLoading(false);
    }
  }, [org]);

  useEffect(() => {
    load();
  }, [load]);

  // Generate report
  const handleGenerateReport = async (formId: string) => {
    if (!org || !user) return;
    setGenerating(true);
    setShowGenerateModal(false);

    try {
      const report = await territorialTabulationEngine.generateReport(org.id, formId);
      setReports((prev) => [report, ...prev]);
      setSelectedReport(report);
    } catch (e) {
      console.error('Failed to generate report:', e);
    } finally {
      setGenerating(false);
    }
  };

  // Total reports count
  const totalReports = reports.length;
  const reportsThisMonth = reports.filter(
    (r) => new Date(r.generated_at) >= new Date(new Date().getFullYear(), new Date().getMonth(), 1)
  ).length;

  return (
    <div>
      <PageHeader
        title="Tabulation Dashboard"
        subtitle="Automatic analysis and cross-tabulation of collected data"
        actions={
          <div className="flex items-center gap-3">
            <button
              onClick={load}
              disabled={loading}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl"
            >
              <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={() => setShowGenerateModal(true)}
              disabled={generating || forms.length === 0}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 disabled:opacity-50"
            >
              {generating ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" /> Generating...
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4" /> Generate Report
                </>
              )}
            </button>
          </div>
        }
      />

      {loading ? (
        <div className="text-center py-12 text-gray-400">Loading...</div>
      ) : (
        <div className="space-y-6">
          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <QuickStatCard
              label="Total Reports"
              value={totalReports}
              icon={FileText}
              color="blue"
            />
            <QuickStatCard
              label="This Month"
              value={reportsThisMonth}
              icon={TrendingUp}
              color="green"
            />
            <QuickStatCard
              label="Forms Available"
              value={forms.length}
              icon={Layers}
              color="purple"
            />
            <QuickStatCard
              label="Overall Status"
              value={semaphoreSummary?.overall ?? 'green'}
              icon={Activity}
              color={semaphoreSummary?.overall === 'green' ? 'green' : semaphoreSummary?.overall === 'red' ? 'red' : 'amber'}
            />
          </div>

          {/* Semaphore Summary */}
          {semaphoreSummary && (
            <SemaphoreSummaryCard
              distribution={semaphoreSummary.distribution}
              overall={semaphoreSummary.overall}
            />
          )}

          {/* Matrices */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {riskMatrix && (
              <MatrixCard
                title="Risk Matrix"
                data={riskMatrix.matrix}
                labels={RISK_LEVEL_LABELS}
                colors={RISK_COLORS}
                icon={AlertTriangle}
              />
            )}
            {vulnerabilityMatrix && (
              <MatrixCard
                title="Vulnerability Matrix"
                data={vulnerabilityMatrix.matrix}
                labels={VULNERABILITY_LEVEL_LABELS}
                colors={VULNERABILITY_COLORS}
                icon={Shield}
              />
            )}
            {priorityMatrix && (
              <MatrixCard
                title="Priority Matrix"
                data={priorityMatrix.matrix}
                labels={PRIORITY_LEVEL_LABELS}
                colors={PRIORITY_COLORS}
                icon={AlertCircle}
              />
            )}
          </div>

          {/* Recent Reports */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5">
            <h3 className="font-bold text-gray-900 mb-4">Recent Tabulation Reports</h3>

            {reports.length === 0 ? (
              <EmptyState
                icon={<BarChart2 className="w-6 h-6" />}
                title="No reports yet"
                description="Generate a tabulation report to see automatic calculations"
                action={
                  <button
                    onClick={() => setShowGenerateModal(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-xl"
                  >
                    <Plus className="w-4 h-4" /> Generate Report
                  </button>
                }
              />
            ) : (
              <div className="space-y-2">
                {reports.slice(0, 10).map((report) => (
                  <div
                    key={report.id}
                    className="flex items-center justify-between p-4 bg-gray-50 rounded-xl hover:bg-gray-100 cursor-pointer transition-colors"
                    onClick={() => setSelectedReport(report)}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
                        <Table className="w-5 h-5 text-blue-600" />
                      </div>
                      <div>
                        <div className="font-medium text-gray-800">{report.name}</div>
                        <div className="text-xs text-gray-500">
                          {new Date(report.generated_at).toLocaleString()} · {report.total_records} records
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="flex gap-2">
                        {report.risk_assessment && (
                          <span
                            className="px-2 py-1 text-xs font-medium rounded-full capitalize"
                            style={{
                              backgroundColor: `${RISK_COLORS[report.risk_assessment.level]}20`,
                              color: RISK_COLORS[report.risk_assessment.level],
                            }}
                          >
                            Risk: {RISK_LEVEL_LABELS[report.risk_assessment.level]}
                          </span>
                        )}
                        {report.vulnerability_assessment && (
                          <span
                            className="px-2 py-1 text-xs font-medium rounded-full capitalize"
                            style={{
                              backgroundColor: `${VULNERABILITY_COLORS[report.vulnerability_assessment.level]}20`,
                              color: VULNERABILITY_COLORS[report.vulnerability_assessment.level],
                            }}
                          >
                            Vuln: {VULNERABILITY_LEVEL_LABELS[report.vulnerability_assessment.level]}
                          </span>
                        )}
                      </div>
                      <SemaphoreIndicator status={report.semaphore_status} />
                      <Eye className="w-4 h-4 text-gray-400" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Report Detail Modal */}
      <ReportDetailModal report={selectedReport} onClose={() => setSelectedReport(null)} />

      {/* Generate Report Modal */}
      {showGenerateModal && (
        <GenerateReportModal
          forms={forms}
          onSelect={handleGenerateReport}
          onClose={() => setShowGenerateModal(false)}
        />
      )}
    </div>
  );
}

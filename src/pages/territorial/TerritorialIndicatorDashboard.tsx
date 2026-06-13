import { useState, useEffect, useCallback } from 'react';
import {
  Activity, Map, Target, TrendingUp, AlertTriangle, RefreshCw, Eye,
  BarChart2, PieChart as PieIcon, Layers, CheckCircle, XCircle,
  ChevronDown, ChevronRight, ArrowUp, ArrowDown, Minus, Circle,
} from 'lucide-react';
import { useOrg } from '../../contexts/OrgContext';
import { PageHeader } from '../../components/common/PageHeader';
import { EmptyState } from '../../components/common/EmptyState';
import { Modal } from '../../components/common/Modal';
import {
  territorialIndicatorEngine,
  type TerritorialKPI,
  type CoverageKPIs,
  type DensityKPIs,
  type OpportunityKPIs,
  type GapKPIs,
  type ExecutiveSummary,
} from '../../services/TerritorialIndicatorEngine';
import { STATUS_COLORS, type SemaphoreStatus } from '../../services/SemaphoreEngine';
import {
  BarChart as RechartsBarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell,
  LineChart as RechartsLineChart, Line,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
} from 'recharts';

const SEMAPHORE_COLORS: Record<SemaphoreStatus, string> = {
  green: '#10b981',
  yellow: '#f59e0b',
  orange: '#f97316',
  red: '#ef4444',
  critical: '#dc2626',
};

const CATEGORY_COLORS: Record<string, string> = {
  coverage: '#3b82f6',
  density: '#10b981',
  opportunity: '#8b5cf6',
  gap: '#ef4444',
  performance: '#f59e0b',
};

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

// KPI Card
function KPICard({
  kpi,
  onClick,
}: {
  kpi: TerritorialKPI;
  onClick?: () => void;
}) {
  const categoryIcons: Record<string, React.ComponentType<{ className?: string }>> = {
    coverage: Map,
    density: Layers,
    opportunity: Target,
    gap: AlertTriangle,
    performance: TrendingUp,
  };
  const Icon = categoryIcons[kpi.category] ?? Activity;

  return (
    <div
      onClick={onClick}
      className={`bg-white rounded-xl border border-gray-100 p-4 hover:shadow-md transition-shadow ${onClick ? 'cursor-pointer' : ''}`}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-gray-500 uppercase tracking-wider">{kpi.category}</p>
          <p className="text-sm font-medium text-gray-800 mt-1">{kpi.name}</p>
        </div>
        <div className="flex items-center gap-2">
          <SemaphoreIndicator status={kpi.semaphore_status} />
          <Icon className="w-4 h-4 text-gray-400" />
        </div>
      </div>
      <div className="mt-3">
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-bold text-gray-900">
            {kpi.current_value !== null ? kpi.current_value.toLocaleString() : '-'}
          </span>
          <span className="text-sm text-gray-500">{kpi.unit}</span>
        </div>
        {kpi.target_value !== null && (
          <div className="text-xs text-gray-400 mt-1">
            Target: {kpi.target_value} {kpi.unit}
          </div>
        )}
      </div>
      {kpi.trend !== 'unknown' && (
        <div className="flex items-center gap-1 mt-2">
          {kpi.trend === 'improving' && <ArrowUp className="w-3 h-3 text-emerald-500" />}
          {kpi.trend === 'declining' && <ArrowDown className="w-3 h-3 text-red-500" />}
          {kpi.trend === 'stable' && <Minus className="w-3 h-3 text-gray-400" />}
          <span className={`text-xs ${kpi.trend === 'improving' ? 'text-emerald-600' : kpi.trend === 'declining' ? 'text-red-600' : 'text-gray-500'}`}>
            {kpi.trend}
          </span>
        </div>
      )}
    </div>
  );
}

// Executive Scorecard
function ExecutiveScorecard({ summary }: { summary: ExecutiveSummary }) {
  const radarData = [
    { metric: 'Coverage', value: summary.coverage_score, fullMark: 100 },
    { metric: 'Density', value: summary.density_score, fullMark: 100 },
    { metric: 'Opportunity', value: summary.opportunity_score, fullMark: 100 },
    { metric: 'Gap Health', value: summary.gap_score, fullMark: 100 },
  ];

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Executive Summary</h2>
          <p className="text-sm text-gray-500">Territorial intelligence at a glance</p>
        </div>
        <div className="flex items-center gap-3 px-4 py-2 rounded-xl bg-gray-50">
          <span className="text-sm text-gray-600">Overall Status:</span>
          <SemaphoreIndicator status={summary.overall_status} size="lg" />
          <span className="text-lg font-bold capitalize text-gray-800">{summary.overall_status}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Radar Chart */}
        <div>
          <ResponsiveContainer width="100%" height={220}>
            <RadarChart data={radarData}>
              <PolarGrid />
              <PolarAngleAxis dataKey="metric" tick={{ fontSize: 12, fill: '#6b7280' }} />
              <PolarRadiusAxis angle={90} domain={[0, 100]} tick={false} />
              <Radar
                name="Score"
                dataKey="value"
                stroke="#3b82f6"
                fill="#3b82f6"
                fillOpacity={0.3}
                strokeWidth={2}
              />
            </RadarChart>
          </ResponsiveContainer>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-blue-50 rounded-xl p-4">
            <div className="flex items-center gap-2 text-blue-600 mb-1">
              <Map className="w-4 h-4" />
              <span className="text-xs font-medium">Total Entities</span>
            </div>
            <div className="text-2xl font-bold text-gray-900">{summary.total_entities}</div>
          </div>
          <div className="bg-emerald-50 rounded-xl p-4">
            <div className="flex items-center gap-2 text-emerald-600 mb-1">
              <CheckCircle className="w-4 h-4" />
              <span className="text-xs font-medium">Visited</span>
            </div>
            <div className="text-2xl font-bold text-gray-900">{summary.total_visited}</div>
          </div>
          <div className="bg-purple-50 rounded-xl p-4">
            <div className="flex items-center gap-2 text-purple-600 mb-1">
              <Target className="w-4 h-4" />
              <span className="text-xs font-medium">Opportunities</span>
            </div>
            <div className="text-2xl font-bold text-gray-900">{summary.total_opportunities}</div>
          </div>
          <div className="bg-red-50 rounded-xl p-4">
            <div className="flex items-center gap-2 text-red-600 mb-1">
              <AlertTriangle className="w-4 h-4" />
              <span className="text-xs font-medium">Critical Issues</span>
            </div>
            <div className="text-2xl font-bold text-gray-900">{summary.critical_issues}</div>
          </div>
        </div>
      </div>

      {/* Score breakdown */}
      <div className="grid grid-cols-4 gap-4 mt-6 pt-4 border-t border-gray-100">
        {[
          { label: 'Coverage Score', value: summary.coverage_score, color: 'blue' },
          { label: 'Density Score', value: summary.density_score, color: 'emerald' },
          { label: 'Opportunity Score', value: summary.opportunity_score, color: 'purple' },
          { label: 'Gap Score', value: summary.gap_score, color: 'amber' },
        ].map((item) => (
          <div key={item.label} className="text-center">
            <div className="text-2xl font-bold text-gray-900">{item.value}</div>
            <div className="text-xs text-gray-500">{item.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Coverage Section
function CoverageSection({ kpis }: { kpis: CoverageKPIs }) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 p-5">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
          <Map className="w-5 h-5 text-blue-600" />
        </div>
        <div className="flex-1">
          <h3 className="font-bold text-gray-800">Coverage Indicators</h3>
          <p className="text-xs text-gray-500">Territorial coverage metrics</p>
        </div>
        <SemaphoreIndicator status={kpis.semaphore_status} size="lg" />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-3 bg-gray-50 rounded-lg">
          <div className="text-xs text-gray-500">Avg Coverage</div>
          <div className="text-xl font-bold text-gray-900">{kpis.avg_coverage_pct.toFixed(1)}%</div>
        </div>
        <div className="p-3 bg-gray-50 rounded-lg">
          <div className="text-xs text-gray-500">Total Entities</div>
          <div className="text-xl font-bold text-gray-900">{kpis.total_entities}</div>
        </div>
        <div className="p-3 bg-gray-50 rounded-lg">
          <div className="text-xs text-gray-500">Visited</div>
          <div className="text-xl font-bold text-emerald-600">{kpis.visited_entities}</div>
        </div>
        <div className="p-3 bg-gray-50 rounded-lg">
          <div className="text-xs text-gray-500">Critical Gaps</div>
          <div className="text-xl font-bold text-red-600">{kpis.critical_gaps_count}</div>
        </div>
      </div>
    </div>
  );
}

// Density Section
function DensitySection({ kpis }: { kpis: DensityKPIs }) {
  const densityData = [
    { name: 'Saturated', value: kpis.saturated_zones_count, color: '#3b82f6' },
    { name: 'Normal', value: kpis.normal_zones_count, color: '#10b981' },
    { name: 'Low', value: kpis.low_density_zones_count, color: '#f59e0b' },
  ].filter(d => d.value > 0);

  return (
    <div className="bg-white rounded-xl border border-gray-100 p-5">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center">
          <Layers className="w-5 h-5 text-emerald-600" />
        </div>
        <div className="flex-1">
          <h3 className="font-bold text-gray-800">Density Indicators</h3>
          <p className="text-xs text-gray-500">Geographic density analysis</p>
        </div>
        <SemaphoreIndicator status={kpis.semaphore_status} size="lg" />
      </div>

      <div className="flex items-center gap-4">
        {densityData.length > 0 && (
          <div className="w-24 h-24">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={densityData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={25}
                  outerRadius={40}
                  paddingAngle={2}
                >
                  {densityData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}
        <div className="flex-1 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Saturated Zones</span>
            <span className="font-semibold text-gray-900">{kpis.saturated_zones_count}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Normal Zones</span>
            <span className="font-semibold text-gray-900">{kpis.normal_zones_count}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Low Density Zones</span>
            <span className="font-semibold text-amber-600">{kpis.low_density_zones_count}</span>
          </div>
          <div className="flex items-center justify-between pt-2 border-t border-gray-100">
            <span className="text-sm text-gray-500">Expansion Candidates</span>
            <span className="font-semibold text-purple-600">{kpis.expansion_candidates}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// Opportunity Section
function OpportunitySection({ kpis }: { kpis: OpportunityKPIs }) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 p-5">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 bg-purple-50 rounded-xl flex items-center justify-center">
          <Target className="w-5 h-5 text-purple-600" />
        </div>
        <div className="flex-1">
          <h3 className="font-bold text-gray-800">Opportunity Indicators</h3>
          <p className="text-xs text-gray-500">Growth and expansion opportunities</p>
        </div>
        <SemaphoreIndicator status={kpis.semaphore_status} size="lg" />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="p-3 bg-emerald-50 rounded-lg">
          <div className="text-xs text-emerald-600">Growth Zones</div>
          <div className="text-xl font-bold text-gray-900">{kpis.growth_zones_count}</div>
        </div>
        <div className="p-3 bg-orange-50 rounded-lg">
          <div className="text-xs text-orange-600">Underserved Zones</div>
          <div className="text-xl font-bold text-gray-900">{kpis.underserved_zones_count}</div>
        </div>
        <div className="p-3 bg-purple-50 rounded-lg">
          <div className="text-xs text-purple-600">Expansion Zones</div>
          <div className="text-xl font-bold text-gray-900">{kpis.expansion_zones_count}</div>
        </div>
        <div className="p-3 bg-gray-50 rounded-lg">
          <div className="text-xs text-gray-500">Est. Potential</div>
          <div className="text-xl font-bold text-gray-900">{kpis.total_estimated_potential.toLocaleString()}</div>
        </div>
      </div>

      <div className="mt-3 p-3 bg-gray-50 rounded-lg flex items-center justify-between">
        <span className="text-sm text-gray-600">Confidence Score</span>
        <div className="flex items-center gap-2">
          <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-purple-500 rounded-full"
              style={{ width: `${kpis.avg_confidence_score * 100}%` }}
            />
          </div>
          <span className="text-sm font-medium text-gray-900">{(kpis.avg_confidence_score * 100).toFixed(0)}%</span>
        </div>
      </div>
    </div>
  );
}

// Gap Section
function GapSection({ kpis }: { kpis: GapKPIs }) {
  const severityData = [
    { name: 'Critical', value: kpis.critical_gaps, color: '#dc2626' },
    { name: 'High', value: kpis.high_gaps, color: '#ef4444' },
    { name: 'Medium', value: kpis.medium_gaps, color: '#f59e0b' },
    { name: 'Low', value: kpis.low_gaps, color: '#10b981' },
  ].filter(d => d.value > 0);

  return (
    <div className="bg-white rounded-xl border border-gray-100 p-5">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 bg-red-50 rounded-xl flex items-center justify-center">
          <AlertTriangle className="w-5 h-5 text-red-600" />
        </div>
        <div className="flex-1">
          <h3 className="font-bold text-gray-800">Gap Analysis</h3>
          <p className="text-xs text-gray-500">Coverage gap severity breakdown</p>
        </div>
        <SemaphoreIndicator status={kpis.semaphore_status} size="lg" />
      </div>

      <div className="flex items-center gap-4">
        {severityData.length > 0 && (
          <div className="w-24 h-24">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={severityData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={25}
                  outerRadius={40}
                  paddingAngle={2}
                >
                  {severityData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}
        <div className="flex-1 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Critical</span>
            <span className="font-semibold text-red-600">{kpis.critical_gaps}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">High</span>
            <span className="font-semibold text-orange-600">{kpis.high_gaps}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Medium</span>
            <span className="font-semibold text-amber-600">{kpis.medium_gaps}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Low</span>
            <span className="font-semibold text-emerald-600">{kpis.low_gaps}</span>
          </div>
        </div>
      </div>

      <div className="mt-3 pt-3 border-t border-gray-100 grid grid-cols-2 gap-3">
        <div className="text-center p-2 bg-gray-50 rounded">
          <div className="text-lg font-bold text-gray-900">{kpis.total_gaps}</div>
          <div className="text-xs text-gray-500">Total Gaps</div>
        </div>
        <div className="text-center p-2 bg-gray-50 rounded">
          <div className="text-lg font-bold text-gray-900">{kpis.avg_gap_pct.toFixed(1)}%</div>
          <div className="text-xs text-gray-500">Avg Gap %</div>
        </div>
      </div>
    </div>
  );
}

// KPI Detail Modal
function KPIDetailModal({
  kpi,
  onClose,
}: {
  kpi: TerritorialKPI | null;
  onClose: () => void;
}) {
  if (!kpi) return null;

  return (
    <Modal
      open={!!kpi}
      onClose={onClose}
      title={kpi.name}
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
        <div className="flex items-center gap-4">
          <div className={`w-16 h-16 rounded-xl flex items-center justify-center`}
            style={{ backgroundColor: `${CATEGORY_COLORS[kpi.category]}20` }}>
            <Activity className="w-8 h-8" style={{ color: CATEGORY_COLORS[kpi.category] }} />
          </div>
          <div>
            <div className="text-3xl font-bold text-gray-900">
              {kpi.current_value !== null ? kpi.current_value.toLocaleString() : '-'} <span className="text-lg text-gray-500">{kpi.unit}</span>
            </div>
            {kpi.target_value !== null && (
              <div className="text-sm text-gray-500">Target: {kpi.target_value} {kpi.unit}</div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="p-3 bg-gray-50 rounded-lg">
            <div className="text-xs text-gray-500">Category</div>
            <div className="text-sm font-medium text-gray-800 capitalize">{kpi.category}</div>
          </div>
          <div className="p-3 bg-gray-50 rounded-lg">
            <div className="text-xs text-gray-500">Priority</div>
            <div className="text-sm font-medium text-gray-800 capitalize">{kpi.priority}</div>
          </div>
          <div className="p-3 bg-gray-50 rounded-lg">
            <div className="text-xs text-gray-500">Trend</div>
            <div className="text-sm font-medium text-gray-800 capitalize">{kpi.trend}</div>
          </div>
          <div className="p-3 bg-gray-50 rounded-lg">
            <div className="text-xs text-gray-500">Status</div>
            <div className="flex items-center gap-2">
              <SemaphoreIndicator status={kpi.semaphore_status} />
              <span className="text-sm font-medium text-gray-800 capitalize">{kpi.semaphore_status}</span>
            </div>
          </div>
        </div>

        <div className="p-4 bg-gray-50 rounded-lg">
          <div className="text-xs text-gray-500 mb-1">Description</div>
          <div className="text-sm text-gray-700">{kpi.description}</div>
        </div>
      </div>
    </Modal>
  );
}

// Main Page
export function TerritorialIndicatorDashboard() {
  const { org } = useOrg();
  const [loading, setLoading] = useState(true);
  const [geoLevel, setGeoLevel] = useState<'municipality' | 'province'>('municipality');

  const [executiveSummary, setExecutiveSummary] = useState<ExecutiveSummary | null>(null);
  const [coverageKPIs, setCoverageKPIs] = useState<CoverageKPIs | null>(null);
  const [densityKPIs, setDensityKPIs] = useState<DensityKPIs | null>(null);
  const [opportunityKPIs, setOpportunityKPIs] = useState<OpportunityKPIs | null>(null);
  const [gapKPIs, setGapKPIs] = useState<GapKPIs | null>(null);
  const [kpis, setKpis] = useState<TerritorialKPI[]>([]);

  const [selectedKPI, setSelectedKPI] = useState<TerritorialKPI | null>(null);

  const load = useCallback(async () => {
    if (!org) return;
    setLoading(true);

    try {
      const [summary, coverage, density, opportunity, gap, kpiList] = await Promise.all([
        territorialIndicatorEngine.getExecutiveSummary(org.id, geoLevel),
        territorialIndicatorEngine.getCoverageKPIs(org.id, geoLevel),
        territorialIndicatorEngine.getDensityKPIs(org.id, geoLevel),
        territorialIndicatorEngine.getOpportunityKPIs(org.id, geoLevel),
        territorialIndicatorEngine.getGapKPIs(org.id, geoLevel),
        territorialIndicatorEngine.generateTerritorialKPIs(org.id, geoLevel),
      ]);

      setExecutiveSummary(summary);
      setCoverageKPIs(coverage);
      setDensityKPIs(density);
      setOpportunityKPIs(opportunity);
      setGapKPIs(gap);
      setKpis(kpiList);
    } catch (e) {
      console.error('Failed to load territorial indicator data:', e);
    } finally {
      setLoading(false);
    }
  }, [org, geoLevel]);

  useEffect(() => {
    load();
  }, [load]);

  const highPriorityKPIs = kpis.filter(k => k.priority === 'high');
  const mediumPriorityKPIs = kpis.filter(k => k.priority === 'medium');
  const lowPriorityKPIs = kpis.filter(k => k.priority === 'low');

  return (
    <div>
      <PageHeader
        title="Territorial KPIs"
        subtitle="Executive dashboard for territorial intelligence indicators"
        actions={
          <div className="flex items-center gap-3">
            <select
              value={geoLevel}
              onChange={(e) => setGeoLevel(e.target.value as 'municipality' | 'province')}
              className="px-3 py-2 text-sm border border-gray-200 rounded-xl bg-white"
            >
              <option value="municipality">Municipality Level</option>
              <option value="province">Province Level</option>
            </select>
            <button
              onClick={load}
              disabled={loading}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl"
            >
              <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        }
      />

      {loading ? (
        <div className="text-center py-12 text-gray-400">Loading territorial intelligence...</div>
      ) : (
        <div className="space-y-6">
          {/* Executive Summary */}
          {executiveSummary && <ExecutiveScorecard summary={executiveSummary} />}

          {/* Section Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {coverageKPIs && <CoverageSection kpis={coverageKPIs} />}
            {densityKPIs && <DensitySection kpis={densityKPIs} />}
            {opportunityKPIs && <OpportunitySection kpis={opportunityKPIs} />}
            {gapKPIs && <GapSection kpis={gapKPIs} />}
          </div>

          {/* KPI Scorecards */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5">
            <h3 className="font-bold text-gray-900 mb-4">All KPIs</h3>

            {highPriorityKPIs.length > 0 && (
              <div className="mb-6">
                <div className="text-xs font-semibold text-red-600 uppercase tracking-wider mb-2">High Priority</div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {highPriorityKPIs.map((kpi) => (
                    <KPICard key={kpi.key} kpi={kpi} onClick={() => setSelectedKPI(kpi)} />
                  ))}
                </div>
              </div>
            )}

            {mediumPriorityKPIs.length > 0 && (
              <div className="mb-6">
                <div className="text-xs font-semibold text-amber-600 uppercase tracking-wider mb-2">Medium Priority</div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {mediumPriorityKPIs.map((kpi) => (
                    <KPICard key={kpi.key} kpi={kpi} onClick={() => setSelectedKPI(kpi)} />
                  ))}
                </div>
              </div>
            )}

            {lowPriorityKPIs.length > 0 && (
              <div>
                <div className="text-xs font-semibold text-emerald-600 uppercase tracking-wider mb-2">Low Priority</div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {lowPriorityKPIs.map((kpi) => (
                    <KPICard key={kpi.key} kpi={kpi} onClick={() => setSelectedKPI(kpi)} />
                  ))}
                </div>
              </div>
            )}

            {kpis.length === 0 && (
              <EmptyState
                icon={<Activity className="w-6 h-6" />}
                title="No KPIs Available"
                description="Territorial intelligence data is required to generate KPIs"
              />
            )}
          </div>
        </div>
      )}

      {/* KPI Detail Modal */}
      <KPIDetailModal kpi={selectedKPI} onClose={() => setSelectedKPI(null)} />
    </div>
  );
}

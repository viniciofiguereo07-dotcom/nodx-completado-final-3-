import React, { useState, useEffect, useCallback } from 'react';
import {
  BarChart3, MapPin, TrendingUp, Target, Route, Layers,
  Database, Upload, Download, ClipboardList, RefreshCw,
  Activity, Globe, FileText, Users, CheckCircle, AlertTriangle,
  ArrowUpRight, ArrowDownRight, Minus, Clock, Camera, PenTool,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
  LineChart, Line, PieChart, Pie, Sector,
} from 'recharts';
import { useOrg } from '../../contexts/OrgContext';
import { PageHeader } from '../../components/common/PageHeader';
import { StatusBadge } from '../../components/common/StatusBadge';
import { useTerritorialCoverage, useTerritorialDensity, useTerritorialOpportunities } from '../../hooks/useTerritorialIntelligence';
import { useTerritorialRegistry } from '../../hooks/useTerritorialRegistry';
import { useTerritorialSubmissions, useTerritorialSubmissionStats } from '../../hooks/useTerritorialSubmissions';
import { supabase } from '../../lib/supabase';

// Types
interface RoutePerformance {
  id: string;
  name: string;
  status: string;
  completion_percentage: number;
  execution_count: number;
  territories_count: number;
}

interface ImportActivity {
  id: string;
  file_name: string;
  target_table: string;
  status: string;
  imported_rows: number;
  created_at: string;
}

interface ExportActivity {
  count: number;
  last_export: string | null;
}

interface CommandCenterStats {
  totalEntities: number;
  activeEntities: number;
  totalRoutes: number;
  activeRoutes: number;
  totalImports: number;
  completedImports: number;
  totalExports: number;
}

// Color palettes
const DENSITY_COLORS: Record<string, string> = {
  saturated: '#dc2626',
  normal: '#2563eb',
  low: '#f59e0b',
};

const STATUS_COLORS: Record<string, string> = {
  active: '#22c55e',
  draft: '#64748b',
  completed: '#0891b2',
  pending: '#f59e0b',
  failed: '#dc2626',
};

const OPP_TYPE_COLORS: Record<string, string> = {
  growth_zone: '#22c55e',
  underserved_zone: '#f59e0b',
  expansion_zone: '#2563eb',
};

// Components
function StatCard({ label, value, subValue, icon: Icon, color, trend }: {
  label: string;
  value: number | string;
  subValue?: string;
  icon: React.ElementType;
  color: string;
  trend?: 'up' | 'down' | 'stable';
}) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between mb-3">
        <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${color}15` }}>
          <Icon className="w-5 h-5" style={{ color }} />
        </div>
        {trend === 'up' && <ArrowUpRight className="w-4 h-4 text-emerald-500" />}
        {trend === 'down' && <ArrowDownRight className="w-4 h-4 text-red-500" />}
        {trend === 'stable' && <Minus className="w-4 h-4 text-slate-400" />}
      </div>
      <div className="flex items-baseline gap-1">
        <span className="text-2xl font-bold text-slate-900">{value}</span>
        {subValue && <span className="text-sm text-slate-400">{subValue}</span>}
      </div>
      <p className="text-xs text-slate-500 mt-1">{label}</p>
    </div>
  );
}

function MiniProgress({ value, label, color }: { value: number; label: string; color: string }) {
  return (
    <div className="flex items-center gap-3 py-1.5">
      <div className="w-24">
        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all"
            style={{ width: `${Math.min(100, value)}%`, backgroundColor: color }}
          />
        </div>
      </div>
      <span className="text-sm text-slate-600 flex-1 truncate">{label}</span>
      <span className="text-xs font-medium text-slate-500">{value.toFixed(0)}%</span>
    </div>
  );
}

function ActivityRow({ icon: Icon, title, subtitle, status, time, color }: {
  icon: React.ElementType;
  title: string;
  subtitle?: string;
  status?: string;
  time: string;
  color: string;
}) {
  return (
    <div className="flex items-center gap-3 py-2 border-b border-slate-50 last:border-0">
      <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${color}15` }}>
        <Icon className="w-4 h-4" style={{ color }} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-slate-800 truncate">{title}</p>
        {subtitle && <p className="text-xs text-slate-400 truncate">{subtitle}</p>}
      </div>
      {status && <StatusBadge status={status} />}
      <span className="text-xs text-slate-400 whitespace-nowrap">{time}</span>
    </div>
  );
}

export function TerritorialCommandCenter() {
  const { org } = useOrg();
  const [geoLevel, setGeoLevel] = useState('municipality');
  const [loading, setLoading] = useState(true);

  // Intelligence hooks
  const { liveCoverage, gaps, loading: covLoading, recalculate: recalcCoverage } = useTerritorialCoverage(geoLevel);
  const { metrics: densityMetrics, loading: denLoading, recalculate: recalcDensity } = useTerritorialDensity(geoLevel);
  const { opportunities, gapAnalysis, loading: oppLoading, detectAll } = useTerritorialOpportunities();

  // Registry hook
  const { entities, loading: regLoading, reload: reloadRegistry } = useTerritorialRegistry({ limit: 1000 });

  // Field collection hooks
  const { submissions, loading: subLoading, reload: reloadSubmissions } = useTerritorialSubmissions({ limit: 100 });
  const { stats: fieldStats, reload: reloadFieldStats } = useTerritorialSubmissionStats();

  // Local state for routes, imports, exports
  const [routes, setRoutes] = useState<RoutePerformance[]>([]);
  const [imports, setImports] = useState<ImportActivity[]>([]);
  const [exportActivity, setExportActivity] = useState<ExportActivity>({ count: 0, last_export: null });

  // Aggregate stats
  const [stats, setStats] = useState<CommandCenterStats>({
    totalEntities: 0,
    activeEntities: 0,
    totalRoutes: 0,
    activeRoutes: 0,
    totalImports: 0,
    completedImports: 0,
    totalExports: 0,
  });

  // Load routes, imports, exports
  const loadAdditionalData = useCallback(async () => {
    if (!org) return;

    try {
      // Routes
      const { data: routeData } = await supabase
        .from('routes')
        .select('id, name, status, completion_percentage, execution_count')
        .eq('organization_id', org.id)
        .order('created_at', { ascending: false })
        .limit(20);
      setRoutes((routeData ?? []) as RoutePerformance[]);

      // Imports
      const { data: importData } = await supabase
        .from('import_jobs')
        .select('id, file_name, target_table, status, imported_rows, created_at')
        .eq('organization_id', org.id)
        .order('created_at', { ascending: false })
        .limit(10);
      setImports((importData ?? []) as ImportActivity[]);

      // Exports - count based on export activity (approximate from audit_logs if available)
      const { count: exportCount } = await supabase
        .from('audit_logs')
        .select('id', { count: 'exact', head: true })
        .eq('organization_id', org.id)
        .eq('action', 'export')
        .limit(1);

      setExportActivity({
        count: exportCount ?? 0,
        last_export: null,
      });

      // Aggregate stats
      const { count: totalEntities } = await supabase
        .from('territorial_entities')
        .select('id', { count: 'exact', head: true })
        .eq('organization_id', org.id);

      const { count: activeEntities } = await supabase
        .from('territorial_entities')
        .select('id', { count: 'exact', head: true })
        .eq('organization_id', org.id)
        .eq('is_active', true);

      const { count: totalRoutes } = await supabase
        .from('routes')
        .select('id', { count: 'exact', head: true })
        .eq('organization_id', org.id);

      const { count: activeRoutes } = await supabase
        .from('routes')
        .select('id', { count: 'exact', head: true })
        .eq('organization_id', org.id)
        .eq('status', 'active');

      const { count: totalImports } = await supabase
        .from('import_jobs')
        .select('id', { count: 'exact', head: true })
        .eq('organization_id', org.id);

      const { count: completedImports } = await supabase
        .from('import_jobs')
        .select('id', { count: 'exact', head: true })
        .eq('organization_id', org.id)
        .eq('status', 'completed');

      setStats({
        totalEntities: totalEntities ?? 0,
        activeEntities: activeEntities ?? 0,
        totalRoutes: totalRoutes ?? 0,
        activeRoutes: activeRoutes ?? 0,
        totalImports: totalImports ?? 0,
        completedImports: completedImports ?? 0,
        totalExports: exportCount ?? 0,
      });

    } catch (e) {
      console.error('Error loading additional data:', e);
    }
  }, [org]);

  // Loading effect
  useEffect(() => {
    if (org) {
      setLoading(true);
      Promise.all([
        loadAdditionalData(),
      ]).finally(() => setLoading(false));
    }
  }, [org, loadAdditionalData]);

  const handleRefreshAll = async () => {
    setLoading(true);
    await Promise.all([
      recalcCoverage(),
      recalcDensity(),
      detectAll(geoLevel),
      reloadRegistry(),
      reloadSubmissions(),
      reloadFieldStats(),
      loadAdditionalData(),
    ]);
    setLoading(false);
  };

  // Calculate aggregate metrics
  const totalEstablishments = liveCoverage.reduce((s, c) => s + c.total_establishments, 0);
  const activeEstablishments = liveCoverage.reduce((s, c) => s + c.active_establishments, 0);
  const avgCoverage = liveCoverage.length > 0
    ? liveCoverage.reduce((s, c) => s + c.coverage_pct, 0) / liveCoverage.length
    : 0;

  const avgDensityScore = densityMetrics.length > 0
    ? densityMetrics.reduce((s, d) => s + d.establishment_count, 0) / densityMetrics.length
    : 0;

  const growthZones = opportunities.filter(o => o.opportunity_type === 'growth_zone').length;
  const expansionZones = opportunities.filter(o => o.opportunity_type === 'expansion_zone').length;
  const underservedZones = opportunities.filter(o => o.opportunity_type === 'underserved_zone').length;

  // Chart data
  const coverageChartData = liveCoverage.slice(0, 10).map(c => ({
    name: c.geo_name,
    coverage: Math.round(c.coverage_pct),
  }));

  const densityChartData = densityMetrics.slice(0, 8).map(d => ({
    name: d.geo_name,
    count: d.establishment_count,
    density: d.density_per_km2 ?? 0,
  }));

  const routePerformanceData = routes.slice(0, 8).map(r => ({
    name: r.name.length > 15 ? r.name.slice(0, 15) + '...' : r.name,
    completion: r.completion_percentage,
    executions: r.execution_count,
  }));

  const submissionByStatus = fieldStats?.byStatus
    ? Object.entries(fieldStats.byStatus).map(([name, value]) => ({ name, value }))
    : [];

  const oppTypeData = [
    { name: 'Growth Zones', value: growthZones, color: OPP_TYPE_COLORS.growth_zone },
    { name: 'Expansion', value: expansionZones, color: OPP_TYPE_COLORS.expansion_zone },
    { name: 'Underserved', value: underservedZones, color: OPP_TYPE_COLORS.underserved_zone },
  ].filter(d => d.value > 0);

  const totalLoading = covLoading || denLoading || oppLoading || regLoading || subLoading || loading;

  return (
    <div className="p-6 max-w-[1600px] mx-auto space-y-6">
      <PageHeader
        title="Territorial Command Center"
        subtitle="Unified operational dashboard for territorial intelligence"
        actions={
          <button
            onClick={handleRefreshAll}
            disabled={totalLoading}
            className="flex items-center gap-2 px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${totalLoading ? 'animate-spin' : ''}`} />
            Refresh All
          </button>
        }
      />

      {/* Geo Level Selector */}
      <div className="flex items-center gap-2 mb-4">
        <Layers className="w-4 h-4 text-slate-400" />
        <span className="text-sm text-slate-500">Geo Level:</span>
        {['province', 'municipality', 'district'].map(level => (
          <button
            key={level}
            onClick={() => setGeoLevel(level)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              geoLevel === level
                ? 'bg-blue-600 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            {level.charAt(0).toUpperCase() + level.slice(1)}
          </button>
        ))}
      </div>

      {/* Top KPI Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
        <StatCard label="Total Entities" value={stats.totalEntities} icon={Database} color="#2563eb" />
        <StatCard label="Active Entities" value={stats.activeEntities} icon={CheckCircle} color="#22c55e" />
        <StatCard label="Coverage" value={avgCoverage.toFixed(1)} subValue="%" icon={MapPin} color="#0891b2" />
        <StatCard label="Avg Density" value={avgDensityScore.toFixed(1)} icon={Users} color="#8b5cf6" />
        <StatCard label="Growth Zones" value={growthZones} icon={TrendingUp} color="#22c55e" />
        <StatCard label="Active Routes" value={stats.activeRoutes} icon={Route} color="#f59e0b" />
        <StatCard label="Imports" value={stats.totalImports} icon={Upload} color="#06b6d4" />
        <StatCard label="Exports" value={stats.totalExports} icon={Download} color="#ec4899" />
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Coverage Chart */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-slate-800">Coverage by {geoLevel}</h3>
            <span className="text-xs text-slate-400">{liveCoverage.length} areas</span>
          </div>
          {coverageChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={coverageChartData} margin={{ top: 8, right: 8, bottom: 40, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748b' }} angle={-30} textAnchor="end" />
                <YAxis tick={{ fontSize: 11, fill: '#64748b' }} domain={[0, 100]} />
                <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 12 }} />
                <Bar dataKey="coverage" radius={[4, 4, 0, 0]}>
                  {coverageChartData.map((entry, i) => (
                    <Cell
                      key={i}
                      fill={entry.coverage >= 80 ? '#22c55e' : entry.coverage >= 50 ? '#f59e0b' : '#dc2626'}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[260px] flex items-center justify-center text-slate-400 text-sm">
              {totalLoading ? 'Loading...' : 'No coverage data'}
            </div>
          )}
        </div>

        {/* Opportunities Pie */}
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h3 className="font-semibold text-slate-800 mb-4">Opportunity Distribution</h3>
          {oppTypeData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={oppTypeData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {oppTypeData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[200px] flex items-center justify-center text-slate-400 text-sm">
              No opportunity data
            </div>
          )}
          <div className="flex flex-wrap justify-center gap-4 mt-4">
            {oppTypeData.map((entry, i) => (
              <div key={i} className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: entry.color }} />
                <span className="text-xs text-slate-600">{entry.name}: {entry.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Second Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Density Metrics */}
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h3 className="font-semibold text-slate-800 mb-4">Top Density Areas</h3>
          <div className="space-y-2">
            {densityMetrics.slice(0, 8).map((d, i) => (
              <MiniProgress
                key={i}
                value={Math.min(100, (d.density_per_km2 ?? 0) * 2)}
                label={d.geo_name}
                color={DENSITY_COLORS[d.density_class ?? 'low'] ?? '#64748b'}
              />
            ))}
            {densityMetrics.length === 0 && (
              <div className="py-8 text-center text-slate-400 text-sm">
                No density data
              </div>
            )}
          </div>
        </div>

        {/* Route Performance */}
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h3 className="font-semibold text-slate-800 mb-4">Route Performance</h3>
          <div className="space-y-2">
            {routePerformanceData.length > 0 ? (
              routePerformanceData.map((r, i) => (
                <MiniProgress
                  key={i}
                  value={r.completion}
                  label={r.name}
                  color={r.completion >= 80 ? '#22c55e' : r.completion >= 50 ? '#f59e0b' : '#dc2626'}
                />
              ))
            ) : (
              <div className="py-8 text-center text-slate-400 text-sm">
                No routes configured
              </div>
            )}
          </div>
        </div>

        {/* Field Collection Activity */}
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h3 className="font-semibold text-slate-800 mb-4">Field Collection</h3>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="text-center p-3 bg-slate-50 rounded-lg">
              <Camera className="w-5 h-5 text-slate-400 mx-auto mb-1" />
              <p className="text-lg font-bold text-slate-900">{fieldStats?.withPhotos ?? 0}</p>
              <p className="text-xs text-slate-500">With Photos</p>
            </div>
            <div className="text-center p-3 bg-slate-50 rounded-lg">
              <PenTool className="w-5 h-5 text-slate-400 mx-auto mb-1" />
              <p className="text-lg font-bold text-slate-900">{fieldStats?.withSignatures ?? 0}</p>
              <p className="text-xs text-slate-500">With Signatures</p>
            </div>
          </div>
          <div className="border-t border-slate-100 pt-3">
            <p className="text-xs text-slate-500 mb-2">Recent Submissions</p>
            <div className="space-y-1">
              {submissions.slice(0, 4).map((s, i) => (
                <ActivityRow
                  key={i}
                  icon={ClipboardList}
                  title={s.form?.name ?? 'Form'}
                  status={s.status}
                  time={new Date(s.created_at).toLocaleDateString()}
                  color="#2563eb"
                />
              ))}
              {submissions.length === 0 && (
                <p className="text-xs text-slate-400 py-2">No submissions yet</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Third Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Gap Analysis */}
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h3 className="font-semibold text-slate-800 mb-4">Coverage Gaps</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="text-left py-2 px-3 text-slate-500 font-medium">Area</th>
                  <th className="text-right py-2 px-3 text-slate-500 font-medium">Visited/Total</th>
                  <th className="text-right py-2 px-3 text-slate-500 font-medium">Gap</th>
                  <th className="text-center py-2 px-3 text-slate-500 font-medium">Severity</th>
                </tr>
              </thead>
              <tbody>
                {gapAnalysis.slice(0, 8).map((g, i) => (
                  <tr key={i} className="border-b border-slate-50 hover:bg-slate-50">
                    <td className="py-2 px-3 font-medium text-slate-800">{g.geo_name}</td>
                    <td className="py-2 px-3 text-right text-slate-600">
                      {g.current_value ?? 0}/{g.expected_value ?? 0}
                    </td>
                    <td className="py-2 px-3 text-right text-slate-600">
                      {g.gap_pct ? `${(g.gap_pct * 100).toFixed(1)}%` : '-'}
                    </td>
                    <td className="py-2 px-3 text-center">
                      <StatusBadge status={g.severity ?? 'low'} />
                    </td>
                  </tr>
                ))}
                {gapAnalysis.length === 0 && (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-emerald-500 text-sm">
                      No coverage gaps detected
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Activity Feed: Imports & Exports */}
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h3 className="font-semibold text-slate-800 mb-4">Recent Activity</h3>
          <div className="space-y-3">
            {/* Imports */}
            <div className="border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2 mb-2">
                <Upload className="w-4 h-4 text-cyan-500" />
                <span className="text-xs font-medium text-slate-600">Import Activity</span>
              </div>
              <div className="space-y-1">
                {imports.slice(0, 3).map((imp, i) => (
                  <ActivityRow
                    key={i}
                    icon={Upload}
                    title={imp.file_name}
                    subtitle={`${imp.imported_rows} rows · ${imp.target_table}`}
                    status={imp.status}
                    time={new Date(imp.created_at).toLocaleDateString()}
                    color="#06b6d4"
                  />
                ))}
                {imports.length === 0 && (
                  <p className="text-xs text-slate-400 py-1">No import activity</p>
                )}
              </div>
            </div>

            {/* Exports */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Download className="w-4 h-4 text-pink-500" />
                <span className="text-xs font-medium text-slate-600">Export Activity</span>
              </div>
              <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                <div className="w-10 h-10 rounded-lg bg-pink-100 flex items-center justify-center">
                  <FileText className="w-5 h-5 text-pink-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-800">{exportActivity.count} total exports</p>
                  <p className="text-xs text-slate-400">
                    {exportActivity.last_export
                      ? `Last: ${new Date(exportActivity.last_export).toLocaleDateString()}`
                      : 'No recent exports'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Row - Atlas Summary */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold mb-1">Territorial Atlas Summary</h3>
            <p className="text-blue-100 text-sm">Complete territorial intelligence overview</p>
          </div>
          <div className="flex items-center gap-8">
            <div className="text-center">
              <p className="text-3xl font-bold">{stats.totalEntities}</p>
              <p className="text-xs text-blue-200">Entities</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold">{opportunities.length}</p>
              <p className="text-xs text-blue-200">Opportunities</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold">{gapAnalysis.length}</p>
              <p className="text-xs text-blue-200">Gaps</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold">{fieldStats?.total ?? 0}</p>
              <p className="text-xs text-blue-200">Collections</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

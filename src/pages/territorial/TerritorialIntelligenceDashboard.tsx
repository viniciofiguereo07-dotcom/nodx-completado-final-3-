import React, { useState } from 'react';
import {
  BarChart3, MapPin, TrendingUp, AlertTriangle, Eye,
  RefreshCw, Layers, ArrowUpRight, ArrowDownRight, Minus,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from 'recharts';
import { PageHeader } from '../../components/common/PageHeader';
import { StatusBadge } from '../../components/common/StatusBadge';
import { useTerritorialCoverage } from '../../hooks/useTerritorialIntelligence';
import { useTerritorialDensity } from '../../hooks/useTerritorialIntelligence';
import { useTerritorialOpportunities } from '../../hooks/useTerritorialIntelligence';
import type { TerritorialGapAnalysis, TerritorialOpportunityMetric } from '../../types';

const GEO_LEVELS = ['province', 'municipality', 'district'] as const;

const DENSITY_COLORS: Record<string, string> = {
  saturated: '#dc2626',
  normal: '#2563eb',
  low: '#f59e0b',
};

const SEVERITY_COLORS: Record<string, string> = {
  critical: '#dc2626',
  high: '#ea580c',
  medium: '#f59e0b',
  low: '#22c55e',
};

const OPP_TYPE_LABELS: Record<string, string> = {
  growth_zone: 'Growth Zone',
  underserved_zone: 'Underserved Zone',
  expansion_zone: 'Expansion Zone',
};

const OPP_TYPE_COLORS: Record<string, string> = {
  growth_zone: '#22c55e',
  underserved_zone: '#f59e0b',
  expansion_zone: '#2563eb',
};

function KPICard({ label, value, unit, icon: Icon, color }: {
  label: string; value: number | string; unit?: string; icon: React.ElementType; color: string;
}) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 hover:shadow-md transition-shadow">
      <div className="flex items-center gap-3 mb-3">
        <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${color}15` }}>
          <Icon className="w-5 h-5" style={{ color }} />
        </div>
        <span className="text-sm font-medium text-slate-500">{label}</span>
      </div>
      <div className="flex items-baseline gap-1">
        <span className="text-3xl font-bold text-slate-900">{value}</span>
        {unit && <span className="text-sm text-slate-400">{unit}</span>}
      </div>
    </div>
  );
}

function CoverageBarChart({ data }: { data: { geo_name: string; coverage_pct: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={data.slice(0, 12)} margin={{ top: 8, right: 8, bottom: 40, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
        <XAxis dataKey="geo_name" tick={{ fontSize: 11, fill: '#64748b' }} angle={-30} textAnchor="end" />
        <YAxis tick={{ fontSize: 11, fill: '#64748b' }} domain={[0, 100]} />
        <Tooltip
          contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 12 }}
          formatter={(v: unknown) => [`${v}%`, 'Coverage']}
        />
        <Bar dataKey="coverage_pct" radius={[4, 4, 0, 0]}>
          {data.slice(0, 12).map((entry, i) => (
            <Cell
              key={i}
              fill={entry.coverage_pct >= 80 ? '#22c55e' : entry.coverage_pct >= 50 ? '#f59e0b' : '#dc2626'}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

function RankingTable({ rows, columns }: {
  rows: { name: string; values: (string | number)[]; extra?: React.ReactNode }[];
  columns: { label: string; align?: string }[];
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-200">
            <th className="text-left py-2 px-3 text-slate-500 font-medium">Name</th>
            {columns.map((c, i) => (
              <th key={i} className={`py-2 px-3 text-slate-500 font-medium ${c.align === 'right' ? 'text-right' : 'text-left'}`}>{c.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
              <td className="py-2 px-3 font-medium text-slate-800">{row.name}</td>
              {row.values.map((v, j) => (
                <td key={j} className={`py-2 px-3 text-slate-600 ${columns[j]?.align === 'right' ? 'text-right' : ''}`}>{v}</td>
              ))}
              {row.extra && <td className="py-2 px-3">{row.extra}</td>}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function TerritorialIntelligenceDashboard() {
  const [geoLevel, setGeoLevel] = useState<string>('municipality');
  const { liveCoverage, gaps, loading: covLoading, recalculate: recalcCoverage } = useTerritorialCoverage(geoLevel);
  const { metrics: densityMetrics, loading: denLoading, recalculate: recalcDensity } = useTerritorialDensity(geoLevel);
  const { opportunities, gapAnalysis, loading: oppLoading, detectAll } = useTerritorialOpportunities();

  const loading = covLoading || denLoading || oppLoading;

  const totalEstablishments = liveCoverage.reduce((s, c) => s + c.total_establishments, 0);
  const activeEstablishments = liveCoverage.reduce((s, c) => s + c.active_establishments, 0);
  const assignedEstablishments = liveCoverage.reduce((s, c) => s + c.assigned_establishments, 0);
  const visitedEstablishments = liveCoverage.reduce((s, c) => s + c.visited_establishments, 0);
  const avgCoverage = liveCoverage.length > 0
    ? Math.round(liveCoverage.reduce((s, c) => s + c.coverage_pct, 0) / liveCoverage.length * 10) / 10
    : 0;

  const handleRecalculate = async () => {
    await Promise.all([recalcCoverage(), recalcDensity(), detectAll(geoLevel)]);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <PageHeader
        title="Territorial Intelligence"
        subtitle="Coverage, density, and expansion analytics"
        actions={
          <button onClick={handleRecalculate} className="flex items-center gap-2 px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">
            <RefreshCw className="w-4 h-4" />
            Recalculate
          </button>
        }
      />

      {/* Geo Level Selector */}
      <div className="flex items-center gap-2">
        <Layers className="w-4 h-4 text-slate-400" />
        <span className="text-sm text-slate-500">Level:</span>
        {GEO_LEVELS.map(level => (
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

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <KPICard label="Total Entities" value={totalEstablishments} icon={MapPin} color="#2563eb" />
        <KPICard label="Active" value={activeEstablishments} icon={BarChart3} color="#22c55e" />
        <KPICard label="Assigned" value={assignedEstablishments} icon={Eye} color="#8b5cf6" />
        <KPICard label="Visited" value={visitedEstablishments} icon={TrendingUp} color="#0891b2" />
        <KPICard label="Avg Coverage" value={avgCoverage} unit="%" icon={BarChart3} color="#f59e0b" />
      </div>

      {/* Coverage Chart + Density Table */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Coverage Bar Chart */}
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h3 className="text-sm font-semibold text-slate-800 mb-4">Coverage by {geoLevel}</h3>
          {liveCoverage.length > 0 ? (
            <CoverageBarChart data={liveCoverage} />
          ) : (
            <div className="h-[280px] flex items-center justify-center text-slate-400 text-sm">
              {loading ? 'Loading...' : 'No data available'}
            </div>
          )}
        </div>

        {/* Density Metrics */}
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h3 className="text-sm font-semibold text-slate-800 mb-4">Density Classification</h3>
          {densityMetrics.length > 0 ? (
            <RankingTable
              rows={densityMetrics.slice(0, 15).map(m => ({
                name: m.geo_name,
                values: [m.establishment_count, m.density_class ?? 'N/A'],
                extra: (
                  <span
                    className="inline-block w-2 h-2 rounded-full"
                    style={{ backgroundColor: DENSITY_COLORS[m.density_class ?? 'low'] }}
                  />
                ),
              }))}
              columns={[
                { label: 'Count', align: 'right' },
                { label: 'Class' },
              ]}
            />
          ) : (
            <div className="h-[280px] flex items-center justify-center text-slate-400 text-sm">
              {loading ? 'Loading...' : 'No data available'}
            </div>
          )}
        </div>
      </div>

      {/* Municipality + Province Rankings */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Municipality Ranking */}
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h3 className="text-sm font-semibold text-slate-800 mb-4">Municipality Ranking</h3>
          {liveCoverage.length > 0 ? (
            <RankingTable
              rows={liveCoverage
                .sort((a, b) => b.total_establishments - a.total_establishments)
                .slice(0, 10)
                .map(c => ({
                  name: c.geo_name,
                  values: [
                    c.total_establishments,
                    c.active_establishments,
                    `${c.coverage_pct}%`,
                  ],
                }))}
              columns={[
                { label: 'Total', align: 'right' },
                { label: 'Active', align: 'right' },
                { label: 'Cov%', align: 'right' },
              ]}
            />
          ) : (
            <div className="py-8 text-center text-slate-400 text-sm">
              {loading ? 'Loading...' : 'No data available'}
            </div>
          )}
        </div>

        {/* Province Ranking */}
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h3 className="text-sm font-semibold text-slate-800 mb-4">Coverage Gaps</h3>
          {gaps.length > 0 ? (
            <RankingTable
              rows={gaps.slice(0, 10).map(g => ({
                name: g.geo_name,
                values: [
                  `${g.current_value}/${g.expected_value}`,
                  `${g.gap_pct}%`,
                ],
                extra: <StatusBadge status={g.severity} />,
              }))}
              columns={[
                { label: 'Visited/Total', align: 'right' },
                { label: 'Gap', align: 'right' },
              ]}
            />
          ) : (
            <div className="py-8 text-center text-emerald-500 text-sm">
              No coverage gaps detected
            </div>
          )}
        </div>
      </div>

      {/* Expansion Opportunities */}
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <h3 className="text-sm font-semibold text-slate-800 mb-4">Expansion Opportunities</h3>
        {opportunities.length > 0 ? (
          <RankingTable
            rows={(opportunities as TerritorialOpportunityMetric[]).map(o => ({
              name: o.geo_name,
              values: [
                OPP_TYPE_LABELS[o.opportunity_type] ?? o.opportunity_type,
                o.current_establishments,
                o.estimated_potential ?? 'N/A',
                `${Math.round((o.confidence_score ?? 0) * 100)}%`,
              ],
              extra: (
                <span
                  className="inline-block w-2 h-2 rounded-full"
                  style={{ backgroundColor: OPP_TYPE_COLORS[o.opportunity_type] ?? '#64748b' }}
                />
              ),
            }))}
            columns={[
              { label: 'Type' },
              { label: 'Current', align: 'right' },
              { label: 'Potential', align: 'right' },
              { label: 'Confidence', align: 'right' },
            ]}
          />
        ) : (
          <div className="py-8 text-center text-slate-400 text-sm">
            {loading ? 'Loading...' : 'Run recalculate to detect opportunities'}
          </div>
        )}
      </div>
    </div>
  );
}

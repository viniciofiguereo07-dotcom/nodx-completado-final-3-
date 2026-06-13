import React, { useState } from 'react';
import {
  Activity, TrendingUp, TrendingDown, Minus, Target, BarChart2,
  RefreshCw, AlertCircle, ChevronRight, Layers,
} from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Cell,
} from 'recharts';
import { useKPIs } from '../../hooks/useIndicators';
import type { KPIResult } from '../../services/IndicatorEngine';

const SECTORS = ['All', 'WASH', 'Food Security', 'Nutrition', 'Education', 'Protection', 'Health', 'M&E'];

const SECTOR_COLORS: Record<string, string> = {
  WASH: '#0891b2', 'Food Security': '#d97706', Nutrition: '#ea580c',
  Education: '#2563eb', Protection: '#dc2626', Health: '#db2777',
  'M&E': '#7c3aed', default: '#64748b',
};

function TrendIcon({ trend }: { trend: KPIResult['trend'] }) {
  if (trend === 'improving') return <TrendingUp className="w-4 h-4 text-emerald-500" />;
  if (trend === 'declining')  return <TrendingDown className="w-4 h-4 text-red-500" />;
  return <Minus className="w-4 h-4 text-slate-400" />;
}

function KPICard({ kpi }: { kpi: KPIResult }) {
  const color = SECTOR_COLORS[kpi.sector ?? ''] ?? SECTOR_COLORS.default;
  const compliance = kpi.compliance_pct ?? null;

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span
              className="text-xs font-semibold px-2 py-0.5 rounded-full"
              style={{ backgroundColor: `${color}18`, color }}
            >
              {kpi.sector ?? 'General'}
            </span>
            <span className="text-xs text-slate-400 font-mono">{kpi.indicator_code}</span>
          </div>
          <h3 className="text-sm font-semibold text-slate-800 truncate">{kpi.indicator_name}</h3>
        </div>
        <TrendIcon trend={kpi.trend} />
      </div>

      <div className="mt-3 flex items-end gap-4">
        <div>
          <div className="text-2xl font-bold text-slate-900">
            {kpi.current_value !== null
              ? `${kpi.current_value.toLocaleString()}${kpi.unit ? ` ${kpi.unit}` : ''}`
              : '—'}
          </div>
          {kpi.target_value !== null && (
            <div className="text-xs text-slate-500 mt-0.5">
              Target: {kpi.target_value.toLocaleString()}{kpi.unit ? ` ${kpi.unit}` : ''}
            </div>
          )}
        </div>
        {compliance !== null && (
          <div className="flex-1">
            <div className="flex justify-between text-xs mb-1">
              <span className="text-slate-500">Compliance</span>
              <span className="font-semibold text-slate-700">{compliance.toFixed(0)}%</span>
            </div>
            <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${Math.min(100, compliance)}%`,
                  backgroundColor: compliance >= 80 ? '#10b981' : compliance >= 50 ? '#f59e0b' : '#ef4444',
                }}
              />
            </div>
          </div>
        )}
      </div>

      {kpi.baseline_value !== null && (
        <div className="mt-2 pt-2 border-t border-slate-100 flex gap-4 text-xs text-slate-500">
          <span>Baseline: <span className="font-medium text-slate-700">{kpi.baseline_value}</span></span>
          {kpi.quality_score !== null && (
            <span>Quality: <span className="font-medium text-slate-700">{kpi.quality_score}%</span></span>
          )}
        </div>
      )}
    </div>
  );
}

function SectorBarChart({ kpis }: { kpis: KPIResult[] }) {
  const grouped = kpis.reduce<Record<string, { count: number; withValue: number }>>((acc, kpi) => {
    const sec = kpi.sector ?? 'General';
    if (!acc[sec]) acc[sec] = { count: 0, withValue: 0 };
    acc[sec].count++;
    if (kpi.current_value !== null) acc[sec].withValue++;
    return acc;
  }, {});

  const data = Object.entries(grouped).map(([sector, v]) => ({
    sector: sector.length > 12 ? sector.slice(0, 11) + '…' : sector,
    fullSector: sector,
    total: v.count,
    withData: v.withValue,
    coverage: v.count > 0 ? Math.round((v.withValue / v.count) * 100) : 0,
  }));

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4">
      <h3 className="text-sm font-semibold text-slate-700 mb-4">Indicators by Sector</h3>
      <ResponsiveContainer width="100%" height={180}>
        <BarChart data={data} barSize={24}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
          <XAxis dataKey="sector" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
          <Tooltip
            formatter={(val, name) => [val, name === 'withData' ? 'With Data' : 'Total']}
            contentStyle={{ fontSize: 12, borderRadius: 8 }}
          />
          <Bar dataKey="total" fill="#e2e8f0" radius={[4, 4, 0, 0]} name="Total" />
          <Bar dataKey="withData" radius={[4, 4, 0, 0]} name="With Data">
            {data.map(entry => (
              <Cell key={entry.sector} fill={SECTOR_COLORS[entry.fullSector] ?? SECTOR_COLORS.default} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function TrendChart({ kpis }: { kpis: KPIResult[] }) {
  const improving = kpis.filter(k => k.trend === 'improving').length;
  const stable    = kpis.filter(k => k.trend === 'stable').length;
  const declining = kpis.filter(k => k.trend === 'declining').length;
  const unknown   = kpis.filter(k => k.trend === 'unknown').length;

  const data = [
    { name: 'Improving', value: improving, color: '#10b981' },
    { name: 'Stable',    value: stable,    color: '#94a3b8' },
    { name: 'Declining', value: declining, color: '#ef4444' },
    { name: 'Unknown',   value: unknown,   color: '#cbd5e1' },
  ].filter(d => d.value > 0);

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4">
      <h3 className="text-sm font-semibold text-slate-700 mb-4">Trend Distribution</h3>
      <ResponsiveContainer width="100%" height={180}>
        <BarChart data={data} layout="vertical" barSize={20}>
          <XAxis type="number" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
          <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} width={70} />
          <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
          <Bar dataKey="value" radius={[0, 4, 4, 0]}>
            {data.map(entry => <Cell key={entry.name} fill={entry.color} />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function IndicatorDashboard() {
  const [sector, setSector]         = useState('All');
  const { kpis, loading, error, reload } = useKPIs(sector === 'All' ? undefined : sector);

  const total       = kpis.length;
  const withData    = kpis.filter(k => k.current_value !== null).length;
  const onTrack     = kpis.filter(k => k.compliance_pct !== null && k.compliance_pct >= 80).length;
  const atRisk      = kpis.filter(k => k.compliance_pct !== null && k.compliance_pct < 50).length;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Indicator Dashboard</h1>
          <p className="text-sm text-slate-500 mt-0.5">KPI overview, trends, and compliance tracking</p>
        </div>
        <button
          onClick={reload}
          className="flex items-center gap-2 px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Indicators', value: total, icon: BarChart2, color: 'text-blue-600' },
          { label: 'With Data',        value: withData, icon: Activity, color: 'text-emerald-600' },
          { label: 'On Track',         value: onTrack,  icon: Target,   color: 'text-green-600' },
          { label: 'At Risk',          value: atRisk,   icon: AlertCircle, color: 'text-red-600' },
        ].map(item => (
          <div key={item.label} className="bg-white rounded-xl border border-slate-200 p-4">
            <div className="flex items-center gap-2 mb-2">
              <item.icon className={`w-4 h-4 ${item.color}`} />
              <span className="text-xs text-slate-500">{item.label}</span>
            </div>
            <div className="text-3xl font-bold text-slate-900">{item.value}</div>
          </div>
        ))}
      </div>

      {/* Sector filter */}
      <div className="flex gap-2 flex-wrap">
        {SECTORS.map(s => (
          <button
            key={s}
            onClick={() => setSector(s)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
              sector === s
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      {/* Charts */}
      {!loading && kpis.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <SectorBarChart kpis={kpis} />
          <TrendChart kpis={kpis} />
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* KPI cards */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-white rounded-xl border border-slate-200 p-4 animate-pulse">
              <div className="h-4 bg-slate-100 rounded w-3/4 mb-2" />
              <div className="h-3 bg-slate-100 rounded w-1/2 mb-4" />
              <div className="h-8 bg-slate-100 rounded w-1/3" />
            </div>
          ))}
        </div>
      ) : kpis.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
          <Layers className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500 font-medium">No indicators found</p>
          <p className="text-slate-400 text-sm mt-1">Add indicators to the catalog to see KPIs here.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {kpis.map(kpi => <KPICard key={kpi.indicator_id} kpi={kpi} />)}
        </div>
      )}
    </div>
  );
}

import React, { useState } from 'react';
import {
  TrendingUp, TrendingDown, Minus, RefreshCw, Layers,
  ChevronRight, BarChart2,
} from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  ReferenceLine, Area, AreaChart,
} from 'recharts';
import { useIndicatorCatalog } from '../../hooks/useIndicators';
import { useTrendSeries } from '../../hooks/useIndicators';
import { useBaselineEndline } from '../../hooks/useIndicators';
import { useHistoricalEvolution } from '../../hooks/useTabulation';
import type { IndicatorCatalogItem } from '../../types';
import type { TrendPoint } from '../../services/IndicatorEngine';

const SECTOR_COLORS: Record<string, string> = {
  WASH: '#0891b2', 'Food Security': '#d97706', Nutrition: '#ea580c',
  Education: '#2563eb', Protection: '#dc2626', Health: '#db2777',
  'M&E': '#7c3aed', default: '#3b82f6',
};

function TrendLine({ indicatorId, color }: { indicatorId: string; color: string }) {
  const { points, loading } = useTrendSeries(indicatorId, 24);

  if (loading) return <div className="h-24 bg-slate-50 rounded-lg animate-pulse" />;
  if (points.length < 2) {
    return (
      <div className="h-24 flex items-center justify-center bg-slate-50 rounded-lg text-xs text-slate-400">
        Insufficient data
      </div>
    );
  }

  const data = points.map((p, i) => ({
    index: i,
    value: p.value,
    date: new Date(p.date).toLocaleDateString('en', { month: 'short', day: 'numeric' }),
  }));

  return (
    <ResponsiveContainer width="100%" height={96}>
      <AreaChart data={data}>
        <defs>
          <linearGradient id={`grad-${indicatorId}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={color} stopOpacity={0.2} />
            <stop offset="95%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <XAxis dataKey="date" tick={{ fontSize: 9, fill: '#94a3b8' }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
        <YAxis tick={{ fontSize: 9, fill: '#94a3b8' }} axisLine={false} tickLine={false} width={28} />
        <Tooltip contentStyle={{ fontSize: 11, borderRadius: 6 }} labelStyle={{ fontSize: 10 }} />
        <Area type="monotone" dataKey="value" stroke={color} strokeWidth={2} fill={`url(#grad-${indicatorId})`} dot={false} activeDot={{ r: 4 }} />
      </AreaChart>
    </ResponsiveContainer>
  );
}

function BaselineEndlineBar({ indicatorId }: { indicatorId: string }) {
  const { data: bl } = useBaselineEndline(indicatorId);

  if (!bl || (bl.baseline_value === null && bl.endline_value === null)) return null;

  const change = bl.change_pct;

  return (
    <div className="mt-2 pt-2 border-t border-slate-100 grid grid-cols-3 gap-2 text-xs">
      <div>
        <div className="text-slate-400">Baseline</div>
        <div className="font-semibold text-slate-700">{bl.baseline_value ?? '—'}</div>
      </div>
      <div>
        <div className="text-slate-400">Endline</div>
        <div className="font-semibold text-slate-700">{bl.endline_value ?? '—'}</div>
      </div>
      <div>
        <div className="text-slate-400">Change</div>
        <div className={`font-semibold flex items-center gap-1 ${
          change === null ? 'text-slate-400' : change >= 0 ? 'text-emerald-600' : 'text-red-600'
        }`}>
          {change === null ? '—' : (
            <>
              {change >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
              {Math.abs(change).toFixed(1)}%
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function IndicatorTrendCard({
  indicator,
  selected,
  onSelect,
}: {
  indicator: IndicatorCatalogItem;
  selected: boolean;
  onSelect: () => void;
}) {
  const color = SECTOR_COLORS[indicator.sector ?? ''] ?? SECTOR_COLORS.default;

  return (
    <div
      className={`bg-white rounded-xl border cursor-pointer transition-all ${
        selected ? 'border-blue-400 shadow-md' : 'border-slate-200 hover:border-slate-300'
      }`}
      onClick={onSelect}
    >
      <div className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span
                className="text-xs font-semibold px-2 py-0.5 rounded-full"
                style={{ backgroundColor: `${color}18`, color }}
              >
                {indicator.sector ?? 'General'}
              </span>
              <span className="text-xs text-slate-400 font-mono">{indicator.code}</span>
            </div>
            <h3 className="text-sm font-semibold text-slate-800 truncate">{indicator.name}</h3>
          </div>
          <ChevronRight className={`w-4 h-4 text-slate-400 flex-shrink-0 transition-transform ${selected ? 'rotate-90' : ''}`} />
        </div>

        <TrendLine indicatorId={indicator.id} color={color} />
        <BaselineEndlineBar indicatorId={indicator.id} />
      </div>
    </div>
  );
}

function ScoreEvolutionChart({ configId, label }: { configId: string; label: string }) {
  const { points, loading } = useHistoricalEvolution(configId, undefined, undefined, 30);

  if (loading) return <div className="h-48 bg-slate-50 rounded-xl animate-pulse" />;
  if (points.length < 2) return null;

  const data = points.map((p, i) => ({
    index: i,
    pct: p.percentage !== null ? Math.round(p.percentage) : null,
    score: p.weighted_score,
    date: new Date(p.date).toLocaleDateString('en', { month: 'short', day: 'numeric' }),
  }));

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4">
      <h3 className="text-sm font-semibold text-slate-700 mb-4">{label} — Score Evolution</h3>
      <ResponsiveContainer width="100%" height={180}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
          <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
          <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} domain={[0, 100]} />
          <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
          <ReferenceLine y={80} stroke="#10b981" strokeDasharray="4 2" label={{ value: 'Target', position: 'right', fontSize: 10, fill: '#10b981' }} />
          <Line type="monotone" dataKey="pct" stroke="#3b82f6" strokeWidth={2} dot={false} activeDot={{ r: 5 }} name="Score %" />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export function HistoricalTrendView() {
  const [selectedIndicator, setSelectedIndicator] = useState<string | null>(null);
  const [sectorFilter, setSectorFilter]           = useState('All');

  const { catalog, loading, error, reload } = useIndicatorCatalog(
    sectorFilter === 'All' ? undefined : sectorFilter
  );

  const sectors = ['All', ...Array.from(new Set(catalog.map(i => i.sector).filter((s): s is string => !!s)))];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Historical Trends</h1>
          <p className="text-sm text-slate-500 mt-0.5">Evolution analysis, baseline/endline comparisons, and trend series</p>
        </div>
        <button
          onClick={reload}
          className="flex items-center gap-2 px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </div>

      {/* Summary strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Indicators',    value: catalog.length,                                                   color: 'text-blue-600',    icon: BarChart2 },
          { label: 'Composite',     value: catalog.filter(i => i.is_composite).length,                       color: 'text-violet-600',  icon: Layers },
          { label: 'System',        value: catalog.filter(i => i.is_system).length,                         color: 'text-slate-600',   icon: BarChart2 },
          { label: 'Custom',        value: catalog.filter(i => !i.is_system && i.organization_id).length,   color: 'text-emerald-600', icon: TrendingUp },
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
        {sectors.map(s => (
          <button
            key={s}
            onClick={() => setSectorFilter(s)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
              sectorFilter === s
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700">{error}</div>
      )}

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-white rounded-xl border border-slate-200 p-4 animate-pulse">
              <div className="h-4 bg-slate-100 rounded w-2/3 mb-3" />
              <div className="h-24 bg-slate-100 rounded" />
            </div>
          ))}
        </div>
      ) : catalog.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
          <Layers className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500 font-medium">No indicators found</p>
          <p className="text-slate-400 text-sm mt-1">Add indicators to the catalog to start tracking trends.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {catalog.map(indicator => (
            <IndicatorTrendCard
              key={indicator.id}
              indicator={indicator}
              selected={selectedIndicator === indicator.id}
              onSelect={() => setSelectedIndicator(selectedIndicator === indicator.id ? null : indicator.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

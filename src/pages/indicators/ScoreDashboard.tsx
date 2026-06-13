import React, { useState } from 'react';
import {
  BarChart2, RefreshCw, ChevronDown, ChevronUp, Layers,
  CheckCircle2, XCircle, AlertCircle, TrendingUp,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  Cell,
} from 'recharts';
import { useTabulationResults, useScoreResults } from '../../hooks/useTabulation';
import type { TabulationResult } from '../../services/TabulationEngine';

function ScoreBar({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div>
      <div className="flex justify-between text-xs mb-1">
        <span className="text-slate-600 truncate">{label}</span>
        <span className="font-semibold text-slate-700 ml-2 flex-shrink-0">{value.toFixed(1)} / {max}</span>
      </div>
      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-300"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
    </div>
  );
}

function ResultCard({
  result,
  selected,
  onSelect,
}: {
  result: TabulationResult;
  selected: boolean;
  onSelect: () => void;
}) {
  const { scores } = useScoreResults(selected ? result.id : null);

  const pct = result.percentage ?? 0;
  const color = pct >= 80 ? '#10b981' : pct >= 60 ? '#f59e0b' : pct >= 40 ? '#f97316' : '#ef4444';

  const fieldScores = Object.entries(result.field_scores as Record<string, Record<string, unknown>>);

  return (
    <div
      className={`bg-white rounded-xl border transition-all cursor-pointer ${
        selected ? 'border-blue-400 shadow-md shadow-blue-100' : 'border-slate-200 hover:border-slate-300'
      }`}
    >
      <div className="p-4" onClick={onSelect}>
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-medium text-slate-500 capitalize">{result.subject_type}</span>
              {result.subject_id && (
                <span className="text-xs text-slate-400 truncate">#{result.subject_id.slice(0, 8)}</span>
              )}
            </div>
            <div className="text-sm font-semibold text-slate-700 capitalize">{result.scoring_type.replace('_', ' ')}</div>
          </div>
          <div className="text-right flex-shrink-0 ml-2">
            <div className="text-2xl font-bold" style={{ color }}>{pct.toFixed(0)}%</div>
            {result.weighted_score !== null && (
              <div className="text-xs text-slate-500">{result.weighted_score.toFixed(1)} pts</div>
            )}
          </div>
        </div>

        <div className="mt-3 h-2 bg-slate-100 rounded-full overflow-hidden">
          <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: color }} />
        </div>

        {result.category && (
          <div className="mt-2 flex items-center gap-1">
            {pct >= 80
              ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
              : pct >= 50
              ? <AlertCircle className="w-3.5 h-3.5 text-amber-500" />
              : <XCircle className="w-3.5 h-3.5 text-red-500" />
            }
            <span className="text-xs font-medium text-slate-600">{result.category}</span>
          </div>
        )}

        <div className="mt-1 flex items-center gap-1 text-slate-400">
          {selected ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          <span className="text-xs">{selected ? 'Hide' : 'Show'} field scores</span>
        </div>
      </div>

      {selected && fieldScores.length > 0 && (
        <div className="px-4 pb-4 border-t border-slate-100 pt-3 space-y-2">
          {fieldScores.map(([key, val]) => {
            const rawVal = (val as Record<string, unknown>).raw_value as number ?? 0;
            const maxVal = (val as Record<string, unknown>).max_value as number ?? 1;
            return (
              <ScoreBar
                key={key}
                label={(val as Record<string, unknown>).band_label as string ?? key}
                value={rawVal}
                max={maxVal}
                color={color}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}

function DistributionChart({ results }: { results: TabulationResult[] }) {
  const bands = [
    { name: '0-20%',   range: [0, 20],   color: '#ef4444' },
    { name: '20-40%',  range: [20, 40],  color: '#f97316' },
    { name: '40-60%',  range: [40, 60],  color: '#f59e0b' },
    { name: '60-80%',  range: [60, 80],  color: '#84cc16' },
    { name: '80-100%', range: [80, 100], color: '#10b981' },
  ];

  const data = bands.map(b => ({
    ...b,
    count: results.filter(r => {
      const p = r.percentage ?? 0;
      return p >= b.range[0] && p < b.range[1];
    }).length,
  }));

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4">
      <h3 className="text-sm font-semibold text-slate-700 mb-4">Score Distribution</h3>
      <ResponsiveContainer width="100%" height={180}>
        <BarChart data={data} barSize={32}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
          <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} allowDecimals={false} />
          <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
          <Bar dataKey="count" name="Count" radius={[4, 4, 0, 0]}>
            {data.map(entry => <Cell key={entry.name} fill={entry.color} />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function SubjectRadar({ results }: { results: TabulationResult[] }) {
  const byType = results.reduce<Record<string, number[]>>((acc, r) => {
    if (r.percentage === null) return acc;
    if (!acc[r.subject_type]) acc[r.subject_type] = [];
    acc[r.subject_type].push(r.percentage);
    return acc;
  }, {});

  const data = Object.entries(byType).map(([type, vals]) => ({
    type: type.charAt(0).toUpperCase() + type.slice(1),
    avg: vals.reduce((a, b) => a + b, 0) / vals.length,
  }));

  if (data.length < 3) return null;

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4">
      <h3 className="text-sm font-semibold text-slate-700 mb-4">Average Score by Subject Type</h3>
      <ResponsiveContainer width="100%" height={200}>
        <RadarChart data={data}>
          <PolarGrid stroke="#e2e8f0" />
          <PolarAngleAxis dataKey="type" tick={{ fontSize: 11, fill: '#64748b' }} />
          <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 9, fill: '#94a3b8' }} />
          <Radar name="Avg Score" dataKey="avg" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.2} />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function ScoreDashboard() {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const { results, loading, error, reload } = useTabulationResults({ limit: 100 });

  const avg = results.length
    ? results.reduce((s, r) => s + (r.percentage ?? 0), 0) / results.length
    : 0;

  const topScore = results.reduce(
    (best, r) => (r.percentage ?? 0) > (best?.percentage ?? -1) ? r : best,
    null as TabulationResult | null
  );

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Score Dashboard</h1>
          <p className="text-sm text-slate-500 mt-0.5">Weighted scores, field breakdowns, and distributions</p>
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
          { label: 'Total Results', value: results.length, icon: BarChart2, color: 'text-blue-600' },
          { label: 'Average Score', value: `${avg.toFixed(0)}%`, icon: TrendingUp, color: 'text-emerald-600' },
          {
            label: 'High Performers',
            value: results.filter(r => (r.percentage ?? 0) >= 80).length,
            icon: CheckCircle2,
            color: 'text-green-600',
          },
          {
            label: 'Needs Attention',
            value: results.filter(r => (r.percentage ?? 0) < 50).length,
            icon: AlertCircle,
            color: 'text-red-600',
          },
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

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700">{error}</div>
      )}

      {/* Charts row */}
      {!loading && results.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <DistributionChart results={results} />
          {results.length >= 3 && <SubjectRadar results={results} />}
        </div>
      )}

      {/* Results grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-white rounded-xl border border-slate-200 p-4 animate-pulse h-32" />
          ))}
        </div>
      ) : results.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
          <Layers className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500 font-medium">No score results yet</p>
          <p className="text-slate-400 text-sm mt-1">Configure tabulation rules and submit forms to generate scores.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {results.map(r => (
            <ResultCard
              key={r.id}
              result={r}
              selected={selectedId === r.id}
              onSelect={() => setSelectedId(selectedId === r.id ? null : r.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

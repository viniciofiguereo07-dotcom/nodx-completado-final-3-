import React, { useState } from 'react';
import {
  Shield, RefreshCw, AlertTriangle, CheckCircle2, AlertCircle,
  XCircle, Zap, Layers, Settings,
} from 'lucide-react';
import { useSemaphoreStatus, useSemaphoreRules } from '../../hooks/useSemaphore';
import type { SemaphoreResult, SemaphoreStatus } from '../../services/SemaphoreEngine';
import { STATUS_COLORS } from '../../services/SemaphoreEngine';

const STATUS_LABELS: Record<SemaphoreStatus, string> = {
  green:    'Operational',
  yellow:   'Watch',
  orange:   'Warning',
  red:      'Alert',
  critical: 'Critical',
};

const STATUS_ICONS: Record<SemaphoreStatus, React.ComponentType<{ className?: string }>> = {
  green:    CheckCircle2,
  yellow:   AlertCircle,
  orange:   AlertTriangle,
  red:      XCircle,
  critical: Zap,
};

function SemaphoreLight({ status }: { status: SemaphoreStatus }) {
  const colors = STATUS_COLORS[status];
  const Icon = STATUS_ICONS[status];

  return (
    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-sm font-medium ${colors.bg} ${colors.text} ${colors.border}`}>
      <span className={`w-2 h-2 rounded-full flex-shrink-0 ${colors.dot} ${status === 'critical' ? 'animate-pulse' : ''}`} />
      <Icon className="w-3.5 h-3.5" />
      <span>{STATUS_LABELS[status]}</span>
    </div>
  );
}

function OverallStatusBanner({ status, summary }: {
  status: SemaphoreStatus;
  summary: Record<SemaphoreStatus, number>;
}) {
  const colors = STATUS_COLORS[status];
  const Icon = STATUS_ICONS[status];
  const total = Object.values(summary).reduce((a, b) => a + b, 0);

  return (
    <div className={`rounded-2xl border-2 p-6 ${colors.bg} ${colors.border}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className={`w-16 h-16 rounded-2xl flex items-center justify-center ${colors.dot}`}>
            <Icon className="w-8 h-8 text-white" />
          </div>
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
              Overall Status
            </div>
            <div className={`text-3xl font-bold ${colors.text}`}>
              {STATUS_LABELS[status]}
            </div>
            <div className="text-sm text-slate-500 mt-0.5">{total} rules evaluated</div>
          </div>
        </div>

        <div className="flex gap-4">
          {((['critical', 'red', 'orange', 'yellow', 'green'] as SemaphoreStatus[])).map(s => {
            const count = summary[s];
            if (count === 0) return null;
            const c = STATUS_COLORS[s];
            return (
              <div key={s} className="text-center">
                <div className={`text-2xl font-bold ${c.text}`}>{count}</div>
                <div className="text-xs text-slate-500 capitalize">{s}</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function ResultRow({ result }: { result: SemaphoreResult }) {
  const colors = STATUS_COLORS[result.status];
  const Icon = STATUS_ICONS[result.status];

  const ruleName = (result.rule as Record<string, unknown> | undefined)?.name as string ?? 'Unknown Rule';
  const ruleType = (result.rule as Record<string, unknown> | undefined)?.rule_type as string ?? '';

  return (
    <div className={`flex items-center gap-4 p-3 rounded-xl border ${colors.bg} ${colors.border}`}>
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${colors.dot}`}>
        <Icon className="w-4 h-4 text-white" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-slate-800 truncate">{ruleName}</div>
        <div className="flex items-center gap-2 mt-0.5">
          {ruleType && (
            <span className="text-xs text-slate-500 capitalize">{ruleType}</span>
          )}
          {result.subject_type && result.subject_type !== 'organization' && (
            <span className="text-xs text-slate-400">· {result.subject_type}</span>
          )}
        </div>
      </div>
      <div className="flex items-center gap-3 flex-shrink-0">
        {result.metric_value !== null && (
          <span className="text-sm font-semibold text-slate-700">
            {result.metric_value.toFixed(1)}
          </span>
        )}
        <SemaphoreLight status={result.status} />
      </div>
      {result.previous_status && result.previous_status !== result.status && (
        <div className="text-xs text-slate-400 flex-shrink-0">
          was {result.previous_status}
        </div>
      )}
    </div>
  );
}

function EmptyRulesGuide() {
  return (
    <div className="bg-white rounded-xl border border-dashed border-slate-300 p-8 text-center">
      <Settings className="w-10 h-10 text-slate-300 mx-auto mb-3" />
      <p className="text-slate-600 font-medium mb-1">No semaphore rules configured</p>
      <p className="text-slate-400 text-sm">
        Create rules to define green/yellow/orange/red/critical thresholds for indicators,
        scores, KPIs, and performance metrics.
      </p>
    </div>
  );
}

export function SemaphoreDashboard() {
  const { latestResults, overallStatus, summary, alerts, byStatus, loading, error, reload } = useSemaphoreStatus();
  const { rules } = useSemaphoreRules();
  const [activeFilter, setActiveFilter] = useState<SemaphoreStatus | 'all'>('all');

  const filtered = activeFilter === 'all'
    ? latestResults
    : latestResults.filter(r => r.status === activeFilter);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Semaphore Dashboard</h1>
          <p className="text-sm text-slate-500 mt-0.5">Traffic-light monitoring across indicators, scores, and KPIs</p>
        </div>
        <button
          onClick={reload}
          className="flex items-center gap-2 px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700">{error}</div>
      )}

      {loading ? (
        <div className="animate-pulse space-y-4">
          <div className="h-32 bg-slate-100 rounded-2xl" />
          <div className="grid grid-cols-3 gap-4">
            {Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-20 bg-slate-100 rounded-xl" />)}
          </div>
        </div>
      ) : rules.length === 0 ? (
        <EmptyRulesGuide />
      ) : (
        <>
          {/* Overall status banner */}
          <OverallStatusBanner status={overallStatus} summary={summary} />

          {/* Alerts section */}
          {alerts.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <AlertTriangle className="w-4 h-4 text-red-500" />
                <h2 className="text-sm font-semibold text-slate-700">Active Alerts ({alerts.length})</h2>
              </div>
              <div className="space-y-2">
                {alerts.map(r => <ResultRow key={r.id} result={r} />)}
              </div>
            </div>
          )}

          {/* Filter tabs */}
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => setActiveFilter('all')}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                activeFilter === 'all'
                  ? 'bg-slate-800 text-white'
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              All ({latestResults.length})
            </button>
            {(['critical', 'red', 'orange', 'yellow', 'green'] as SemaphoreStatus[]).map(s => {
              const count = summary[s];
              if (count === 0) return null;
              const colors = STATUS_COLORS[s];
              return (
                <button
                  key={s}
                  onClick={() => setActiveFilter(s)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all border ${
                    activeFilter === s
                      ? `${colors.bg} ${colors.text} ${colors.border} shadow-sm`
                      : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <span className={`inline-block w-2 h-2 rounded-full mr-1.5 ${colors.dot}`} />
                  {STATUS_LABELS[s]} ({count})
                </button>
              );
            })}
          </div>

          {/* Results */}
          {filtered.length === 0 ? (
            <div className="bg-white rounded-xl border border-slate-200 p-8 text-center">
              <Shield className="w-10 h-10 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500">No results for this filter</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filtered.map(r => <ResultRow key={r.id} result={r} />)}
            </div>
          )}
        </>
      )}
    </div>
  );
}

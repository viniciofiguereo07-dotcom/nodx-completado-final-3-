import { useState, useEffect } from 'react';
import { Activity, Plus, AlertTriangle, CheckCircle2, XCircle, Clock, RefreshCw, ChevronRight, Filter, Lightbulb } from 'lucide-react';
import { useOrg } from '../../contexts/OrgContext';
import { useAuth } from '../../contexts/AuthContext';
import { diagnosticEngine } from '../../services/DiagnosticEngine';
import type { DiagnosticRule, DiagnosticResult, DiagnosticSeverity, RecommendationInstance } from '../../types';

const SEVERITY_CONFIG: Record<DiagnosticSeverity, { label: string; color: string; bg: string; icon: React.ElementType }> = {
  critical: { label: 'Critical', color: 'text-red-700',    bg: 'bg-red-100',    icon: XCircle },
  high:     { label: 'High',     color: 'text-orange-700', bg: 'bg-orange-100', icon: AlertTriangle },
  medium:   { label: 'Medium',   color: 'text-amber-700',  bg: 'bg-amber-100',  icon: AlertTriangle },
  low:      { label: 'Low',      color: 'text-blue-700',   bg: 'bg-blue-100',   icon: Activity },
  info:     { label: 'Info',     color: 'text-gray-600',   bg: 'bg-gray-100',   icon: CheckCircle2 },
};

const STATUS_COLORS: Record<string, string> = {
  open:         'bg-red-100 text-red-700',
  acknowledged: 'bg-amber-100 text-amber-700',
  resolved:     'bg-emerald-100 text-emerald-700',
  dismissed:    'bg-gray-100 text-gray-500',
};

const REC_STATUS_COLORS: Record<string, string> = {
  pending:     'bg-blue-100 text-blue-700',
  in_progress: 'bg-amber-100 text-amber-700',
  completed:   'bg-emerald-100 text-emerald-700',
  dismissed:   'bg-gray-100 text-gray-500',
};

export function DiagnosticsPage() {
  const { org } = useOrg();
  const orgId = org?.id;
  const { user } = useAuth();
  const [rules, setRules]   = useState<DiagnosticRule[]>([]);
  const [results, setResults] = useState<DiagnosticResult[]>([]);
  const [recs, setRecs]     = useState<RecommendationInstance[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab]       = useState<'overview' | 'rules' | 'findings' | 'recommendations'>('overview');
  const [statusFilter, setStatusFilter] = useState<DiagnosticResult['status'] | 'all'>('all');

  useEffect(() => { if (orgId) loadAll(); }, [orgId]);

  async function loadAll() {
    if (!orgId) return;
    setLoading(true);
    const [r, res, rec] = await Promise.allSettled([
      diagnosticEngine.getRules(orgId),
      diagnosticEngine.getResults(orgId),
      diagnosticEngine.getRecommendations(orgId),
    ]);
    if (r.status === 'fulfilled') setRules(r.value);
    if (res.status === 'fulfilled') setResults(res.value);
    if (rec.status === 'fulfilled') setRecs(rec.value);
    setLoading(false);
  }

  async function handleAcknowledge(id: string) {
    if (!user) return;
    await diagnosticEngine.acknowledgeResult(id, user.id);
    setResults(prev => prev.map(r => r.id === id ? { ...r, status: 'acknowledged', acknowledged_by: user.id } : r));
  }

  async function handleResolve(id: string) {
    if (!user) return;
    await diagnosticEngine.resolveResult(id, user.id);
    setResults(prev => prev.map(r => r.id === id ? { ...r, status: 'resolved' } : r));
  }

  async function handleDismiss(id: string) {
    await diagnosticEngine.dismissResult(id);
    setResults(prev => prev.map(r => r.id === id ? { ...r, status: 'dismissed' } : r));
  }

  async function handleRecAction(id: string, status: RecommendationInstance['status']) {
    await diagnosticEngine.updateRecommendation(id, { status });
    setRecs(prev => prev.map(r => r.id === id ? { ...r, status } : r));
  }

  const openResults     = results.filter(r => r.status === 'open');
  const criticalResults = results.filter(r => r.severity === 'critical' || r.severity === 'high');
  const activeRules     = rules.filter(r => r.is_active);
  const pendingRecs     = recs.filter(r => r.status === 'pending' || r.status === 'in_progress');

  const filteredResults = statusFilter === 'all' ? results : results.filter(r => r.status === statusFilter);

  return (
    <div className="p-6 max-w-screen-xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Diagnostics Engine</h1>
          <p className="text-sm text-gray-500 mt-0.5">Rule-based data quality checks, anomaly detection, and recommendations</p>
        </div>
        <div className="flex gap-2">
          <button onClick={loadAll} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
            <RefreshCw size={16} />
          </button>
          <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors">
            <Plus size={14} /> New Rule
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Open Findings',     value: openResults.length,     color: 'text-red-600',    bg: 'bg-red-50',    icon: XCircle },
          { label: 'Critical / High',   value: criticalResults.length, color: 'text-orange-600', bg: 'bg-orange-50', icon: AlertTriangle },
          { label: 'Active Rules',      value: activeRules.length,     color: 'text-blue-600',   bg: 'bg-blue-50',   icon: Activity },
          { label: 'Recommendations',   value: pendingRecs.length,     color: 'text-emerald-600',bg: 'bg-emerald-50',icon: Lightbulb },
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

      {/* Tabs */}
      <div className="flex border-b border-gray-200">
        {(['overview', 'rules', 'findings', 'recommendations'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2.5 text-sm font-medium capitalize transition-colors border-b-2 -mb-px ${tab === t ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
          >
            {t.charAt(0).toUpperCase() + t.slice(1)}
            {t === 'findings' && openResults.length > 0 && (
              <span className="ml-1.5 bg-red-100 text-red-700 text-xs px-1.5 py-0.5 rounded-full">{openResults.length}</span>
            )}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-16 text-gray-400">Loading diagnostic data...</div>
      ) : (
        <>
          {tab === 'overview' && (
            <div className="grid grid-cols-2 gap-6">
              {/* Severity breakdown */}
              <div className="bg-white border border-gray-200 rounded-xl p-5">
                <h3 className="font-semibold text-gray-800 mb-4">Findings by Severity</h3>
                {results.length === 0 ? (
                  <div className="text-center py-8">
                    <CheckCircle2 size={32} className="text-emerald-400 mx-auto mb-2" />
                    <p className="text-gray-500 text-sm">No findings — all checks passing</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {(Object.entries(SEVERITY_CONFIG) as [DiagnosticSeverity, typeof SEVERITY_CONFIG[DiagnosticSeverity]][]).map(([sev, cfg]) => {
                      const count = results.filter(r => r.severity === sev).length;
                      if (count === 0) return null;
                      const Icon = cfg.icon;
                      return (
                        <div key={sev} className="flex items-center gap-3">
                          <div className={`p-1.5 rounded-lg ${cfg.bg}`}>
                            <Icon size={14} className={cfg.color} />
                          </div>
                          <span className="text-sm text-gray-600 flex-1">{cfg.label}</span>
                          <div className="flex-1 bg-gray-100 rounded-full h-2">
                            <div className={`h-full rounded-full ${cfg.bg.replace('bg-', 'bg-').replace('-100', '-400')}`}
                              style={{ width: `${(count / results.length) * 100}%` }} />
                          </div>
                          <span className="text-sm font-bold text-gray-700 w-6 text-right">{count}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Rules by category */}
              <div className="bg-white border border-gray-200 rounded-xl p-5">
                <h3 className="font-semibold text-gray-800 mb-4">Rules by Category</h3>
                {rules.length === 0 ? (
                  <div className="text-center py-8">
                    <Activity size={32} className="text-gray-300 mx-auto mb-2" />
                    <p className="text-gray-500 text-sm">No diagnostic rules configured</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {[...new Set(rules.map(r => r.category))].map(cat => {
                      const count = rules.filter(r => r.category === cat).length;
                      return (
                        <div key={cat} className="flex items-center gap-2 py-1.5">
                          <span className="text-sm text-gray-500 capitalize flex-1">{cat.replace('_', ' ')}</span>
                          <span className="text-sm font-semibold text-gray-700">{count}</span>
                          <div className="w-20 bg-gray-100 rounded-full h-1.5">
                            <div className="h-full bg-blue-400 rounded-full" style={{ width: `${(count / rules.length) * 100}%` }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {tab === 'rules' && (
            <div className="space-y-3">
              {rules.length === 0 ? (
                <div className="text-center py-16 bg-white border border-gray-200 rounded-xl">
                  <Activity size={40} className="text-gray-300 mx-auto mb-3" />
                  <p className="font-medium text-gray-500">No diagnostic rules</p>
                  <p className="text-sm text-gray-400 mt-1">Create rules to monitor data quality automatically</p>
                </div>
              ) : rules.map(rule => {
                const cfg = SEVERITY_CONFIG[rule.severity];
                const Icon = cfg.icon;
                return (
                  <div key={rule.id} className="bg-white border border-gray-200 rounded-xl p-4 flex items-start gap-4">
                    <div className={`p-2 rounded-lg mt-0.5 ${cfg.bg}`}>
                      <Icon size={16} className={cfg.color} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-medium text-gray-800">{rule.name}</h3>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${cfg.bg} ${cfg.color}`}>{cfg.label}</span>
                        <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">{rule.category.replace('_', ' ')}</span>
                        {!rule.is_active && <span className="text-xs bg-gray-100 text-gray-400 px-2 py-0.5 rounded-full">Inactive</span>}
                      </div>
                      {rule.description && <p className="text-sm text-gray-500">{rule.description}</p>}
                      <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
                        <span>Table: <span className="font-mono">{rule.applies_to_table}</span></span>
                        <span>·</span>
                        <span>Runs: {rule.run_frequency.replace('_', ' ')}</span>
                        <span>·</span>
                        <span>Action: {rule.action_type}</span>
                        <span>·</span>
                        <span>{rule.condition_rules.length} conditions</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {tab === 'findings' && (
            <div className="space-y-4">
              {/* Status filter */}
              <div className="flex gap-2">
                {(['all', 'open', 'acknowledged', 'resolved', 'dismissed'] as const).map(s => (
                  <button key={s} onClick={() => setStatusFilter(s)}
                    className={`px-3 py-1.5 text-xs rounded-lg border font-medium capitalize transition-colors ${statusFilter === s ? 'bg-blue-600 border-blue-600 text-white' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                  >
                    {s}
                    {s !== 'all' && results.filter(r => r.status === s).length > 0 && (
                      <span className="ml-1">({results.filter(r => r.status === s).length})</span>
                    )}
                  </button>
                ))}
              </div>

              {filteredResults.length === 0 ? (
                <div className="text-center py-16 bg-white border border-gray-200 rounded-xl">
                  <CheckCircle2 size={40} className="text-emerald-400 mx-auto mb-3" />
                  <p className="font-medium text-gray-500">No findings matching filter</p>
                </div>
              ) : filteredResults.map(result => {
                const cfg = SEVERITY_CONFIG[result.severity];
                const Icon = cfg.icon;
                return (
                  <div key={result.id} className="bg-white border border-gray-200 rounded-xl p-4">
                    <div className="flex items-start gap-3">
                      <div className={`p-2 rounded-lg mt-0.5 ${cfg.bg}`}>
                        <Icon size={15} className={cfg.color} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${cfg.bg} ${cfg.color}`}>{cfg.label}</span>
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[result.status]}`}>{result.status}</span>
                          <span className="text-xs text-gray-400 font-mono">{result.record_type}</span>
                        </div>
                        <p className="text-sm font-medium text-gray-800">{result.finding}</p>
                        {result.recommendation && (
                          <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                            <Lightbulb size={11} className="text-amber-400" />
                            {result.recommendation}
                          </p>
                        )}
                        <p className="text-xs text-gray-400 mt-1.5">{new Date(result.created_at).toLocaleString()}</p>
                      </div>
                      {result.status === 'open' && (
                        <div className="flex gap-1.5">
                          <button onClick={() => handleAcknowledge(result.id)}
                            className="px-2.5 py-1 text-xs border border-amber-200 text-amber-700 rounded-lg hover:bg-amber-50 transition-colors">
                            Acknowledge
                          </button>
                          <button onClick={() => handleResolve(result.id)}
                            className="px-2.5 py-1 text-xs border border-emerald-200 text-emerald-700 rounded-lg hover:bg-emerald-50 transition-colors">
                            Resolve
                          </button>
                          <button onClick={() => handleDismiss(result.id)}
                            className="px-2.5 py-1 text-xs border border-gray-200 text-gray-500 rounded-lg hover:bg-gray-50 transition-colors">
                            Dismiss
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {tab === 'recommendations' && (
            <div className="space-y-3">
              {recs.length === 0 ? (
                <div className="text-center py-16 bg-white border border-gray-200 rounded-xl">
                  <Lightbulb size={40} className="text-gray-300 mx-auto mb-3" />
                  <p className="font-medium text-gray-500">No active recommendations</p>
                  <p className="text-sm text-gray-400 mt-1">Recommendations appear here when diagnostic rules trigger actions</p>
                </div>
              ) : recs.map(rec => (
                <div key={rec.id} className="bg-white border border-gray-200 rounded-xl p-4">
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-amber-50 rounded-lg">
                      <Lightbulb size={16} className="text-amber-600" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-medium text-gray-800">{rec.title}</h3>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${REC_STATUS_COLORS[rec.status]}`}>{rec.status}</span>
                        {rec.due_date && (
                          <span className="text-xs flex items-center gap-1 text-gray-400">
                            <Clock size={11} /> Due {rec.due_date}
                          </span>
                        )}
                      </div>
                      {rec.description && <p className="text-sm text-gray-500">{rec.description}</p>}
                    </div>
                    {rec.status === 'pending' && (
                      <div className="flex gap-1.5">
                        <button onClick={() => handleRecAction(rec.id, 'in_progress')}
                          className="px-2.5 py-1 text-xs border border-blue-200 text-blue-700 rounded-lg hover:bg-blue-50 transition-colors">
                          Start
                        </button>
                        <button onClick={() => handleRecAction(rec.id, 'dismissed')}
                          className="px-2.5 py-1 text-xs border border-gray-200 text-gray-500 rounded-lg hover:bg-gray-50 transition-colors">
                          Dismiss
                        </button>
                      </div>
                    )}
                    {rec.status === 'in_progress' && (
                      <button onClick={() => handleRecAction(rec.id, 'completed')}
                        className="px-2.5 py-1 text-xs border border-emerald-200 text-emerald-700 rounded-lg hover:bg-emerald-50 transition-colors">
                        Complete
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

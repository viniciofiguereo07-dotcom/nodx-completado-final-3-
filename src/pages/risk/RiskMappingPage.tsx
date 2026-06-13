import { useState, useEffect, useCallback } from 'react';
import { AlertTriangle, Plus, Shield, Layers, RefreshCw, Trash2, ChevronDown } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useOrg } from '../../contexts/OrgContext';
import { useAuth } from '../../contexts/AuthContext';
import { PageHeader } from '../../components/common/PageHeader';
import { EmptyState } from '../../components/common/EmptyState';
import { Modal } from '../../components/common/Modal';
import type { RiskLayer, VulnerabilityAssessment } from '../../types';

const RISK_COLORS: Record<number, { bg: string; text: string; border: string }> = {
  1: { bg: 'bg-green-50',   text: 'text-green-700',   border: 'border-green-200' },
  2: { bg: 'bg-lime-50',    text: 'text-lime-700',     border: 'border-lime-200' },
  3: { bg: 'bg-amber-50',   text: 'text-amber-700',    border: 'border-amber-200' },
  4: { bg: 'bg-orange-50',  text: 'text-orange-700',   border: 'border-orange-200' },
  5: { bg: 'bg-red-50',     text: 'text-red-700',      border: 'border-red-200' },
};

const RISK_LABELS: Record<number, string> = {
  1: 'Minimal',
  2: 'Low',
  3: 'Moderate',
  4: 'High',
  5: 'Critical',
};

const HAZARD_TYPES = [
  'flooding', 'landslide', 'drought', 'pollution',
  'contamination', 'fire_risk', 'earthquake', 'disease_outbreak', 'conflict', 'other',
];

const CATEGORIES: Array<{ value: string; label: string; icon: typeof AlertTriangle }> = [
  { value: 'hazard',        label: 'Hazard',        icon: AlertTriangle },
  { value: 'vulnerability', label: 'Vulnerability',  icon: Shield },
  { value: 'exposure',      label: 'Exposure',       icon: Layers },
  { value: 'risk',          label: 'Composite Risk', icon: AlertTriangle },
];

export function RiskMappingPage() {
  const { org } = useOrg();
  const { user } = useAuth();
  const [risks, setRisks] = useState<RiskLayer[]>([]);
  const [vulns, setVulns] = useState<VulnerabilityAssessment[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'layers' | 'vulnerability'>('layers');
  const [showCreateRisk, setShowCreateRisk] = useState(false);
  const [showCreateVuln, setShowCreateVuln] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  const [riskForm, setRiskForm] = useState({
    name: '',
    category: 'hazard',
    hazard_type: 'flooding',
    severity: 3,
    source: '',
    assessment_date: new Date().toISOString().slice(0, 10),
  });

  const [vulnForm, setVulnForm] = useState({
    indicator_name: '',
    indicator_value: '',
    indicator_score: 3,
    assessment_date: new Date().toISOString().slice(0, 10),
    source: '',
  });

  const load = useCallback(async () => {
    if (!org) return;
    const [{ data: r }, { data: v }] = await Promise.all([
      supabase.from('risk_layers').select('*').eq('organization_id', org.id).order('severity', { ascending: false }),
      supabase.from('vulnerability_assessments').select('*').eq('organization_id', org.id).order('created_at', { ascending: false }),
    ]);
    setRisks((r ?? []) as RiskLayer[]);
    setVulns((v ?? []) as VulnerabilityAssessment[]);
    setLoading(false);
  }, [org]);

  useEffect(() => { load(); }, [load]);

  async function handleCreateRisk() {
    if (!org || !user) return;
    setSaving(true);
    await supabase.from('risk_layers').insert({
      organization_id: org.id,
      name: riskForm.name,
      category: riskForm.category,
      hazard_type: riskForm.category === 'hazard' ? riskForm.hazard_type : null,
      severity: riskForm.severity,
      source: riskForm.source || null,
      assessment_date: riskForm.assessment_date || null,
      created_by: user.id,
    });
    setSaving(false);
    setShowCreateRisk(false);
    setRiskForm({ name: '', category: 'hazard', hazard_type: 'flooding', severity: 3, source: '', assessment_date: new Date().toISOString().slice(0, 10) });
    await load();
  }

  async function handleCreateVuln() {
    if (!org || !user) return;
    setSaving(true);
    await supabase.from('vulnerability_assessments').insert({
      organization_id: org.id,
      indicator_name: vulnForm.indicator_name,
      indicator_value: vulnForm.indicator_value ? Number(vulnForm.indicator_value) : null,
      indicator_score: vulnForm.indicator_score,
      assessment_date: vulnForm.assessment_date || null,
      source: vulnForm.source || null,
      created_by: user.id,
    });
    setSaving(false);
    setShowCreateVuln(false);
    setVulnForm({ indicator_name: '', indicator_value: '', indicator_score: 3, assessment_date: new Date().toISOString().slice(0, 10), source: '' });
    await load();
  }

  async function handleDelete(table: 'risk_layers' | 'vulnerability_assessments', id: string) {
    await supabase.from(table).delete().eq('id', id);
    setDeleteTarget(null);
    await load();
  }

  // Compute composite risk score from all layers
  const avgSeverity = risks.length > 0 ? (risks.reduce((s, r) => s + r.severity, 0) / risks.length).toFixed(1) : null;
  const criticalCount = risks.filter(r => r.severity >= 4).length;
  const hazardCount = risks.filter(r => r.category === 'hazard').length;
  const vulnAvg = vulns.length > 0 ? (vulns.reduce((s, v) => s + (v.indicator_score ?? 0), 0) / vulns.length).toFixed(1) : null;

  return (
    <div>
      <PageHeader
        title="Risk Mapping"
        subtitle="Hazard, vulnerability, and exposure assessment framework"
        actions={
          <button onClick={() => activeTab === 'layers' ? setShowCreateRisk(true) : setShowCreateVuln(true)}
            className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white text-sm font-semibold rounded-xl hover:bg-red-700">
            <Plus className="w-4 h-4" /> Add {activeTab === 'layers' ? 'Risk Layer' : 'Indicator'}
          </button>
        }
      />

      {/* Summary KPIs */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Risk Layers', value: String(risks.length), sub: `${hazardCount} hazards`, color: 'text-red-600', bg: 'bg-red-50' },
          { label: 'Avg Severity', value: avgSeverity ?? '—', sub: 'across all layers', color: 'text-orange-600', bg: 'bg-orange-50' },
          { label: 'Critical Zones', value: String(criticalCount), sub: 'severity ≥ 4', color: 'text-red-700', bg: 'bg-red-50' },
          { label: 'Avg Vulnerability', value: vulnAvg ?? '—', sub: `${vulns.length} indicators`, color: 'text-amber-600', bg: 'bg-amber-50' },
        ].map(({ label, value, sub, color, bg }) => (
          <div key={label} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <div className={`text-2xl font-bold ${color} mb-1`}>{value}</div>
            <div className="text-sm font-semibold text-gray-700">{label}</div>
            <div className="text-xs text-gray-400 mt-0.5">{sub}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-4">
        {(['layers', 'vulnerability'] as const).map(t => (
          <button key={t} onClick={() => setActiveTab(t)}
            className={`px-4 py-2 text-sm font-semibold rounded-xl transition-colors capitalize ${activeTab === t ? 'bg-blue-600 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
            {t === 'layers' ? 'Risk Layers' : 'Vulnerability Indicators'}
          </button>
        ))}
      </div>

      {activeTab === 'layers' && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-gray-400">Loading...</div>
          ) : risks.length === 0 ? (
            <EmptyState icon={<AlertTriangle className="w-6 h-6" />} title="No risk layers yet"
              description="Add hazard, vulnerability, and exposure layers to build your risk assessment"
              action={<button onClick={() => setShowCreateRisk(true)} className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white text-sm font-semibold rounded-xl"><Plus className="w-4 h-4" />Add Risk Layer</button>}
            />
          ) : (
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Name</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Category</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Hazard Type</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Severity</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Assessed</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Source</th>
                  <th />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {risks.map(r => {
                  const c = RISK_COLORS[r.severity] ?? RISK_COLORS[3];
                  return (
                    <tr key={r.id} className="hover:bg-gray-50">
                      <td className="px-5 py-3 font-medium text-sm text-gray-900">{r.name}</td>
                      <td className="px-5 py-3">
                        <span className="text-xs font-medium text-gray-600 bg-gray-100 px-2 py-0.5 rounded-full capitalize">{r.category}</span>
                      </td>
                      <td className="px-5 py-3 text-sm text-gray-500 capitalize">{r.hazard_type?.replace(/_/g, ' ') ?? '—'}</td>
                      <td className="px-5 py-3">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold border ${c.bg} ${c.text} ${c.border}`}>
                          <AlertTriangle className="w-3 h-3" />
                          {RISK_LABELS[r.severity]} ({r.severity}/5)
                        </span>
                      </td>
                      <td className="px-5 py-3 text-xs text-gray-400">{r.assessment_date ? new Date(r.assessment_date).toLocaleDateString() : '—'}</td>
                      <td className="px-5 py-3 text-sm text-gray-500">{r.source ?? '—'}</td>
                      <td className="px-5 py-3">
                        <button onClick={() => handleDelete('risk_layers', r.id)} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      )}

      {activeTab === 'vulnerability' && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-gray-400">Loading...</div>
          ) : vulns.length === 0 ? (
            <EmptyState icon={<Shield className="w-6 h-6" />} title="No vulnerability indicators"
              description="Track water access, health, education, livelihood and infrastructure indicators"
              action={<button onClick={() => setShowCreateVuln(true)} className="flex items-center gap-2 px-4 py-2 bg-amber-600 text-white text-sm font-semibold rounded-xl"><Plus className="w-4 h-4" />Add Indicator</button>}
            />
          ) : (
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Indicator</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Value</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Score (1–5)</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Assessed</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Source</th>
                  <th />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {vulns.map(v => {
                  const score = v.indicator_score ?? 3;
                  const c = RISK_COLORS[score] ?? RISK_COLORS[3];
                  return (
                    <tr key={v.id} className="hover:bg-gray-50">
                      <td className="px-5 py-3 font-medium text-sm text-gray-900">{v.indicator_name}</td>
                      <td className="px-5 py-3 text-sm text-gray-600">{v.indicator_value ?? '—'}</td>
                      <td className="px-5 py-3">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold border ${c.bg} ${c.text} ${c.border}`}>
                          {score}/5 — {RISK_LABELS[score]}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-xs text-gray-400">{v.assessment_date ? new Date(v.assessment_date).toLocaleDateString() : '—'}</td>
                      <td className="px-5 py-3 text-sm text-gray-500">{v.source ?? '—'}</td>
                      <td className="px-5 py-3">
                        <button onClick={() => handleDelete('vulnerability_assessments', v.id)} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Create Risk Layer Modal */}
      <Modal open={showCreateRisk} onClose={() => setShowCreateRisk(false)} title="Add Risk Layer"
        footer={
          <div className="flex justify-end gap-3">
            <button onClick={() => setShowCreateRisk(false)} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-xl">Cancel</button>
            <button onClick={handleCreateRisk} disabled={saving || !riskForm.name}
              className="px-4 py-2 text-sm bg-red-600 text-white font-semibold rounded-xl disabled:opacity-50">
              {saving ? 'Saving...' : 'Add Layer'}
            </button>
          </div>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Layer name *</label>
            <input type="text" value={riskForm.name} onChange={e => setRiskForm(p => ({ ...p, name: e.target.value }))}
              placeholder="e.g. Flood Zone — Eastern District"
              className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-500" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
              <select value={riskForm.category} onChange={e => setRiskForm(p => ({ ...p, category: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-500">
                {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </div>
            {riskForm.category === 'hazard' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Hazard type</label>
                <select value={riskForm.hazard_type} onChange={e => setRiskForm(p => ({ ...p, hazard_type: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-500">
                  {HAZARD_TYPES.map(h => <option key={h} value={h}>{h.replace(/_/g, ' ')}</option>)}
                </select>
              </div>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Severity (1 = Minimal, 5 = Critical)</label>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map(s => {
                const c = RISK_COLORS[s];
                return (
                  <button key={s} onClick={() => setRiskForm(p => ({ ...p, severity: s }))}
                    className={`flex-1 py-2.5 rounded-xl text-sm font-bold border-2 transition-all ${riskForm.severity === s ? `${c.bg} ${c.text} ${c.border}` : 'border-gray-200 text-gray-400 hover:bg-gray-50'}`}>
                    {s}
                  </button>
                );
              })}
            </div>
            <div className="text-center text-xs text-gray-500 mt-1">{RISK_LABELS[riskForm.severity]}</div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Assessment date</label>
              <input type="date" value={riskForm.assessment_date} onChange={e => setRiskForm(p => ({ ...p, assessment_date: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Data source</label>
              <input type="text" value={riskForm.source} onChange={e => setRiskForm(p => ({ ...p, source: e.target.value }))}
                placeholder="e.g. Government survey"
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-500" />
            </div>
          </div>
        </div>
      </Modal>

      {/* Create Vulnerability Modal */}
      <Modal open={showCreateVuln} onClose={() => setShowCreateVuln(false)} title="Add Vulnerability Indicator"
        footer={
          <div className="flex justify-end gap-3">
            <button onClick={() => setShowCreateVuln(false)} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-xl">Cancel</button>
            <button onClick={handleCreateVuln} disabled={saving || !vulnForm.indicator_name}
              className="px-4 py-2 text-sm bg-amber-600 text-white font-semibold rounded-xl disabled:opacity-50">
              {saving ? 'Saving...' : 'Add Indicator'}
            </button>
          </div>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Indicator name *</label>
            <input type="text" value={vulnForm.indicator_name} onChange={e => setVulnForm(p => ({ ...p, indicator_name: e.target.value }))}
              placeholder="e.g. % HH with safe water access"
              className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Measured value</label>
              <input type="number" value={vulnForm.indicator_value} onChange={e => setVulnForm(p => ({ ...p, indicator_value: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Score (1–5)</label>
              <select value={vulnForm.indicator_score} onChange={e => setVulnForm(p => ({ ...p, indicator_score: +e.target.value }))}
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500">
                {[1, 2, 3, 4, 5].map(s => <option key={s} value={s}>{s} — {RISK_LABELS[s]}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Assessment date</label>
              <input type="date" value={vulnForm.assessment_date} onChange={e => setVulnForm(p => ({ ...p, assessment_date: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Source</label>
              <input type="text" value={vulnForm.source} onChange={e => setVulnForm(p => ({ ...p, source: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500" />
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
}

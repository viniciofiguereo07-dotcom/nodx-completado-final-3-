import { useState, useEffect, useCallback } from 'react';
import {
  Droplets, Plus, RefreshCw, CheckCircle2, XCircle, AlertTriangle,
  MapPin, ChevronLeft, ChevronRight, X, Wrench,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useOrg } from '../../contexts/OrgContext';
import { PageHeader } from '../../components/common/PageHeader';
import { Modal } from '../../components/common/Modal';
import { EmptyState } from '../../components/common/EmptyState';
import type { WashWaterPoint, WashSanitationFacility } from '../../types';

type Tab = 'water_points' | 'sanitation';

const WATER_STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  functional: { label: 'Functional', color: 'text-emerald-700 bg-emerald-50', icon: CheckCircle2 },
  non_functional: { label: 'Non-Functional', color: 'text-red-700 bg-red-50', icon: XCircle },
  needs_repair: { label: 'Needs Repair', color: 'text-amber-700 bg-amber-50', icon: Wrench },
  decommissioned: { label: 'Decommissioned', color: 'text-gray-600 bg-gray-100', icon: XCircle },
};

const WATER_TYPES: Record<string, string> = {
  borehole: 'Borehole',
  spring: 'Spring',
  piped: 'Piped',
  surface: 'Surface Water',
  rainwater: 'Rainwater Collection',
  other: 'Other',
};

const SANITATION_TYPES: Record<string, string> = {
  latrine: 'Latrine',
  toilet: 'Toilet',
  slab: 'Slab',
  open_defecation_free: 'ODF Zone',
  other: 'Other',
};

const QUALITY_LABELS: Record<number, { label: string; color: string }> = {
  1: { label: 'Critical', color: 'text-red-600' },
  2: { label: 'Poor', color: 'text-orange-600' },
  3: { label: 'Fair', color: 'text-amber-600' },
  4: { label: 'Good', color: 'text-lime-600' },
  5: { label: 'Excellent', color: 'text-emerald-600' },
};

const PAGE_SIZE = 12;

interface WaterForm {
  name: string;
  type: string;
  status: string;
  lat: string;
  lng: string;
  population_served: string;
  water_quality_score: string;
  chlorine_residual_mgl: string;
  turbidity_ntu: string;
}

interface SanitationForm {
  name: string;
  facility_type: string;
  status: string;
  lat: string;
  lng: string;
  households_served: string;
  has_handwashing: boolean;
}

const emptyWaterForm: WaterForm = {
  name: '', type: '', status: 'functional', lat: '', lng: '',
  population_served: '', water_quality_score: '', chlorine_residual_mgl: '', turbidity_ntu: '',
};

const emptySanitationForm: SanitationForm = {
  name: '', facility_type: '', status: 'functional', lat: '', lng: '',
  households_served: '', has_handwashing: false,
};

export function WASHPage() {
  const { org } = useOrg();
  const [tab, setTab] = useState<Tab>('water_points');
  const [waterPoints, setWaterPoints] = useState<WashWaterPoint[]>([]);
  const [sanitation, setSanitation] = useState<WashSanitationFacility[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedItem, setSelectedItem] = useState<WashWaterPoint | WashSanitationFacility | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [waterForm, setWaterForm] = useState<WaterForm>(emptyWaterForm);
  const [sanitationForm, setSanitationForm] = useState<SanitationForm>(emptySanitationForm);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!org) return;
    setLoading(true);
    const table = tab === 'water_points' ? 'wash_water_points' : 'wash_sanitation_facilities';

    let query = supabase
      .from(table)
      .select('*', { count: 'exact' })
      .eq('organization_id', org.id)
      .order('created_at', { ascending: false })
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

    if (statusFilter !== 'all') query = query.eq('status', statusFilter);

    const { data, count } = await query;
    if (tab === 'water_points') {
      setWaterPoints((data ?? []) as unknown as WashWaterPoint[]);
    } else {
      setSanitation((data ?? []) as unknown as WashSanitationFacility[]);
    }
    setTotal(count ?? 0);
    setLoading(false);
  }, [org, tab, page, statusFilter]);

  useEffect(() => { load(); }, [load]);

  const currentItems = tab === 'water_points' ? waterPoints : sanitation;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const functionalCount = currentItems.filter(i => i.status === 'functional').length;
  const needsRepairCount = currentItems.filter(i => i.status === 'needs_repair').length;
  const nonFunctionalCount = currentItems.filter(i => i.status === 'non_functional').length;
  const totalPop = tab === 'water_points'
    ? (waterPoints as WashWaterPoint[]).reduce((s, w) => s + (w.population_served ?? 0), 0)
    : (sanitation as WashSanitationFacility[]).reduce((s, f) => s + (f.households_served ?? 0), 0);

  async function handleCreateWater() {
    if (!org) return;
    setSaving(true);
    await supabase.from('wash_water_points').insert({
      organization_id: org.id,
      name: waterForm.name,
      type: waterForm.type || null,
      status: waterForm.status || 'functional',
      lat: waterForm.lat ? parseFloat(waterForm.lat) : null,
      lng: waterForm.lng ? parseFloat(waterForm.lng) : null,
      population_served: waterForm.population_served ? parseInt(waterForm.population_served) : null,
      water_quality_score: waterForm.water_quality_score ? parseInt(waterForm.water_quality_score) : null,
      chlorine_residual_mgl: waterForm.chlorine_residual_mgl ? parseFloat(waterForm.chlorine_residual_mgl) : null,
      turbidity_ntu: waterForm.turbidity_ntu ? parseFloat(waterForm.turbidity_ntu) : null,
    });
    setSaving(false);
    setShowCreate(false);
    setWaterForm(emptyWaterForm);
    await load();
  }

  async function handleCreateSanitation() {
    if (!org) return;
    setSaving(true);
    await supabase.from('wash_sanitation_facilities').insert({
      organization_id: org.id,
      name: sanitationForm.name,
      type: sanitationForm.facility_type || null,
      status: sanitationForm.status || 'functional',
      lat: sanitationForm.lat ? parseFloat(sanitationForm.lat) : null,
      lng: sanitationForm.lng ? parseFloat(sanitationForm.lng) : null,
      population_served: sanitationForm.households_served ? parseInt(sanitationForm.households_served) : null,
    });
    setSaving(false);
    setShowCreate(false);
    setSanitationForm(emptySanitationForm);
    await load();
  }

  return (
    <div>
      <PageHeader
        title="WASH"
        subtitle="Water, Sanitation and Hygiene facility management"
        actions={
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700"
          >
            <Plus className="w-4 h-4" /> Add Facility
          </button>
        }
      />

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[
          { label: tab === 'water_points' ? 'Water Points' : 'Sanitation Facilities', value: total, color: 'text-blue-600', bg: 'bg-blue-50', icon: Droplets },
          { label: 'Functional', value: functionalCount, color: 'text-emerald-600', bg: 'bg-emerald-50', icon: CheckCircle2 },
          { label: 'Needs Repair', value: needsRepairCount, color: 'text-amber-600', bg: 'bg-amber-50', icon: AlertTriangle },
          { label: tab === 'water_points' ? 'Pop. Served' : 'HH Served', value: totalPop.toLocaleString(), color: 'text-teal-600', bg: 'bg-teal-50', icon: MapPin },
        ].map(kpi => {
          const Icon = kpi.icon;
          return (
            <div key={kpi.label} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${kpi.bg}`}>
                  <Icon className={`w-4 h-4 ${kpi.color}`} />
                </div>
                <span className="text-xs text-gray-500">{kpi.label}</span>
              </div>
              <div className={`text-2xl font-bold ${kpi.color}`}>{kpi.value}</div>
            </div>
          );
        })}
      </div>

      {/* Tabs + Filters */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 mb-4">
        <div className="flex items-center gap-4 mb-3">
          {(['water_points', 'sanitation'] as const).map(t => (
            <button
              key={t}
              onClick={() => { setTab(t); setPage(0); setStatusFilter('all'); }}
              className={`px-4 py-2 text-sm font-medium rounded-xl transition-colors ${tab === t ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-100'}`}
            >
              {t === 'water_points' ? 'Water Points' : 'Sanitation Facilities'}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-3">
          <select
            value={statusFilter}
            onChange={e => { setStatusFilter(e.target.value); setPage(0); }}
            className="px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Status</option>
            {Object.entries(WATER_STATUS_CONFIG).map(([k, v]) => (
              <option key={k} value={k}>{v.label}</option>
            ))}
          </select>
          <button onClick={load} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg">
            <RefreshCw size={16} />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="text-center py-16 text-gray-400">Loading {tab === 'water_points' ? 'water points' : 'sanitation facilities'}...</div>
        ) : currentItems.length === 0 ? (
          <EmptyState
            icon={<Droplets className="w-6 h-6" />}
            title={tab === 'water_points' ? 'No water points recorded' : 'No sanitation facilities recorded'}
            description="Add WASH infrastructure to start tracking water and sanitation coverage"
            action={
              <button
                onClick={() => setShowCreate(true)}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-xl"
              >
                <Plus className="w-4 h-4" /> Add Facility
              </button>
            }
          />
        ) : (
          <>
            {tab === 'water_points' ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-100">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Name</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Type</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Status</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Quality</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Pop. Served</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Location</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {(waterPoints as WashWaterPoint[]).map(wp => {
                      const statusCfg = WATER_STATUS_CONFIG[wp.status] ?? WATER_STATUS_CONFIG.functional;
                      const StatusIcon = statusCfg.icon;
                      const qualityCfg = wp.water_quality_score ? QUALITY_LABELS[wp.water_quality_score] : null;
                      return (
                        <tr key={wp.id} className="hover:bg-gray-50/50 cursor-pointer" onClick={() => setSelectedItem(wp)}>
                          <td className="px-4 py-3 font-medium text-gray-800">{wp.name}</td>
                          <td className="px-4 py-3 text-gray-500">{wp.type ? WATER_TYPES[wp.type] ?? wp.type : '—'}</td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2 py-0.5 rounded-full ${statusCfg.color}`}>
                              <StatusIcon size={11} /> {statusCfg.label}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            {qualityCfg ? (
                              <div className="flex items-center gap-1.5">
                                <div className="flex gap-0.5">
                                  {[1, 2, 3, 4, 5].map(n => (
                                    <div
                                      key={n}
                                      className={`w-2 h-2 rounded-sm ${(wp.water_quality_score ?? 0) >= n ? 'bg-blue-500' : 'bg-gray-200'}`}
                                    />
                                  ))}
                                </div>
                                <span className={`text-xs font-medium ${qualityCfg.color}`}>{qualityCfg.label}</span>
                              </div>
                            ) : '—'}
                          </td>
                          <td className="px-4 py-3 text-gray-500">
                            {wp.population_served?.toLocaleString() ?? '—'}
                          </td>
                          <td className="px-4 py-3 text-gray-400 text-xs">
                            {wp.lat && wp.lng ? `${wp.lat.toFixed(4)}, ${wp.lng.toFixed(4)}` : '—'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-100">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Name</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Type</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Status</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">HH Served</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Handwashing</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Location</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {(sanitation as WashSanitationFacility[]).map(sf => {
                      const statusCfg = WATER_STATUS_CONFIG[sf.status] ?? WATER_STATUS_CONFIG.functional;
                      const StatusIcon = statusCfg.icon;
                      return (
                        <tr key={sf.id} className="hover:bg-gray-50/50 cursor-pointer" onClick={() => setSelectedItem(sf)}>
                          <td className="px-4 py-3 font-medium text-gray-800">{sf.name}</td>
                          <td className="px-4 py-3 text-gray-500">
                            {sf.facility_type ? SANITATION_TYPES[sf.facility_type] ?? sf.facility_type : '—'}
                          </td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2 py-0.5 rounded-full ${statusCfg.color}`}>
                              <StatusIcon size={11} /> {statusCfg.label}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-gray-500">
                            {sf.households_served?.toLocaleString() ?? '—'}
                          </td>
                          <td className="px-4 py-3">
                            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${sf.has_handwashing ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>
                              {sf.has_handwashing ? 'Yes' : 'No'}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-gray-400 text-xs">
                            {sf.lat && sf.lng ? `${sf.lat.toFixed(4)}, ${sf.lng.toFixed(4)}` : '—'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {totalPages > 1 && (
              <div className="px-5 py-3 border-t border-gray-100 flex items-center justify-between">
                <span className="text-xs text-gray-400">
                  {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, total)} of {total}
                </span>
                <div className="flex gap-1">
                  <button
                    onClick={() => setPage(p => Math.max(0, p - 1))}
                    disabled={page === 0}
                    className="p-1.5 rounded-lg border border-gray-200 disabled:opacity-40 hover:bg-gray-50"
                  >
                    <ChevronLeft size={14} />
                  </button>
                  <button
                    onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                    disabled={page >= totalPages - 1}
                    className="p-1.5 rounded-lg border border-gray-200 disabled:opacity-40 hover:bg-gray-50"
                  >
                    <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Detail Drawer */}
      {selectedItem && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/30" onClick={() => setSelectedItem(null)} />
          <div className="relative bg-white w-full max-w-sm shadow-2xl overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-100 px-5 py-4 flex items-center justify-between">
              <h2 className="font-bold text-gray-900">{selectedItem.name}</h2>
              <button onClick={() => setSelectedItem(null)} className="p-2 text-gray-400 hover:text-gray-600 rounded-lg">
                <X size={18} />
              </button>
            </div>
            <div className="p-5 space-y-4">
              {(() => {
                const statusCfg = WATER_STATUS_CONFIG[selectedItem.status] ?? WATER_STATUS_CONFIG.functional;
                const StatusIcon = statusCfg.icon;
                return (
                  <span className={`inline-flex items-center gap-1.5 text-sm font-medium px-3 py-1 rounded-full ${statusCfg.color}`}>
                    <StatusIcon size={14} /> {statusCfg.label}
                  </span>
                );
              })()}

              <div className="grid grid-cols-2 gap-3">
                {(() => {
                  const items = tab === 'water_points' ? (() => {
                    const wp = selectedItem as WashWaterPoint;
                    return [
                      { label: 'Type', value: wp.type ? WATER_TYPES[wp.type] : '—' },
                      { label: 'Population Served', value: wp.population_served?.toLocaleString() ?? '—' },
                      { label: 'Water Quality', value: wp.water_quality_score ? `${wp.water_quality_score}/5 — ${QUALITY_LABELS[wp.water_quality_score]?.label}` : '—' },
                      { label: 'Chlorine (mg/L)', value: wp.chlorine_residual_mgl?.toString() ?? '—' },
                      { label: 'Turbidity (NTU)', value: wp.turbidity_ntu?.toString() ?? '—' },
                      { label: 'Last Tested', value: wp.last_tested_at ? new Date(wp.last_tested_at).toLocaleDateString() : '—' },
                    ];
                  })() : (() => {
                    const sf = selectedItem as WashSanitationFacility;
                    return [
                      { label: 'Facility Type', value: sf.facility_type ? SANITATION_TYPES[sf.facility_type] : '—' },
                      { label: 'HH Served', value: sf.households_served?.toLocaleString() ?? '—' },
                      { label: 'Handwashing Station', value: sf.has_handwashing ? 'Yes' : 'No' },
                      { label: 'Last Cleaned', value: sf.last_cleaned_at ? new Date(sf.last_cleaned_at).toLocaleDateString() : '—' },
                    ];
                  })();
                  return items.map(item => (
                    <div key={item.label} className="bg-gray-50 rounded-xl p-3">
                      <div className="text-xs text-gray-400 mb-1">{item.label}</div>
                      <div className="text-sm font-medium text-gray-800">{item.value}</div>
                    </div>
                  ));
                })()}
              </div>

              {(selectedItem.lat !== null && selectedItem.lng !== null) && (
                <div>
                  <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Coordinates</div>
                  <div className="flex items-center gap-2 bg-gray-50 rounded-xl p-3">
                    <MapPin size={14} className="text-gray-400" />
                    <span className="font-mono text-sm text-gray-600">
                      {selectedItem.lat?.toFixed(6)}, {selectedItem.lng?.toFixed(6)}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Create Modal */}
      <Modal
        open={showCreate}
        onClose={() => { setShowCreate(false); setWaterForm(emptyWaterForm); setSanitationForm(emptySanitationForm); }}
        title={tab === 'water_points' ? 'Add Water Point' : 'Add Sanitation Facility'}
        size="lg"
        footer={
          <div className="flex justify-end gap-3">
            <button
              onClick={() => { setShowCreate(false); setWaterForm(emptyWaterForm); setSanitationForm(emptySanitationForm); }}
              className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-xl"
            >
              Cancel
            </button>
            <button
              onClick={tab === 'water_points' ? handleCreateWater : handleCreateSanitation}
              disabled={saving || !(tab === 'water_points' ? waterForm.name : sanitationForm.name)}
              className="px-4 py-2 text-sm bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Add Facility'}
            </button>
          </div>
        }
      >
        {tab === 'water_points' ? (
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
              <input
                type="text"
                value={waterForm.name}
                onChange={e => setWaterForm(p => ({ ...p, name: e.target.value }))}
                placeholder="e.g. Borehole #3 — Northern Sector"
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
              <select
                value={waterForm.type}
                onChange={e => setWaterForm(p => ({ ...p, type: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">— Select —</option>
                {Object.entries(WATER_TYPES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select
                value={waterForm.status}
                onChange={e => setWaterForm(p => ({ ...p, status: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {Object.entries(WATER_STATUS_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Population Served</label>
              <input
                type="number"
                min="0"
                value={waterForm.population_served}
                onChange={e => setWaterForm(p => ({ ...p, population_served: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Water Quality (1–5)</label>
              <select
                value={waterForm.water_quality_score}
                onChange={e => setWaterForm(p => ({ ...p, water_quality_score: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">— Select —</option>
                {[1, 2, 3, 4, 5].map(n => <option key={n} value={n}>{n} — {QUALITY_LABELS[n].label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Chlorine Residual (mg/L)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={waterForm.chlorine_residual_mgl}
                onChange={e => setWaterForm(p => ({ ...p, chlorine_residual_mgl: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Turbidity (NTU)</label>
              <input
                type="number"
                step="0.1"
                min="0"
                value={waterForm.turbidity_ntu}
                onChange={e => setWaterForm(p => ({ ...p, turbidity_ntu: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Latitude</label>
              <input
                type="number"
                step="0.000001"
                value={waterForm.lat}
                onChange={e => setWaterForm(p => ({ ...p, lat: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Longitude</label>
              <input
                type="number"
                step="0.000001"
                value={waterForm.lng}
                onChange={e => setWaterForm(p => ({ ...p, lng: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
              <input
                type="text"
                value={sanitationForm.name}
                onChange={e => setSanitationForm(p => ({ ...p, name: e.target.value }))}
                placeholder="e.g. Communal Latrine Block A"
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Facility Type</label>
              <select
                value={sanitationForm.facility_type}
                onChange={e => setSanitationForm(p => ({ ...p, facility_type: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">— Select —</option>
                {Object.entries(SANITATION_TYPES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select
                value={sanitationForm.status}
                onChange={e => setSanitationForm(p => ({ ...p, status: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {Object.entries(WATER_STATUS_CONFIG).slice(0, 3).map(([k, v]) => (
                  <option key={k} value={k}>{v.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Households Served</label>
              <input
                type="number"
                min="0"
                value={sanitationForm.households_served}
                onChange={e => setSanitationForm(p => ({ ...p, households_served: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex items-center gap-3 col-span-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <div
                  onClick={() => setSanitationForm(p => ({ ...p, has_handwashing: !p.has_handwashing }))}
                  className={`w-10 h-6 rounded-full transition-colors flex items-center px-0.5 cursor-pointer ${sanitationForm.has_handwashing ? 'bg-blue-600' : 'bg-gray-200'}`}
                >
                  <div className={`w-5 h-5 bg-white rounded-full shadow transition-transform ${sanitationForm.has_handwashing ? 'translate-x-4' : ''}`} />
                </div>
                <span className="text-sm text-gray-700">Has Handwashing Station</span>
              </label>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Latitude</label>
              <input
                type="number"
                step="0.000001"
                value={sanitationForm.lat}
                onChange={e => setSanitationForm(p => ({ ...p, lat: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Longitude</label>
              <input
                type="number"
                step="0.000001"
                value={sanitationForm.lng}
                onChange={e => setSanitationForm(p => ({ ...p, lng: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

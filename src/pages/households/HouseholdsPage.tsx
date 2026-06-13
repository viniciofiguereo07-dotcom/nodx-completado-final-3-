import { useState, useEffect, useCallback } from 'react';
import {
  Home, Plus, Search, RefreshCw, Users, MapPin, AlertTriangle,
  Filter, ChevronLeft, ChevronRight, Eye, X,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useOrg } from '../../contexts/OrgContext';
import { PageHeader } from '../../components/common/PageHeader';
import { StatusBadge } from '../../components/common/StatusBadge';
import { Modal } from '../../components/common/Modal';
import { EmptyState } from '../../components/common/EmptyState';
import type { Household } from '../../types';

const DISPLACEMENT_LABELS: Record<string, string> = {
  resident: 'Resident',
  idp: 'IDP',
  returnee: 'Returnee',
  refugee: 'Refugee',
  unknown: 'Unknown',
};

const DISPLACEMENT_COLORS: Record<string, string> = {
  resident: 'bg-emerald-100 text-emerald-700',
  idp: 'bg-red-100 text-red-700',
  returnee: 'bg-blue-100 text-blue-700',
  refugee: 'bg-amber-100 text-amber-700',
  unknown: 'bg-gray-100 text-gray-500',
};

const PAGE_SIZE = 15;

interface FormState {
  household_id: string;
  head_of_household: string;
  head_sex: 'male' | 'female' | 'other' | '';
  household_size: string;
  displacement_status: 'resident' | 'idp' | 'returnee' | 'refugee' | 'unknown' | '';
  address: string;
  lat: string;
  lng: string;
}

const emptyForm: FormState = {
  household_id: '',
  head_of_household: '',
  head_sex: '',
  household_size: '',
  displacement_status: '',
  address: '',
  lat: '',
  lng: '',
};

export function HouseholdsPage() {
  const { org } = useOrg();
  const [households, setHouseholds] = useState<Household[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedHH, setSelectedHH] = useState<Household | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState(false);

  const stats = {
    total: total,
    idp: households.filter(h => h.displacement_status === 'idp').length,
    refugees: households.filter(h => h.displacement_status === 'refugee').length,
    avgSize: households.length > 0
      ? (households.reduce((s, h) => s + (h.household_size ?? 0), 0) / households.length).toFixed(1)
      : '—',
  };

  const load = useCallback(async () => {
    if (!org) return;
    setLoading(true);

    let query = supabase
      .from('households')
      .select('*', { count: 'exact' })
      .eq('organization_id', org.id)
      .order('created_at', { ascending: false })
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

    if (search.trim()) {
      query = query.or(
        `head_of_household.ilike.%${search}%,household_id.ilike.%${search}%,address.ilike.%${search}%`
      );
    }
    if (statusFilter !== 'all') {
      query = query.eq('displacement_status', statusFilter);
    }

    const { data, count } = await query;
    setHouseholds((data ?? []) as unknown as Household[]);
    setTotal(count ?? 0);
    setLoading(false);
  }, [org, page, search, statusFilter]);

  useEffect(() => { load(); }, [load]);

  async function handleCreate() {
    if (!org) return;
    setSaving(true);
    const payload: Record<string, unknown> = {
      organization_id: org.id,
      household_id: form.household_id || null,
      head_of_household: form.head_of_household || null,
      head_sex: form.head_sex || null,
      household_size: form.household_size ? parseInt(form.household_size) : null,
      displacement_status: form.displacement_status || null,
      address: form.address || null,
      lat: form.lat ? parseFloat(form.lat) : null,
      lng: form.lng ? parseFloat(form.lng) : null,
    };
    await supabase.from('households').insert(payload);
    setSaving(false);
    setShowCreate(false);
    setForm(emptyForm);
    await load();
  }

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div>
      <PageHeader
        title="Households"
        subtitle="Humanitarian household registry and population tracking"
        actions={
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4" /> Register Household
          </button>
        }
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Total Households', value: total, color: 'text-blue-600', bg: 'bg-blue-50', icon: Home },
          { label: 'IDPs', value: stats.idp, color: 'text-red-600', bg: 'bg-red-50', icon: AlertTriangle },
          { label: 'Refugees', value: stats.refugees, color: 'text-amber-600', bg: 'bg-amber-50', icon: Users },
          { label: 'Avg. Size', value: stats.avgSize, color: 'text-emerald-600', bg: 'bg-emerald-50', icon: Users },
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

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 mb-4 flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search by name, ID or address..."
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(0); }}
            className="w-full pl-8 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <select
          value={statusFilter}
          onChange={e => { setStatusFilter(e.target.value); setPage(0); }}
          className="px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="all">All Status</option>
          {Object.entries(DISPLACEMENT_LABELS).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
        <button onClick={load} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg">
          <RefreshCw size={16} />
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="text-center py-16 text-gray-400">Loading households...</div>
        ) : households.length === 0 ? (
          <EmptyState
            icon={<Home className="w-6 h-6" />}
            title="No households registered"
            description="Register your first household to start tracking humanitarian data"
            action={
              <button
                onClick={() => setShowCreate(true)}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-xl"
              >
                <Plus className="w-4 h-4" /> Register Household
              </button>
            }
          />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">ID</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Head of Household</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Size</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Displacement</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Location</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Registered</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {households.map(hh => (
                    <tr key={hh.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-4 py-3 font-mono text-xs text-gray-500">
                        {hh.household_id ?? hh.id.slice(0, 8)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-gray-800">{hh.head_of_household ?? '—'}</div>
                        {hh.head_sex && (
                          <span className="text-xs text-gray-400 capitalize">{hh.head_sex}</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-semibold text-gray-800">{hh.household_size ?? '—'}</span>
                        {hh.household_size && <span className="text-xs text-gray-400 ml-1">members</span>}
                      </td>
                      <td className="px-4 py-3">
                        {hh.displacement_status ? (
                          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${DISPLACEMENT_COLORS[hh.displacement_status] ?? 'bg-gray-100 text-gray-500'}`}>
                            {DISPLACEMENT_LABELS[hh.displacement_status] ?? hh.displacement_status}
                          </span>
                        ) : '—'}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500 max-w-xs truncate">
                        {hh.address ?? (hh.lat && hh.lng ? `${hh.lat.toFixed(4)}, ${hh.lng.toFixed(4)}` : '—')}
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-400">
                        {new Date(hh.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => setSelectedHH(hh)}
                          className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        >
                          <Eye size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
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
      {selectedHH && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/30" onClick={() => setSelectedHH(null)} />
          <div className="relative bg-white w-full max-w-md shadow-2xl overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between z-10">
              <h2 className="font-bold text-gray-900">Household Detail</h2>
              <button onClick={() => setSelectedHH(null)} className="p-2 text-gray-400 hover:text-gray-600 rounded-lg">
                <X size={18} />
              </button>
            </div>
            <div className="p-6 space-y-5">
              <div className="bg-blue-50 rounded-xl p-4">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                    <Home size={18} className="text-blue-600" />
                  </div>
                  <div>
                    <div className="font-bold text-gray-900">{selectedHH.head_of_household ?? 'Unnamed Household'}</div>
                    <div className="text-xs text-gray-500">ID: {selectedHH.household_id ?? selectedHH.id.slice(0, 12)}</div>
                  </div>
                </div>
                {selectedHH.displacement_status && (
                  <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${DISPLACEMENT_COLORS[selectedHH.displacement_status] ?? 'bg-gray-100 text-gray-500'}`}>
                    {DISPLACEMENT_LABELS[selectedHH.displacement_status]}
                  </span>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: 'Household Size', value: selectedHH.household_size ? `${selectedHH.household_size} members` : '—' },
                  { label: 'Head Sex', value: selectedHH.head_sex ? selectedHH.head_sex.charAt(0).toUpperCase() + selectedHH.head_sex.slice(1) : '—' },
                  { label: 'Registration Date', value: selectedHH.registration_date ?? new Date(selectedHH.created_at).toLocaleDateString() },
                  { label: 'Last Updated', value: new Date(selectedHH.updated_at).toLocaleDateString() },
                ].map(item => (
                  <div key={item.label} className="bg-gray-50 rounded-xl p-3">
                    <div className="text-xs text-gray-400 mb-1">{item.label}</div>
                    <div className="text-sm font-medium text-gray-800">{item.value}</div>
                  </div>
                ))}
              </div>

              {selectedHH.address && (
                <div>
                  <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Address</div>
                  <div className="flex items-start gap-2 bg-gray-50 rounded-xl p-3">
                    <MapPin size={14} className="text-gray-400 mt-0.5 flex-shrink-0" />
                    <span className="text-sm text-gray-700">{selectedHH.address}</span>
                  </div>
                </div>
              )}

              {(selectedHH.lat !== null && selectedHH.lng !== null) && (
                <div>
                  <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">GPS Coordinates</div>
                  <div className="bg-gray-50 rounded-xl p-3 font-mono text-sm text-gray-600">
                    {selectedHH.lat?.toFixed(6)}, {selectedHH.lng?.toFixed(6)}
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
        onClose={() => { setShowCreate(false); setForm(emptyForm); }}
        title="Register Household"
        size="lg"
        footer={
          <div className="flex justify-end gap-3">
            <button onClick={() => { setShowCreate(false); setForm(emptyForm); }} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-xl">
              Cancel
            </button>
            <button
              onClick={handleCreate}
              disabled={saving}
              className="px-4 py-2 text-sm bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Register'}
            </button>
          </div>
        }
      >
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Household ID</label>
            <input
              type="text"
              value={form.household_id}
              onChange={e => setForm(p => ({ ...p, household_id: e.target.value }))}
              placeholder="e.g. HH-001"
              className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Head of Household</label>
            <input
              type="text"
              value={form.head_of_household}
              onChange={e => setForm(p => ({ ...p, head_of_household: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Head Sex</label>
            <select
              value={form.head_sex}
              onChange={e => setForm(p => ({ ...p, head_sex: e.target.value as FormState['head_sex'] }))}
              className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">— Select —</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Household Size</label>
            <input
              type="number"
              min="1"
              value={form.household_size}
              onChange={e => setForm(p => ({ ...p, household_size: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Displacement Status</label>
            <select
              value={form.displacement_status}
              onChange={e => setForm(p => ({ ...p, displacement_status: e.target.value as FormState['displacement_status'] }))}
              className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">— Select —</option>
              {Object.entries(DISPLACEMENT_LABELS).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
            <input
              type="text"
              value={form.address}
              onChange={e => setForm(p => ({ ...p, address: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Latitude</label>
            <input
              type="number"
              step="0.000001"
              value={form.lat}
              onChange={e => setForm(p => ({ ...p, lat: e.target.value }))}
              placeholder="e.g. 18.4861"
              className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Longitude</label>
            <input
              type="number"
              step="0.000001"
              value={form.lng}
              onChange={e => setForm(p => ({ ...p, lng: e.target.value }))}
              placeholder="e.g. -69.9312"
              className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      </Modal>
    </div>
  );
}

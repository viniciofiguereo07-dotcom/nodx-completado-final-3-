import { useState, useEffect, useCallback } from 'react';
import { CalendarCheck, Plus, MapPin, Clock, AlertCircle, Trash2, Edit2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useOrg } from '../../contexts/OrgContext';
import { PageHeader } from '../../components/common/PageHeader';
import { StatusBadge } from '../../components/common/StatusBadge';
import { EmptyState } from '../../components/common/EmptyState';
import { Modal } from '../../components/common/Modal';
import type { Visit } from '../../types';

export function VisitsPage() {
  const { org } = useOrg();
  const [visits, setVisits] = useState<Visit[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ address: '', status: 'scheduled', notes: '' });

  const load = useCallback(async () => {
    if (!org) return;
    const { data } = await supabase.from('visits').select('*').eq('organization_id', org.id).order('created_at', { ascending: false }).limit(50);
    setVisits((data ?? []) as Visit[]);
    setLoading(false);
  }, [org]);

  useEffect(() => { load(); }, [load]);

  async function handleCreate() {
    if (!org) return;
    setSaving(true);
    await supabase.from('visits').insert({ organization_id: org.id, address: form.address || null, status: form.status, notes: form.notes || null });
    setSaving(false);
    setShowCreate(false);
    setForm({ address: '', status: 'scheduled', notes: '' });
    await load();
  }

  return (
    <div>
      <PageHeader title="Visit Management" subtitle="Track scheduled and completed field visits"
        actions={<button onClick={() => setShowCreate(true)} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700"><Plus className="w-4 h-4" />New Visit</button>}
      />
      {loading ? <div className="text-center py-12 text-gray-400">Loading...</div> :
        visits.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
            <EmptyState icon={<CalendarCheck className="w-6 h-6" />} title="No visits yet" description="Schedule your first field visit"
              action={<button onClick={() => setShowCreate(true)} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-xl"><Plus className="w-4 h-4" />New Visit</button>}
            />
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Status</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Address</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Notes</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Created</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {visits.map(v => (
                  <tr key={v.id} className="hover:bg-gray-50">
                    <td className="px-5 py-3"><StatusBadge status={v.status} /></td>
                    <td className="px-5 py-3 text-sm text-gray-700">{v.address ?? <span className="text-gray-400 italic">No address</span>}</td>
                    <td className="px-5 py-3 text-sm text-gray-500 max-w-xs truncate">{v.notes ?? '—'}</td>
                    <td className="px-5 py-3 text-xs text-gray-400">{new Date(v.created_at).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      }
      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="New Visit"
        footer={<div className="flex justify-end gap-3"><button onClick={() => setShowCreate(false)} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-xl">Cancel</button><button onClick={handleCreate} disabled={saving} className="px-4 py-2 text-sm bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 disabled:opacity-50">{saving ? 'Saving...' : 'Create Visit'}</button></div>}
      >
        <div className="space-y-4">
          <div><label className="block text-sm font-medium text-gray-700 mb-1">Address</label><input type="text" value={form.address} onChange={e => setForm(p => ({ ...p, address: e.target.value }))} className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" /></div>
          <div><label className="block text-sm font-medium text-gray-700 mb-1">Status</label><select value={form.status} onChange={e => setForm(p => ({ ...p, status: e.target.value }))} className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">{['scheduled', 'in_progress', 'completed', 'cancelled'].map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}</select></div>
          <div><label className="block text-sm font-medium text-gray-700 mb-1">Notes</label><textarea value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} rows={3} className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" /></div>
        </div>
      </Modal>
    </div>
  );
}

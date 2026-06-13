import { useState, useEffect, useCallback } from 'react';
import { Package, Plus, AlertTriangle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useOrg } from '../../contexts/OrgContext';
import { PageHeader } from '../../components/common/PageHeader';
import { EmptyState } from '../../components/common/EmptyState';
import { Modal } from '../../components/common/Modal';
import type { InventoryItem } from '../../types';

export function InventoryPage() {
  const { org } = useOrg();
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: '', sku: '', unit: 'units', quantity_on_hand: 0, reorder_threshold: 0 });

  const load = useCallback(async () => {
    if (!org) return;
    const { data } = await supabase.from('inventory_items').select('*').eq('organization_id', org.id).order('name');
    setItems((data ?? []) as InventoryItem[]);
    setLoading(false);
  }, [org]);

  useEffect(() => { load(); }, [load]);

  async function handleCreate() {
    if (!org) return;
    setSaving(true);
    await supabase.from('inventory_items').insert({ organization_id: org.id, name: form.name, sku: form.sku || null, unit: form.unit, quantity_on_hand: form.quantity_on_hand, reorder_threshold: form.reorder_threshold });
    setSaving(false);
    setShowCreate(false);
    setForm({ name: '', sku: '', unit: 'units', quantity_on_hand: 0, reorder_threshold: 0 });
    await load();
  }

  return (
    <div>
      <PageHeader title="Inventory" subtitle="Track stock levels across territories and routes"
        actions={<button onClick={() => setShowCreate(true)} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700"><Plus className="w-4 h-4" />New Item</button>}
      />
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {loading ? <div className="p-8 text-center text-gray-400">Loading...</div> :
          items.length === 0 ? <EmptyState icon={<Package className="w-6 h-6" />} title="No inventory items" description="Add your first stock item"
            action={<button onClick={() => setShowCreate(true)} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-xl"><Plus className="w-4 h-4" />New Item</button>}
          /> : (
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Item</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase">SKU</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase">On Hand</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Threshold</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Health</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {items.map(item => {
                  const low = item.quantity_on_hand <= item.reorder_threshold;
                  const empty = item.quantity_on_hand <= 0;
                  return (
                    <tr key={item.id} className="hover:bg-gray-50">
                      <td className="px-5 py-3"><div className="font-medium text-sm text-gray-900">{item.name}</div></td>
                      <td className="px-5 py-3 text-sm text-gray-500 font-mono">{item.sku ?? '—'}</td>
                      <td className="px-5 py-3 text-sm font-bold text-gray-900">{item.quantity_on_hand} {item.unit}</td>
                      <td className="px-5 py-3 text-sm text-gray-500">{item.reorder_threshold}</td>
                      <td className="px-5 py-3">
                        {empty ? <span className="text-xs text-red-600 bg-red-50 px-2 py-1 rounded-lg flex items-center gap-1 w-fit"><AlertTriangle className="w-3 h-3" />Out of stock</span> :
                         low ? <span className="text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded-lg flex items-center gap-1 w-fit"><AlertTriangle className="w-3 h-3" />Low stock</span> :
                         <span className="text-xs text-emerald-600 bg-emerald-50 px-2 py-1 rounded-lg w-fit block">Healthy</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )
        }
      </div>
      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="New Inventory Item"
        footer={<div className="flex justify-end gap-3"><button onClick={() => setShowCreate(false)} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-xl">Cancel</button><button onClick={handleCreate} disabled={saving || !form.name} className="px-4 py-2 text-sm bg-blue-600 text-white font-semibold rounded-xl disabled:opacity-50">{saving ? 'Saving...' : 'Create Item'}</button></div>}
      >
        <div className="space-y-4">
          <div><label className="block text-sm font-medium text-gray-700 mb-1">Name *</label><input type="text" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="block text-sm font-medium text-gray-700 mb-1">SKU</label><input type="text" value={form.sku} onChange={e => setForm(p => ({ ...p, sku: e.target.value }))} className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Unit</label><input type="text" value={form.unit} onChange={e => setForm(p => ({ ...p, unit: e.target.value }))} className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Quantity on hand</label><input type="number" value={form.quantity_on_hand} onChange={e => setForm(p => ({ ...p, quantity_on_hand: +e.target.value }))} className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Reorder threshold</label><input type="number" value={form.reorder_threshold} onChange={e => setForm(p => ({ ...p, reorder_threshold: +e.target.value }))} className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" /></div>
          </div>
        </div>
      </Modal>
    </div>
  );
}

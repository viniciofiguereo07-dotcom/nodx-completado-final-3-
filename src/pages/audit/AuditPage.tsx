import { useState, useEffect, useCallback } from 'react';
import { List, RefreshCw } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useOrg } from '../../contexts/OrgContext';
import { PageHeader } from '../../components/common/PageHeader';
import { EmptyState } from '../../components/common/EmptyState';
import type { AuditLog } from '../../types';

export function AuditPage() {
  const { org } = useOrg();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!org) return;
    const { data } = await supabase.from('audit_logs').select('*').eq('organization_id', org.id).order('created_at', { ascending: false }).limit(100);
    setLogs((data ?? []) as AuditLog[]);
    setLoading(false);
  }, [org]);

  useEffect(() => { load(); }, [load]);

  return (
    <div>
      <PageHeader title="Audit Logs" subtitle="Complete history of all platform changes"
        actions={<button onClick={load} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl border border-gray-200"><RefreshCw className="w-4 h-4" /></button>}
      />
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {loading ? <div className="p-8 text-center text-gray-400">Loading...</div> :
          logs.length === 0 ? <EmptyState icon={<List className="w-6 h-6" />} title="No audit logs yet" description="Audit events will appear here as operations are performed" /> : (
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Action</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Resource</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Actor</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {logs.map(log => (
                  <tr key={log.id} className="hover:bg-gray-50">
                    <td className="px-5 py-3"><span className="text-xs font-mono bg-gray-100 text-gray-700 px-2 py-1 rounded-lg">{log.action}</span></td>
                    <td className="px-5 py-3 text-sm text-gray-600">{log.resource_type ?? '—'}</td>
                    <td className="px-5 py-3 text-xs text-gray-400 font-mono">{log.actor_id?.slice(0, 8) ?? 'system'}...</td>
                    <td className="px-5 py-3 text-xs text-gray-400">{new Date(log.created_at).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )
        }
      </div>
    </div>
  );
}

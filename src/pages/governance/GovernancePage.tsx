import { useState, useEffect } from 'react';
import { Shield, Clock, Archive, Download, Plus, AlertTriangle, CheckCircle2, Trash2, RefreshCw, FileBarChart2 } from 'lucide-react';
import { useOrg } from '../../contexts/OrgContext';
import { useAuth } from '../../contexts/AuthContext';
import { governanceService } from '../../services/DataGovernanceService';
import type { DataPolicy, RetentionPolicy, ArchiveJob, DataExportRequest } from '../../types';

const POLICY_TYPE_COLORS: Record<string, string> = {
  retention:  'bg-blue-100 text-blue-700',
  archiving:  'bg-amber-100 text-amber-700',
  purge:      'bg-red-100 text-red-700',
  export:     'bg-emerald-100 text-emerald-700',
  consent:    'bg-purple-100 text-purple-700',
};

const JOB_STATUS_COLORS: Record<string, string> = {
  pending:    'bg-gray-100 text-gray-600',
  running:    'bg-blue-100 text-blue-700',
  completed:  'bg-emerald-100 text-emerald-700',
  failed:     'bg-red-100 text-red-700',
  cancelled:  'bg-orange-100 text-orange-700',
};

const EXPORT_STATUS_COLORS: Record<string, string> = {
  pending:    'bg-gray-100 text-gray-600',
  processing: 'bg-blue-100 text-blue-700',
  ready:      'bg-emerald-100 text-emerald-700',
  failed:     'bg-red-100 text-red-700',
  expired:    'bg-orange-100 text-orange-700',
};

const TABLES_LIST = [
  'form_submissions', 'visits', 'households', 'household_members',
  'wash_water_points', 'wash_sanitation_facilities', 'me_indicator_values',
  'risk_layers', 'geometry_features', 'audit_logs', 'import_jobs',
];

export function GovernancePage() {
  const { org } = useOrg();
  const orgId = org?.id;
  const { user } = useAuth();
  const [policies, setPolicies]   = useState<DataPolicy[]>([]);
  const [retentions, setRetentions] = useState<RetentionPolicy[]>([]);
  const [jobs, setJobs]           = useState<ArchiveJob[]>([]);
  const [exports, setExports]     = useState<DataExportRequest[]>([]);
  const [loading, setLoading]     = useState(true);
  const [tab, setTab]             = useState<'policies' | 'retention' | 'jobs' | 'exports'>('policies');

  useEffect(() => { if (orgId) loadAll(); }, [orgId]);

  async function loadAll() {
    if (!orgId) return;
    setLoading(true);
    const [p, r, j, e] = await Promise.allSettled([
      governanceService.getPolicies(orgId),
      governanceService.getRetentionPolicies(orgId),
      governanceService.getArchiveJobs(orgId),
      governanceService.getExportRequests(orgId),
    ]);
    if (p.status === 'fulfilled') setPolicies(p.value);
    if (r.status === 'fulfilled') setRetentions(r.value);
    if (j.status === 'fulfilled') setJobs(j.value);
    if (e.status === 'fulfilled') setExports(e.value);
    setLoading(false);
  }

  async function requestExport(format: DataExportRequest['format']) {
    if (!orgId || !user) return;
    await governanceService.requestExport({
      organization_id: orgId,
      requested_by: user.id,
      export_type: 'full',
      tables: null,
      filters: {},
      format,
    });
    loadAll();
  }

  const activePolicies   = policies.filter(p => p.is_active).length;
  const completedJobs    = jobs.filter(j => j.status === 'completed').length;
  const totalArchived    = jobs.reduce((acc, j) => acc + j.records_archived, 0);
  const pendingExports   = exports.filter(e => e.status === 'pending' || e.status === 'processing').length;

  return (
    <div className="p-6 max-w-screen-xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Data Governance</h1>
          <p className="text-sm text-gray-500 mt-0.5">Retention policies, archiving, exports, and data lifecycle management</p>
        </div>
        <div className="flex gap-2">
          <button onClick={loadAll} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
            <RefreshCw size={16} />
          </button>
          <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors">
            <Plus size={14} /> New Policy
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Active Policies',   value: activePolicies,    icon: Shield,         color: 'text-blue-600',    bg: 'bg-blue-50' },
          { label: 'Archive Jobs',       value: completedJobs,     icon: Archive,        color: 'text-amber-600',   bg: 'bg-amber-50' },
          { label: 'Records Archived',   value: totalArchived.toLocaleString(), icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-50' },
          { label: 'Pending Exports',    value: pendingExports,    icon: Download,       color: 'text-purple-600',  bg: 'bg-purple-50' },
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
        {(['policies', 'retention', 'jobs', 'exports'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2.5 text-sm font-medium capitalize transition-colors border-b-2 -mb-px ${tab === t ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
          >
            {t === 'jobs' ? 'Archive Jobs' : t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-16 text-gray-400">Loading governance data...</div>
      ) : (
        <>
          {tab === 'policies' && (
            <div className="space-y-3">
              {policies.length === 0 ? (
                <div className="text-center py-16 bg-white border border-gray-200 rounded-xl">
                  <Shield size={40} className="text-gray-300 mx-auto mb-3" />
                  <p className="font-medium text-gray-500">No data policies configured</p>
                  <p className="text-sm text-gray-400 mt-1">Create policies to govern data lifecycle</p>
                </div>
              ) : policies.map(p => (
                <div key={p.id} className="bg-white border border-gray-200 rounded-xl p-4 flex items-center gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-medium text-gray-800">{p.name}</h3>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${POLICY_TYPE_COLORS[p.policy_type]}`}>
                        {p.policy_type}
                      </span>
                      {!p.is_active && <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">Inactive</span>}
                    </div>
                    {p.description && <p className="text-sm text-gray-500">{p.description}</p>}
                    {p.applies_to?.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {p.applies_to.map(t => (
                          <span key={t} className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded font-mono">{t}</span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="text-xs text-gray-400">{new Date(p.created_at).toLocaleDateString()}</div>
                </div>
              ))}
            </div>
          )}

          {tab === 'retention' && (
            <div className="space-y-3">
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-center gap-2 text-sm text-amber-700">
                <AlertTriangle size={16} className="flex-shrink-0" />
                Retention policies determine how long records are kept before archiving or purging. Changes take effect on the next archive job.
              </div>
              {retentions.length === 0 ? (
                <div className="text-center py-12 bg-white border border-gray-200 rounded-xl">
                  <Clock size={36} className="text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500">No retention policies configured</p>
                </div>
              ) : (
                <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-100">
                        <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Table</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Retention (days)</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Archive After</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Purge After</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {retentions.map(r => (
                        <tr key={r.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 font-mono text-xs text-gray-600">{r.table_name}</td>
                          <td className="px-4 py-3 text-gray-700">{r.retention_days}</td>
                          <td className="px-4 py-3 text-gray-500">{r.archive_after_days ?? '—'}</td>
                          <td className="px-4 py-3 text-gray-500">{r.purge_after_days ?? '—'}</td>
                          <td className="px-4 py-3">
                            {r.is_active
                              ? <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">Active</span>
                              : <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">Inactive</span>
                            }
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {tab === 'jobs' && (
            <div className="space-y-3">
              {jobs.length === 0 ? (
                <div className="text-center py-12 bg-white border border-gray-200 rounded-xl">
                  <Archive size={36} className="text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500">No archive jobs run yet</p>
                </div>
              ) : jobs.map(j => (
                <div key={j.id} className="bg-white border border-gray-200 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm text-gray-600">{j.table_name}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${JOB_STATUS_COLORS[j.status]}`}>{j.status}</span>
                    </div>
                    <span className="text-xs text-gray-400">{new Date(j.created_at).toLocaleString()}</span>
                  </div>
                  <div className="grid grid-cols-3 gap-4 text-xs text-gray-500">
                    <div><span className="font-medium text-gray-700">{j.records_scanned.toLocaleString()}</span> scanned</div>
                    <div><span className="font-medium text-gray-700">{j.records_archived.toLocaleString()}</span> archived</div>
                    <div><span className="font-medium text-gray-700">{j.records_purged.toLocaleString()}</span> purged</div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {tab === 'exports' && (
            <div className="space-y-4">
              <div className="bg-white border border-gray-200 rounded-xl p-5">
                <h3 className="font-semibold text-gray-800 mb-3">Request New Export</h3>
                <div className="flex flex-wrap gap-2">
                  {(['csv', 'xlsx', 'json', 'geojson'] as const).map(fmt => (
                    <button key={fmt} onClick={() => requestExport(fmt)}
                      className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50 transition-colors"
                    >
                      <Download size={14} className="text-gray-400" />
                      Export as {fmt.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>

              {exports.length > 0 && (
                <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-100">
                        <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Type</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Format</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Status</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Records</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Requested</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {exports.map(e => (
                        <tr key={e.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 capitalize text-gray-600">{e.export_type}</td>
                          <td className="px-4 py-3 font-mono text-xs text-gray-600 uppercase">{e.format}</td>
                          <td className="px-4 py-3">
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${EXPORT_STATUS_COLORS[e.status]}`}>{e.status}</span>
                          </td>
                          <td className="px-4 py-3 text-gray-500">{e.record_count?.toLocaleString() ?? '—'}</td>
                          <td className="px-4 py-3 text-gray-400 text-xs">{new Date(e.created_at).toLocaleString()}</td>
                          <td className="px-4 py-3">
                            {e.status === 'ready' && e.file_url && (
                              <a href={e.file_url} className="text-blue-600 hover:underline text-xs flex items-center gap-1">
                                <Download size={12} /> Download
                              </a>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

import React, { useState } from 'react';
import {
  FileText, ClipboardList, Camera, PenTool, MapPin,
  Plus, RefreshCw, Search, Filter, ChevronRight,
  CheckCircle, Clock, FileQuestion, XCircle,
} from 'lucide-react';
import { PageHeader } from '../../components/common/PageHeader';
import { StatusBadge } from '../../components/common/StatusBadge';
import { useTerritorialForms } from '../../hooks/useTerritorialForms';
import { useTerritorialSubmissions, useTerritorialSubmissionStats } from '../../hooks/useTerritorialSubmissions';
import type { TerritorialForm, TerritorialSubmission } from '../../services/TerritorialFieldCollectionEngine';

const STATUS_CONFIG: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  draft: { label: 'Draft', icon: Clock, color: '#64748b' },
  submitted: { label: 'Submitted', icon: CheckCircle, color: '#22c55e' },
  reviewed: { label: 'Reviewed', icon: CheckCircle, color: '#0891b2' },
  rejected: { label: 'Rejected', icon: XCircle, color: '#dc2626' },
};

function KPICard({ label, value, icon: Icon, color }: {
  label: string; value: number | string; icon: React.ElementType; color: string;
}) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 hover:shadow-md transition-shadow">
      <div className="flex items-center gap-3 mb-3">
        <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${color}15` }}>
          <Icon className="w-5 h-5" style={{ color }} />
        </div>
        <span className="text-sm font-medium text-slate-500">{label}</span>
      </div>
      <div className="flex items-baseline gap-1">
        <span className="text-3xl font-bold text-slate-900">{value}</span>
      </div>
    </div>
  );
}

function FormCard({ form, onClick }: { form: TerritorialForm; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="w-full text-left bg-white rounded-xl border border-slate-200 p-4 hover:shadow-md hover:border-blue-300 transition-all group"
    >
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
            <FileText className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h4 className="font-semibold text-slate-900 group-hover:text-blue-600 transition-colors">{form.name}</h4>
            <p className="text-xs text-slate-400">v{form.version}</p>
          </div>
        </div>
        <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-blue-500 transition-colors" />
      </div>
      {form.description && (
        <p className="text-sm text-slate-500 line-clamp-2">{form.description}</p>
      )}
      <div className="mt-3 flex items-center gap-3">
        <StatusBadge status={form.is_active ? 'active' : 'inactive'} />
        <span className="text-xs text-slate-400">
          {form.schema?.fields?.length ?? 0} fields
        </span>
      </div>
    </button>
  );
}

function SubmissionRow({ submission, onClick }: { submission: TerritorialSubmission; onClick: () => void }) {
  const config = STATUS_CONFIG[submission.status] ?? STATUS_CONFIG.draft;
  const StatusIcon = config.icon;

  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-4 px-4 py-3 bg-white rounded-lg border border-slate-200 hover:shadow-sm hover:border-blue-200 transition-all"
    >
      <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${config.color}15` }}>
        <StatusIcon className="w-4 h-4" style={{ color: config.color }} />
      </div>
      <div className="flex-1 text-left">
        <div className="flex items-center gap-2">
          <span className="font-medium text-slate-900">{submission.form?.name ?? 'Unknown Form'}</span>
          {submission.entity_id && (
            <span className="text-xs text-slate-400">Entity: {submission.entity_id.slice(0, 8)}</span>
          )}
        </div>
        <div className="flex items-center gap-3 mt-1">
          {submission.gps_latitude && submission.gps_longitude && (
            <span className="inline-flex items-center gap-1 text-xs text-slate-400">
              <MapPin className="w-3 h-3" />
              GPS
            </span>
          )}
          {submission.photos && submission.photos.length > 0 && (
            <span className="inline-flex items-center gap-1 text-xs text-slate-400">
              <Camera className="w-3 h-3" />
              {submission.photos.length}
            </span>
          )}
          {submission.signatures && submission.signatures.length > 0 && (
            <span className="inline-flex items-center gap-1 text-xs text-slate-400">
              <PenTool className="w-3 h-3" />
              {submission.signatures.length}
            </span>
          )}
        </div>
      </div>
      <div className="text-right">
        <StatusBadge status={submission.status} />
        <p className="text-xs text-slate-400 mt-1">
          {new Date(submission.created_at).toLocaleDateString()}
        </p>
      </div>
    </button>
  );
}

export function FieldCollectionDashboard() {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showCreateModal, setShowCreateModal] = useState(false);

  const { forms, loading: formsLoading, error: formsError, reload: reloadForms } = useTerritorialForms({ isActive: true });
  const { submissions, loading: submissionsLoading, error: submissionsError, reload: reloadSubmissions, createSubmission } = useTerritorialSubmissions({ status: statusFilter === 'all' ? undefined : statusFilter });
  const { stats, loading: statsLoading, reload: reloadStats } = useTerritorialSubmissionStats();

  const loading = formsLoading || submissionsLoading || statsLoading;
  const error = formsError || submissionsError;

  const filteredForms = forms.filter(f =>
    f.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredSubmissions = submissions.filter(s =>
    !searchTerm || s.form?.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleRefresh = async () => {
    await Promise.all([reloadForms(), reloadSubmissions(), reloadStats()]);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <PageHeader
        title="Field Collection"
        subtitle="Dynamic forms, GPS capture, photo evidence, and digital signatures"
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={handleRefresh}
              className="flex items-center gap-2 px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              Refresh
            </button>
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-2 px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              New Collection
            </button>
          </div>
        }
      />

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {error}
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <KPICard label="Total Submissions" value={stats?.total ?? 0} icon={ClipboardList} color="#2563eb" />
        <KPICard label="This Month" value={stats?.thisMonth ?? 0} icon={Clock} color="#8b5cf6" />
        <KPICard label="With Photos" value={stats?.withPhotos ?? 0} icon={Camera} color="#0891b2" />
        <KPICard label="With Signatures" value={stats?.withSignatures ?? 0} icon={PenTool} color="#22c55e" />
        <KPICard label="Active Forms" value={forms.length} icon={FileText} color="#f59e0b" />
      </div>

      {/* Status Quick Filters */}
      <div className="flex items-center gap-3">
        <Filter className="w-4 h-4 text-slate-400" />
        <span className="text-sm text-slate-500">Status:</span>
        {['all', 'draft', 'submitted', 'reviewed', 'rejected'].map(status => (
          <button
            key={status}
            onClick={() => setStatusFilter(status)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              statusFilter === status
                ? 'bg-blue-600 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            {status.charAt(0).toUpperCase() + status.slice(1)}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Forms List */}
        <div className="lg:col-span-1 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-slate-800">Collection Forms</h3>
            <span className="text-sm text-slate-400">{filteredForms.length} forms</span>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search forms..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
            {filteredForms.length > 0 ? (
              filteredForms.map(form => (
                <FormCard key={form.id} form={form} onClick={() => {}} />
              ))
            ) : (
              <div className="py-8 text-center text-slate-400 text-sm">
                {loading ? 'Loading...' : 'No forms available'}
              </div>
            )}
          </div>
        </div>

        {/* Submissions List */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-slate-800">Recent Submissions</h3>
            <span className="text-sm text-slate-400">{filteredSubmissions.length} submissions</span>
          </div>
          <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
            {filteredSubmissions.length > 0 ? (
              filteredSubmissions.map(submission => (
                <SubmissionRow key={submission.id} submission={submission} onClick={() => {}} />
              ))
            ) : (
              <div className="py-16 text-center bg-white rounded-xl border border-slate-200">
                <ClipboardList className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-500 font-medium">No submissions yet</p>
                <p className="text-sm text-slate-400 mt-1">Select a form to start collecting data</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

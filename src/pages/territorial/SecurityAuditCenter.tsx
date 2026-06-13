import React, { useState, useEffect } from 'react';
import {
  Shield, Activity, AlertTriangle, User, Clock, Filter,
  Download, RefreshCw, Eye, Lock, Unlock, Key, FileKey,
  AlertCircle, CheckCircle2, XCircle, Search, Calendar,
  ChevronLeft, ChevronRight
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useOrg } from '../../contexts/OrgContext';
import {
  territorialSecurityEngine,
  type SecurityAuditLog,
  type SecurityAction,
} from '../../services/TerritorialSecurityEngine';

const ACTION_CONFIG: Record<SecurityAction, { label: string; color: string; icon: React.ReactNode }> = {
  login: { label: 'Login', color: 'green', icon: <Unlock className="w-4 h-4" /> },
  logout: { label: 'Logout', color: 'slate', icon: <Lock className="w-4 h-4" /> },
  password_change: { label: 'Password Change', color: 'blue', icon: <Key className="w-4 h-4" /> },
  role_assigned: { label: 'Role Assigned', color: 'blue', icon: <User className="w-4 h-4" /> },
  role_revoked: { label: 'Role Revoked', color: 'red', icon: <User className="w-4 h-4" /> },
  permission_granted: { label: 'Permission Granted', color: 'green', icon: <CheckCircle2 className="w-4 h-4" /> },
  permission_revoked: { label: 'Permission Revoked', color: 'red', icon: <XCircle className="w-4 h-4" /> },
  break_glass_activated: { label: 'Break Glass Activated', color: 'amber', icon: <AlertTriangle className="w-4 h-4" /> },
  break_glass_deactivated: { label: 'Break Glass Deactivated', color: 'green', icon: <CheckCircle2 className="w-4 h-4" /> },
  recovery_key_generated: { label: 'Recovery Key Generated', color: 'blue', icon: <FileKey className="w-4 h-4" /> },
  recovery_key_used: { label: 'Recovery Key Used', color: 'amber', icon: <Key className="w-4 h-4" /> },
  emergency_token_created: { label: 'Emergency Token Created', color: 'amber', icon: <AlertCircle className="w-4 h-4" /> },
  emergency_token_revoked: { label: 'Emergency Token Revoked', color: 'red', icon: <XCircle className="w-4 h-4" /> },
  user_created: { label: 'User Created', color: 'green', icon: <User className="w-4 h-4" /> },
  user_updated: { label: 'User Updated', color: 'blue', icon: <User className="w-4 h-4" /> },
  user_deleted: { label: 'User Deleted', color: 'red', icon: <User className="w-4 h-4" /> },
  access_denied: { label: 'Access Denied', color: 'red', icon: <XCircle className="w-4 h-4" /> },
  suspicious_activity: { label: 'Suspicious Activity', color: 'red', icon: <AlertTriangle className="w-4 h-4" /> },
};

export function SecurityAuditCenter() {
  const { user } = useAuth();
  const { org } = useOrg();

  const [logs, setLogs] = useState<SecurityAuditLog[]>([]);
  const [stats, setStats] = useState<{
    totalLogs: number;
    byAction: Record<string, number>;
    last24h: number;
    suspiciousCount: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  // Filters
  const [filterAction, setFilterAction] = useState<SecurityAction | ''>('');
  const [filterUserId, setFilterUserId] = useState('');
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 50;

  useEffect(() => {
    if (org) loadAll();
  }, [org, filterAction, filterStartDate, filterEndDate]);

  const loadAll = async () => {
    if (!org) return;
    setLoading(true);
    try {
      const [logsData, statsData] = await Promise.all([
        territorialSecurityEngine.getAuditLogs(org.id, {
          action: filterAction || undefined,
          startDate: filterStartDate || undefined,
          endDate: filterEndDate || undefined,
          limit: 500,
        }),
        territorialSecurityEngine.getAuditStats(org.id),
      ]);
      setLogs(logsData);
      setStats(statsData);
    } catch (e) {
      console.error('Failed to load audit logs:', e);
    } finally {
      setLoading(false);
    }
  };

  const filteredLogs = logs.filter(log => {
    if (filterUserId && log.user_id !== filterUserId) return false;
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      if (!log.action.includes(query) &&
          !log.resource_type.toLowerCase().includes(query) &&
          !(log.resource_id?.toLowerCase().includes(query))) {
        return false;
      }
    }
    return true;
  });

  const paginatedLogs = filteredLogs.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const totalPages = Math.ceil(filteredLogs.length / itemsPerPage);

  const exportLogs = () => {
    const csv = [
      ['Date', 'User ID', 'Action', 'Resource Type', 'Resource ID', 'IP Address'].join(','),
      ...filteredLogs.map(log => [
        log.created_at,
        log.user_id || 'system',
        log.action,
        log.resource_type,
        log.resource_id || '',
        log.ip_address || '',
      ].join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `security-audit-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString();
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-indigo-100 rounded-xl flex items-center justify-center">
                <Shield className="w-6 h-6 text-indigo-600" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-slate-900">Security Audit Center</h1>
                <p className="text-sm text-slate-500">Complete audit trail of all security events</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={loadAll}
                className="flex items-center gap-2 px-3 py-2 text-slate-600 hover:text-slate-700 border border-slate-300 rounded-lg hover:bg-slate-50"
              >
                <RefreshCw className="w-4 h-4" />
                Refresh
              </button>
              <button
                onClick={exportLogs}
                className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800"
              >
                <Download className="w-4 h-4" />
                Export CSV
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white rounded-xl p-4 border border-slate-200">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Activity className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-slate-900">{stats.totalLogs}</div>
                  <div className="text-xs text-slate-500">Total Events</div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl p-4 border border-slate-200">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                  <Clock className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-slate-900">{stats.last24h}</div>
                  <div className="text-xs text-slate-500">Last 24 Hours</div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl p-4 border border-slate-200">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5 text-amber-600" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-slate-900">{stats.suspiciousCount}</div>
                  <div className="text-xs text-slate-500">Suspicious Events</div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl p-4 border border-slate-200">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                  <Shield className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-slate-900">
                    {Object.keys(stats.byAction).length}
                  </div>
                  <div className="text-xs text-slate-500">Event Types</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Search</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Search events..."
                  className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Action Type</label>
              <select
                value={filterAction}
                onChange={e => setFilterAction(e.target.value as SecurityAction | '')}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              >
                <option value="">All Actions</option>
                {Object.entries(ACTION_CONFIG).map(([key, config]) => (
                  <option key={key} value={key}>{config.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Start Date</label>
              <input
                type="date"
                value={filterStartDate}
                onChange={e => setFilterStartDate(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">End Date</label>
              <input
                type="date"
                value={filterEndDate}
                onChange={e => setFilterEndDate(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
              />
            </div>

            <div className="flex items-end">
              <button
                onClick={() => {
                  setFilterAction('');
                  setFilterStartDate('');
                  setFilterEndDate('');
                  setSearchQuery('');
                  setCurrentPage(1);
                }}
                className="w-full px-3 py-2 text-slate-600 hover:text-slate-700 border border-slate-300 rounded-lg text-sm hover:bg-slate-50"
              >
                Clear Filters
              </button>
            </div>
          </div>
        </div>

        {/* Logs Table */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600">Timestamp</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600">Action</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600">User</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600">Resource</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {paginatedLogs.map(log => {
                  const config = ACTION_CONFIG[log.action] || { label: log.action, color: 'slate', icon: null };
                  return (
                    <tr key={log.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 text-sm text-slate-600 whitespace-nowrap">
                        {formatDate(log.created_at)}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium ${
                          config.color === 'green' ? 'bg-green-100 text-green-700' :
                          config.color === 'red' ? 'bg-red-100 text-red-700' :
                          config.color === 'amber' ? 'bg-amber-100 text-amber-700' :
                          config.color === 'blue' ? 'bg-blue-100 text-blue-700' :
                          'bg-slate-100 text-slate-600'
                        }`}>
                          {config.icon}
                          {config.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-600">
                        {log.user_id ? (
                          <span className="font-mono text-xs">{log.user_id.substring(0, 8)}...</span>
                        ) : (
                          <span className="text-slate-400">System</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-sm text-slate-900">{log.resource_type}</div>
                        {log.resource_id && (
                          <div className="text-xs text-slate-500 font-mono">{log.resource_id.substring(0, 16)}...</div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-sm text-slate-600">
                          {(log.new_value || log.old_value) && (
                            <div className="flex items-center gap-1 text-xs">
                              {log.old_value && <XCircle className="w-3 h-3 text-red-400" />}
                              {log.new_value && <CheckCircle2 className="w-3 h-3 text-green-400" />}
                              <span>Changes recorded</span>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {paginatedLogs.length === 0 && !loading && (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-slate-500">
                      No audit logs found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 bg-slate-50 border-t border-slate-200">
              <div className="text-sm text-slate-600">
                Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, filteredLogs.length)} of {filteredLogs.length} results
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="p-2 rounded-lg border border-slate-300 hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-sm text-slate-600">
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="p-2 rounded-lg border border-slate-300 hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

import { useState, useEffect, useCallback } from 'react';
import { Lock, Plus, Edit2, Trash2, Check, X, Shield, Users, AlertCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useOrg } from '../../contexts/OrgContext';
import { PageHeader } from '../../components/common/PageHeader';
import { Modal } from '../../components/common/Modal';
import { EmptyState } from '../../components/common/EmptyState';
import { ROLE_LABELS, ROLE_COLORS } from '../../types';
import type { Permission, UserRole } from '../../types';

const SYSTEM_ROLES: UserRole[] = ['super_admin', 'org_admin', 'project_manager', 'supervisor', 'agent', 'auditor', 'viewer'];

const DEFAULT_ROLE_PERMISSIONS: Record<UserRole, string[]> = {
  super_admin: ['*'],
  org_admin: ['territories.*', 'routes.*', 'visits.*', 'forms.*', 'inventory.*', 'analytics.view', 'analytics.export', 'members.*', 'devices.*', 'workflows.*', 'audit.view', 'ai.query'],
  project_manager: ['territories.view', 'territories.create', 'territories.edit', 'routes.*', 'visits.*', 'forms.*', 'inventory.*', 'analytics.view', 'members.view', 'devices.view', 'workflows.view', 'workflows.create', 'workflows.execute', 'ai.query'],
  supervisor: ['territories.view', 'routes.view', 'routes.create', 'routes.edit', 'visits.*', 'forms.view', 'forms.create', 'forms.edit', 'forms.submit', 'forms.review', 'inventory.view', 'inventory.transact', 'analytics.view', 'ai.query'],
  agent: ['territories.view', 'routes.view', 'visits.view', 'visits.create', 'visits.edit', 'forms.view', 'forms.submit', 'inventory.view', 'inventory.transact'],
  auditor: ['territories.view', 'routes.view', 'visits.view', 'forms.view', 'inventory.view', 'analytics.view', 'audit.view', 'members.view'],
  viewer: ['territories.view', 'routes.view', 'visits.view', 'forms.view', 'inventory.view', 'analytics.view'],
};

function hasPermission(role: UserRole, permKey: string): boolean {
  const perms = DEFAULT_ROLE_PERMISSIONS[role] ?? [];
  if (perms.includes('*')) return true;
  if (perms.includes(permKey)) return true;
  const [mod] = permKey.split('.');
  if (perms.includes(`${mod}.*`)) return true;
  return false;
}

export function PermissionsEnginePage() {
  const { org } = useOrg();
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRole, setSelectedRole] = useState<UserRole>('super_admin');
  const [view, setView] = useState<'matrix' | 'roles'>('matrix');
  const [modules, setModules] = useState<string[]>([]);

  const load = useCallback(async () => {
    const { data } = await supabase.from('permissions').select('*').order('module').order('name');
    const perms = (data ?? []) as Permission[];
    setPermissions(perms);
    setModules([...new Set(perms.map(p => p.module))]);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const grouped = modules.reduce((acc, mod) => {
    acc[mod] = permissions.filter(p => p.module === mod);
    return acc;
  }, {} as Record<string, Permission[]>);

  return (
    <div>
      <PageHeader
        title="Permissions Engine"
        subtitle="Granular role-based access control management"
        actions={
          <div className="flex rounded-xl border border-gray-200 overflow-hidden">
            <button onClick={() => setView('matrix')} className={`px-4 py-2 text-sm font-medium ${view === 'matrix' ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-50'}`}>Permission Matrix</button>
            <button onClick={() => setView('roles')} className={`px-4 py-2 text-sm font-medium ${view === 'roles' ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-50'}`}>Role Cards</button>
          </div>
        }
      />

      {loading ? (
        <div className="text-center py-12 text-gray-400">Loading permissions...</div>
      ) : view === 'matrix' ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          {/* Role headers */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="sticky left-0 bg-white text-left px-5 py-4 text-sm font-semibold text-gray-700 min-w-52 border-r border-gray-100">Permission</th>
                  {SYSTEM_ROLES.map(role => (
                    <th key={role} className="px-3 py-4 text-center min-w-28">
                      <div className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${ROLE_COLORS[role]}`}>
                        {ROLE_LABELS[role]}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {modules.map(mod => (
                  <>
                    <tr key={`mod-${mod}`} className="bg-gray-50">
                      <td colSpan={SYSTEM_ROLES.length + 1} className="px-5 py-2">
                        <span className="text-xs font-bold text-gray-500 uppercase tracking-widest capitalize">{mod}</span>
                      </td>
                    </tr>
                    {grouped[mod].map(perm => (
                      <tr key={perm.id} className="border-t border-gray-50 hover:bg-gray-50/50 transition-colors">
                        <td className="sticky left-0 bg-white border-r border-gray-100 px-5 py-3">
                          <div className="font-medium text-sm text-gray-800">{perm.name}</div>
                          <div className="text-xs text-gray-400 font-mono">{perm.key}</div>
                        </td>
                        {SYSTEM_ROLES.map(role => {
                          const granted = hasPermission(role, perm.key);
                          return (
                            <td key={role} className="px-3 py-3 text-center">
                              {granted ? (
                                <div className="flex items-center justify-center">
                                  <div className="w-6 h-6 bg-emerald-100 rounded-full flex items-center justify-center">
                                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                                  </div>
                                </div>
                              ) : (
                                <div className="flex items-center justify-center">
                                  <div className="w-6 h-6 bg-gray-100 rounded-full flex items-center justify-center">
                                    <X className="w-3.5 h-3.5 text-gray-300" />
                                  </div>
                                </div>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {SYSTEM_ROLES.map(role => {
            const perms = DEFAULT_ROLE_PERMISSIONS[role];
            const isFullAccess = perms.includes('*');
            const count = isFullAccess ? permissions.length : permissions.filter(p => hasPermission(role, p.key)).length;

            return (
              <div key={role} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <div className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium mb-2 ${ROLE_COLORS[role]}`}>
                      {ROLE_LABELS[role]}
                    </div>
                    <div className="text-2xl font-bold text-gray-900">{count}</div>
                    <div className="text-xs text-gray-500">of {permissions.length} permissions</div>
                  </div>
                  <div className="w-10 h-10 bg-gray-50 rounded-xl flex items-center justify-center">
                    {isFullAccess ? <Shield className="w-5 h-5 text-gray-500" /> : <Lock className="w-5 h-5 text-gray-400" />}
                  </div>
                </div>

                {/* Progress bar */}
                <div className="w-full bg-gray-100 rounded-full h-1.5 mb-4">
                  <div
                    className="h-1.5 rounded-full bg-blue-500 transition-all"
                    style={{ width: `${(count / permissions.length) * 100}%` }}
                  />
                </div>

                {/* Permission summary by module */}
                <div className="space-y-1">
                  {modules.slice(0, 5).map(mod => {
                    const modPerms = grouped[mod] ?? [];
                    const granted = modPerms.filter(p => hasPermission(role, p.key)).length;
                    return (
                      <div key={mod} className="flex items-center justify-between text-xs">
                        <span className="text-gray-500 capitalize">{mod}</span>
                        <div className="flex items-center gap-1">
                          <div className={`w-12 h-1 rounded-full ${granted === modPerms.length ? 'bg-emerald-400' : granted > 0 ? 'bg-blue-400' : 'bg-gray-200'}`} />
                          <span className="text-gray-400 w-8 text-right">{granted}/{modPerms.length}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Legend */}
      <div className="mt-4 flex items-center gap-4 text-xs text-gray-400">
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-4 bg-emerald-100 rounded-full flex items-center justify-center"><Check className="w-2.5 h-2.5 text-emerald-600" /></div>
          Granted
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-4 bg-gray-100 rounded-full flex items-center justify-center"><X className="w-2.5 h-2.5 text-gray-300" /></div>
          Denied
        </div>
        <div className="ml-auto flex items-center gap-1.5">
          <AlertCircle className="w-3.5 h-3.5" />
          Permission matrix reflects system defaults. Custom org permissions coming soon.
        </div>
      </div>
    </div>
  );
}

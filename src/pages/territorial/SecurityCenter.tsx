import React, { useState, useEffect } from 'react';
import { Shield, Lock, Unlock, User, AlertTriangle, Key, Settings, Plus, Trash2, CreditCard as Edit2, Save, X, ChevronDown, ChevronRight, Activity, Clock, Eye, EyeOff, Radio, Zap, AlertCircle, CheckCircle2, FileKey, RefreshCw, Users } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useOrg } from '../../contexts/OrgContext';
import {
  territorialSecurityEngine,
  type Role,
  type Permission,
  type BreakGlassSession,
} from '../../services/TerritorialSecurityEngine';
import type { RolePermission } from '../../types';

type UserRole = 'super_admin' | 'org_admin' | 'project_manager' | 'supervisor' | 'agent' | 'auditor' | 'viewer';

const ROLE_COLORS: Record<UserRole, string> = {
  super_admin: 'red',
  org_admin: 'purple',
  project_manager: 'blue',
  supervisor: 'green',
  agent: 'amber',
  auditor: 'slate',
  viewer: 'gray',
};

const MODULE_PERMISSIONS: Record<string, string[]> = {
  territories: ['territories.view', 'territories.create', 'territories.edit', 'territories.delete'],
  routes: ['routes.view', 'routes.create', 'routes.edit', 'routes.delete'],
  visits: ['visits.view', 'visits.create', 'visits.edit', 'visits.delete'],
  forms: ['forms.view', 'forms.create', 'forms.edit', 'forms.delete', 'forms.submit'],
  geospatial: ['geospatial.view', 'geospatial.edit'],
  indicators: ['indicators.view', 'indicators.create', 'indicators.edit'],
  reports: ['reports.view', 'reports.create', 'reports.export'],
  users: ['users.view', 'users.create', 'users.edit', 'users.delete'],
  settings: ['settings.view', 'settings.edit'],
};

export function SecurityCenter() {
  const { user } = useAuth();
  const { org } = useOrg();

  const [roles, setRoles] = useState<Role[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [rolePermissions, setRolePermissions] = useState<Record<string, string[]>>({});
  const [breakGlassSessions, setBreakGlassSessions] = useState<BreakGlassSession[]>([]);
  const [activeBreakGlass, setActiveBreakGlass] = useState<BreakGlassSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'roles' | 'permissions' | 'breakglass'>('roles');

  // Role editing
  const [editingRole, setEditingRole] = useState<string | null>(null);
  const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set());

  // Create role
  const [showCreateRole, setShowCreateRole] = useState(false);
  const [newRoleName, setNewRoleName] = useState('');
  const [newRoleDisplay, setNewRoleDisplay] = useState('');
  const [newRoleColor, setNewRoleColor] = useState('#3b82f6');

  // Break glass
  const [showBreakGlassModal, setShowBreakGlassModal] = useState(false);
  const [breakGlassJustification, setBreakGlassJustification] = useState('');
  const [breakGlassDuration, setBreakGlassDuration] = useState(30);
  const [breakGlassPermissions, setBreakGlassPermissions] = useState<string[]>([]);

  useEffect(() => {
    if (org) loadAll();
  }, [org]);

  useEffect(() => {
    if (user) checkActiveBreakGlass();
  }, [user]);

  const loadAll = async () => {
    if (!org) return;
    setLoading(true);
    try {
      const [rolesData, permsData, sessionsData] = await Promise.all([
        territorialSecurityEngine.getRoles(org.id),
        territorialSecurityEngine.getPermissions(),
        territorialSecurityEngine.getBreakGlassSessions(org.id),
      ]);
      setRoles(rolesData);
      setPermissions(permsData);

      // Load role permissions for each role
      const rp: Record<string, string[]> = {};
      for (const role of rolesData) {
        const rolePerms = await territorialSecurityEngine.getRolePermissions(role.id);
        rp[role.id] = rolePerms.map(p => p.permission_key);
      }
      setRolePermissions(rp);

      setBreakGlassSessions(sessionsData);
    } catch (e) {
      console.error('Failed to load security data:', e);
    } finally {
      setLoading(false);
    }
  };

  const checkActiveBreakGlass = async () => {
    if (!user) return;
    try {
      const session = await territorialSecurityEngine.getActiveBreakGlassSession(user.id);
      setActiveBreakGlass(session);
    } catch (e) {
      console.error('Failed to check break glass:', e);
    }
  };

  const handleCreateRole = async () => {
    if (!org || !user) return;
    try {
      const role = await territorialSecurityEngine.createRole({
        organizationId: org.id,
        name: newRoleName.toLowerCase().replace(/\s+/g, '_'),
        displayName: newRoleDisplay,
        color: newRoleColor,
      });
      setRoles(prev => [...prev, role]);
      setRolePermissions(prev => ({ ...prev, [role.id]: [] }));
      setShowCreateRole(false);
      setNewRoleName('');
      setNewRoleDisplay('');
    } catch (e) {
      console.error('Failed to create role:', e);
    }
  };

  const handleDeleteRole = async (roleId: string) => {
    if (!org) return;
    if (!confirm('Are you sure you want to delete this role?')) return;
    try {
      await territorialSecurityEngine.deleteRole(roleId, org.id);
      setRoles(prev => prev.filter(r => r.id !== roleId));
    } catch (e) {
      console.error('Failed to delete role:', e);
    }
  };

  const handleTogglePermission = async (roleId: string, permissionKey: string) => {
    if (!org) return;
    const currentPerms = rolePermissions[roleId] || [];
    const hasPerm = currentPerms.includes(permissionKey);

    try {
      if (hasPerm) {
        await territorialSecurityEngine.revokePermission(roleId, permissionKey, org.id);
        setRolePermissions(prev => ({
          ...prev,
          [roleId]: prev[roleId].filter(p => p !== permissionKey),
        }));
      } else {
        await territorialSecurityEngine.grantPermission(roleId, permissionKey, org.id);
        setRolePermissions(prev => ({
          ...prev,
          [roleId]: [...(prev[roleId] || []), permissionKey],
        }));
      }
    } catch (e) {
      console.error('Failed to toggle permission:', e);
    }
  };

  const handleActivateBreakGlass = async () => {
    if (!org || !user) return;
    try {
      const session = await territorialSecurityEngine.activateBreakGlass({
        organizationId: org.id,
        userId: user.id,
        justification: breakGlassJustification,
        elevatedPermissions: breakGlassPermissions,
        durationMinutes: breakGlassDuration,
        originalRole: 'org_admin',
      });
      setActiveBreakGlass(session);
      setBreakGlassSessions(prev => [session, ...prev]);
      setShowBreakGlassModal(false);
      setBreakGlassJustification('');
      setBreakGlassPermissions([]);
    } catch (e) {
      console.error('Failed to activate break glass:', e);
    }
  };

  const handleDeactivateBreakGlass = async () => {
    if (!org || !user || !activeBreakGlass) return;
    try {
      await territorialSecurityEngine.deactivateBreakGlass(activeBreakGlass.id, user.id, org.id);
      setActiveBreakGlass(null);
      loadAll();
    } catch (e) {
      console.error('Failed to deactivate break glass:', e);
    }
  };

  const toggleModule = (module: string) => {
    setExpandedModules(prev => {
      const next = new Set(prev);
      if (next.has(module)) next.delete(module);
      else next.add(module);
      return next;
    });
  };

  const hasPermission = (roleId: string, permissionKey: string) => {
    return (rolePermissions[roleId] || []).includes(permissionKey);
  };

  const toggleAllModulePermissions = (roleId: string, module: string) => {
    const perms = MODULE_PERMISSIONS[module] || [];
    const allSelected = perms.every(p => hasPermission(roleId, p));

    perms.forEach(p => {
      const currentHas = hasPermission(roleId, p);
      if (allSelected && currentHas) {
        handleTogglePermission(roleId, p);
      } else if (!allSelected && !currentHas) {
        handleTogglePermission(roleId, p);
      }
    });
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-slate-900 rounded-xl flex items-center justify-center">
                <Shield className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-slate-900">Security Center</h1>
                <p className="text-sm text-slate-500">Manage roles, permissions, and emergency access</p>
              </div>
            </div>

            {activeBreakGlass && (
              <div className="flex items-center gap-3 px-4 py-2 bg-amber-100 border border-amber-200 rounded-lg">
                <AlertTriangle className="w-5 h-5 text-amber-600" />
                <div className="text-sm">
                  <span className="font-medium text-amber-800">Break Glass Active</span>
                  <span className="text-amber-700 ml-2">
                    Expires: {new Date(activeBreakGlass.expires_at).toLocaleTimeString()}
                  </span>
                </div>
                <button
                  onClick={handleDeactivateBreakGlass}
                  className="ml-2 px-3 py-1 bg-amber-600 text-white text-xs rounded hover:bg-amber-700"
                >
                  Deactivate
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Active Break Glass Warning */}
        {activeBreakGlass && (
          <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-xl">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5" />
              <div>
                <h3 className="font-medium text-amber-900">Break Glass Mode Active</h3>
                <p className="text-sm text-amber-700 mt-1">
                  You have elevated permissions for: {activeBreakGlass.elevated_permissions.join(', ')}
                </p>
                <p className="text-xs text-amber-600 mt-1">
                  Justification: {activeBreakGlass.justification}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-4 mb-6">
          {(['roles', 'permissions', 'breakglass'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === tab
                  ? 'bg-slate-900 text-white'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              {tab === 'roles' ? 'Roles' : tab === 'permissions' ? 'Permissions' : 'Break Glass'}
            </button>
          ))}
        </div>

        {activeTab === 'roles' && (
          <div className="space-y-6">
            {/* Create Role Button */}
            <div className="flex justify-end">
              <button
                onClick={() => setShowCreateRole(true)}
                className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800"
              >
                <Plus className="w-4 h-4" />
                Create Role
              </button>
            </div>

            {/* Roles Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {roles.map(role => (
                <div key={role.id} className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                  <div className="p-4 border-b border-slate-200">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-10 h-10 rounded-lg flex items-center justify-center"
                          style={{ backgroundColor: `${role.color}20` }}
                        >
                          <User className="w-5 h-5" style={{ color: role.color }} />
                        </div>
                        <div>
                          <h3 className="font-semibold text-slate-900">{role.display_name}</h3>
                          <p className="text-xs text-slate-500">{role.name}</p>
                        </div>
                      </div>
                      {!role.is_system && (
                        <button
                          onClick={() => handleDeleteRole(role.id)}
                          className="text-red-600 hover:text-red-700 p-1"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                    {role.description && (
                      <p className="text-sm text-slate-600 mt-2">{role.description}</p>
                    )}
                  </div>

                  <div className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-slate-600">Permissions</span>
                      <span className="text-xs text-slate-500">
                        {(rolePermissions[role.id] || []).length} / {permissions.length}
                      </span>
                    </div>

                    {/* Module Permissions */}
                    <div className="space-y-1">
                      {Object.entries(MODULE_PERMISSIONS).map(([module, perms]) => {
                        const assigned = (rolePermissions[role.id] || []);
                        const moduleCount = perms.filter(p => assigned.includes(p)).length;
                        const expanded = expandedModules.has(`${role.id}-${module}`);

                        return (
                          <div key={module} className="border border-slate-200 rounded-lg">
                            <button
                              onClick={() => toggleModule(`${role.id}-${module}`)}
                              className="w-full flex items-center justify-between px-3 py-2 hover:bg-slate-50"
                            >
                              <div className="flex items-center gap-2">
                                {expanded ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
                                <span className="text-sm font-medium text-slate-700 capitalize">{module}</span>
                              </div>
                              <span className="text-xs text-slate-500">{moduleCount}/{perms.length}</span>
                            </button>

                            {expanded && (
                              <div className="px-3 pb-2 space-y-1">
                                {perms.map(perm => (
                                  <label
                                    key={perm}
                                    className="flex items-center gap-2 py-1 px-2 rounded hover:bg-slate-50 cursor-pointer"
                                  >
                                    <input
                                      type="checkbox"
                                      checked={hasPermission(role.id, perm)}
                                      onChange={() => handleTogglePermission(role.id, perm)}
                                      className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                                    />
                                    <span className="text-xs text-slate-600">{perm.split('.')[1]}</span>
                                  </label>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'permissions' && (
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <table className="w-full">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600">Permission Key</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600">Name</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600">Module</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600">Description</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {permissions.map(perm => (
                  <tr key={perm.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <code className="text-xs bg-slate-100 px-2 py-1 rounded font-mono">{perm.key}</code>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-900">{perm.name}</td>
                    <td className="px-4 py-3">
                      <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded capitalize">
                        {perm.module}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600">{perm.description || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'breakglass' && (
          <div className="space-y-6">
            {/* Break Glass Activation */}
            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center">
                  <AlertTriangle className="w-6 h-6 text-amber-600" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-slate-900">Break Glass Mode</h3>
                  <p className="text-sm text-slate-600 mt-1">
                    Emergency privilege elevation for critical operations. All break glass activations are logged and audited.
                  </p>
                </div>
                {!activeBreakGlass && (
                  <button
                    onClick={() => setShowBreakGlassModal(true)}
                    className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700"
                  >
                    Activate Break Glass
                  </button>
                )}
              </div>
            </div>

            {/* Break Glass Sessions History */}
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <div className="px-4 py-3 bg-slate-50 border-b border-slate-200">
                <h3 className="font-medium text-slate-900">Session History</h3>
              </div>
              <div className="divide-y divide-slate-200">
                {breakGlassSessions.map(session => (
                  <div key={session.id} className="p-4 hover:bg-slate-50">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${
                            session.is_active ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'
                          }`}>
                            {session.is_active ? <Radio className="w-3 h-3" /> : <X className="w-3 h-3" />}
                            {session.is_active ? 'Active' : 'Ended'}
                          </span>
                          <span className="text-sm font-medium text-slate-900">
                            {new Date(session.created_at).toLocaleString()}
                          </span>
                        </div>
                        <p className="text-sm text-slate-600 mt-1">{session.justification}</p>
                        <div className="flex items-center gap-4 mt-2 text-xs text-slate-500">
                          <span>Duration: {Math.round((new Date(session.expires_at).getTime() - new Date(session.elevated_at).getTime()) / 60000)} min</span>
                          <span>Permissions: {session.elevated_permissions.length}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
                {breakGlassSessions.length === 0 && (
                  <div className="p-8 text-center text-slate-500">No break glass sessions recorded</div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Create Role Modal */}
      {showCreateRole && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-900">Create Role</h3>
              <button onClick={() => setShowCreateRole(false)}>
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Internal Name</label>
              <input
                type="text"
                value={newRoleName}
                onChange={e => setNewRoleName(e.target.value)}
                placeholder="e.g., field_manager"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Display Name</label>
              <input
                type="text"
                value={newRoleDisplay}
                onChange={e => setNewRoleDisplay(e.target.value)}
                placeholder="e.g., Field Manager"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Color</label>
              <input
                type="color"
                value={newRoleColor}
                onChange={e => setNewRoleColor(e.target.value)}
                className="w-full h-10 border border-slate-300 rounded-lg"
              />
            </div>

            <button
              onClick={handleCreateRole}
              disabled={!newRoleName || !newRoleDisplay}
              className="w-full py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Create Role
            </button>
          </div>
        </div>
      )}

      {/* Break Glass Modal */}
      {showBreakGlassModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-center gap-3 mb-2">
              <AlertTriangle className="w-6 h-6 text-amber-600" />
              <h3 className="text-lg font-semibold text-slate-900">Activate Break Glass</h3>
            </div>

            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <p className="text-sm text-amber-800">
                Break glass mode grants elevated permissions for emergency access. All activations are logged and audited.
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Justification *</label>
              <textarea
                value={breakGlassJustification}
                onChange={e => setBreakGlassJustification(e.target.value)}
                placeholder="Explain why you need elevated access..."
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                rows={3}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Duration (minutes)</label>
              <input
                type="number"
                value={breakGlassDuration}
                onChange={e => setBreakGlassDuration(parseInt(e.target.value) || 30)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Elevated Permissions</label>
              <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto p-2 border border-slate-200 rounded-lg">
                {permissions.map(perm => (
                  <label key={perm.id} className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={breakGlassPermissions.includes(perm.key)}
                      onChange={e => {
                        if (e.target.checked) {
                          setBreakGlassPermissions(prev => [...prev, perm.key]);
                        } else {
                          setBreakGlassPermissions(prev => prev.filter(p => p !== perm.key));
                        }
                      }}
                      className="w-4 h-4 rounded border-slate-300"
                    />
                    <span className="text-slate-600 truncate">{perm.key}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowBreakGlassModal(false)}
                className="flex-1 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={handleActivateBreakGlass}
                disabled={!breakGlassJustification || breakGlassPermissions.length === 0}
                className="flex-1 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 disabled:opacity-50"
              >
                Activate
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

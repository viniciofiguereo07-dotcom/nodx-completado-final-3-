import { useOrg } from '../contexts/OrgContext';
import type { UserRole } from '../types';

const ROLE_HIERARCHY: Record<UserRole, number> = {
  super_admin: 7,
  org_admin: 6,
  project_manager: 5,
  supervisor: 4,
  agent: 3,
  auditor: 2,
  viewer: 1,
};

const ROLE_PERMISSIONS: Record<UserRole, string[]> = {
  super_admin: ['*'],
  org_admin: [
    'territories.*', 'routes.*', 'visits.*', 'forms.*',
    'inventory.*', 'analytics.*', 'members.*', 'devices.*',
    'workflows.*', 'audit.view', 'ai.query',
  ],
  project_manager: [
    'territories.view', 'territories.create', 'territories.edit',
    'routes.*', 'visits.*', 'forms.*', 'inventory.*',
    'analytics.view', 'members.view', 'devices.view',
    'workflows.view', 'workflows.create', 'workflows.execute', 'ai.query',
  ],
  supervisor: [
    'territories.view', 'routes.view', 'routes.create', 'routes.edit',
    'visits.*', 'forms.view', 'forms.create', 'forms.edit', 'forms.submit', 'forms.review',
    'inventory.view', 'inventory.transact', 'analytics.view', 'ai.query',
  ],
  agent: [
    'territories.view', 'routes.view', 'visits.view', 'visits.create', 'visits.edit',
    'forms.view', 'forms.submit', 'inventory.view', 'inventory.transact',
  ],
  auditor: [
    'territories.view', 'routes.view', 'visits.view', 'forms.view',
    'inventory.view', 'analytics.view', 'audit.view', 'members.view',
  ],
  viewer: [
    'territories.view', 'routes.view', 'visits.view', 'forms.view',
    'inventory.view', 'analytics.view',
  ],
};

export function usePermissions() {
  const { role } = useOrg();

  function can(permission: string): boolean {
    if (!role) return false;
    const perms = ROLE_PERMISSIONS[role] ?? [];
    if (perms.includes('*')) return true;
    if (perms.includes(permission)) return true;
    const [mod] = permission.split('.');
    if (perms.includes(`${mod}.*`)) return true;
    return false;
  }

  function hasMinRole(minRole: UserRole): boolean {
    if (!role) return false;
    return ROLE_HIERARCHY[role] >= ROLE_HIERARCHY[minRole];
  }

  return { can, hasMinRole, role };
}

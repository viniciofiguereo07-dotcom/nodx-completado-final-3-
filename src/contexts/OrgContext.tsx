import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import type { Organization, OrgMember, UserRole } from '../types';
import { useAuth } from './AuthContext';

interface OrgContextValue {
  org: Organization | null;
  member: OrgMember | null;
  role: UserRole | null;
  loading: boolean;
  hasOrg: boolean;
  refresh: () => Promise<void>;
  canManage: boolean;
  isSuperAdmin: boolean;
}

const OrgContext = createContext<OrgContextValue | null>(null);

export function OrgProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [org, setOrg] = useState<Organization | null>(null);
  const [member, setMember] = useState<OrgMember | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user) { setOrg(null); setMember(null); setLoading(false); return; }
    setLoading(true);
    const { data: mem } = await supabase
      .from('organization_members')
      .select('*, organizations(*)')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .maybeSingle();

    if (mem) {
      setMember(mem as OrgMember);
      setOrg((mem as unknown as { organizations: Organization }).organizations ?? null);
    } else {
      setMember(null);
      setOrg(null);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => { load(); }, [load]);

  const role = (member?.role as UserRole) ?? null;
  const canManage = role ? ['super_admin', 'org_admin', 'project_manager'].includes(role) : false;
  const isSuperAdmin = role === 'super_admin';

  return (
    <OrgContext.Provider value={{ org, member, role, loading, hasOrg: !!org, refresh: load, canManage, isSuperAdmin }}>
      {children}
    </OrgContext.Provider>
  );
}

export function useOrg() {
  const ctx = useContext(OrgContext);
  if (!ctx) throw new Error('useOrg must be used inside OrgProvider');
  return ctx;
}

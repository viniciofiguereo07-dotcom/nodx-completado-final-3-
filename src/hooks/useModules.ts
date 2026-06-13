import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useOrg } from '../contexts/OrgContext';

export function useModules() {
  const { org } = useOrg();
  const [activeModules, setActiveModules] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!org) { setActiveModules([]); setLoading(false); return; }
    supabase
      .from('organization_modules')
      .select('module_key')
      .eq('organization_id', org.id)
      .eq('is_active', true)
      .then(({ data }) => {
        setActiveModules(data?.map(m => m.module_key) ?? []);
        setLoading(false);
      });
  }, [org]);

  const isActive = (key: string) => activeModules.includes(key);
  return { activeModules, isActive, loading };
}

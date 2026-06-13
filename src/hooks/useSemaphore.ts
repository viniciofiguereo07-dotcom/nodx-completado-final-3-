import { useEffect, useState, useCallback } from 'react';
import { useOrg } from '../contexts/OrgContext';
import {
  semaphoreEngine,
  SemaphoreRule,
  SemaphoreResult,
  SemaphoreStatus,
  worstStatus,
  STATUS_PRIORITY,
} from '../services/SemaphoreEngine';

export function useSemaphoreRules() {
  const { org } = useOrg();
  const [rules, setRules]     = useState<SemaphoreRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!org) { setRules([]); setLoading(false); return; }
    setLoading(true);
    setError(null);
    try {
      setRules(await semaphoreEngine.getRules(org.id));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [org]);

  useEffect(() => { load(); }, [load]);

  const createRule = useCallback(async (
    rule: Omit<SemaphoreRule, 'id' | 'created_at' | 'updated_at'>
  ) => {
    const created = await semaphoreEngine.createRule(rule);
    setRules(prev => [...prev, created]);
    return created;
  }, []);

  const updateRule = useCallback(async (id: string, patch: Partial<SemaphoreRule>) => {
    await semaphoreEngine.updateRule(id, patch);
    setRules(prev => prev.map(r => r.id === id ? { ...r, ...patch } : r));
  }, []);

  const deleteRule = useCallback(async (id: string) => {
    await semaphoreEngine.deleteRule(id);
    setRules(prev => prev.filter(r => r.id !== id));
  }, []);

  return { rules, loading, error, reload: load, createRule, updateRule, deleteRule };
}

export function useSemaphoreResults(opts?: {
  ruleId?: string;
  subjectType?: string;
  subjectId?: string;
  status?: SemaphoreStatus;
  limit?: number;
}) {
  const { org } = useOrg();
  const [results, setResults]   = useState<SemaphoreResult[]>([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!org) { setResults([]); setLoading(false); return; }
    setLoading(true);
    setError(null);
    try {
      setResults(await semaphoreEngine.getResults(org.id, opts));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [org, opts?.ruleId, opts?.subjectType, opts?.subjectId, opts?.status, opts?.limit]);

  useEffect(() => { load(); }, [load]);

  const evaluate = useCallback(async (
    ruleId: string,
    value: number,
    subjectType = 'organization',
    subjectId?: string,
    notes?: string
  ) => {
    if (!org) return;
    const result = await semaphoreEngine.evaluate(org.id, ruleId, value, subjectType, subjectId, notes);
    setResults(prev => [result, ...prev]);
    return result;
  }, [org]);

  return { results, loading, error, reload: load, evaluate };
}

export function useSemaphoreStatus() {
  const { org } = useOrg();
  const [latestResults, setLatestResults]         = useState<SemaphoreResult[]>([]);
  const [overallStatus, setOverallStatus]         = useState<SemaphoreStatus>('green');
  const [summary, setSummary]                     = useState<Record<SemaphoreStatus, number>>({ green: 0, yellow: 0, orange: 0, red: 0, critical: 0 });
  const [loading, setLoading]                     = useState(true);
  const [error, setError]                         = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!org) { setLoading(false); return; }
    setLoading(true);
    setError(null);
    try {
      const [latest, overall, sum] = await Promise.all([
        semaphoreEngine.getLatestResults(org.id),
        semaphoreEngine.getOrganizationOverallStatus(org.id),
        semaphoreEngine.getStatusSummary(org.id),
      ]);
      setLatestResults(latest);
      setOverallStatus(overall);
      setSummary(sum);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [org]);

  useEffect(() => { load(); }, [load]);

  // Alerts: results where status >= orange
  const alerts = latestResults.filter(r => STATUS_PRIORITY[r.status] >= STATUS_PRIORITY['orange']);

  // Group by status
  const byStatus = latestResults.reduce<Record<SemaphoreStatus, SemaphoreResult[]>>(
    (acc, r) => { acc[r.status] = [...(acc[r.status] ?? []), r]; return acc; },
    { green: [], yellow: [], orange: [], red: [], critical: [] }
  );

  const worstOfList = (list: SemaphoreResult[]): SemaphoreStatus =>
    worstStatus(list.map(r => r.status));

  return {
    latestResults,
    overallStatus,
    summary,
    alerts,
    byStatus,
    worstOfList,
    loading,
    error,
    reload: load,
  };
}

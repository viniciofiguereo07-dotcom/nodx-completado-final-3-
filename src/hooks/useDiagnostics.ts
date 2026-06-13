import { useEffect, useState, useCallback } from 'react';
import { useOrg } from '../contexts/OrgContext';
import { diagnosticEngine } from '../services/DiagnosticEngine';
import type {
  DiagnosticFinding,
  DiagnosticSeverity,
  DiagnosticFindingType,
  DiagnosticExecution,
  RecommendationInstance,
  RecommendationAction,
  DiagnosticCatalogItem,
  RecommendationCatalogItem,
  DiagnosticRule,
} from '../types';

// ---------------------------------------------------------------------------
// useDiagnostics — rules, catalog, executions overview
// ---------------------------------------------------------------------------
export function useDiagnostics() {
  const { org } = useOrg();
  const [rules, setRules]               = useState<DiagnosticRule[]>([]);
  const [catalog, setCatalog]           = useState<DiagnosticCatalogItem[]>([]);
  const [executions, setExecutions]     = useState<DiagnosticExecution[]>([]);
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!org) { setLoading(false); return; }
    setLoading(true);
    setError(null);
    try {
      const [r, c, e] = await Promise.allSettled([
        diagnosticEngine.getRules(org.id),
        diagnosticEngine.getCatalog(org.id),
        diagnosticEngine.getExecutions(org.id),
      ]);
      if (r.status === 'fulfilled') setRules(r.value);
      if (c.status === 'fulfilled') setCatalog(c.value);
      if (e.status === 'fulfilled') setExecutions(e.value);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [org]);

  useEffect(() => { load(); }, [load]);

  return { rules, catalog, executions, loading, error, reload: load };
}

// ---------------------------------------------------------------------------
// useFindings — paginated findings with filters
// ---------------------------------------------------------------------------
export function useFindings(opts?: {
  status?: DiagnosticFinding['status'];
  severity?: DiagnosticSeverity;
  findingType?: DiagnosticFindingType;
  limit?: number;
}) {
  const { org } = useOrg();
  const [findings, setFindings] = useState<DiagnosticFinding[]>([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!org) { setLoading(false); return; }
    setLoading(true);
    setError(null);
    try {
      setFindings(await diagnosticEngine.getFindings(org.id, opts));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [org, opts?.status, opts?.severity, opts?.findingType, opts?.limit]);

  useEffect(() => { load(); }, [load]);

  const acknowledge = useCallback(async (id: string, userId: string) => {
    await diagnosticEngine.acknowledgeFinding(id, userId);
    setFindings(prev => prev.map(f => f.id === id ? { ...f, status: 'acknowledged' as const } : f));
  }, []);

  const resolve = useCallback(async (id: string, userId: string) => {
    await diagnosticEngine.resolveFinding(id, userId);
    setFindings(prev => prev.map(f => f.id === id ? { ...f, status: 'resolved' as const } : f));
  }, []);

  const dismiss = useCallback(async (id: string) => {
    await diagnosticEngine.dismissFinding(id);
    setFindings(prev => prev.map(f => f.id === id ? { ...f, status: 'dismissed' as const } : f));
  }, []);

  return { findings, loading, error, reload: load, acknowledge, resolve, dismiss };
}

// ---------------------------------------------------------------------------
// useRecommendations — active recommendations with actions
// ---------------------------------------------------------------------------
export function useRecommendations() {
  const { org } = useOrg();
  const [recommendations, setRecommendations] = useState<RecommendationInstance[]>([]);
  const [recCatalog, setRecCatalog]           = useState<RecommendationCatalogItem[]>([]);
  const [loading, setLoading]                 = useState(true);
  const [error, setError]                     = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!org) { setLoading(false); return; }
    setLoading(true);
    setError(null);
    try {
      const [recs, cat] = await Promise.allSettled([
        diagnosticEngine.getRecommendations(org.id),
        diagnosticEngine.getRecommendationCatalog(org.id),
      ]);
      if (recs.status === 'fulfilled') setRecommendations(recs.value);
      if (cat.status === 'fulfilled') setRecCatalog(cat.value);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [org]);

  useEffect(() => { load(); }, [load]);

  const updateStatus = useCallback(async (id: string, status: RecommendationInstance['status']) => {
    await diagnosticEngine.updateRecommendation(id, { status });
    setRecommendations(prev => prev.map(r => r.id === id ? { ...r, status } : r));
  }, []);

  const getActions = useCallback(async (recommendationId: string) => {
    return diagnosticEngine.getRecommendationActions(recommendationId);
  }, []);

  return { recommendations, recCatalog, loading, error, reload: load, updateStatus, getActions };
}

// ---------------------------------------------------------------------------
// useDiagnosticExecution — single execution + its findings
// ---------------------------------------------------------------------------
export function useDiagnosticExecution(executionId: string | null) {
  const { org } = useOrg();
  const [execution, setExecution] = useState<DiagnosticExecution | null>(null);
  const [findings, setFindings]   = useState<DiagnosticFinding[]>([]);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState<string | null>(null);

  useEffect(() => {
    if (!org || !executionId) { setExecution(null); setFindings([]); return; }
    setLoading(true);
    setError(null);
    Promise.allSettled([
      diagnosticEngine.getExecutions(org.id, 1),
      diagnosticEngine.getFindings(org.id, { limit: 100 }),
    ]).then(([execRes, findRes]) => {
      if (execRes.status === 'fulfilled') {
        const match = execRes.value.find(e => e.id === executionId);
        setExecution(match ?? null);
      }
      if (findRes.status === 'fulfilled') {
        setFindings(findRes.value.filter(f => f.execution_id === executionId));
      }
    }).catch(e => setError((e as Error).message))
      .finally(() => setLoading(false));
  }, [org, executionId]);

  return { execution, findings, loading, error };
}

// ---------------------------------------------------------------------------
// usePriorityFindings — top unresolved findings by priority
// ---------------------------------------------------------------------------
export function usePriorityFindings(limit = 10) {
  const { org } = useOrg();
  const [findings, setFindings] = useState<DiagnosticFinding[]>([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!org) { setLoading(false); return; }
    setLoading(true);
    setError(null);
    try {
      const all = await diagnosticEngine.getFindings(org.id, { status: 'open', limit: limit * 3 });
      // Sort by priority descending and take top `limit`
      const sorted = all
        .filter(f => f.status === 'open' || f.status === 'acknowledged')
        .sort((a, b) => (b.priority_score ?? 0) - (a.priority_score ?? 0))
        .slice(0, limit);
      setFindings(sorted);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [org, limit]);

  useEffect(() => { load(); }, [load]);

  return { findings, loading, error, reload: load };
}

import { useEffect, useState, useCallback } from 'react';
import { useOrg } from '../contexts/OrgContext';
import {
  tabulationEngine,
  TabulationConfig,
  TabulationResult,
  ScoreResult,
  CompositeIndex,
  SubjectType,
} from '../services/TabulationEngine';

export function useTabulation() {
  const { org } = useOrg();
  const [configs, setConfigs]   = useState<TabulationConfig[]>([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState<string | null>(null);

  const loadConfigs = useCallback(async () => {
    if (!org) { setConfigs([]); setLoading(false); return; }
    setLoading(true);
    setError(null);
    try {
      const data = await tabulationEngine.getConfigs(org.id);
      setConfigs(data);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [org]);

  useEffect(() => { loadConfigs(); }, [loadConfigs]);

  const createConfig = useCallback(async (
    cfg: Omit<TabulationConfig, 'id' | 'created_at' | 'updated_at'>
  ) => {
    const created = await tabulationEngine.createConfig(cfg);
    setConfigs(prev => [...prev, created]);
    return created;
  }, []);

  const updateConfig = useCallback(async (id: string, patch: Partial<TabulationConfig>) => {
    await tabulationEngine.updateConfig(id, patch);
    setConfigs(prev => prev.map(c => c.id === id ? { ...c, ...patch } : c));
  }, []);

  const deleteConfig = useCallback(async (id: string) => {
    await tabulationEngine.deleteConfig(id);
    setConfigs(prev => prev.filter(c => c.id !== id));
  }, []);

  return { configs, loading, error, reload: loadConfigs, createConfig, updateConfig, deleteConfig };
}

export function useTabulationResults(opts?: {
  configId?: string;
  subjectType?: SubjectType;
  subjectId?: string;
  limit?: number;
}) {
  const { org } = useOrg();
  const [results, setResults]   = useState<TabulationResult[]>([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!org) { setResults([]); setLoading(false); return; }
    setLoading(true);
    setError(null);
    try {
      const data = await tabulationEngine.getResults(org.id, opts);
      setResults(data);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [org, opts?.configId, opts?.subjectType, opts?.subjectId, opts?.limit]);

  useEffect(() => { load(); }, [load]);

  return { results, loading, error, reload: load };
}

export function useScoreResults(tabulationId: string | null) {
  const [scores, setScores]   = useState<ScoreResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState<string | null>(null);

  useEffect(() => {
    if (!tabulationId) { setScores([]); return; }
    setLoading(true);
    setError(null);
    tabulationEngine.getScoreResults(tabulationId)
      .then(setScores)
      .catch(e => setError((e as Error).message))
      .finally(() => setLoading(false));
  }, [tabulationId]);

  return { scores, loading, error };
}

export function useCompositeIndexes() {
  const { org } = useOrg();
  const [indexes, setIndexes]   = useState<CompositeIndex[]>([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState<string | null>(null);

  useEffect(() => {
    if (!org) { setIndexes([]); setLoading(false); return; }
    setLoading(true);
    tabulationEngine.getCompositeIndexes(org.id)
      .then(setIndexes)
      .catch(e => setError((e as Error).message))
      .finally(() => setLoading(false));
  }, [org]);

  const createIndex = useCallback(async (
    idx: Omit<CompositeIndex, 'id' | 'created_at' | 'updated_at'>
  ) => {
    const created = await tabulationEngine.createCompositeIndex(idx);
    setIndexes(prev => [...prev, created]);
    return created;
  }, []);

  return { indexes, loading, error, createIndex };
}

export function useHistoricalEvolution(
  configId: string | null,
  subjectType?: SubjectType,
  subjectId?: string,
  limit = 30
) {
  const { org } = useOrg();
  const [points, setPoints] = useState<Array<{ date: string; weighted_score: number | null; percentage: number | null }>>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!org || !configId) { setPoints([]); return; }
    setLoading(true);
    tabulationEngine.getHistoricalEvolution(org.id, configId, subjectType, subjectId, limit)
      .then(setPoints)
      .catch(() => setPoints([]))
      .finally(() => setLoading(false));
  }, [org, configId, subjectType, subjectId, limit]);

  return { points, loading };
}

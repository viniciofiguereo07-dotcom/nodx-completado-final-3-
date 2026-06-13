import { useEffect, useState, useCallback } from 'react';
import { useOrg } from '../contexts/OrgContext';
import {
  indicatorEngine,
  KPIResult,
  BaselineEndline,
  TrendPoint,
  AggregatedIndicator,
  IndicatorSector,
} from '../services/IndicatorEngine';
import type { IndicatorCatalogItem, IndicatorValue } from '../types';

export function useIndicatorCatalog(sector?: IndicatorSector) {
  const { org } = useOrg();
  const [catalog, setCatalog] = useState<IndicatorCatalogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!org) { setCatalog([]); setLoading(false); return; }
    setLoading(true);
    setError(null);
    try {
      setCatalog(await indicatorEngine.getCatalog(org.id, sector));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [org, sector]);

  useEffect(() => { load(); }, [load]);

  const createIndicator = useCallback(async (
    ind: Omit<IndicatorCatalogItem, 'id' | 'created_at' | 'updated_at' | 'children' | 'thresholds'>
  ) => {
    const created = await indicatorEngine.createIndicator(ind);
    setCatalog(prev => [...prev, created]);
    return created;
  }, []);

  return { catalog, loading, error, reload: load, createIndicator };
}

export function useIndicatorValues(opts?: {
  indicatorId?: string;
  geoUnitId?: string;
  projectId?: string;
  from?: string;
  to?: string;
  limit?: number;
}) {
  const { org } = useOrg();
  const [values, setValues]   = useState<IndicatorValue[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!org) { setValues([]); setLoading(false); return; }
    setLoading(true);
    setError(null);
    try {
      setValues(await indicatorEngine.getValues(org.id, opts));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [org, opts?.indicatorId, opts?.geoUnitId, opts?.projectId, opts?.from, opts?.to, opts?.limit]);

  useEffect(() => { load(); }, [load]);

  const recordValue = useCallback(async (
    value: Omit<IndicatorValue, 'id' | 'created_at' | 'indicator'>
  ) => {
    const saved = await indicatorEngine.recordValue(value);
    setValues(prev => [saved, ...prev]);
    return saved;
  }, []);

  return { values, loading, error, reload: load, recordValue };
}

export function useKPIs(sector?: IndicatorSector) {
  const { org } = useOrg();
  const [kpis, setKpis]       = useState<KPIResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!org) { setKpis([]); setLoading(false); return; }
    setLoading(true);
    setError(null);
    try {
      setKpis(await indicatorEngine.generateKPIs(org.id, sector));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [org, sector]);

  useEffect(() => { load(); }, [load]);

  return { kpis, loading, error, reload: load };
}

export function useBaselineEndline(indicatorId: string | null) {
  const { org } = useOrg();
  const [data, setData]       = useState<BaselineEndline | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState<string | null>(null);

  useEffect(() => {
    if (!org || !indicatorId) { setData(null); return; }
    setLoading(true);
    setError(null);
    indicatorEngine.getBaselineEndline(org.id, indicatorId)
      .then(setData)
      .catch(e => setError((e as Error).message))
      .finally(() => setLoading(false));
  }, [org, indicatorId]);

  return { data, loading, error };
}

export function useTrendSeries(indicatorId: string | null, limit = 24) {
  const { org } = useOrg();
  const [points, setPoints]   = useState<TrendPoint[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState<string | null>(null);

  useEffect(() => {
    if (!org || !indicatorId) { setPoints([]); return; }
    setLoading(true);
    setError(null);
    indicatorEngine.getTrendSeries(org.id, indicatorId, limit)
      .then(setPoints)
      .catch(e => setError((e as Error).message))
      .finally(() => setLoading(false));
  }, [org, indicatorId, limit]);

  return { points, loading, error };
}

export function useAggregatedIndicators(indicatorIds: string[], geoUnitId?: string) {
  const { org } = useOrg();
  const [aggregated, setAggregated] = useState<AggregatedIndicator[]>([]);
  const [loading, setLoading]       = useState(false);

  useEffect(() => {
    if (!org || indicatorIds.length === 0) { setAggregated([]); return; }
    setLoading(true);
    indicatorEngine.getAggregated(org.id, indicatorIds, geoUnitId)
      .then(setAggregated)
      .catch(() => setAggregated([]))
      .finally(() => setLoading(false));
  }, [org, indicatorIds.join(','), geoUnitId]);

  return { aggregated, loading };
}

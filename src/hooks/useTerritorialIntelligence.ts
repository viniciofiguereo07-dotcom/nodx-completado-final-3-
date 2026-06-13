import { useEffect, useState, useCallback } from 'react';
import { useOrg } from '../contexts/OrgContext';
import { territorialIntelligenceEngine } from '../services/TerritorialIntelligenceEngine';
import type {
  TerritorialCoverageMetric,
  TerritorialDensityMetric,
  TerritorialOpportunityMetric,
  TerritorialGapAnalysis,
} from '../types';
import type { CoverageResult, GapResult } from '../services/TerritorialIntelligenceEngine';

// ---------------------------------------------------------------------------
// useTerritorialCoverage
// ---------------------------------------------------------------------------
export function useTerritorialCoverage(geoLevel: string = 'municipality') {
  const { org } = useOrg();
  const [metrics, setMetrics] = useState<TerritorialCoverageMetric[]>([]);
  const [liveCoverage, setLiveCoverage] = useState<CoverageResult[]>([]);
  const [gaps, setGaps] = useState<GapResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!org) { setLoading(false); return; }
    setLoading(true);
    setError(null);
    try {
      const [persisted, coverage, gapResults] = await Promise.all([
        territorialIntelligenceEngine.getCoverageMetrics(org.id, geoLevel),
        territorialIntelligenceEngine.calculateCoverage(org.id, geoLevel),
        territorialIntelligenceEngine.detectCoverageGaps(org.id, geoLevel),
      ]);
      setMetrics(persisted);
      setLiveCoverage(coverage);
      setGaps(gapResults);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [org, geoLevel]);

  useEffect(() => { load(); }, [load]);

  const recalculate = useCallback(async () => {
    if (!org) return;
    try {
      const coverage = await territorialIntelligenceEngine.calculateCoverage(org.id, geoLevel);
      await territorialIntelligenceEngine.saveCoverageMetrics(org.id, coverage);
      setLiveCoverage(coverage);
    } catch (e) {
      setError((e as Error).message);
    }
  }, [org, geoLevel]);

  return { metrics, liveCoverage, gaps, loading, error, reload: load, recalculate };
}

// ---------------------------------------------------------------------------
// useTerritorialDensity
// ---------------------------------------------------------------------------
export function useTerritorialDensity(geoLevel: string = 'municipality') {
  const { org } = useOrg();
  const [metrics, setMetrics] = useState<TerritorialDensityMetric[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!org) { setLoading(false); return; }
    setLoading(true);
    setError(null);
    try {
      setMetrics(await territorialIntelligenceEngine.getDensityMetrics(org.id, geoLevel));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [org, geoLevel]);

  useEffect(() => { load(); }, [load]);

  const recalculate = useCallback(async () => {
    if (!org) return;
    try {
      const density = await territorialIntelligenceEngine.calculateDensity(org.id, geoLevel);
      await territorialIntelligenceEngine.saveDensityMetrics(org.id, density);
      setMetrics(await territorialIntelligenceEngine.getDensityMetrics(org.id, geoLevel));
    } catch (e) {
      setError((e as Error).message);
    }
  }, [org, geoLevel]);

  return { metrics, loading, error, reload: load, recalculate };
}

// ---------------------------------------------------------------------------
// useTerritorialOpportunities
// ---------------------------------------------------------------------------
export function useTerritorialOpportunities() {
  const { org } = useOrg();
  const [opportunities, setOpportunities] = useState<TerritorialOpportunityMetric[]>([]);
  const [gapAnalysis, setGapAnalysis] = useState<TerritorialGapAnalysis[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!org) { setLoading(false); return; }
    setLoading(true);
    setError(null);
    try {
      const [opp, gaps] = await Promise.all([
        territorialIntelligenceEngine.getOpportunityMetrics(org.id),
        territorialIntelligenceEngine.getGapAnalysis(org.id),
      ]);
      setOpportunities(opp);
      setGapAnalysis(gaps);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [org]);

  useEffect(() => { load(); }, [load]);

  const detectAll = useCallback(async (geoLevel: string = 'municipality') => {
    if (!org) return;
    try {
      const [growth, expansion, gaps] = await Promise.all([
        territorialIntelligenceEngine.detectGrowthZones(org.id, geoLevel),
        territorialIntelligenceEngine.detectExpansionOpportunities(org.id, geoLevel),
        territorialIntelligenceEngine.detectCoverageGaps(org.id, geoLevel),
      ]);
      const all = [...growth, ...expansion];
      await territorialIntelligenceEngine.saveOpportunityMetrics(org.id, all);
      await territorialIntelligenceEngine.saveGapAnalysis(org.id, gaps);
      setGapAnalysis(await territorialIntelligenceEngine.getGapAnalysis(org.id));
    } catch (e) {
      setError((e as Error).message);
    }
  }, [org]);

  return { opportunities, gapAnalysis, loading, error, reload: load, detectAll };
}

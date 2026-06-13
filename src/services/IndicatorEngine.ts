import { supabase } from '../lib/supabase';
import type { IndicatorCatalogItem, IndicatorThreshold, IndicatorValue } from '../types';

export type IndicatorPeriod = 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'annual' | 'custom';
export type IndicatorSector = 'WASH' | 'Food Security' | 'Nutrition' | 'Education' | 'Protection' | 'Shelter' | 'Livelihoods' | 'Agriculture' | 'Health' | 'M&E' | string;

export interface KPIResult {
  indicator_id: string;
  indicator_name: string;
  indicator_code: string;
  sector: string | null;
  unit: string | null;
  current_value: number | null;
  baseline_value: number | null;
  endline_value: number | null;
  target_value: number | null;
  progress_pct: number | null;
  compliance_pct: number | null;
  trend: 'improving' | 'stable' | 'declining' | 'unknown';
  trend_slope: number | null;
  period_start: string | null;
  period_end: string | null;
  quality_score: number | null;
}

export interface BaselineEndline {
  indicator_id: string;
  baseline_value: number | null;
  baseline_period: string | null;
  endline_value: number | null;
  endline_period: string | null;
  change_absolute: number | null;
  change_pct: number | null;
  achieved: boolean | null;
}

export interface TrendPoint {
  date: string;
  value: number | null;
  quality_score: number | null;
}

export interface AggregatedIndicator {
  indicator_id: string;
  geo_unit_id: string | null;
  period_start: string | null;
  period_end: string | null;
  count: number;
  sum: number | null;
  average: number | null;
  min: number | null;
  max: number | null;
  latest: number | null;
}

export interface IndicatorTarget {
  indicator_id: string;
  target_value: number;
  target_date: string | null;
  notes: string | null;
}

// Client-side targets map (until a targets table is added)
const _targets = new Map<string, IndicatorTarget>();

function computeTrend(points: TrendPoint[]): { trend: KPIResult['trend']; slope: number | null } {
  const valid = points.filter(p => p.value !== null);
  if (valid.length < 2) return { trend: 'unknown', slope: null };

  const n = valid.length;
  const xMean = (n - 1) / 2;
  const yMean = valid.reduce((s, p) => s + (p.value ?? 0), 0) / n;

  let num = 0;
  let den = 0;
  valid.forEach((p, i) => {
    num += (i - xMean) * ((p.value ?? 0) - yMean);
    den += (i - xMean) ** 2;
  });

  const slope = den !== 0 ? num / den : 0;

  let trend: KPIResult['trend'] = 'stable';
  if (Math.abs(slope) < 0.01) trend = 'stable';
  else if (slope > 0) trend = 'improving';
  else trend = 'declining';

  return { trend, slope };
}

export class IndicatorEngine {
  // ── Catalog ───────────────────────────────────────────────

  async getCatalog(organizationId: string, sector?: IndicatorSector): Promise<IndicatorCatalogItem[]> {
    let q = supabase
      .from('indicator_catalog')
      .select('*, thresholds:indicator_thresholds(*)')
      .or(`organization_id.is.null,organization_id.eq.${organizationId}`)
      .order('sort_order');

    if (sector) q = q.eq('sector', sector);

    const { data, error } = await q;
    if (error) throw error;
    return (data ?? []) as IndicatorCatalogItem[];
  }

  async getIndicator(id: string): Promise<IndicatorCatalogItem | null> {
    const { data, error } = await supabase
      .from('indicator_catalog')
      .select('*, children:indicator_catalog(*), thresholds:indicator_thresholds(*)')
      .eq('id', id)
      .maybeSingle();
    if (error) throw error;
    return data as IndicatorCatalogItem | null;
  }

  async createIndicator(
    indicator: Omit<IndicatorCatalogItem, 'id' | 'created_at' | 'updated_at' | 'children' | 'thresholds'>
  ): Promise<IndicatorCatalogItem> {
    const { data, error } = await supabase
      .from('indicator_catalog')
      .insert(indicator)
      .select()
      .single();
    if (error) throw error;
    return data as IndicatorCatalogItem;
  }

  // ── Thresholds ────────────────────────────────────────────

  async getThresholds(indicatorId: string): Promise<IndicatorThreshold[]> {
    const { data, error } = await supabase
      .from('indicator_thresholds')
      .select('*')
      .eq('indicator_id', indicatorId);
    if (error) throw error;
    return (data ?? []) as IndicatorThreshold[];
  }

  async upsertThreshold(threshold: Omit<IndicatorThreshold, 'id' | 'created_at'>): Promise<void> {
    const { error } = await supabase
      .from('indicator_thresholds')
      .insert(threshold);
    if (error) throw error;
  }

  // ── Values ────────────────────────────────────────────────

  async getValues(
    organizationId: string,
    opts?: {
      indicatorId?: string;
      geoUnitId?: string;
      projectId?: string;
      from?: string;
      to?: string;
      limit?: number;
    }
  ): Promise<IndicatorValue[]> {
    let q = supabase
      .from('indicator_values')
      .select('*, indicator:indicator_catalog(id,code,name,sector,unit,data_type)')
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false })
      .limit(opts?.limit ?? 200);

    if (opts?.indicatorId) q = q.eq('indicator_id', opts.indicatorId);
    if (opts?.geoUnitId)   q = q.eq('geo_unit_id', opts.geoUnitId);
    if (opts?.projectId)   q = q.eq('project_id', opts.projectId);
    if (opts?.from)        q = q.gte('created_at', opts.from);
    if (opts?.to)          q = q.lte('created_at', opts.to);

    const { data, error } = await q;
    if (error) throw error;
    return (data ?? []) as IndicatorValue[];
  }

  async recordValue(value: Omit<IndicatorValue, 'id' | 'created_at' | 'indicator'>): Promise<IndicatorValue> {
    const { data, error } = await supabase
      .from('indicator_values')
      .insert(value)
      .select()
      .single();
    if (error) throw error;
    return data as IndicatorValue;
  }

  // ── KPI Generation ────────────────────────────────────────

  async generateKPIs(organizationId: string, sector?: IndicatorSector): Promise<KPIResult[]> {
    const [catalog, values] = await Promise.all([
      this.getCatalog(organizationId, sector),
      this.getValues(organizationId, { limit: 1000 }),
    ]);

    return catalog.map(ind => {
      const indValues = values.filter(v => v.indicator_id === ind.id);
      const numericValues = indValues
        .map(v => ({ date: v.created_at, value: v.value, quality_score: v.quality_score }))
        .filter(v => v.value !== null)
        .sort((a, b) => a.date.localeCompare(b.date));

      const current = numericValues[numericValues.length - 1]?.value ?? null;
      const { trend, slope } = computeTrend(numericValues);

      const target = _targets.get(ind.id);
      const compliance = target && current !== null
        ? Math.min(100, (current / target.target_value) * 100)
        : null;

      return {
        indicator_id: ind.id,
        indicator_name: ind.name,
        indicator_code: ind.code,
        sector: ind.sector,
        unit: ind.unit,
        current_value: current,
        baseline_value: numericValues[0]?.value ?? null,
        endline_value: null,
        target_value: target?.target_value ?? null,
        progress_pct: null,
        compliance_pct: compliance,
        trend,
        trend_slope: slope,
        period_start: numericValues[0]?.date ?? null,
        period_end: numericValues[numericValues.length - 1]?.date ?? null,
        quality_score: current !== null
          ? (indValues.find(v => v.value === current)?.quality_score ?? null)
          : null,
      };
    });
  }

  // ── Baseline / Endline ────────────────────────────────────

  async getBaselineEndline(
    organizationId: string,
    indicatorId: string
  ): Promise<BaselineEndline> {
    const values = await this.getValues(organizationId, { indicatorId, limit: 500 });
    const sorted = values
      .filter(v => v.value !== null)
      .sort((a, b) => (a.period_start ?? a.created_at).localeCompare(b.period_start ?? b.created_at));

    const baseline = sorted[0] ?? null;
    const endline  = sorted[sorted.length - 1] ?? null;

    const changeAbs = baseline && endline && baseline.value !== null && endline.value !== null
      ? endline.value - baseline.value
      : null;
    const changePct = baseline?.value && changeAbs !== null
      ? (changeAbs / baseline.value) * 100
      : null;

    const target = _targets.get(indicatorId);
    const achieved = target && endline?.value !== null
      ? (endline.value ?? 0) >= target.target_value
      : null;

    return {
      indicator_id: indicatorId,
      baseline_value: baseline?.value ?? null,
      baseline_period: baseline?.period_start ?? null,
      endline_value: endline?.value ?? null,
      endline_period: endline?.period_start ?? null,
      change_absolute: changeAbs,
      change_pct: changePct,
      achieved,
    };
  }

  // ── Trend Analysis ────────────────────────────────────────

  async getTrendSeries(
    organizationId: string,
    indicatorId: string,
    limit = 24
  ): Promise<TrendPoint[]> {
    const { data, error } = await supabase
      .from('indicator_values')
      .select('created_at, value, quality_score')
      .eq('organization_id', organizationId)
      .eq('indicator_id', indicatorId)
      .not('value', 'is', null)
      .order('created_at', { ascending: true })
      .limit(limit);

    if (error) throw error;

    return (data ?? []).map(r => ({
      date: r.created_at,
      value: r.value,
      quality_score: r.quality_score,
    }));
  }

  // ── Aggregation ───────────────────────────────────────────

  async getAggregated(
    organizationId: string,
    indicatorIds: string[],
    geoUnitId?: string
  ): Promise<AggregatedIndicator[]> {
    const results: AggregatedIndicator[] = [];

    for (const iid of indicatorIds) {
      const values = await this.getValues(organizationId, {
        indicatorId: iid,
        geoUnitId,
        limit: 500,
      });
      const nums = values.map(v => v.value).filter((v): v is number => v !== null);
      const sorted = values.sort((a, b) => a.created_at.localeCompare(b.created_at));

      results.push({
        indicator_id: iid,
        geo_unit_id: geoUnitId ?? null,
        period_start: sorted[0]?.period_start ?? null,
        period_end: sorted[sorted.length - 1]?.period_end ?? null,
        count: nums.length,
        sum: nums.length ? nums.reduce((a, b) => a + b, 0) : null,
        average: nums.length ? nums.reduce((a, b) => a + b, 0) / nums.length : null,
        min: nums.length ? Math.min(...nums) : null,
        max: nums.length ? Math.max(...nums) : null,
        latest: nums.length ? nums[nums.length - 1] : null,
      });
    }

    return results;
  }

  // ── Compliance calculation ────────────────────────────────

  computeCompliance(currentValue: number, targetValue: number, higherIsBetter = true): number {
    if (targetValue === 0) return 0;
    const ratio = currentValue / targetValue;
    return higherIsBetter
      ? Math.min(100, ratio * 100)
      : Math.max(0, (2 - ratio) * 100);
  }

  // ── Threshold check ───────────────────────────────────────

  checkThreshold(value: number, thresholds: IndicatorThreshold[]): IndicatorThreshold | null {
    for (const t of thresholds) {
      const aboveMin = t.min_value === null || value >= t.min_value;
      const belowMax = t.max_value === null || value <= t.max_value;
      if (aboveMin && belowMax) return t;
    }
    return null;
  }

  // ── Target management (in-memory helper) ─────────────────

  setTarget(target: IndicatorTarget): void {
    _targets.set(target.indicator_id, target);
  }

  getTarget(indicatorId: string): IndicatorTarget | undefined {
    return _targets.get(indicatorId);
  }
}

export const indicatorEngine = new IndicatorEngine();

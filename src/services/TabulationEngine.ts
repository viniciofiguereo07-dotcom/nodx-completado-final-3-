import { supabase } from '../lib/supabase';

export type ScoringType =
  | 'score'
  | 'weighted_score'
  | 'percentage'
  | 'category'
  | 'rating'
  | 'index'
  | 'composite'
  | 'aggregation';

export type SubjectType =
  | 'individual'
  | 'household'
  | 'community'
  | 'commercial'
  | 'territory'
  | 'route'
  | 'organization';

export interface FieldWeight {
  field_key: string;
  field_label?: string;
  weight: number;
  max_value?: number;
  category_bands?: CategoryBand[];
}

export interface CategoryBand {
  label: string;
  min: number;
  max: number;
  rating?: string;
}

export interface TabulationConfig {
  id: string;
  organization_id: string;
  form_template_id: string | null;
  name: string;
  description: string | null;
  scoring_type: ScoringType;
  field_weights: FieldWeight[];
  category_rules: Record<string, unknown>[];
  aggregation_cfg: Record<string, unknown>;
  output_levels: SubjectType[];
  is_active: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface TabulationResult {
  id: string;
  organization_id: string;
  config_id: string | null;
  form_submission_id: string | null;
  subject_type: SubjectType;
  subject_id: string | null;
  period_start: string | null;
  period_end: string | null;
  scoring_type: string;
  raw_score: number | null;
  weighted_score: number | null;
  max_possible_score: number | null;
  percentage: number | null;
  category: string | null;
  rating: string | null;
  index_value: number | null;
  composite_score: number | null;
  aggregations: Record<string, unknown>;
  cross_tabs: Record<string, unknown>;
  comparisons: Record<string, unknown>;
  field_scores: Record<string, unknown>;
  metadata: Record<string, unknown>;
  calculated_at: string;
  created_at: string;
}

export interface ScoreResult {
  id: string;
  organization_id: string;
  tabulation_id: string | null;
  field_key: string;
  field_label: string | null;
  raw_value: number | null;
  weight: number;
  weighted_value: number | null;
  max_value: number | null;
  percentage: number | null;
  category: string | null;
  band_label: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface CompositeIndex {
  id: string;
  organization_id: string;
  name: string;
  code: string;
  description: string | null;
  component_weights: ComponentWeight[];
  normalization: 'min_max' | 'z_score' | 'percentile' | 'raw';
  output_range_min: number;
  output_range_max: number;
  is_active: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface ComponentWeight {
  indicator_id?: string;
  metric_key?: string;
  label: string;
  weight: number;
  value?: number;
}

interface CalculationInput {
  organizationId: string;
  formSubmissionId?: string;
  subjectType?: SubjectType;
  subjectId?: string;
  data: Record<string, unknown>;
  config: TabulationConfig;
  periodStart?: string;
  periodEnd?: string;
}

function resolveNumeric(v: unknown): number | null {
  if (typeof v === 'number') return v;
  if (typeof v === 'string') {
    const n = parseFloat(v);
    return isNaN(n) ? null : n;
  }
  return null;
}

function resolveCategory(value: number, bands: CategoryBand[]): { category: string; band_label: string } | null {
  for (const b of bands) {
    if (value >= b.min && value <= b.max) {
      return { category: b.rating ?? b.label, band_label: b.label };
    }
  }
  return null;
}

export function computeWeightedScore(
  data: Record<string, unknown>,
  fieldWeights: FieldWeight[]
): {
  raw_score: number;
  weighted_score: number;
  max_possible_score: number;
  percentage: number;
  field_scores: Record<string, unknown>;
} {
  let rawSum = 0;
  let weightedSum = 0;
  let maxSum = 0;
  const fieldScores: Record<string, unknown> = {};

  for (const fw of fieldWeights) {
    const raw = resolveNumeric(data[fw.field_key]);
    if (raw === null) continue;

    const weighted = raw * fw.weight;
    const maxVal = (fw.max_value ?? 1) * fw.weight;
    rawSum += raw;
    weightedSum += weighted;
    maxSum += maxVal;

    const band = fw.category_bands ? resolveCategory(raw, fw.category_bands) : null;
    fieldScores[fw.field_key] = {
      raw_value: raw,
      weight: fw.weight,
      weighted_value: weighted,
      max_value: fw.max_value ?? null,
      percentage: fw.max_value ? (raw / fw.max_value) * 100 : null,
      category: band?.category ?? null,
      band_label: band?.band_label ?? null,
    };
  }

  const percentage = maxSum > 0 ? (weightedSum / maxSum) * 100 : 0;

  return {
    raw_score: rawSum,
    weighted_score: weightedSum,
    max_possible_score: maxSum,
    percentage,
    field_scores: fieldScores,
  };
}

export function computePercentage(
  data: Record<string, unknown>,
  fieldWeights: FieldWeight[]
): number {
  const { weighted_score, max_possible_score } = computeWeightedScore(data, fieldWeights);
  return max_possible_score > 0 ? (weighted_score / max_possible_score) * 100 : 0;
}

export function computeRating(percentage: number, bands: CategoryBand[]): string {
  const sorted = [...bands].sort((a, b) => b.min - a.min);
  for (const b of sorted) {
    if (percentage >= b.min) return b.rating ?? b.label;
  }
  return bands[bands.length - 1]?.label ?? 'N/A';
}

export function computeIndex(
  components: ComponentWeight[],
  normalization: CompositeIndex['normalization'] = 'min_max',
  rangeMin = 0,
  rangeMax = 100
): number {
  const totalWeight = components.reduce((sum, c) => sum + c.weight, 0);
  if (totalWeight === 0) return 0;

  const rawIndex = components.reduce((sum, c) => {
    return sum + (c.value ?? 0) * (c.weight / totalWeight);
  }, 0);

  if (normalization === 'raw') return rawIndex;

  // min-max normalize to output range
  const allValues = components.map(c => c.value ?? 0);
  const min = Math.min(...allValues);
  const max = Math.max(...allValues);
  if (max === min) return (rangeMin + rangeMax) / 2;

  return rangeMin + ((rawIndex - min) / (max - min)) * (rangeMax - rangeMin);
}

export function computeAggregation(
  values: number[],
  type: 'sum' | 'average' | 'min' | 'max' | 'count'
): number {
  if (values.length === 0) return 0;
  switch (type) {
    case 'sum':     return values.reduce((a, b) => a + b, 0);
    case 'average': return values.reduce((a, b) => a + b, 0) / values.length;
    case 'min':     return Math.min(...values);
    case 'max':     return Math.max(...values);
    case 'count':   return values.length;
  }
}

export function computeCrossTabulation(
  records: Record<string, unknown>[],
  rowField: string,
  colField: string,
  valueField: string
): Record<string, Record<string, number>> {
  const result: Record<string, Record<string, number>> = {};
  for (const rec of records) {
    const row = String(rec[rowField] ?? 'N/A');
    const col = String(rec[colField] ?? 'N/A');
    const val = resolveNumeric(rec[valueField]) ?? 0;
    if (!result[row]) result[row] = {};
    result[row][col] = (result[row][col] ?? 0) + val;
  }
  return result;
}

export class TabulationEngine {
  // ── Configs ──────────────────────────────────────────────

  async getConfigs(organizationId: string): Promise<TabulationConfig[]> {
    const { data, error } = await supabase
      .from('tabulation_configs')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('is_active', true)
      .order('name');
    if (error) throw error;
    return (data ?? []) as TabulationConfig[];
  }

  async createConfig(
    cfg: Omit<TabulationConfig, 'id' | 'created_at' | 'updated_at'>
  ): Promise<TabulationConfig> {
    const { data, error } = await supabase
      .from('tabulation_configs')
      .insert(cfg)
      .select()
      .single();
    if (error) throw error;
    return data as TabulationConfig;
  }

  async updateConfig(id: string, patch: Partial<TabulationConfig>): Promise<void> {
    const { error } = await supabase
      .from('tabulation_configs')
      .update({ ...patch, updated_at: new Date().toISOString() })
      .eq('id', id);
    if (error) throw error;
  }

  async deleteConfig(id: string): Promise<void> {
    const { error } = await supabase
      .from('tabulation_configs')
      .update({ is_active: false })
      .eq('id', id);
    if (error) throw error;
  }

  // ── Results ──────────────────────────────────────────────

  async getResults(
    organizationId: string,
    opts?: {
      configId?: string;
      subjectType?: SubjectType;
      subjectId?: string;
      limit?: number;
    }
  ): Promise<TabulationResult[]> {
    let q = supabase
      .from('tabulation_results')
      .select('*')
      .eq('organization_id', organizationId)
      .order('calculated_at', { ascending: false })
      .limit(opts?.limit ?? 200);

    if (opts?.configId)     q = q.eq('config_id', opts.configId);
    if (opts?.subjectType)  q = q.eq('subject_type', opts.subjectType);
    if (opts?.subjectId)    q = q.eq('subject_id', opts.subjectId);

    const { data, error } = await q;
    if (error) throw error;
    return (data ?? []) as TabulationResult[];
  }

  async getResultsBySubmission(submissionId: string): Promise<TabulationResult[]> {
    const { data, error } = await supabase
      .from('tabulation_results')
      .select('*')
      .eq('form_submission_id', submissionId);
    if (error) throw error;
    return (data ?? []) as TabulationResult[];
  }

  async getScoreResults(tabulationId: string): Promise<ScoreResult[]> {
    const { data, error } = await supabase
      .from('score_results')
      .select('*')
      .eq('tabulation_id', tabulationId)
      .order('field_key');
    if (error) throw error;
    return (data ?? []) as ScoreResult[];
  }

  // ── Composite Indexes ────────────────────────────────────

  async getCompositeIndexes(organizationId: string): Promise<CompositeIndex[]> {
    const { data, error } = await supabase
      .from('composite_indexes')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('is_active', true)
      .order('name');
    if (error) throw error;
    return (data ?? []) as CompositeIndex[];
  }

  async createCompositeIndex(
    idx: Omit<CompositeIndex, 'id' | 'created_at' | 'updated_at'>
  ): Promise<CompositeIndex> {
    const { data, error } = await supabase
      .from('composite_indexes')
      .insert(idx)
      .select()
      .single();
    if (error) throw error;
    return data as CompositeIndex;
  }

  // ── Core calculation ─────────────────────────────────────

  async calculate(input: CalculationInput): Promise<TabulationResult> {
    const { organizationId, formSubmissionId, subjectType, subjectId, data, config, periodStart, periodEnd } = input;

    const scored = computeWeightedScore(data, config.field_weights);

    const category = config.field_weights[0]?.category_bands
      ? resolveCategory(scored.percentage, config.field_weights[0].category_bands)
      : null;

    const resultPayload: Omit<TabulationResult, 'id' | 'created_at'> = {
      organization_id: organizationId,
      config_id: config.id,
      form_submission_id: formSubmissionId ?? null,
      subject_type: subjectType ?? 'individual',
      subject_id: subjectId ?? null,
      period_start: periodStart ?? null,
      period_end: periodEnd ?? null,
      scoring_type: config.scoring_type,
      raw_score: scored.raw_score,
      weighted_score: scored.weighted_score,
      max_possible_score: scored.max_possible_score,
      percentage: scored.percentage,
      category: category?.category ?? null,
      rating: category?.band_label ?? null,
      index_value: null,
      composite_score: null,
      aggregations: {},
      cross_tabs: {},
      comparisons: {},
      field_scores: scored.field_scores,
      metadata: {},
      calculated_at: new Date().toISOString(),
    };

    const { data: saved, error } = await supabase
      .from('tabulation_results')
      .insert(resultPayload)
      .select()
      .single();
    if (error) throw error;

    // Persist individual field score rows
    const scoreRows = Object.entries(scored.field_scores).map(([key, val]) => {
      const v = val as Record<string, unknown>;
      return {
        organization_id: organizationId,
        tabulation_id: (saved as TabulationResult).id,
        field_key: key,
        field_label: config.field_weights.find(f => f.field_key === key)?.field_label ?? key,
        raw_value: (v.raw_value as number) ?? null,
        weight: (v.weight as number) ?? 1,
        weighted_value: (v.weighted_value as number) ?? null,
        max_value: (v.max_value as number) ?? null,
        percentage: (v.percentage as number) ?? null,
        category: (v.category as string) ?? null,
        band_label: (v.band_label as string) ?? null,
        metadata: {},
      };
    });

    if (scoreRows.length > 0) {
      await supabase.from('score_results').insert(scoreRows);
    }

    return saved as TabulationResult;
  }

  // Trigger tabulation for a form submission using all active configs for that template
  async processSubmission(
    organizationId: string,
    submission: { id: string; template_id: string | null; data: Record<string, unknown>; created_at: string }
  ): Promise<TabulationResult[]> {
    if (!submission.template_id) return [];

    const configs = await this.getConfigs(organizationId);
    const matching = configs.filter(c => c.form_template_id === submission.template_id);

    const results: TabulationResult[] = [];
    for (const config of matching) {
      const result = await this.calculate({
        organizationId,
        formSubmissionId: submission.id,
        data: submission.data,
        config,
        periodStart: submission.created_at.slice(0, 10),
      });
      results.push(result);
    }
    return results;
  }

  // ── Historical evolution ─────────────────────────────────

  async getHistoricalEvolution(
    organizationId: string,
    configId: string,
    subjectType?: SubjectType,
    subjectId?: string,
    limit = 30
  ): Promise<Array<{ date: string; weighted_score: number | null; percentage: number | null }>> {
    let q = supabase
      .from('tabulation_results')
      .select('calculated_at, weighted_score, percentage')
      .eq('organization_id', organizationId)
      .eq('config_id', configId)
      .order('calculated_at', { ascending: true })
      .limit(limit);

    if (subjectType) q = q.eq('subject_type', subjectType);
    if (subjectId)   q = q.eq('subject_id', subjectId);

    const { data, error } = await q;
    if (error) throw error;

    return (data ?? []).map(r => ({
      date: r.calculated_at,
      weighted_score: r.weighted_score,
      percentage: r.percentage,
    }));
  }

  // ── Comparison ───────────────────────────────────────────

  async compareSubjects(
    organizationId: string,
    configId: string,
    subjectIds: string[]
  ): Promise<Record<string, TabulationResult | null>> {
    const result: Record<string, TabulationResult | null> = {};
    for (const id of subjectIds) {
      const { data } = await supabase
        .from('tabulation_results')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('config_id', configId)
        .eq('subject_id', id)
        .order('calculated_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      result[id] = (data as TabulationResult) ?? null;
    }
    return result;
  }
}

export const tabulationEngine = new TabulationEngine();

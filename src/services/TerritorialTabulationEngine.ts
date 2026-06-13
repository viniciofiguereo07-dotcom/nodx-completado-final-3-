import { supabase } from '../lib/supabase';
import { tabulationEngine, computeWeightedScore, computeCrossTabulation, type CategoryBand } from './TabulationEngine';
import { semaphoreEngine, type SemaphoreStatus, type SemaphoreThresholdBand } from './SemaphoreEngine';
import type { TerritorialSubmission } from './TerritorialFieldCollectionEngine';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
export type RiskLevel = 'low' | 'medium' | 'high';
export type VulnerabilityLevel = 'low' | 'medium' | 'high';
export type PriorityLevel = 'level_1' | 'level_2' | 'level_3';

export const RISK_LEVEL_LABELS: Record<RiskLevel, string> = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
};

export const VULNERABILITY_LEVEL_LABELS: Record<VulnerabilityLevel, string> = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
};

export const PRIORITY_LEVEL_LABELS: Record<PriorityLevel, string> = {
  level_1: 'Level 1 (Critical)',
  level_2: 'Level 2 (Moderate)',
  level_3: 'Level 3 (Low)',
};

export interface FrequencyDistribution {
  value: string;
  count: number;
  percentage: number;
  cumulative_percentage: number;
}

export interface NumericDistribution {
  min: number;
  max: number;
  mean: number;
  median: number;
  mode: number | null;
  std_dev: number;
  quartiles: { q1: number; q2: number; q3: number };
}

export interface CrossTabResult {
  row_field: string;
  col_field: string;
  matrix: Record<string, Record<string, { count: number; percentage: number; row_percentage: number; col_percentage: number }>>;
  row_totals: Record<string, number>;
  col_totals: Record<string, number>;
  grand_total: number;
  chi_square?: number;
}

export interface AggregationResult {
  field: string;
  count: number;
  sum: number;
  mean: number;
  min: number;
  max: number;
  std_dev: number;
}

export interface RiskAssessmentConfig {
  id: string;
  name: string;
  description: string | null;
  risk_factors: RiskFactor[];
  thresholds: Record<RiskLevel, { min: number; max: number }>;
  is_active: boolean;
}

export interface RiskFactor {
  field_key: string;
  weight: number;
  scoring: 'direct' | 'inverse' | 'categorical';
  value_map?: Record<string, number>;
  max_value?: number;
}

export interface VulnerabilityAssessmentConfig {
  id: string;
  name: string;
  description: string | null;
  vulnerability_factors: VulnerabilityFactor[];
  thresholds: Record<VulnerabilityLevel, { min: number; max: number }>;
  is_active: boolean;
}

export interface VulnerabilityFactor {
  field_key: string;
  weight: number;
  scoring: 'direct' | 'inverse' | 'categorical';
  value_map?: Record<string, number>;
  max_value?: number;
}

export interface PriorityAssessmentConfig {
  id: string;
  name: string;
  description: string | null;
  priority_factors: PriorityFactor[];
  thresholds: Record<PriorityLevel, { min: number; max: number }>;
  is_active: boolean;
}

export interface PriorityFactor {
  field_key: string;
  weight: number;
  scoring: 'direct' | 'inverse' | 'categorical';
  value_map?: Record<string, number>;
  max_value?: number;
}

export interface TabulationReport {
  id: string;
  organization_id: string;
  form_id: string | null;
  name: string;
  generated_at: string;
  filters: Record<string, unknown>;
  frequencies: Record<string, FrequencyDistribution[]>;
  numeric_stats: Record<string, NumericDistribution>;
  cross_tabs: CrossTabResult[];
  aggregations: AggregationResult[];
  risk_assessment: {
    score: number;
    level: RiskLevel;
    factors: Record<string, { value: unknown; score: number; weight: number }>;
  } | null;
  vulnerability_assessment: {
    score: number;
    level: VulnerabilityLevel;
    factors: Record<string, { value: unknown; score: number; weight: number }>;
  } | null;
  priority_assessment: {
    score: number;
    level: PriorityLevel;
    factors: Record<string, { value: unknown; score: number; weight: number }>;
  } | null;
  semaphore_status: SemaphoreStatus;
  total_records: number;
}

export interface AutoTabulationConfig {
  form_id: string;
  form_name: string;
  field_configs: FieldTabulationConfig[];
  cross_tab_configs: CrossTabConfig[];
  risk_config: RiskAssessmentConfig | null;
  vulnerability_config: VulnerabilityAssessmentConfig | null;
  priority_config: PriorityAssessmentConfig | null;
  semaphore_thresholds: SemaphoreThresholdBand[];
}

export interface FieldTabulationConfig {
  field_key: string;
  field_label: string;
  field_type: 'categorical' | 'numeric' | 'boolean' | 'date';
  compute_frequency: boolean;
  compute_statistics: boolean;
}

export interface CrossTabConfig {
  row_field: string;
  col_field: string;
  value_aggregation?: 'count' | 'sum' | 'mean';
  value_field?: string;
}

// ---------------------------------------------------------------------------
// Helper Functions
// ---------------------------------------------------------------------------
function resolveNumeric(v: unknown): number | null {
  if (typeof v === 'number') return isNaN(v) ? null : v;
  if (typeof v === 'string') {
    const n = parseFloat(v);
    return isNaN(n) ? null : n;
  }
  if (typeof v === 'boolean') return v ? 1 : 0;
  return null;
}

function calculateMedian(sorted: number[]): number {
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

function calculateStdDev(values: number[], mean: number): number {
  if (values.length === 0) return 0;
  const squaredDiffs = values.map(v => Math.pow(v - mean, 2));
  return Math.sqrt(squaredDiffs.reduce((a, b) => a + b, 0) / values.length);
}

function calculateQuartiles(sorted: number[]): { q1: number; q2: number; q3: number } {
  const n = sorted.length;
  if (n === 0) return { q1: 0, q2: 0, q3: 0 };
  return {
    q1: calculateMedian(sorted.slice(0, Math.floor(n / 2))),
    q2: calculateMedian(sorted),
    q3: calculateMedian(sorted.slice(Math.ceil(n / 2))),
  };
}

function getMode(values: number[]): number | null {
  if (values.length === 0) return null;
  const counts = new Map<number, number>();
  for (const v of values) {
    counts.set(v, (counts.get(v) ?? 0) + 1);
  }
  let maxCount = 0;
  let mode: number | null = null;
  for (const [val, count] of counts) {
    if (count > maxCount) {
      maxCount = count;
      mode = val;
    }
  }
  return mode;
}

function assessLevel(
  score: number,
  thresholds: Record<string, { min: number; max: number }>
): string {
  for (const [level, range] of Object.entries(thresholds)) {
    if (score >= range.min && score <= range.max) {
      return level;
    }
  }
  return Object.keys(thresholds)[0] ?? 'unknown';
}

function evaluateSemaphoreFromScore(
  score: number,
  thresholds: SemaphoreThresholdBand[]
): SemaphoreStatus {
  const sorted = [...thresholds].sort((a, b) => {
    const priority: Record<SemaphoreStatus, number> = {
      green: 0, yellow: 1, orange: 2, red: 3, critical: 4,
    };
    return priority[b.status] - priority[a.status];
  });

  for (const band of sorted) {
    const aboveMin = band.min === null || score >= band.min;
    const belowMax = band.max === null || score <= band.max;
    if (aboveMin && belowMax) {
      return band.status;
    }
  }
  return 'green';
}

// ---------------------------------------------------------------------------
// Main Service
// ---------------------------------------------------------------------------
export class TerritorialTabulationEngine {

  // -------------------------------------------------------------------------
  // Frequency Distribution
  // -------------------------------------------------------------------------
  computeFrequencyDistribution(
    records: Record<string, unknown>[],
    fieldKey: string
  ): FrequencyDistribution[] {
    const counts = new Map<string, number>();
    let total = 0;

    for (const rec of records) {
      const val = rec[fieldKey];
      const key = val === null || val === undefined ? 'N/A' : String(val);
      counts.set(key, (counts.get(key) ?? 0) + 1);
      total++;
    }

    if (total === 0) return [];

    const entries = Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1]);

    let cumulative = 0;
    return entries.map(([value, count]) => {
      const percentage = (count / total) * 100;
      cumulative += percentage;
      return { value, count, percentage, cumulative_percentage: cumulative };
    });
  }

  // -------------------------------------------------------------------------
  // Numeric Statistics
  // -------------------------------------------------------------------------
  computeNumericStatistics(
    records: Record<string, unknown>[],
    fieldKey: string
  ): NumericDistribution | null {
    const values: number[] = [];

    for (const rec of records) {
      const num = resolveNumeric(rec[fieldKey]);
      if (num !== null) values.push(num);
    }

    if (values.length === 0) {
      return {
        min: 0, max: 0, mean: 0, median: 0, mode: null,
        std_dev: 0, quartiles: { q1: 0, q2: 0, q3: 0 },
      };
    }

    const sorted = [...values].sort((a, b) => a - b);
    const sum = values.reduce((a, b) => a + b, 0);
    const mean = sum / values.length;

    return {
      min: sorted[0],
      max: sorted[sorted.length - 1],
      mean,
      median: calculateMedian(sorted),
      mode: getMode(values),
      std_dev: calculateStdDev(values, mean),
      quartiles: calculateQuartiles(sorted),
    };
  }

  // -------------------------------------------------------------------------
  // Cross Tabulation
  // -------------------------------------------------------------------------
  computeCrossTab(
    records: Record<string, unknown>[],
    rowField: string,
    colField: string,
    valueAggregation: 'count' | 'sum' | 'mean' = 'count',
    valueField?: string
  ): CrossTabResult {
    const matrix: CrossTabResult['matrix'] = {};
    const rowTotals: Record<string, number> = {};
    const colTotals: Record<string, number> = {};
    let grandTotal = 0;

    // Build raw counts/sums
    for (const rec of records) {
      const row = rec[rowField] === null || rec[rowField] === undefined
        ? 'N/A' : String(rec[rowField]);
      const col = rec[colField] === null || rec[colField] === undefined
        ? 'N/A' : String(rec[colField]);

      let value = 1;
      if (valueAggregation !== 'count' && valueField) {
        const num = resolveNumeric(rec[valueField]);
        value = num ?? 0;
      }

      if (!matrix[row]) matrix[row] = {};
      if (!matrix[row][col]) matrix[row][col] = { count: 0, percentage: 0, row_percentage: 0, col_percentage: 0 };

      if (valueAggregation === 'mean') {
        // Store sum and count for mean calculation
        const cell = matrix[row][col] as unknown as { sum: number; count: number; percentage: number; row_percentage: number; col_percentage: number };
        cell.sum = (cell.sum ?? 0) + value;
        cell.count += 1;
      } else {
        (matrix[row][col] as { count: number }).count += value;
      }

      rowTotals[row] = (rowTotals[row] ?? 0) + value;
      colTotals[col] = (colTotals[col] ?? 0) + value;
      grandTotal += value;
    }

    // Calculate percentages
    for (const row of Object.keys(matrix)) {
      for (const col of Object.keys(matrix[row])) {
        const cell = matrix[row][col];
        if (valueAggregation === 'mean') {
          const meanCell = cell as unknown as { sum: number; count: number };
          cell.count = meanCell.sum / meanCell.count;
        }
        cell.percentage = grandTotal > 0 ? (cell.count / grandTotal) * 100 : 0;
        cell.row_percentage = rowTotals[row] > 0 ? (cell.count / rowTotals[row]) * 100 : 0;
        cell.col_percentage = colTotals[col] > 0 ? (cell.count / colTotals[col]) * 100 : 0;
      }
    }

    return {
      row_field: rowField,
      col_field: colField,
      matrix,
      row_totals: rowTotals,
      col_totals: colTotals,
      grand_total: grandTotal,
    };
  }

  // -------------------------------------------------------------------------
  // Aggregation
  // -------------------------------------------------------------------------
  computeAggregation(
    records: Record<string, unknown>[],
    fieldKey: string
  ): AggregationResult {
    const values: number[] = [];

    for (const rec of records) {
      const num = resolveNumeric(rec[fieldKey]);
      if (num !== null) values.push(num);
    }

    if (values.length === 0) {
      return {
        field: fieldKey,
        count: 0,
        sum: 0,
        mean: 0,
        min: 0,
        max: 0,
        std_dev: 0,
      };
    }

    const sum = values.reduce((a, b) => a + b, 0);
    const mean = sum / values.length;

    return {
      field: fieldKey,
      count: values.length,
      sum,
      mean,
      min: Math.min(...values),
      max: Math.max(...values),
      std_dev: calculateStdDev(values, mean),
    };
  }

  // -------------------------------------------------------------------------
  // Risk Assessment
  // -------------------------------------------------------------------------
  computeRiskScore(
    data: Record<string, unknown>,
    config: RiskAssessmentConfig
  ): { score: number; level: RiskLevel; factors: Record<string, { value: unknown; score: number; weight: number }> } {
    let totalScore = 0;
    let totalWeight = 0;
    const factors: Record<string, { value: unknown; score: number; weight: number }> = {};

    for (const factor of config.risk_factors) {
      const raw = data[factor.field_key];
      let score = 0;

      if (factor.scoring === 'direct') {
        score = resolveNumeric(raw) ?? 0;
      } else if (factor.scoring === 'inverse') {
        const num = resolveNumeric(raw);
        score = num !== null ? (factor.max_value ?? 100) - num : 0;
      } else if (factor.scoring === 'categorical' && factor.value_map) {
        const key = raw === null || raw === undefined ? 'N/A' : String(raw);
        score = factor.value_map[key] ?? 0;
      }

      totalScore += score * factor.weight;
      totalWeight += factor.weight;
      factors[factor.field_key] = { value: raw, score, weight: factor.weight };
    }

    const normalizedScore = totalWeight > 0 ? totalScore / totalWeight : 0;
    const level = assessLevel(normalizedScore, config.thresholds) as RiskLevel;

    return { score: normalizedScore, level, factors };
  }

  // -------------------------------------------------------------------------
  // Vulnerability Assessment
  // -------------------------------------------------------------------------
  computeVulnerabilityScore(
    data: Record<string, unknown>,
    config: VulnerabilityAssessmentConfig
  ): { score: number; level: VulnerabilityLevel; factors: Record<string, { value: unknown; score: number; weight: number }> } {
    let totalScore = 0;
    let totalWeight = 0;
    const factors: Record<string, { value: unknown; score: number; weight: number }> = {};

    for (const factor of config.vulnerability_factors) {
      const raw = data[factor.field_key];
      let score = 0;

      if (factor.scoring === 'direct') {
        score = resolveNumeric(raw) ?? 0;
      } else if (factor.scoring === 'inverse') {
        const num = resolveNumeric(raw);
        score = num !== null ? (factor.max_value ?? 100) - num : 0;
      } else if (factor.scoring === 'categorical' && factor.value_map) {
        const key = raw === null || raw === undefined ? 'N/A' : String(raw);
        score = factor.value_map[key] ?? 0;
      }

      totalScore += score * factor.weight;
      totalWeight += factor.weight;
      factors[factor.field_key] = { value: raw, score, weight: factor.weight };
    }

    const normalizedScore = totalWeight > 0 ? totalScore / totalWeight : 0;
    const level = assessLevel(normalizedScore, config.thresholds) as VulnerabilityLevel;

    return { score: normalizedScore, level, factors };
  }

  // -------------------------------------------------------------------------
  // Priority Assessment
  // -------------------------------------------------------------------------
  computePriorityScore(
    data: Record<string, unknown>,
    config: PriorityAssessmentConfig
  ): { score: number; level: PriorityLevel; factors: Record<string, { value: unknown; score: number; weight: number }> } {
    let totalScore = 0;
    let totalWeight = 0;
    const factors: Record<string, { value: unknown; score: number; weight: number }> = {};

    for (const factor of config.priority_factors) {
      const raw = data[factor.field_key];
      let score = 0;

      if (factor.scoring === 'direct') {
        score = resolveNumeric(raw) ?? 0;
      } else if (factor.scoring === 'inverse') {
        const num = resolveNumeric(raw);
        score = num !== null ? (factor.max_value ?? 100) - num : 0;
      } else if (factor.scoring === 'categorical' && factor.value_map) {
        const key = raw === null || raw === undefined ? 'N/A' : String(raw);
        score = factor.value_map[key] ?? 0;
      }

      totalScore += score * factor.weight;
      totalWeight += factor.weight;
      factors[factor.field_key] = { value: raw, score, weight: factor.weight };
    }

    const normalizedScore = totalWeight > 0 ? totalScore / totalWeight : 0;
    const level = assessLevel(normalizedScore, config.thresholds) as PriorityLevel;

    return { score: normalizedScore, level, factors };
  }

  // -------------------------------------------------------------------------
  // Generate Full Tabulation Report
  // -------------------------------------------------------------------------
  async generateReport(
    organizationId: string,
    formId: string,
    opts?: {
      filters?: Record<string, unknown>;
      fieldConfigs?: FieldTabulationConfig[];
      crossTabConfigs?: CrossTabConfig[];
      riskConfig?: RiskAssessmentConfig;
      vulnerabilityConfig?: VulnerabilityAssessmentConfig;
      priorityConfig?: PriorityAssessmentConfig;
      semaphoreThresholds?: SemaphoreThresholdBand[];
    }
  ): Promise<TabulationReport> {
    // Fetch submissions for the form
    const { data: submissions, error } = await supabase
      .from('territorial_submissions')
      .select('id, data, status, created_at, submitted_at, entity_id')
      .eq('organization_id', organizationId)
      .eq('form_id', formId)
      .eq('status', 'submitted');

    if (error) throw error;

    const records = (submissions ?? []).map((s: { data: unknown }) => s.data as Record<string, unknown>);

    // Default field configs if not provided
    const fieldConfigs = opts?.fieldConfigs ?? this.inferFieldConfigs(records);

    // Compute frequencies
    const frequencies: Record<string, FrequencyDistribution[]> = {};
    for (const fc of fieldConfigs.filter(f => f.compute_frequency)) {
      frequencies[fc.field_key] = this.computeFrequencyDistribution(records, fc.field_key);
    }

    // Compute numeric statistics
    const numericStats: Record<string, NumericDistribution> = {};
    for (const fc of fieldConfigs.filter(f => f.compute_statistics)) {
      const stats = this.computeNumericStatistics(records, fc.field_key);
      if (stats) numericStats[fc.field_key] = stats;
    }

    // Compute cross tabs
    const crossTabs: CrossTabResult[] = [];
    if (opts?.crossTabConfigs) {
      for (const cc of opts.crossTabConfigs) {
        crossTabs.push(this.computeCrossTab(
          records,
          cc.row_field,
          cc.col_field,
          cc.value_aggregation,
          cc.value_field
        ));
      }
    }

    // Compute aggregations
    const aggregations: AggregationResult[] = [];
    for (const fc of fieldConfigs.filter(f => f.compute_statistics)) {
      aggregations.push(this.computeAggregation(records, fc.field_key));
    }

    // Risk assessment
    let riskAssessment: TabulationReport['risk_assessment'] = null;
    if (opts?.riskConfig) {
      // Aggregate across all records
      const allData = records.reduce((acc, rec) => {
        for (const [k, v] of Object.entries(rec)) {
          if (typeof v === 'number') {
            acc[k] = (acc[k] as number ?? 0) + v;
          } else if (!acc[k]) {
            acc[k] = v;
          }
        }
        return acc;
      }, {} as Record<string, unknown>);

      const result = this.computeRiskScore(allData, opts.riskConfig);
      riskAssessment = {
        score: result.score,
        level: result.level,
        factors: result.factors,
      };
    }

    // Vulnerability assessment
    let vulnerabilityAssessment: TabulationReport['vulnerability_assessment'] = null;
    if (opts?.vulnerabilityConfig) {
      const allData = records.reduce((acc, rec) => {
        for (const [k, v] of Object.entries(rec)) {
          if (typeof v === 'number') {
            acc[k] = (acc[k] as number ?? 0) + v;
          } else if (!acc[k]) {
            acc[k] = v;
          }
        }
        return acc;
      }, {} as Record<string, unknown>);

      const result = this.computeVulnerabilityScore(allData, opts.vulnerabilityConfig);
      vulnerabilityAssessment = {
        score: result.score,
        level: result.level,
        factors: result.factors,
      };
    }

    // Priority assessment
    let priorityAssessment: TabulationReport['priority_assessment'] = null;
    if (opts?.priorityConfig) {
      const allData = records.reduce((acc, rec) => {
        for (const [k, v] of Object.entries(rec)) {
          if (typeof v === 'number') {
            acc[k] = (acc[k] as number ?? 0) + v;
          } else if (!acc[k]) {
            acc[k] = v;
          }
        }
        return acc;
      }, {} as Record<string, unknown>);

      const result = this.computePriorityScore(allData, opts.priorityConfig);
      priorityAssessment = {
        score: result.score,
        level: result.level,
        factors: result.factors,
      };
    }

    // Semaphore status
    let semaphoreStatus: SemaphoreStatus = 'green';
    if (opts?.semaphoreThresholds && opts.semaphoreThresholds.length > 0) {
      const compositeScore = (riskAssessment?.score ?? 0) +
        (vulnerabilityAssessment?.score ?? 0) * 0.5 +
        (100 - (priorityAssessment?.score ?? 0)) * 0.3;
      semaphoreStatus = evaluateSemaphoreFromScore(compositeScore, opts.semaphoreThresholds);
    }

    const report: TabulationReport = {
      id: `report_${Date.now()}`,
      organization_id: organizationId,
      form_id: formId,
      name: `Tabulation Report - ${new Date().toISOString()}`,
      generated_at: new Date().toISOString(),
      filters: opts?.filters ?? {},
      frequencies,
      numeric_stats: numericStats,
      cross_tabs: crossTabs,
      aggregations,
      risk_assessment: riskAssessment,
      vulnerability_assessment: vulnerabilityAssessment,
      priority_assessment: priorityAssessment,
      semaphore_status: semaphoreStatus,
      total_records: records.length,
    };

    // Persist report
    const { error: saveError } = await supabase
      .from('tabulation_reports')
      .insert({
        organization_id: organizationId,
        form_id: formId,
        name: report.name,
        generated_at: report.generated_at,
        filters: report.filters,
        frequencies: report.frequencies,
        numeric_stats: report.numeric_stats,
        cross_tabs: report.cross_tabs,
        aggregations: report.aggregations,
        risk_assessment: report.risk_assessment,
        vulnerability_assessment: report.vulnerability_assessment,
        priority_assessment: report.priority_assessment,
        semaphore_status: report.semaphore_status,
        total_records: report.total_records,
      });

    if (saveError) {
      console.error('Failed to persist tabulation report:', saveError);
    }

    return report;
  }

  // -------------------------------------------------------------------------
  // Infer Field Configs from Data
  // -------------------------------------------------------------------------
  inferFieldConfigs(records: Record<string, unknown>[]): FieldTabulationConfig[] {
    if (records.length === 0) return [];

    const allKeys = new Set<string>();
    const numericKeys = new Set<string>();

    for (const rec of records) {
      for (const [key, value] of Object.entries(rec)) {
        allKeys.add(key);
        if (typeof value === 'number') {
          numericKeys.add(key);
        }
      }
    }

    return Array.from(allKeys).map(key => ({
      field_key: key,
      field_label: key.replace(/_/g, ' ').replace(/([A-Z])/g, ' $1').trim(),
      field_type: numericKeys.has(key) ? 'numeric' : 'categorical' as const,
      compute_frequency: true,
      compute_statistics: numericKeys.has(key),
    }));
  }

  // -------------------------------------------------------------------------
  // Get Saved Reports
  // -------------------------------------------------------------------------
  async getReports(
    organizationId: string,
    formId?: string,
    limit = 20
  ): Promise<TabulationReport[]> {
    let query = supabase
      .from('tabulation_reports')
      .select('*')
      .eq('organization_id', organizationId)
      .order('generated_at', { ascending: false })
      .limit(limit);

    if (formId) {
      query = query.eq('form_id', formId);
    }

    const { data, error } = await query;
    if (error) throw error;

    return (data ?? []).map(d => ({
      id: d.id,
      organization_id: d.organization_id,
      form_id: d.form_id,
      name: d.name,
      generated_at: d.generated_at,
      filters: d.filters ?? {},
      frequencies: d.frequencies ?? {},
      numeric_stats: d.numeric_stats ?? {},
      cross_tabs: d.cross_tabs ?? [],
      aggregations: d.aggregations ?? [],
      risk_assessment: d.risk_assessment,
      vulnerability_assessment: d.vulnerability_assessment,
      priority_assessment: d.priority_assessment,
      semaphore_status: d.semaphore_status ?? 'green',
      total_records: d.total_records ?? 0,
    })) as TabulationReport[];
  }

  // -------------------------------------------------------------------------
  // Quick Stats for Dashboard
  // -------------------------------------------------------------------------
  async getQuickStats(
    organizationId: string,
    formId: string
  ): Promise<{
    total_submissions: number;
    submitted_this_week: number;
    submitted_this_month: number;
    average_completeness: number;
    top_fields: Array<{ field: string; count: number; avg_value: number | null }>;
  }> {
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthAgo = new Date(now.getFullYear(), now.getMonth(), 1);

    const { data: submissions, error } = await supabase
      .from('territorial_submissions')
      .select('id, data, created_at, status')
      .eq('organization_id', organizationId)
      .eq('form_id', formId);

    if (error) throw error;

    const all = submissions ?? [];
    const submitted = all.filter((s: { status: string }) => s.status === 'submitted');
    const thisWeek = submitted.filter((s: { created_at: string }) =>
      new Date(s.created_at) >= weekAgo
    );
    const thisMonth = submitted.filter((s: { created_at: string }) =>
      new Date(s.created_at) >= monthAgo
    );

    // Calculate completeness (fields with values / total expected fields)
    let totalFields = 0;
    let filledFields = 0;
    const fieldCounts = new Map<string, { count: number; sum: number }>();

    for (const s of submitted) {
      const data = s.data as Record<string, unknown> ?? {};
      for (const [k, v] of Object.entries(data)) {
        totalFields++;
        if (v !== null && v !== undefined && v !== '') {
          filledFields++;
        }
        if (!fieldCounts.has(k)) {
          fieldCounts.set(k, { count: 0, sum: 0 });
        }
        const fc = fieldCounts.get(k)!;
        fc.count++;
        if (typeof v === 'number') {
          fc.sum += v;
        }
      }
    }

    const topFields = Array.from(fieldCounts.entries())
      .map(([field, { count, sum }]) => ({
        field,
        count,
        avg_value: count > 0 ? sum / count : null,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return {
      total_submissions: submitted.length,
      submitted_this_week: thisWeek.length,
      submitted_this_month: thisMonth.length,
      average_completeness: totalFields > 0 ? (filledFields / totalFields) * 100 : 0,
      top_fields: topFields,
    };
  }

  // -------------------------------------------------------------------------
  // Matrix Views
  // -------------------------------------------------------------------------
  async getRiskMatrix(
    organizationId: string,
    opts?: { formId?: string; entityId?: string }
  ): Promise<{
    matrix: Record<RiskLevel, number>;
    by_entity: Array<{ entity_id: string; risk_level: RiskLevel; score: number }>;
  }> {
    // Get recent reports
    let query = supabase
      .from('tabulation_reports')
      .select('id, risk_assessment, form_id')
      .eq('organization_id', organizationId)
      .not('risk_assessment', 'is', null)
      .order('generated_at', { ascending: false })
      .limit(100);

    if (opts?.formId) {
      query = query.eq('form_id', opts.formId);
    }

    const { data, error } = await query;
    if (error) throw error;

    const matrix: Record<RiskLevel, number> = { low: 0, medium: 0, high: 0 };
    const byEntity: Array<{ entity_id: string; risk_level: RiskLevel; score: number }> = [];

    const seen = new Set<string>();
    for (const r of (data ?? [])) {
      const ra = r.risk_assessment as { level: RiskLevel; score: number } | null;
      if (!ra) continue;

      // Count each risk level
      matrix[ra.level] = (matrix[ra.level] ?? 0) + 1;

      // Track by form
      if (!seen.has(r.form_id)) {
        seen.add(r.form_id);
        byEntity.push({
          entity_id: r.form_id,
          risk_level: ra.level,
          score: ra.score,
        });
      }
    }

    return { matrix, by_entity: byEntity };
  }

  async getVulnerabilityMatrix(
    organizationId: string,
    opts?: { formId?: string; entityId?: string }
  ): Promise<{
    matrix: Record<VulnerabilityLevel, number>;
    by_entity: Array<{ entity_id: string; vulnerability_level: VulnerabilityLevel; score: number }>;
  }> {
    let query = supabase
      .from('tabulation_reports')
      .select('id, vulnerability_assessment, form_id')
      .eq('organization_id', organizationId)
      .not('vulnerability_assessment', 'is', null)
      .order('generated_at', { ascending: false })
      .limit(100);

    if (opts?.formId) {
      query = query.eq('form_id', opts.formId);
    }

    const { data, error } = await query;
    if (error) throw error;

    const matrix: Record<VulnerabilityLevel, number> = { low: 0, medium: 0, high: 0 };
    const byEntity: Array<{ entity_id: string; vulnerability_level: VulnerabilityLevel; score: number }> = [];

    const seen = new Set<string>();
    for (const r of (data ?? [])) {
      const va = r.vulnerability_assessment as { level: VulnerabilityLevel; score: number } | null;
      if (!va) continue;

      matrix[va.level] = (matrix[va.level] ?? 0) + 1;

      if (!seen.has(r.form_id)) {
        seen.add(r.form_id);
        byEntity.push({
          entity_id: r.form_id,
          vulnerability_level: va.level,
          score: va.score,
        });
      }
    }

    return { matrix, by_entity: byEntity };
  }

  async getPriorityMatrix(
    organizationId: string,
    opts?: { formId?: string; entityId?: string }
  ): Promise<{
    matrix: Record<PriorityLevel, number>;
    by_entity: Array<{ entity_id: string; priority_level: PriorityLevel; score: number }>;
  }> {
    let query = supabase
      .from('tabulation_reports')
      .select('id, priority_assessment, form_id')
      .eq('organization_id', organizationId)
      .not('priority_assessment', 'is', null)
      .order('generated_at', { ascending: false })
      .limit(100);

    if (opts?.formId) {
      query = query.eq('form_id', opts.formId);
    }

    const { data, error } = await query;
    if (error) throw error;

    const matrix: Record<PriorityLevel, number> = { level_1: 0, level_2: 0, level_3: 0 };
    const byEntity: Array<{ entity_id: string; priority_level: PriorityLevel; score: number }> = [];

    const seen = new Set<string>();
    for (const r of (data ?? [])) {
      const pa = r.priority_assessment as { level: PriorityLevel; score: number } | null;
      if (!pa) continue;

      matrix[pa.level] = (matrix[pa.level] ?? 0) + 1;

      if (!seen.has(r.form_id)) {
        seen.add(r.form_id);
        byEntity.push({
          entity_id: r.form_id,
          priority_level: pa.level,
          score: pa.score,
        });
      }
    }

    return { matrix, by_entity: byEntity };
  }

  // -------------------------------------------------------------------------
  // Semaphore Summary
  // -------------------------------------------------------------------------
  async getSemaphoreSummary(organizationId: string): Promise<{
    overall: SemaphoreStatus;
    distribution: Record<SemaphoreStatus, number>;
    changes: Array<{ from: SemaphoreStatus; to: SemaphoreStatus; count: number }>;
  }> {
    const results = await semaphoreEngine.getLatestResults(organizationId);

    const distribution: Record<SemaphoreStatus, number> = {
      green: 0, yellow: 0, orange: 0, red: 0, critical: 0,
    };

    const transitions = new Map<string, number>();

    for (const r of results) {
      distribution[r.status] = (distribution[r.status] ?? 0) + 1;

      if (r.previous_status) {
        const key = `${r.previous_status}->${r.status}`;
        transitions.set(key, (transitions.get(key) ?? 0) + 1);
      }
    }

    const overall = semaphoreEngine.evaluateInMemory(
      50, // default value
      [
        { status: 'green', min: 0, max: 60 },
        { status: 'yellow', min: 61, max: 80 },
        { status: 'red', min: 81, max: 100 },
      ]
    ).status;

    const changes = Array.from(transitions.entries()).map(([key, count]) => {
      const [from, to] = key.split('->') as [SemaphoreStatus, SemaphoreStatus];
      return { from, to, count };
    });

    return { overall, distribution, changes };
  }
}

export const territorialTabulationEngine = new TerritorialTabulationEngine();

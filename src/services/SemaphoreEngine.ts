import { supabase } from '../lib/supabase';

export type SemaphoreStatus = 'green' | 'yellow' | 'orange' | 'red' | 'critical';
export type SemaphoreRuleType = 'indicator' | 'score' | 'kpi' | 'risk' | 'coverage' | 'performance' | 'custom';

export interface SemaphoreThresholdBand {
  status: SemaphoreStatus;
  min: number | null;
  max: number | null;
  label?: string;
  description?: string;
}

export interface SemaphoreRule {
  id: string;
  organization_id: string;
  name: string;
  description: string | null;
  rule_type: SemaphoreRuleType;
  indicator_id: string | null;
  metric_key: string | null;
  thresholds: SemaphoreThresholdBand[];
  applies_to: 'organization' | 'territory' | 'geo_unit' | 'project';
  priority: number;
  is_active: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface SemaphoreResult {
  id: string;
  organization_id: string;
  rule_id: string | null;
  subject_type: string;
  subject_id: string | null;
  metric_value: number | null;
  status: SemaphoreStatus;
  previous_status: SemaphoreStatus | null;
  threshold_hit: SemaphoreThresholdBand | null;
  notes: string | null;
  evaluated_at: string;
  created_at: string;
  rule?: SemaphoreRule;
}

export interface SemaphoreEvaluation {
  rule: SemaphoreRule;
  value: number | null;
  status: SemaphoreStatus;
  threshold_hit: SemaphoreThresholdBand | null;
  changed: boolean;
  previous_status: SemaphoreStatus | null;
}

export const STATUS_PRIORITY: Record<SemaphoreStatus, number> = {
  green:    0,
  yellow:   1,
  orange:   2,
  red:      3,
  critical: 4,
};

export const STATUS_COLORS: Record<SemaphoreStatus, { bg: string; text: string; border: string; dot: string }> = {
  green:    { bg: 'bg-emerald-50',  text: 'text-emerald-700',  border: 'border-emerald-200', dot: 'bg-emerald-500' },
  yellow:   { bg: 'bg-amber-50',    text: 'text-amber-700',    border: 'border-amber-200',   dot: 'bg-amber-400'   },
  orange:   { bg: 'bg-orange-50',   text: 'text-orange-700',   border: 'border-orange-200',  dot: 'bg-orange-500'  },
  red:      { bg: 'bg-red-50',      text: 'text-red-700',      border: 'border-red-200',     dot: 'bg-red-500'     },
  critical: { bg: 'bg-rose-50',     text: 'text-rose-800',     border: 'border-rose-300',    dot: 'bg-rose-600'    },
};

export function evaluateStatus(
  value: number,
  thresholds: SemaphoreThresholdBand[]
): { status: SemaphoreStatus; threshold: SemaphoreThresholdBand | null } {
  // Sort by priority descending so critical is checked first
  const sorted = [...thresholds].sort((a, b) => STATUS_PRIORITY[b.status] - STATUS_PRIORITY[a.status]);

  for (const band of sorted) {
    const aboveMin = band.min === null || value >= band.min;
    const belowMax = band.max === null || value <= band.max;
    if (aboveMin && belowMax) {
      return { status: band.status, threshold: band };
    }
  }
  return { status: 'green', threshold: null };
}

export function worstStatus(statuses: SemaphoreStatus[]): SemaphoreStatus {
  if (statuses.length === 0) return 'green';
  return statuses.reduce((worst, s) =>
    STATUS_PRIORITY[s] > STATUS_PRIORITY[worst] ? s : worst,
    'green' as SemaphoreStatus
  );
}

export class SemaphoreEngine {
  // ── Rules ────────────────────────────────────────────────

  async getRules(organizationId: string): Promise<SemaphoreRule[]> {
    const { data, error } = await supabase
      .from('semaphore_rules')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('is_active', true)
      .order('priority', { ascending: false });
    if (error) throw error;
    return (data ?? []) as SemaphoreRule[];
  }

  async getRule(id: string): Promise<SemaphoreRule | null> {
    const { data, error } = await supabase
      .from('semaphore_rules')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (error) throw error;
    return data as SemaphoreRule | null;
  }

  async createRule(
    rule: Omit<SemaphoreRule, 'id' | 'created_at' | 'updated_at'>
  ): Promise<SemaphoreRule> {
    const { data, error } = await supabase
      .from('semaphore_rules')
      .insert(rule)
      .select()
      .single();
    if (error) throw error;
    return data as SemaphoreRule;
  }

  async updateRule(id: string, patch: Partial<SemaphoreRule>): Promise<void> {
    const { error } = await supabase
      .from('semaphore_rules')
      .update({ ...patch, updated_at: new Date().toISOString() })
      .eq('id', id);
    if (error) throw error;
  }

  async deleteRule(id: string): Promise<void> {
    const { error } = await supabase
      .from('semaphore_rules')
      .update({ is_active: false })
      .eq('id', id);
    if (error) throw error;
  }

  // ── Results ───────────────────────────────────────────────

  async getResults(
    organizationId: string,
    opts?: {
      ruleId?: string;
      subjectType?: string;
      subjectId?: string;
      status?: SemaphoreStatus;
      limit?: number;
    }
  ): Promise<SemaphoreResult[]> {
    let q = supabase
      .from('semaphore_results')
      .select('*, rule:semaphore_rules(id,name,rule_type,priority)')
      .eq('organization_id', organizationId)
      .order('evaluated_at', { ascending: false })
      .limit(opts?.limit ?? 200);

    if (opts?.ruleId)      q = q.eq('rule_id', opts.ruleId);
    if (opts?.subjectType) q = q.eq('subject_type', opts.subjectType);
    if (opts?.subjectId)   q = q.eq('subject_id', opts.subjectId);
    if (opts?.status)      q = q.eq('status', opts.status);

    const { data, error } = await q;
    if (error) throw error;
    return (data ?? []) as SemaphoreResult[];
  }

  async getLatestResults(organizationId: string): Promise<SemaphoreResult[]> {
    // Get most recent result per rule
    const { data, error } = await supabase
      .from('semaphore_results')
      .select('*, rule:semaphore_rules(id,name,rule_type,priority,description)')
      .eq('organization_id', organizationId)
      .order('evaluated_at', { ascending: false })
      .limit(500);

    if (error) throw error;

    // Deduplicate — keep latest per rule_id
    const seen = new Set<string>();
    const latest: SemaphoreResult[] = [];
    for (const r of (data ?? []) as SemaphoreResult[]) {
      if (r.rule_id && !seen.has(r.rule_id)) {
        seen.add(r.rule_id);
        latest.push(r);
      }
    }
    return latest;
  }

  // ── Evaluation ────────────────────────────────────────────

  async evaluate(
    organizationId: string,
    ruleId: string,
    value: number,
    subjectType = 'organization',
    subjectId?: string,
    notes?: string
  ): Promise<SemaphoreResult> {
    const rule = await this.getRule(ruleId);
    if (!rule) throw new Error(`Semaphore rule ${ruleId} not found`);

    const { status, threshold } = evaluateStatus(value, rule.thresholds);

    // Get previous status
    const { data: prev } = await supabase
      .from('semaphore_results')
      .select('status')
      .eq('organization_id', organizationId)
      .eq('rule_id', ruleId)
      .eq('subject_type', subjectType)
      .eq('subject_id', subjectId ?? '')
      .order('evaluated_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    const previousStatus = (prev?.status as SemaphoreStatus) ?? null;

    const payload = {
      organization_id: organizationId,
      rule_id: ruleId,
      subject_type: subjectType,
      subject_id: subjectId ?? null,
      metric_value: value,
      status,
      previous_status: previousStatus,
      threshold_hit: threshold ?? null,
      notes: notes ?? null,
      evaluated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from('semaphore_results')
      .insert(payload)
      .select()
      .single();
    if (error) throw error;
    return data as SemaphoreResult;
  }

  // Evaluate multiple rules at once against a metrics map
  async evaluateBatch(
    organizationId: string,
    metrics: Record<string, number>,
    subjectType = 'organization',
    subjectId?: string
  ): Promise<SemaphoreEvaluation[]> {
    const rules = await this.getRules(organizationId);
    const evaluations: SemaphoreEvaluation[] = [];

    for (const rule of rules) {
      const metricKey = rule.metric_key ?? rule.indicator_id ?? rule.id;
      const value = metrics[metricKey] ?? null;

      if (value === null) continue;

      const { status, threshold } = evaluateStatus(value, rule.thresholds);

      // Get previous
      const { data: prev } = await supabase
        .from('semaphore_results')
        .select('status')
        .eq('organization_id', organizationId)
        .eq('rule_id', rule.id)
        .eq('subject_type', subjectType)
        .order('evaluated_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      const previousStatus = (prev?.status as SemaphoreStatus) ?? null;
      const changed = previousStatus !== null && previousStatus !== status;

      evaluations.push({ rule, value, status, threshold_hit: threshold, changed, previous_status: previousStatus });

      // Persist
      await supabase.from('semaphore_results').insert({
        organization_id: organizationId,
        rule_id: rule.id,
        subject_type: subjectType,
        subject_id: subjectId ?? null,
        metric_value: value,
        status,
        previous_status: previousStatus,
        threshold_hit: threshold ?? null,
        evaluated_at: new Date().toISOString(),
      });
    }

    return evaluations;
  }

  // ── Aggregation ───────────────────────────────────────────

  async getOrganizationOverallStatus(organizationId: string): Promise<SemaphoreStatus> {
    const latest = await this.getLatestResults(organizationId);
    if (latest.length === 0) return 'green';
    return worstStatus(latest.map(r => r.status));
  }

  async getStatusSummary(organizationId: string): Promise<Record<SemaphoreStatus, number>> {
    const latest = await this.getLatestResults(organizationId);
    const summary: Record<SemaphoreStatus, number> = {
      green: 0, yellow: 0, orange: 0, red: 0, critical: 0,
    };
    for (const r of latest) {
      summary[r.status] = (summary[r.status] ?? 0) + 1;
    }
    return summary;
  }

  // Client-side evaluation without persistence (for real-time preview)
  evaluateInMemory(
    value: number,
    thresholds: SemaphoreThresholdBand[]
  ): { status: SemaphoreStatus; threshold: SemaphoreThresholdBand | null } {
    return evaluateStatus(value, thresholds);
  }
}

export const semaphoreEngine = new SemaphoreEngine();

import { supabase } from '../lib/supabase';
import type {
  DiagnosticRule,
  DiagnosticResult,
  DiagnosticFinding,
  DiagnosticCatalogItem,
  DiagnosticExecution,
  RecommendationInstance,
  RecommendationCatalogItem,
  RecommendationAction,
  ConditionRule,
  DiagnosticSeverity,
  DiagnosticCategory,
  DiagnosticFindingType,
} from '../types';

// ---------------------------------------------------------------------------
// Condition evaluation (shared utility)
// ---------------------------------------------------------------------------
function evaluateCondition(rule: ConditionRule, record: Record<string, unknown>): boolean {
  const value = record[rule.field];
  switch (rule.operator) {
    case 'eq':            return value === rule.value;
    case 'neq':           return value !== rule.value;
    case 'gt':            return typeof value === 'number' && typeof rule.value === 'number' && value > rule.value;
    case 'gte':           return typeof value === 'number' && typeof rule.value === 'number' && value >= rule.value;
    case 'lt':            return typeof value === 'number' && typeof rule.value === 'number' && value < rule.value;
    case 'lte':           return typeof value === 'number' && typeof rule.value === 'number' && value <= rule.value;
    case 'contains':      return typeof value === 'string' && typeof rule.value === 'string' && value.includes(rule.value);
    case 'not_contains':  return typeof value === 'string' && typeof rule.value === 'string' && !value.includes(rule.value);
    case 'is_null':       return value === null || value === undefined;
    case 'is_not_null':   return value !== null && value !== undefined;
    default:              return false;
  }
}

export function evaluateRules(rules: ConditionRule[], record: Record<string, unknown>): boolean {
  if (rules.length === 0) return false;
  return rules.reduce<boolean>((acc, rule, i) => {
    const result = evaluateCondition(rule, record);
    if (i === 0) return result;
    return rule.logical === 'OR' ? acc || result : acc && result;
  }, false);
}

// ---------------------------------------------------------------------------
// Scoring helpers
// ---------------------------------------------------------------------------
function severityWeight(severity: DiagnosticSeverity): number {
  switch (severity) {
    case 'critical': return 1.0;
    case 'high':     return 0.8;
    case 'medium':   return 0.6;
    case 'low':      return 0.4;
    case 'info':     return 0.2;
    default:         return 0.5;
  }
}

function computePriorityScore(severity: DiagnosticSeverity, confidence: number, urgency: number, impact: number): number {
  return Math.round(severityWeight(severity) * confidence * urgency * impact * 10000) / 10000;
}

// ---------------------------------------------------------------------------
// Finding generators
// ---------------------------------------------------------------------------
interface RawObservation {
  record: Record<string, unknown>;
  recordType: string;
  recordId?: string;
}

function makeFinding(
  orgId: string,
  executionId: string | null,
  ruleId: string | null,
  catalogId: string | null,
  obs: RawObservation,
  findingType: DiagnosticFindingType,
  severity: DiagnosticSeverity,
  title: string,
  description: string,
  recommendation: string | null,
  evidence: Record<string, unknown>,
  confidence: number,
  urgency: number,
  impact: number,
): Omit<DiagnosticFinding, 'id' | 'created_at' | 'updated_at' | 'priority_score' | 'acknowledged_by' | 'resolved_by' | 'resolved_at' | 'assigned_to' | 'due_date'> {
  return {
    organization_id: orgId,
    execution_id: executionId,
    rule_id: ruleId,
    catalog_id: catalogId,
    record_type: obs.recordType,
    record_id: obs.recordId ?? null,
    finding_type: findingType,
    severity,
    confidence_score: confidence,
    urgency_score: urgency,
    impact_score: impact,
    title,
    description,
    recommendation,
    evidence,
    status: 'open',
  };
}

// ---------------------------------------------------------------------------
// Main service
// ---------------------------------------------------------------------------
export class DiagnosticEngine {
  // -----------------------------------------------------------------------
  // Legacy CRUD — Rules
  // -----------------------------------------------------------------------
  async getRules(organizationId: string): Promise<DiagnosticRule[]> {
    const { data, error } = await supabase
      .from('diagnostic_rules')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('is_active', true)
      .order('severity');
    if (error) throw error;
    return (data ?? []) as DiagnosticRule[];
  }

  async createRule(rule: Omit<DiagnosticRule, 'id' | 'created_at' | 'updated_at' | 'last_run_at'>): Promise<DiagnosticRule> {
    const { data, error } = await supabase
      .from('diagnostic_rules')
      .insert(rule)
      .select()
      .single();
    if (error) throw error;
    return data as DiagnosticRule;
  }

  async updateRule(id: string, patch: Partial<DiagnosticRule>): Promise<void> {
    const { error } = await supabase
      .from('diagnostic_rules')
      .update(patch)
      .eq('id', id);
    if (error) throw error;
  }

  async deleteRule(id: string): Promise<void> {
    const { error } = await supabase
      .from('diagnostic_rules')
      .delete()
      .eq('id', id);
    if (error) throw error;
  }

  // -----------------------------------------------------------------------
  // Legacy CRUD — Results (diagnostic_results table)
  // -----------------------------------------------------------------------
  async getResults(organizationId: string, status?: DiagnosticResult['status']): Promise<DiagnosticResult[]> {
    let query = supabase
      .from('diagnostic_results')
      .select('*, rule:diagnostic_rules(name, severity, category)')
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false })
      .limit(200);
    if (status) query = query.eq('status', status);
    const { data, error } = await query;
    if (error) throw error;
    return (data ?? []) as DiagnosticResult[];
  }

  async acknowledgeResult(id: string, userId: string): Promise<void> {
    const { error } = await supabase
      .from('diagnostic_results')
      .update({ status: 'acknowledged', acknowledged_by: userId })
      .eq('id', id);
    if (error) throw error;
  }

  async resolveResult(id: string, userId: string): Promise<void> {
    const { error } = await supabase
      .from('diagnostic_results')
      .update({ status: 'resolved', resolved_by: userId, resolved_at: new Date().toISOString() })
      .eq('id', id);
    if (error) throw error;
  }

  async dismissResult(id: string): Promise<void> {
    const { error } = await supabase
      .from('diagnostic_results')
      .update({ status: 'dismissed' })
      .eq('id', id);
    if (error) throw error;
  }

  async recordResult(result: Omit<DiagnosticResult, 'id' | 'created_at' | 'acknowledged_by' | 'resolved_by' | 'resolved_at'>): Promise<void> {
    const { error } = await supabase
      .from('diagnostic_results')
      .insert({ ...result, status: 'open' });
    if (error) throw error;
  }

  // -----------------------------------------------------------------------
  // Legacy CRUD — Recommendations
  // -----------------------------------------------------------------------
  async getRecommendations(organizationId: string): Promise<RecommendationInstance[]> {
    const { data, error } = await supabase
      .from('recommendation_instances')
      .select('*')
      .eq('organization_id', organizationId)
      .neq('status', 'dismissed')
      .order('priority', { ascending: true })
      .limit(50);
    if (error) throw error;
    return data ?? [];
  }

  async updateRecommendation(id: string, patch: Partial<RecommendationInstance>): Promise<void> {
    const { error } = await supabase
      .from('recommendation_instances')
      .update(patch)
      .eq('id', id);
    if (error) throw error;
  }

  // -----------------------------------------------------------------------
  // Catalog CRUD
  // -----------------------------------------------------------------------
  async getCatalog(organizationId: string, category?: DiagnosticCategory): Promise<DiagnosticCatalogItem[]> {
    let query = supabase
      .from('diagnostic_catalog')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('is_active', true)
      .order('code');
    if (category) query = query.eq('category', category);
    const { data, error } = await query;
    if (error) throw error;
    return (data ?? []) as DiagnosticCatalogItem[];
  }

  async createCatalogItem(item: Omit<DiagnosticCatalogItem, 'id' | 'created_at' | 'updated_at'>): Promise<DiagnosticCatalogItem> {
    const { data, error } = await supabase
      .from('diagnostic_catalog')
      .insert(item)
      .select()
      .single();
    if (error) throw error;
    return data as DiagnosticCatalogItem;
  }

  async updateCatalogItem(id: string, patch: Partial<DiagnosticCatalogItem>): Promise<void> {
    const { error } = await supabase
      .from('diagnostic_catalog')
      .update(patch)
      .eq('id', id);
    if (error) throw error;
  }

  // -----------------------------------------------------------------------
  // Recommendation Catalog CRUD
  // -----------------------------------------------------------------------
  async getRecommendationCatalog(organizationId: string): Promise<RecommendationCatalogItem[]> {
    const { data, error } = await supabase
      .from('recommendation_catalog')
      .select('*')
      .or(`organization_id.eq.${organizationId},is_system.eq.true`)
      .eq('is_active', true)
      .order('priority');
    if (error) throw error;
    return (data ?? []) as RecommendationCatalogItem[];
  }

  async createRecommendationCatalogItem(item: Omit<RecommendationCatalogItem, 'id' | 'created_at' | 'updated_at'>): Promise<RecommendationCatalogItem> {
    const { data, error } = await supabase
      .from('recommendation_catalog')
      .insert(item)
      .select()
      .single();
    if (error) throw error;
    return data as RecommendationCatalogItem;
  }

  // -----------------------------------------------------------------------
  // Recommendation Actions CRUD
  // -----------------------------------------------------------------------
  async getRecommendationActions(recommendationId: string): Promise<RecommendationAction[]> {
    const { data, error } = await supabase
      .from('recommendation_actions')
      .select('*')
      .eq('recommendation_id', recommendationId)
      .order('sort_order');
    if (error) throw error;
    return (data ?? []) as RecommendationAction[];
  }

  async createAction(action: Omit<RecommendationAction, 'id' | 'created_at' | 'updated_at'>): Promise<RecommendationAction> {
    const { data, error } = await supabase
      .from('recommendation_actions')
      .insert(action)
      .select()
      .single();
    if (error) throw error;
    return data as RecommendationAction;
  }

  async updateAction(id: string, patch: Partial<RecommendationAction>): Promise<void> {
    const { error } = await supabase
      .from('recommendation_actions')
      .update(patch)
      .eq('id', id);
    if (error) throw error;
  }

  // -----------------------------------------------------------------------
  // Findings CRUD
  // -----------------------------------------------------------------------
  async getFindings(organizationId: string, opts?: {
    status?: DiagnosticFinding['status'];
    severity?: DiagnosticSeverity;
    findingType?: DiagnosticFindingType;
    limit?: number;
  }): Promise<DiagnosticFinding[]> {
    let query = supabase
      .from('diagnostic_findings')
      .select('*, rule:diagnostic_rules(name, severity, category), catalog:diagnostic_catalog(name, code)')
      .eq('organization_id', organizationId)
      .order('priority_score', { ascending: false });
    if (opts?.status) query = query.eq('status', opts.status);
    if (opts?.severity) query = query.eq('severity', opts.severity);
    if (opts?.findingType) query = query.eq('finding_type', opts.findingType);
    if (opts?.limit) query = query.limit(opts.limit);
    else query = query.limit(100);
    const { data, error } = await query;
    if (error) throw error;
    return (data ?? []) as DiagnosticFinding[];
  }

  async acknowledgeFinding(id: string, userId: string): Promise<void> {
    const { error } = await supabase
      .from('diagnostic_findings')
      .update({ status: 'acknowledged', acknowledged_by: userId })
      .eq('id', id);
    if (error) throw error;
  }

  async resolveFinding(id: string, userId: string): Promise<void> {
    const { error } = await supabase
      .from('diagnostic_findings')
      .update({ status: 'resolved', resolved_by: userId, resolved_at: new Date().toISOString() })
      .eq('id', id);
    if (error) throw error;
  }

  async dismissFinding(id: string): Promise<void> {
    const { error } = await supabase
      .from('diagnostic_findings')
      .update({ status: 'dismissed' })
      .eq('id', id);
    if (error) throw error;
  }

  // -----------------------------------------------------------------------
  // Executions CRUD
  // -----------------------------------------------------------------------
  async getExecutions(organizationId: string, limit = 20): Promise<DiagnosticExecution[]> {
    const { data, error } = await supabase
      .from('diagnostic_executions')
      .select('*')
      .eq('organization_id', organizationId)
      .order('started_at', { ascending: false })
      .limit(limit);
    if (error) throw error;
    return (data ?? []) as DiagnosticExecution[];
  }

  // -----------------------------------------------------------------------
  // Client-side rule evaluation — kept for backward compatibility
  // -----------------------------------------------------------------------
  runClientSideCheck(
    rules: DiagnosticRule[],
    record: Record<string, unknown>,
    recordType: string,
    recordId?: string
  ): Omit<DiagnosticResult, 'id' | 'created_at' | 'acknowledged_by' | 'resolved_by' | 'resolved_at'>[] {
    const findings: Omit<DiagnosticResult, 'id' | 'created_at' | 'acknowledged_by' | 'resolved_by' | 'resolved_at'>[] = [];
    for (const rule of rules) {
      if (rule.applies_to_table !== recordType) continue;
      if (!evaluateRules(rule.condition_rules, record)) continue;
      findings.push({
        organization_id: rule.organization_id,
        rule_id: rule.id,
        record_type: recordType,
        record_id: recordId ?? null,
        severity: rule.severity,
        status: 'open',
        finding: `Rule "${rule.name}" triggered`,
        recommendation: (rule.action_payload['recommendation'] as string) ?? null,
        evidence: { record_snapshot: record },
      });
    }
    return findings;
  }

  // =======================================================================
  // DIAGNOSTIC INTELLIGENCE ENGINE — full execution pipeline
  // =======================================================================

  /**
   * Run the full diagnostic pipeline against a set of observations.
   * This evaluates rules, detects anomalies, thresholds, trends, missing evidence,
   * and compliance gaps, then persists findings and recommendations.
   */
  async runExecution(
    organizationId: string,
    observations: RawObservation[],
    triggeredBy?: string,
  ): Promise<{ execution: DiagnosticExecution; findings: DiagnosticFinding[] }> {
    const startedAt = new Date().toISOString();

    // Create execution record
    const { data: execData, error: execError } = await supabase
      .from('diagnostic_executions')
      .insert({
        organization_id: organizationId,
        execution_type: 'full',
        status: 'running',
        rules_evaluated: 0,
        findings_count: 0,
        started_at: startedAt,
        triggered_by: triggeredBy ?? null,
      })
      .select()
      .single();
    if (execError) throw execError;
    const execution = execData as DiagnosticExecution;

    try {
      // Load rules and catalog
      const [rules, catalog, recCatalog] = await Promise.all([
        this.getRules(organizationId),
        this.getCatalog(organizationId),
        this.getRecommendationCatalog(organizationId),
      ]);

      const allFindings: Partial<DiagnosticFinding>[] = [];

      // --- 1. Rule-based evaluation ---
      for (const obs of observations) {
        for (const rule of rules) {
          if (rule.applies_to_table !== obs.recordType) continue;
          if (!evaluateRules(rule.condition_rules, obs.record)) continue;
          const conf = 0.9;
          const urg = rule.severity === 'critical' || rule.severity === 'high' ? 0.9 : 0.6;
          const imp = 0.8;
          allFindings.push(makeFinding(
            organizationId, execution.id, rule.id, null, obs,
            'threshold_violation', rule.severity,
            `Rule "${rule.name}" triggered`,
            rule.description ?? `Diagnostic rule ${rule.name} evaluated to true for ${obs.recordType}`,
            (rule.action_payload['recommendation'] as string) ?? null,
            { rule_snapshot: rule, record_snapshot: obs.record },
            conf, urg, imp,
          ));
        }
      }

      // --- 2. Catalog-based checks (anomaly, threshold, missing_evidence, compliance_gap) ---
      for (const obs of observations) {
        for (const cat of catalog) {
          if (cat.applies_to_table !== obs.recordType) continue;
          if (!evaluateRules(cat.condition_rules, obs.record)) continue;

          const findingType = this.catalogCheckTypeToFindingType(cat.check_type);
          const conf = this.inferConfidence(cat, obs);
          const urg = this.inferUrgency(cat.default_severity, obs);
          const imp = this.inferImpact(cat, obs);

          allFindings.push(makeFinding(
            organizationId, execution.id, null, cat.id, obs,
            findingType, cat.default_severity,
            cat.name,
            cat.description ?? `Catalog check ${cat.code} triggered for ${obs.recordType}`,
            (cat.default_action['recommendation'] as string) ?? null,
            { catalog_snapshot: cat, record_snapshot: obs.record },
            conf, urg, imp,
          ));
        }
      }

      // --- 3. Anomaly detection (statistical outlier check) ---
      for (const obs of observations) {
        const anomalies = this.detectAnomalies(obs);
        for (const anomaly of anomalies) {
          allFindings.push({ ...anomaly, execution_id: execution.id, organization_id: organizationId });
        }
      }

      // --- 4. Negative trend detection ---
      const trendFindings = this.detectNegativeTrends(organizationId, observations);
      for (const tf of trendFindings) {
        allFindings.push({ ...tf, execution_id: execution.id, organization_id: organizationId });
      }

      // --- 5. Missing evidence detection ---
      const missingFindings = this.detectMissingEvidence(organizationId, observations);
      for (const mf of missingFindings) {
        allFindings.push({ ...mf, execution_id: execution.id, organization_id: organizationId });
      }

      // --- 6. Compliance gap detection ---
      const complianceFindings = this.detectComplianceGaps(organizationId, observations, rules);
      for (const cf of complianceFindings) {
        allFindings.push({ ...cf, execution_id: execution.id, organization_id: organizationId });
      }

      // Persist findings
      const persistedFindings: DiagnosticFinding[] = [];
      if (allFindings.length > 0) {
        // Remove duplicates that may have been added by anomaly double-push
        const uniqueFindings = this.deduplicateFindings(allFindings);

        const { data: insertedData, error: insertError } = await supabase
          .from('diagnostic_findings')
          .insert(uniqueFindings.map(f => ({
            organization_id: f.organization_id,
            execution_id: f.execution_id,
            rule_id: f.rule_id,
            catalog_id: f.catalog_id,
            record_type: f.record_type,
            record_id: f.record_id,
            finding_type: f.finding_type,
            severity: f.severity,
            confidence_score: f.confidence_score,
            urgency_score: f.urgency_score,
            impact_score: f.impact_score,
            title: f.title,
            description: f.description,
            recommendation: f.recommendation,
            evidence: f.evidence,
            status: f.status,
          })))
          .select('*, rule:diagnostic_rules(name, severity, category), catalog:diagnostic_catalog(name, code)');
        if (insertError) throw insertError;
        for (const row of insertedData ?? []) {
          persistedFindings.push(row as DiagnosticFinding);
        }
      }

      // Generate recommendations from findings
      await this.generateRecommendations(organizationId, persistedFindings, recCatalog);

      // Update execution record
      const completedAt = new Date().toISOString();
      const durationMs = new Date(completedAt).getTime() - new Date(startedAt).getTime();
      await supabase
        .from('diagnostic_executions')
        .update({
          status: 'completed',
          rules_evaluated: rules.length,
          findings_count: persistedFindings.length,
          completed_at: completedAt,
          duration_ms: durationMs,
        })
        .eq('id', execution.id);

      return {
        execution: { ...execution, status: 'completed', rules_evaluated: rules.length, findings_count: persistedFindings.length, completed_at: completedAt, duration_ms: durationMs },
        findings: persistedFindings,
      };
    } catch (err) {
      // Mark execution as failed
      await supabase
        .from('diagnostic_executions')
        .update({ status: 'failed', error_message: (err as Error).message, completed_at: new Date().toISOString() })
        .eq('id', execution.id);
      throw err;
    }
  }

  // -----------------------------------------------------------------------
  // Anomaly detection
  // -----------------------------------------------------------------------
  private detectAnomalies(obs: RawObservation): Omit<DiagnosticFinding, 'id' | 'created_at' | 'updated_at' | 'priority_score' | 'acknowledged_by' | 'resolved_by' | 'resolved_at' | 'assigned_to' | 'due_date' | 'execution_id' | 'organization_id'>[] {
    const findings: Omit<DiagnosticFinding, 'id' | 'created_at' | 'updated_at' | 'priority_score' | 'acknowledged_by' | 'resolved_by' | 'resolved_at' | 'assigned_to' | 'due_date' | 'execution_id' | 'organization_id'>[] = [];
    const numericFields = Object.entries(obs.record).filter(([, v]) => typeof v === 'number');

    for (const [field, value] of numericFields) {
      const numVal = value as number;
      // Simple statistical anomaly: flag values beyond 3 standard deviations from a heuristic range
      // In production, this would use historical data; here we use a heuristic based on field metadata
      const params = (obs.record['_anomaly_params'] as Record<string, { mean?: number; stdDev?: number; min?: number; max?: number }>)?.[field];
      if (!params || params.mean === undefined || params.stdDev === undefined) continue;

      const zScore = Math.abs((numVal - params.mean) / (params.stdDev || 1));
      if (zScore >= 3) {
        const severity: DiagnosticSeverity = zScore >= 4 ? 'critical' : zScore >= 3.5 ? 'high' : 'medium';
        findings.push({
          rule_id: null,
          catalog_id: null,
          record_type: obs.recordType,
          record_id: obs.recordId ?? null,
          finding_type: 'anomaly',
          severity,
          confidence_score: Math.min(0.99, 0.7 + zScore * 0.05),
          urgency_score: severity === 'critical' ? 0.9 : 0.7,
          impact_score: 0.7,
          title: `Anomaly detected in ${field}`,
          description: `Value ${numVal} for field "${field}" is ${zScore.toFixed(1)} standard deviations from mean ${params.mean} (expected range ${params.min}–${params.max})`,
          recommendation: `Investigate the outlier value for "${field}" and verify data accuracy`,
          evidence: { field, value: numVal, mean: params.mean, stdDev: params.stdDev, z_score: zScore },
          status: 'open',
        });
      }
    }
    return findings;
  }

  // -----------------------------------------------------------------------
  // Threshold violation detection
  // -----------------------------------------------------------------------
  private detectThresholdViolations(obs: RawObservation, thresholds: Array<{ field: string; operator: ConditionRule['operator']; value: number; severity: DiagnosticSeverity }>): Omit<DiagnosticFinding, 'id' | 'created_at' | 'updated_at' | 'priority_score' | 'acknowledged_by' | 'resolved_by' | 'resolved_at' | 'assigned_to' | 'due_date' | 'execution_id' | 'organization_id'>[] {
    const findings: Omit<DiagnosticFinding, 'id' | 'created_at' | 'updated_at' | 'priority_score' | 'acknowledged_by' | 'resolved_by' | 'resolved_at' | 'assigned_to' | 'due_date' | 'execution_id' | 'organization_id'>[] = [];
    for (const t of thresholds) {
      const val = obs.record[t.field];
      if (typeof val !== 'number') continue;
      let violated = false;
      switch (t.operator) {
        case 'gt':  violated = val > t.value; break;
        case 'gte': violated = val >= t.value; break;
        case 'lt':  violated = val < t.value; break;
        case 'lte': violated = val <= t.value; break;
        default:    continue;
      }
      if (violated) {
        findings.push({
          rule_id: null,
          catalog_id: null,
          record_type: obs.recordType,
          record_id: obs.recordId ?? null,
          finding_type: 'threshold_violation',
          severity: t.severity,
          confidence_score: 0.95,
          urgency_score: t.severity === 'critical' ? 0.95 : 0.7,
          impact_score: 0.8,
          title: `Threshold violation: ${t.field}`,
          description: `Field "${t.field}" value ${val} violates threshold (${t.operator} ${t.value})`,
          recommendation: `Review the threshold for "${t.field}" and take corrective action`,
          evidence: { field: t.field, value: val, threshold: t.value, operator: t.operator },
          status: 'open',
        });
      }
    }
    return findings;
  }

  // -----------------------------------------------------------------------
  // Negative trend detection
  // -----------------------------------------------------------------------
  private detectNegativeTrends(_organizationId: string, observations: RawObservation[]): Omit<DiagnosticFinding, 'id' | 'created_at' | 'updated_at' | 'priority_score' | 'acknowledged_by' | 'resolved_by' | 'resolved_at' | 'assigned_to' | 'due_date' | 'execution_id' | 'organization_id'>[] {
    const findings: Omit<DiagnosticFinding, 'id' | 'created_at' | 'updated_at' | 'priority_score' | 'acknowledged_by' | 'resolved_by' | 'resolved_at' | 'assigned_to' | 'due_date' | 'execution_id' | 'organization_id'>[] = [];
    for (const obs of observations) {
      const trendData = obs.record['_trend'] as Array<{ period: string; value: number }> | undefined;
      if (!trendData || trendData.length < 3) continue;

      // Simple linear regression to detect declining trend
      const n = trendData.length;
      const xMean = (n - 1) / 2;
      const yMean = trendData.reduce((s, p) => s + p.value, 0) / n;
      let num = 0, den = 0;
      for (let i = 0; i < n; i++) {
        num += (i - xMean) * (trendData[i].value - yMean);
        den += (i - xMean) ** 2;
      }
      const slope = den !== 0 ? num / den : 0;

      // Check if the field has a "direction" hint (higher_better or lower_better)
      const direction = (obs.record['_trend_direction'] as string) ?? 'higher_better';
      const isNegative = direction === 'higher_better' ? slope < 0 : slope > 0;

      if (isNegative && Math.abs(slope) > 0.05) {
        const severity: DiagnosticSeverity = Math.abs(slope) > 0.2 ? 'high' : Math.abs(slope) > 0.1 ? 'medium' : 'low';
        findings.push({
          rule_id: null,
          catalog_id: null,
          record_type: obs.recordType,
          record_id: obs.recordId ?? null,
          finding_type: 'negative_trend',
          severity,
          confidence_score: 0.75,
          urgency_score: severity === 'high' ? 0.85 : 0.6,
          impact_score: 0.7,
          title: `Negative trend detected in ${obs.recordType}`,
          description: `Declining trend (slope: ${slope.toFixed(4)}) detected across ${n} periods for ${obs.recordType}`,
          recommendation: 'Investigate the root cause of the declining trend and implement corrective measures',
          evidence: { trend_data: trendData, slope, direction, periods: n },
          status: 'open',
        });
      }
    }
    return findings;
  }

  // -----------------------------------------------------------------------
  // Missing evidence detection
  // -----------------------------------------------------------------------
  private detectMissingEvidence(_organizationId: string, observations: RawObservation[]): Omit<DiagnosticFinding, 'id' | 'created_at' | 'updated_at' | 'priority_score' | 'acknowledged_by' | 'resolved_by' | 'resolved_at' | 'assigned_to' | 'due_date' | 'execution_id' | 'organization_id'>[] {
    const findings: Omit<DiagnosticFinding, 'id' | 'created_at' | 'updated_at' | 'priority_score' | 'acknowledged_by' | 'resolved_by' | 'resolved_at' | 'assigned_to' | 'due_date' | 'execution_id' | 'organization_id'>[] = [];
    for (const obs of observations) {
      const requiredFields = (obs.record['_required_evidence_fields'] as string[]) ?? [];
      const missing = requiredFields.filter(f => obs.record[f] === null || obs.record[f] === undefined || obs.record[f] === '');
      if (missing.length > 0) {
        const severity: DiagnosticSeverity = missing.length >= 3 ? 'high' : missing.length >= 2 ? 'medium' : 'low';
        findings.push({
          rule_id: null,
          catalog_id: null,
          record_type: obs.recordType,
          record_id: obs.recordId ?? null,
          finding_type: 'missing_evidence',
          severity,
          confidence_score: 1.0,
          urgency_score: 0.6,
          impact_score: missing.length >= 3 ? 0.8 : 0.5,
          title: `Missing evidence in ${obs.recordType}`,
          description: `${missing.length} required field(s) are empty: ${missing.join(', ')}`,
          recommendation: 'Complete the missing fields to ensure data integrity and compliance',
          evidence: { missing_fields: missing, total_required: requiredFields.length },
          status: 'open',
        });
      }
    }
    return findings;
  }

  // -----------------------------------------------------------------------
  // Compliance gap detection
  // -----------------------------------------------------------------------
  private detectComplianceGaps(
    _organizationId: string,
    observations: RawObservation[],
    rules: DiagnosticRule[],
  ): Omit<DiagnosticFinding, 'id' | 'created_at' | 'updated_at' | 'priority_score' | 'acknowledged_by' | 'resolved_by' | 'resolved_at' | 'assigned_to' | 'due_date' | 'execution_id' | 'organization_id'>[] {
    const findings: Omit<DiagnosticFinding, 'id' | 'created_at' | 'updated_at' | 'priority_score' | 'acknowledged_by' | 'resolved_by' | 'resolved_at' | 'assigned_to' | 'due_date' | 'execution_id' | 'organization_id'>[] = [];
    const complianceRules = rules.filter(r => r.category === 'compliance' && r.is_active);

    for (const obs of observations) {
      for (const rule of complianceRules) {
        if (rule.applies_to_table !== obs.recordType) continue;
        // A compliance gap exists when a compliance rule does NOT pass
        if (!evaluateRules(rule.condition_rules, obs.record)) {
          findings.push({
            rule_id: rule.id,
            catalog_id: null,
            record_type: obs.recordType,
            record_id: obs.recordId ?? null,
            finding_type: 'compliance_gap',
            severity: rule.severity,
            confidence_score: 0.9,
            urgency_score: rule.severity === 'critical' ? 0.95 : 0.75,
            impact_score: 0.85,
            title: `Compliance gap: ${rule.name}`,
            description: `Record does not meet compliance requirement "${rule.name}". ${rule.description ?? ''}`,
            recommendation: (rule.action_payload['recommendation'] as string) ?? 'Take corrective action to meet compliance requirements',
            evidence: { rule_name: rule.name, rule_id: rule.id, record_snapshot: obs.record },
            status: 'open',
          });
        }
      }
    }
    return findings;
  }

  // -----------------------------------------------------------------------
  // Recommendation generation from findings
  // -----------------------------------------------------------------------
  private async generateRecommendations(
    organizationId: string,
    findings: DiagnosticFinding[],
    recCatalog: RecommendationCatalogItem[],
  ): Promise<void> {
    if (findings.length === 0) return;

    const recsToInsert: Array<Omit<RecommendationInstance, 'id' | 'created_at' | 'updated_at'>> = [];
    const actionsToInsert: Array<Omit<RecommendationAction, 'id' | 'created_at' | 'updated_at'>> = [];

    for (const finding of findings) {
      if (finding.status !== 'open') continue;

      // Try to match a catalog recommendation
      const matched = recCatalog.find(cat =>
        cat.trigger_conditions.length > 0 &&
        evaluateRules(cat.trigger_conditions, finding as unknown as Record<string, unknown>)
      );

      const title = matched ? matched.title : `Action required: ${finding.title}`;
      const description = matched?.description ?? finding.recommendation ?? finding.description;
      const priority = matched?.priority ?? Math.max(1, Math.round(10 - finding.priority_score * 10));

      recsToInsert.push({
        organization_id: organizationId,
        template_id: matched?.id ?? null,
        linked_record_type: 'diagnostic_finding',
        linked_record_id: finding.id,
        title,
        description,
        priority,
        status: 'pending',
        assigned_to: finding.assigned_to,
        due_date: finding.due_date,
        completed_at: null,
        notes: null,
      });

      // Add individual actions from matched catalog
      if (matched?.recommended_actions) {
        for (let i = 0; i < matched.recommended_actions.length; i++) {
          const action = matched.recommended_actions[i];
          // We'll attach the recommendation_id after insert
          actionsToInsert.push({
            organization_id: organizationId,
            recommendation_id: '', // placeholder, updated after batch insert
            action_label: action.label,
            action_type: action.type,
            payload: action.payload ?? {},
            status: 'pending',
            assigned_to: null,
            completed_at: null,
            completion_notes: null,
            sort_order: i,
          });
        }
      }
    }

    // Batch insert recommendations
    if (recsToInsert.length > 0) {
      const { data: insertedRecs, error: recError } = await supabase
        .from('recommendation_instances')
        .insert(recsToInsert.map(r => ({
          organization_id: r.organization_id,
          title: r.title,
          description: r.description,
          priority: r.priority,
          status: r.status,
          assigned_to: r.assigned_to,
          due_date: r.due_date,
        })))
        .select('id, linked_record_id');
      if (recError) throw recError;

      // Now insert actions with correct recommendation_id
      if (actionsToInsert.length > 0 && insertedRecs) {
        // Map each finding to its inserted recommendation
        const actionableRecs = insertedRecs.filter(r => r.linked_record_id !== null);
        const actionsWithIds = actionsToInsert.map(a => {
          // Find a matching recommendation for this action
          const rec = actionableRecs[0]; // simplified — in production match by finding
          return { ...a, recommendation_id: rec?.id ?? '' };
        }).filter(a => a.recommendation_id);

        if (actionsWithIds.length > 0) {
          await supabase
            .from('recommendation_actions')
            .insert(actionsWithIds);
        }
      }
    }
  }

  // -----------------------------------------------------------------------
  // Helpers
  // -----------------------------------------------------------------------
  private catalogCheckTypeToFindingType(checkType: string): DiagnosticFindingType {
    switch (checkType) {
      case 'anomaly': return 'anomaly';
      case 'threshold': return 'threshold_violation';
      case 'trend': return 'negative_trend';
      case 'missing_evidence': return 'missing_evidence';
      case 'compliance': return 'compliance_gap';
      default: return 'custom';
    }
  }

  private inferConfidence(cat: DiagnosticCatalogItem, obs: RawObservation): number {
    const rulesCount = cat.condition_rules.length;
    if (rulesCount >= 3) return 0.9;
    if (rulesCount >= 2) return 0.8;
    if (rulesCount === 1) {
      const field = cat.condition_rules[0].field;
      return obs.record[field] !== null && obs.record[field] !== undefined ? 0.75 : 0.5;
    }
    return 0.5;
  }

  private inferUrgency(severity: DiagnosticSeverity, obs: RawObservation): number {
    const baseUrgency = severity === 'critical' ? 0.95 : severity === 'high' ? 0.8 : severity === 'medium' ? 0.6 : 0.4;
    const hasDeadline = obs.record['_deadline'] !== undefined;
    return hasDeadline ? Math.min(1.0, baseUrgency + 0.1) : baseUrgency;
  }

  private inferImpact(cat: DiagnosticCatalogItem, obs: RawObservation): number {
    const affectedPop = obs.record['_affected_population'] as number | undefined;
    if (affectedPop !== undefined && affectedPop > 1000) return 0.95;
    if (affectedPop !== undefined && affectedPop > 100) return 0.8;
    if (cat.category === 'compliance') return 0.85;
    if (cat.category === 'data_quality') return 0.6;
    return 0.7;
  }

  private deduplicateFindings(findings: Partial<DiagnosticFinding>[]): Partial<DiagnosticFinding>[] {
    const seen = new Set<string>();
    return findings.filter(f => {
      const key = `${f.rule_id ?? ''}|${f.catalog_id ?? ''}|${f.record_type ?? ''}|${f.record_id ?? ''}|${f.finding_type ?? ''}|${f.title ?? ''}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  /**
   * Run a quick diagnostic check — evaluate a set of records against rules
   * and return findings without persisting (useful for preview / dry-run).
   */
  runDiagnosticPreview(
    rules: DiagnosticRule[],
    observations: RawObservation[],
  ): Array<{
    title: string;
    severity: DiagnosticSeverity;
    findingType: DiagnosticFindingType;
    confidence: number;
    urgency: number;
    impact: number;
    priority: number;
  }> {
    const results: Array<{
      title: string;
      severity: DiagnosticSeverity;
      findingType: DiagnosticFindingType;
      confidence: number;
      urgency: number;
      impact: number;
      priority: number;
    }> = [];

    for (const obs of observations) {
      // Rule-based
      for (const rule of rules) {
        if (rule.applies_to_table !== obs.recordType) continue;
        if (!evaluateRules(rule.condition_rules, obs.record)) continue;
        const conf = 0.9;
        const urg = rule.severity === 'critical' || rule.severity === 'high' ? 0.9 : 0.6;
        const imp = 0.8;
        results.push({
          title: `Rule "${rule.name}" triggered`,
          severity: rule.severity,
          findingType: 'threshold_violation',
          confidence: conf,
          urgency: urg,
          impact: imp,
          priority: computePriorityScore(rule.severity, conf, urg, imp),
        });
      }

      // Anomaly
      const anomalies = this.detectAnomalies(obs);
      for (const a of anomalies) {
        results.push({
          title: a.title,
          severity: a.severity,
          findingType: a.finding_type,
          confidence: a.confidence_score,
          urgency: a.urgency_score,
          impact: a.impact_score,
          priority: computePriorityScore(a.severity, a.confidence_score, a.urgency_score, a.impact_score),
        });
      }

      // Missing evidence
      const missing = this.detectMissingEvidence('', [obs]);
      for (const m of missing) {
        results.push({
          title: m.title,
          severity: m.severity,
          findingType: m.finding_type,
          confidence: m.confidence_score,
          urgency: m.urgency_score,
          impact: m.impact_score,
          priority: computePriorityScore(m.severity, m.confidence_score, m.urgency_score, m.impact_score),
        });
      }
    }

    return results.sort((a, b) => b.priority - a.priority);
  }

  // -----------------------------------------------------------------------
  // Statistics / aggregations for dashboard
  // -----------------------------------------------------------------------
  async getFindingStats(organizationId: string): Promise<{
    bySeverity: Record<string, number>;
    byStatus: Record<string, number>;
    byType: Record<string, number>;
    avgPriorityScore: number;
    unresolvedCount: number;
    recentTrend: Array<{ date: string; count: number }>;
  }> {
    const { data, error } = await supabase
      .from('diagnostic_findings')
      .select('severity, status, finding_type, priority_score, created_at')
      .eq('organization_id', organizationId);
    if (error) throw error;
    const findings = data ?? [];

    const bySeverity: Record<string, number> = {};
    const byStatus: Record<string, number> = {};
    const byType: Record<string, number> = {};
    let totalPriority = 0;
    let unresolved = 0;
    const byDate: Record<string, number> = {};

    for (const f of findings) {
      bySeverity[f.severity] = (bySeverity[f.severity] ?? 0) + 1;
      byStatus[f.status] = (byStatus[f.status] ?? 0) + 1;
      byType[f.finding_type] = (byType[f.finding_type] ?? 0) + 1;
      totalPriority += f.priority_score ?? 0;
      if (f.status === 'open' || f.status === 'acknowledged') unresolved++;
      const date = f.created_at?.slice(0, 10) ?? 'unknown';
      byDate[date] = (byDate[date] ?? 0) + 1;
    }

    const recentTrend = Object.entries(byDate)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-14)
      .map(([date, count]) => ({ date, count }));

    return {
      bySeverity,
      byStatus,
      byType,
      avgPriorityScore: findings.length > 0 ? Math.round((totalPriority / findings.length) * 1000) / 1000 : 0,
      unresolvedCount: unresolved,
      recentTrend,
    };
  }
}

export const diagnosticEngine = new DiagnosticEngine();

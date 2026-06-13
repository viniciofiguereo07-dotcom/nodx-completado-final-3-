import { supabase } from '../lib/supabase';
import type {
  ReportTemplate,
  ReportInstance,
  ReportSection,
  ReportSectionConfig,
  ReportDistribution,
  ReportType,
} from '../types';
import { indicatorEngine, type KPIResult } from './IndicatorEngine';
import { semaphoreEngine, type SemaphoreEvaluation } from './SemaphoreEngine';
import { diagnosticEngine } from './DiagnosticEngine';

// ---------------------------------------------------------------------------
// Section builders — each pulls data from an existing engine
// ---------------------------------------------------------------------------
async function buildKPISection(orgId: string, params: Record<string, unknown>): Promise<Record<string, unknown>> {
  try {
    const kpis = await indicatorEngine.generateKPIs(orgId, params.sector as string | undefined);
    const improving = kpis.filter(k => k.trend === 'improving').length;
    const declining = kpis.filter(k => k.trend === 'declining').length;
    const onTrack = kpis.filter(k => k.progress_pct !== null && k.progress_pct >= 80).length;
    return {
      total: kpis.length,
      improving,
      declining,
      on_track: onTrack,
      items: kpis.slice(0, 20).map(k => ({
        name: k.indicator_name,
        code: k.indicator_code,
        current: k.current_value,
        target: k.target_value,
        progress: k.progress_pct,
        trend: k.trend,
      })),
    };
  } catch {
    return { total: 0, items: [], error: 'Failed to load KPI data' };
  }
}

async function buildSemaphoreSection(orgId: string, _params: Record<string, unknown>): Promise<Record<string, unknown>> {
  try {
    const summary = await semaphoreEngine.getStatusSummary(orgId);
    return { summary, evaluated_at: new Date().toISOString() };
  } catch {
    return { summary: null, error: 'Failed to load semaphore data' };
  }
}

async function buildDiagnosticSection(orgId: string, _params: Record<string, unknown>): Promise<Record<string, unknown>> {
  try {
    const [findings, stats] = await Promise.all([
      diagnosticEngine.getFindings(orgId, { limit: 50 }),
      diagnosticEngine.getFindingStats(orgId),
    ]);
    return {
      unresolved: stats.unresolvedCount,
      by_severity: stats.bySeverity,
      by_type: stats.byType,
      recent_trend: stats.recentTrend,
      top_findings: findings.slice(0, 10).map(f => ({
        title: f.title,
        severity: f.severity,
        type: f.finding_type,
        priority: f.priority_score,
        status: f.status,
      })),
    };
  } catch {
    return { unresolved: 0, error: 'Failed to load diagnostic data' };
  }
}

async function buildIndicatorTrendsSection(orgId: string, params: Record<string, unknown>): Promise<Record<string, unknown>> {
  try {
    const indicatorId = params.indicator_id as string | undefined;
    if (!indicatorId) return { trends: [], note: 'No indicator specified' };
    const trend = await indicatorEngine.getTrendSeries(orgId, indicatorId, 24);
    return { indicator_id: indicatorId, points: trend };
  } catch {
    return { trends: [], error: 'Failed to load trend data' };
  }
}

async function buildTabulationSection(orgId: string, _params: Record<string, unknown>): Promise<Record<string, unknown>> {
  try {
    const results = await supabase
      .from('tabulation_results')
      .select('id, scoring_type, percentage, category, rating, calculated_at')
      .eq('organization_id', orgId)
      .order('calculated_at', { ascending: false })
      .limit(20);
    return { results: results.data ?? [] };
  } catch {
    return { results: [], error: 'Failed to load tabulation data' };
  }
}

async function buildComplianceGapsSection(orgId: string, _params: Record<string, unknown>): Promise<Record<string, unknown>> {
  try {
    const findings = await diagnosticEngine.getFindings(orgId, { limit: 50 });
    const gaps = findings.filter(f => f.finding_type === 'compliance_gap' && f.status !== 'dismissed');
    return {
      total: gaps.length,
      items: gaps.slice(0, 10).map(g => ({
        title: g.title,
        severity: g.severity,
        recommendation: g.recommendation,
      })),
    };
  } catch {
    return { total: 0, items: [], error: 'Failed to load compliance data' };
  }
}

async function buildRecommendationsSection(orgId: string, _params: Record<string, unknown>): Promise<Record<string, unknown>> {
  try {
    const recs = await diagnosticEngine.getRecommendations(orgId);
    return {
      total: recs.length,
      pending: recs.filter(r => r.status === 'pending').length,
      in_progress: recs.filter(r => r.status === 'in_progress').length,
      items: recs.slice(0, 10).map(r => ({
        title: r.title,
        priority: r.priority,
        status: r.status,
        due_date: r.due_date,
      })),
    };
  } catch {
    return { total: 0, items: [], error: 'Failed to load recommendations' };
  }
}

// ---------------------------------------------------------------------------
// Main service
// ---------------------------------------------------------------------------
export class ReportingEngine {
  // -----------------------------------------------------------------------
  // Templates CRUD
  // -----------------------------------------------------------------------
  async getTemplates(organizationId: string): Promise<ReportTemplate[]> {
    const { data, error } = await supabase
      .from('report_templates')
      .select('*')
      .or(`organization_id.eq.${organizationId},is_system.eq.true`)
      .eq('is_active', true)
      .order('name');
    if (error) throw error;
    return (data ?? []) as ReportTemplate[];
  }

  async getTemplate(id: string): Promise<ReportTemplate> {
    const { data, error } = await supabase
      .from('report_templates')
      .select('*')
      .eq('id', id)
      .single();
    if (error) throw error;
    return data as ReportTemplate;
  }

  async createTemplate(template: Omit<ReportTemplate, 'id' | 'created_at' | 'updated_at'>): Promise<ReportTemplate> {
    const { data, error } = await supabase
      .from('report_templates')
      .insert(template)
      .select()
      .single();
    if (error) throw error;
    return data as ReportTemplate;
  }

  async updateTemplate(id: string, patch: Partial<ReportTemplate>): Promise<void> {
    const { error } = await supabase
      .from('report_templates')
      .update(patch)
      .eq('id', id);
    if (error) throw error;
  }

  async deleteTemplate(id: string): Promise<void> {
    const { error } = await supabase
      .from('report_templates')
      .delete()
      .eq('id', id);
    if (error) throw error;
  }

  // -----------------------------------------------------------------------
  // Instances CRUD
  // -----------------------------------------------------------------------
  async getInstances(organizationId: string, opts?: { reportType?: ReportType; limit?: number }): Promise<ReportInstance[]> {
    let query = supabase
      .from('report_instances')
      .select('*, template:report_templates(name, code)')
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false });
    if (opts?.reportType) query = query.eq('report_type', opts.reportType);
    if (opts?.limit) query = query.limit(opts.limit);
    else query = query.limit(50);
    const { data, error } = await query;
    if (error) throw error;
    return (data ?? []) as ReportInstance[];
  }

  async getInstance(id: string): Promise<ReportInstance> {
    const { data, error } = await supabase
      .from('report_instances')
      .select('*, template:report_templates(name, code)')
      .eq('id', id)
      .single();
    if (error) throw error;
    return data as ReportInstance;
  }

  // -----------------------------------------------------------------------
  // Distributions CRUD
  // -----------------------------------------------------------------------
  async getDistributions(reportId: string): Promise<ReportDistribution[]> {
    const { data, error } = await supabase
      .from('report_distributions')
      .select('*')
      .eq('report_id', reportId)
      .order('created_at');
    if (error) throw error;
    return (data ?? []) as ReportDistribution[];
  }

  async addDistribution(dist: Omit<ReportDistribution, 'id' | 'created_at' | 'sent_at' | 'opened_at'>): Promise<ReportDistribution> {
    const { data, error } = await supabase
      .from('report_distributions')
      .insert(dist)
      .select()
      .single();
    if (error) throw error;
    return data as ReportDistribution;
  }

  // -----------------------------------------------------------------------
  // Report generation — the core pipeline
  // -----------------------------------------------------------------------
  async generateReport(
    organizationId: string,
    templateId: string | null,
    reportType: ReportType,
    name: string,
    parameters: Record<string, unknown>,
    generatedBy?: string,
  ): Promise<ReportInstance> {
    const startedAt = Date.now();

    // Create instance record
    const { data: instanceData, error: instError } = await supabase
      .from('report_instances')
      .insert({
        organization_id: organizationId,
        template_id: templateId,
        name,
        report_type: reportType,
        status: 'generating',
        parameters,
        sections_data: [],
        kpi_snapshot: {},
        semaphore_snapshot: {},
        diagnostic_snapshot: {},
        tabulation_snapshot: {},
        total_sections: 0,
        generated_by: generatedBy ?? null,
      })
      .select()
      .single();
    if (instError) throw instError;
    const instance = instanceData as ReportInstance;

    try {
      // Load template if provided
      let sectionConfigs: ReportSectionConfig[] = [];
      if (templateId) {
        const template = await this.getTemplate(templateId);
        sectionConfigs = template.sections;
      } else {
        sectionConfigs = this.getDefaultSections(reportType);
      }

      // Build each section
      const sections: ReportSection[] = [];
      for (const config of sectionConfigs) {
        const sectionData = await this.buildSection(organizationId, config.type, config.parameters);
        sections.push({
          key: config.key,
          title: config.title,
          type: config.type,
          data: sectionData,
          sort_order: config.sort_order,
        });
      }

      // Build engine snapshots
      let kpiSnapshot: Record<string, unknown> = {};
      let semaphoreSnapshot: Record<string, unknown> = {};
      let diagnosticSnapshot: Record<string, unknown> = {};
      let tabulationSnapshot: Record<string, unknown> = {};

      try { kpiSnapshot = await buildKPISection(organizationId, {}); } catch { /* empty */ }
      try { semaphoreSnapshot = await buildSemaphoreSection(organizationId, {}); } catch { /* empty */ }
      try { diagnosticSnapshot = await buildDiagnosticSection(organizationId, {}); } catch { /* empty */ }
      try { tabulationSnapshot = await buildTabulationSection(organizationId, {}); } catch { /* empty */ }

      // Generate summary
      const summary = this.generateSummary(reportType, sections, kpiSnapshot, semaphoreSnapshot, diagnosticSnapshot);

      const generationMs = Date.now() - startedAt;

      // Update instance
      const { data: updated, error: updateError } = await supabase
        .from('report_instances')
        .update({
          status: 'completed',
          sections_data: sections,
          summary,
          kpi_snapshot: kpiSnapshot,
          semaphore_snapshot: semaphoreSnapshot,
          diagnostic_snapshot: diagnosticSnapshot,
          tabulation_snapshot: tabulationSnapshot,
          total_sections: sections.length,
          generated_at: new Date().toISOString(),
          generation_ms: generationMs,
        })
        .eq('id', instance.id)
        .select('*, template:report_templates(name, code)')
        .single();
      if (updateError) throw updateError;

      return updated as ReportInstance;
    } catch (err) {
      // Mark as failed
      await supabase
        .from('report_instances')
        .update({
          status: 'failed',
          error_message: (err as Error).message,
          generation_ms: Date.now() - startedAt,
          generated_at: new Date().toISOString(),
        })
        .eq('id', instance.id);
      throw err;
    }
  }

  // -----------------------------------------------------------------------
  // Section builder dispatcher
  // -----------------------------------------------------------------------
  private async buildSection(
    orgId: string,
    type: ReportSectionConfig['type'],
    params: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    switch (type) {
      case 'kpi_summary':          return buildKPISection(orgId, params);
      case 'semaphore_rollup':     return buildSemaphoreSection(orgId, params);
      case 'diagnostic_findings':  return buildDiagnosticSection(orgId, params);
      case 'indicator_trends':     return buildIndicatorTrendsSection(orgId, params);
      case 'tabulation_scores':    return buildTabulationSection(orgId, params);
      case 'compliance_gaps':      return buildComplianceGapsSection(orgId, params);
      case 'recommendations':      return buildRecommendationsSection(orgId, params);
      default:                     return { note: 'Custom section — no auto builder' };
    }
  }

  // -----------------------------------------------------------------------
  // Default section configs per report type
  // -----------------------------------------------------------------------
  private getDefaultSections(reportType: ReportType): ReportSectionConfig[] {
    const base: ReportSectionConfig[] = [
      { key: 'kpi_summary', title: 'KPI Summary', type: 'kpi_summary', parameters: {}, sort_order: 0 },
      { key: 'semaphore_rollup', title: 'Status Overview', type: 'semaphore_rollup', parameters: {}, sort_order: 1 },
    ];

    switch (reportType) {
      case 'executive_summary':
        return [
          ...base,
          { key: 'diagnostic_findings', title: 'Key Findings', type: 'diagnostic_findings', parameters: {}, sort_order: 2 },
          { key: 'recommendations', title: 'Recommendations', type: 'recommendations', parameters: {}, sort_order: 3 },
        ];
      case 'detailed_findings':
        return [
          ...base,
          { key: 'diagnostic_findings', title: 'All Findings', type: 'diagnostic_findings', parameters: {}, sort_order: 2 },
          { key: 'compliance_gaps', title: 'Compliance Gaps', type: 'compliance_gaps', parameters: {}, sort_order: 3 },
          { key: 'recommendations', title: 'Recommendations', type: 'recommendations', parameters: {}, sort_order: 4 },
        ];
      case 'kpi_dashboard':
        return [
          { key: 'kpi_summary', title: 'KPI Summary', type: 'kpi_summary', parameters: {}, sort_order: 0 },
          { key: 'indicator_trends', title: 'Indicator Trends', type: 'indicator_trends', parameters: {}, sort_order: 1 },
          { key: 'tabulation_scores', title: 'Score Results', type: 'tabulation_scores', parameters: {}, sort_order: 2 },
        ];
      case 'compliance_audit':
        return [
          { key: 'semaphore_rollup', title: 'Status Overview', type: 'semaphore_rollup', parameters: {}, sort_order: 0 },
          { key: 'compliance_gaps', title: 'Compliance Gaps', type: 'compliance_gaps', parameters: {}, sort_order: 1 },
          { key: 'diagnostic_findings', title: 'Diagnostic Findings', type: 'diagnostic_findings', parameters: {}, sort_order: 2 },
          { key: 'recommendations', title: 'Corrective Actions', type: 'recommendations', parameters: {}, sort_order: 3 },
        ];
      case 'indicator_progress':
        return [
          { key: 'kpi_summary', title: 'KPI Summary', type: 'kpi_summary', parameters: {}, sort_order: 0 },
          { key: 'indicator_trends', title: 'Indicator Trends', type: 'indicator_trends', parameters: {}, sort_order: 1 },
          { key: 'semaphore_rollup', title: 'Status Overview', type: 'semaphore_rollup', parameters: {}, sort_order: 2 },
        ];
      case 'diagnostic_overview':
        return [
          { key: 'diagnostic_findings', title: 'Findings', type: 'diagnostic_findings', parameters: {}, sort_order: 0 },
          { key: 'compliance_gaps', title: 'Compliance Gaps', type: 'compliance_gaps', parameters: {}, sort_order: 1 },
          { key: 'recommendations', title: 'Recommendations', type: 'recommendations', parameters: {}, sort_order: 2 },
          { key: 'semaphore_rollup', title: 'Status Overview', type: 'semaphore_rollup', parameters: {}, sort_order: 3 },
        ];
      default:
        return base;
    }
  }

  // -----------------------------------------------------------------------
  // Summary generation
  // -----------------------------------------------------------------------
  private generateSummary(
    reportType: ReportType,
    sections: ReportSection[],
    kpiSnapshot: Record<string, unknown>,
    semaphoreSnapshot: Record<string, unknown>,
    diagnosticSnapshot: Record<string, unknown>,
  ): string {
    const parts: string[] = [];

    const kpiTotal = (kpiSnapshot.total as number) ?? 0;
    const kpiOnTrack = (kpiSnapshot.on_track as number) ?? 0;
    if (kpiTotal > 0) {
      parts.push(`${kpiOnTrack}/${kpiTotal} KPIs on track (${Math.round((kpiOnTrack / kpiTotal) * 100)}%).`);
    }

    const semSummary = semaphoreSnapshot.summary as Record<string, number> | null;
    if (semSummary) {
      const red = semSummary['red'] ?? semSummary['critical'] ?? 0;
      const green = semSummary['green'] ?? 0;
      parts.push(`${green} indicators green, ${red} red/critical.`);
    }

    const unresolved = (diagnosticSnapshot.unresolved as number) ?? 0;
    if (unresolved > 0) {
      parts.push(`${unresolved} unresolved diagnostic findings.`);
    }

    if (parts.length === 0) {
      parts.push('Report generated successfully with no critical items.');
    }

    return parts.join(' ');
  }

  // -----------------------------------------------------------------------
  // Statistics for dashboard
  // -----------------------------------------------------------------------
  async getReportStats(organizationId: string): Promise<{
    totalReports: number;
    byType: Record<string, number>;
    byStatus: Record<string, number>;
    recentReports: Array<{ id: string; name: string; type: string; status: string; generated_at: string | null }>;
    avgGenerationMs: number;
  }> {
    const { data, error } = await supabase
      .from('report_instances')
      .select('id, name, report_type, status, generated_at, generation_ms')
      .eq('organization_id', organizationId);
    if (error) throw error;
    const instances = data ?? [];

    const byType: Record<string, number> = {};
    const byStatus: Record<string, number> = {};
    let totalMs = 0;
    let msCount = 0;

    for (const inst of instances) {
      byType[inst.report_type] = (byType[inst.report_type] ?? 0) + 1;
      byStatus[inst.status] = (byStatus[inst.status] ?? 0) + 1;
      if (inst.generation_ms != null) { totalMs += inst.generation_ms; msCount++; }
    }

    const recentReports = instances
      .sort((a, b) => (b.generated_at ?? b.id).localeCompare(a.generated_at ?? a.id))
      .slice(0, 10)
      .map(i => ({ id: i.id, name: i.name, type: i.report_type, status: i.status, generated_at: i.generated_at }));

    return {
      totalReports: instances.length,
      byType,
      byStatus,
      recentReports,
      avgGenerationMs: msCount > 0 ? Math.round(totalMs / msCount) : 0,
    };
  }
}

export const reportingEngine = new ReportingEngine();

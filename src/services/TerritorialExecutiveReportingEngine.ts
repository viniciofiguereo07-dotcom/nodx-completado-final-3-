import { supabase } from '../lib/supabase';
import { territorialAtlasEngine, type AtlasGeneratedProduct, type AtlasType } from './TerritorialAtlasEngine';
import { territorialIndicatorEngine, type ExecutiveSummary, type TerritorialKPI } from './TerritorialIndicatorEngine';
import { territorialAlertEngine, type TerritorialAlert, type TerritorialAlertMetrics } from './TerritorialAlertEngine';
import { territorialTabulationEngine, type TabulationReport, type RiskLevel, type VulnerabilityLevel, type PriorityLevel } from './TerritorialTabulationEngine';
import { territorialIntelligenceEngine, type CoverageResult, type DensityResult, type OpportunityResult, type GapResult } from './TerritorialIntelligenceEngine';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import PptxGenJS from 'pptxgenjs';
import {
  Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType,
  Table, TableRow, TableCell, WidthType, PageBreak,
} from 'docx';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
export type ExecutiveReportType = 'national' | 'provincial' | 'municipal' | 'corridor' | 'commercial' | 'humanitarian';
export type ExecutiveSummaryFormat = 'one_page' | 'multi_page' | 'presentation';
export type ExecutiveExportFormat = 'pdf' | 'word' | 'powerpoint';

export interface ExecutiveNarrative {
  coverage: string;
  density: string;
  opportunities: string;
  gaps: string;
  risks: string;
  vulnerability: string;
  indicators: string;
  alerts: string;
  atlas_summary: string;
  field_collection: string;
}

export interface ExecutiveRecommendation {
  id: string;
  category: 'expansion' | 'commercial' | 'humanitarian' | 'route_optimization' | 'priority_intervention';
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  impact_score: number;
  affected_areas: string[];
  action_items: string[];
  estimated_timeline: string;
  resource_requirements: string;
}

export interface ExecutiveReport {
  id: string;
  organization_id: string;
  report_type: ExecutiveReportType;
  title: string;
  subtitle: string;
  format: ExecutiveSummaryFormat;
  generated_at: string;
  generated_by: string | null;
  period_start: string;
  period_end: string;
  executive_summary: ExecutiveSummary | null;
  narrative: ExecutiveNarrative;
  recommendations: ExecutiveRecommendation[];
  key_metrics: {
    coverage_score: number;
    opportunity_score: number;
    risk_level: string;
    total_entities: number;
    total_opportunities: number;
    critical_issues: number;
  };
  alert_summary: {
    total_active: number;
    critical_count: number;
    high_count: number;
    humanitarian_risks: number;
  };
  atlas_reference: {
    atlas_id: string | null;
    atlas_type: AtlasType | null;
    sections_count: number;
  };
  field_collection_summary: {
    total_visits: number;
    avg_per_month: number;
    peak_month: string | null;
  };
  status: 'draft' | 'published' | 'archived';
  file_urls: Record<ExecutiveExportFormat, string | null>;
}

// ---------------------------------------------------------------------------
// Main Engine
// ---------------------------------------------------------------------------
export class TerritorialExecutiveReportingEngine {

  // -------------------------------------------------------------------------
  // Generate Executive Report
  // -------------------------------------------------------------------------
  async generateExecutiveReport(
    organizationId: string,
    reportType: ExecutiveReportType,
    opts?: {
      format?: ExecutiveSummaryFormat;
      generateAtlas?: boolean;
      atlasType?: AtlasType;
      periodStart?: string;
      periodEnd?: string;
    }
  ): Promise<ExecutiveReport> {
    const format = opts?.format ?? 'multi_page';
    const periodStart = opts?.periodStart ?? new Date(new Date().getFullYear(), 0, 1).toISOString();
    const periodEnd = opts?.periodEnd ?? new Date().toISOString();

    // Gather all data from existing engines (NO DUPLICATION)
    const [
      executiveSummary,
      territorialKPIs,
      alertMetrics,
      coverage,
      density,
      opportunities,
      gaps,
      riskMatrix,
      vulnerabilityMatrix,
      priorityMatrix,
      fieldCollectionStats,
    ] = await Promise.all([
      this.fetchExecutiveSummary(organizationId),
      this.fetchTerritorialKPIs(organizationId),
      this.fetchAlertMetrics(organizationId),
      this.fetchCoverage(organizationId),
      this.fetchDensity(organizationId),
      this.fetchOpportunities(organizationId),
      this.fetchGaps(organizationId),
      territorialTabulationEngine.getRiskMatrix(organizationId),
      territorialTabulationEngine.getVulnerabilityMatrix(organizationId),
      territorialTabulationEngine.getPriorityMatrix(organizationId),
      this.fetchFieldCollectionStats(organizationId),
    ]);

    // Optionally generate atlas for reference
    let atlasProduct: AtlasGeneratedProduct | null = null;
    if (opts?.generateAtlas && opts?.atlasType) {
      try {
        atlasProduct = await territorialAtlasEngine.generateAtlas(organizationId, opts.atlasType);
        await territorialAtlasEngine.saveAtlas(atlasProduct);
      } catch (e) {
        console.error('Failed to generate atlas:', e);
      }
    }

    // Generate AI narratives
    const narrative = this.generateNarratives({
      executiveSummary,
      territorialKPIs,
      alertMetrics,
      coverage,
      density,
      opportunities,
      gaps,
      riskMatrix,
      vulnerabilityMatrix,
      fieldCollectionStats,
      reportType,
    });

    // Generate automatic recommendations
    const recommendations = this.generateRecommendations({
      coverage,
      density,
      opportunities,
      gaps,
      alertMetrics,
      riskMatrix,
      vulnerabilityMatrix,
      priorityMatrix,
    });

    const keyMetrics = {
      coverage_score: executiveSummary?.coverage_score ?? 0,
      opportunity_score: executiveSummary?.opportunity_score ?? 0,
      risk_level: executiveSummary?.overall_status ?? 'green',
      total_entities: executiveSummary?.total_entities ?? 0,
      total_opportunities: opportunities.length,
      critical_issues: executiveSummary?.critical_issues ?? 0,
    };

    const alertSummary = {
      total_active: alertMetrics.total_active,
      critical_count: alertMetrics.critical_count,
      high_count: alertMetrics.high_count,
      humanitarian_risks: alertMetrics.by_type['vulnerability_cluster'] + alertMetrics.by_type['humanitarian_risk'],
    };

    const report: ExecutiveReport = {
      id: crypto.randomUUID(),
      organization_id: organizationId,
      report_type: reportType,
      title: this.generateTitle(reportType),
      subtitle: this.generateSubtitle(reportType, periodStart, periodEnd),
      format,
      generated_at: new Date().toISOString(),
      generated_by: null,
      period_start: periodStart,
      period_end: periodEnd,
      executive_summary: executiveSummary,
      narrative,
      recommendations,
      key_metrics: keyMetrics,
      alert_summary: alertSummary,
      atlas_reference: {
        atlas_id: atlasProduct?.id ?? null,
        atlas_type: atlasProduct?.atlas_type ?? null,
        sections_count: atlasProduct?.sections.length ?? 0,
      },
      field_collection_summary: fieldCollectionStats,
      status: 'draft',
      file_urls: { pdf: null, word: null, powerpoint: null },
    };

    return report;
  }

  // -------------------------------------------------------------------------
  // Data Fetchers (consume existing engines)
  // -------------------------------------------------------------------------
  private async fetchExecutiveSummary(orgId: string): Promise<ExecutiveSummary | null> {
    try {
      return await territorialIndicatorEngine.getExecutiveSummary(orgId);
    } catch {
      return null;
    }
  }

  private async fetchTerritorialKPIs(orgId: string): Promise<TerritorialKPI[]> {
    try {
      return await territorialIndicatorEngine.generateTerritorialKPIs(orgId);
    } catch {
      return [];
    }
  }

  private async fetchAlertMetrics(orgId: string): Promise<TerritorialAlertMetrics> {
    try {
      return await territorialAlertEngine.getAlertMetrics(orgId);
    } catch {
      return {
        total_active: 0,
        critical_count: 0,
        high_count: 0,
        medium_count: 0,
        low_count: 0,
        by_type: {} as Record<string, number>,
        by_geo_level: {},
        avg_resolution_hours: null,
        alerts_last_24h: 0,
        trend_7d: [],
      };
    }
  }

  private async fetchCoverage(orgId: string): Promise<CoverageResult[]> {
    try {
      return await territorialIntelligenceEngine.calculateCoverage(orgId, 'municipality');
    } catch {
      return [];
    }
  }

  private async fetchDensity(orgId: string): Promise<DensityResult[]> {
    try {
      return await territorialIntelligenceEngine.calculateDensity(orgId, 'municipality');
    } catch {
      return [];
    }
  }

  private async fetchOpportunities(orgId: string): Promise<OpportunityResult[]> {
    try {
      const [growth, expansion] = await Promise.all([
        territorialIntelligenceEngine.detectGrowthZones(orgId, 'municipality'),
        territorialIntelligenceEngine.detectExpansionOpportunities(orgId, 'municipality'),
      ]);
      return [...growth, ...expansion];
    } catch {
      return [];
    }
  }

  private async fetchGaps(orgId: string): Promise<GapResult[]> {
    try {
      return await territorialIntelligenceEngine.detectCoverageGaps(orgId, 'municipality');
    } catch {
      return [];
    }
  }

  private async fetchFieldCollectionStats(orgId: string): Promise<{
    total_visits: number;
    avg_per_month: number;
    peak_month: string | null;
  }> {
    try {
      const { data } = await supabase
        .from('territorial_visit_history')
        .select('created_at')
        .eq('organization_id', orgId);

      const visits = data ?? [];
      const byMonth: Record<string, number> = {};

      for (const v of visits) {
        const month = v.created_at?.slice(0, 7) ?? 'unknown';
        byMonth[month] = (byMonth[month] ?? 0) + 1;
      }

      const months = Object.entries(byMonth);
      const peak = months.length > 0
        ? months.reduce((a, b) => a[1] > b[1] ? a : b)
        : null;

      return {
        total_visits: visits.length,
        avg_per_month: months.length > 0 ? visits.length / months.length : 0,
        peak_month: peak ? peak[0] : null,
      };
    } catch {
      return { total_visits: 0, avg_per_month: 0, peak_month: null };
    }
  }

  // -------------------------------------------------------------------------
  // AI Narrative Generation
  // -------------------------------------------------------------------------
  private generateNarratives(data: {
    executiveSummary: ExecutiveSummary | null;
    territorialKPIs: TerritorialKPI[];
    alertMetrics: TerritorialAlertMetrics;
    coverage: CoverageResult[];
    density: DensityResult[];
    opportunities: OpportunityResult[];
    gaps: GapResult[];
    riskMatrix: { matrix: Record<RiskLevel, number> };
    vulnerabilityMatrix: { matrix: Record<VulnerabilityLevel, number> };
    fieldCollectionStats: { total_visits: number; avg_per_month: number };
    reportType: ExecutiveReportType;
  }): ExecutiveNarrative {
    const summary = data.executiveSummary;

    // Coverage narrative
    const avgCoverage = data.coverage.length > 0
      ? data.coverage.reduce((s, c) => s + c.coverage_pct, 0) / data.coverage.length
      : 0;
    const coverageNarrative = `Territorial coverage analysis reveals an average coverage of ${avgCoverage.toFixed(1)}% across ${data.coverage.length} geographic zones. ${data.coverage.filter(c => c.coverage_pct >= 80).length} zones have achieved optimal coverage (>=80%), while ${data.coverage.filter(c => c.coverage_pct < 30).length} zones remain critically underserved. The coverage trajectory indicates ${summary?.overall_status ?? 'stable'} operational status with ${summary?.coverage_score ?? 0}% overall coverage efficiency.`;

    // Density narrative
    const saturated = data.density.filter(d => d.density_class === 'saturated').length;
    const low = data.density.filter(d => d.density_class === 'low').length;
    const densityNarrative = `Density analysis identifies ${saturated} saturated zones, ${data.density.filter(d => d.density_class === 'normal').length} normal density zones, and ${low} low-density zones presenting expansion opportunities. Market saturation in established areas suggests resource optimization potential, while low-density zones offer strategic expansion candidates with minimal competitive pressure.`;

    // Opportunities narrative
    const growthZones = data.opportunities.filter(o => o.opportunity_type === 'growth_zone');
    const expansionZones = data.opportunities.filter(o => o.opportunity_type === 'expansion_zone');
    const underserved = data.opportunities.filter(o => o.opportunity_type === 'underserved_zone');
    const totalPotential = data.opportunities.reduce((s, o) => s + o.estimated_potential, 0);
    const opportunitiesNarrative = `Strategic analysis identified ${data.opportunities.length} territorial opportunities: ${growthZones.length} growth zones with organic expansion potential, ${underserved.length} underserved zones requiring targeted intervention, and ${expansionZones.length} blue ocean expansion opportunities. Combined estimated potential of ${totalPotential.toLocaleString()} new establishments represents significant growth opportunity.`;

    // Gaps narrative
    const criticalGaps = data.gaps.filter(g => g.severity === 'critical');
    const highGaps = data.gaps.filter(g => g.severity === 'high');
    const gapsNarrative = `Gap analysis detected ${data.gaps.length} coverage gaps across the territory. ${criticalGaps.length} critical-severity gaps (>70% missing) require immediate intervention to prevent service disruption. ${highGaps.length} high-severity gaps (50-70%) should be prioritized in the next operational cycle. Average gap across all zones is ${data.gaps.length > 0 ? (data.gaps.reduce((s, g) => s + g.gap_pct, 0) / data.gaps.length).toFixed(1) : 0}%.`;

    // Risks narrative
    const riskNarrative = `Risk assessment reveals ${data.riskMatrix.matrix.high} high-risk areas, ${data.riskMatrix.matrix.medium} medium-risk areas, and ${data.riskMatrix.matrix.low} low-risk areas. ${data.alertMetrics.critical_count} critical alerts are currently active requiring immediate attention. Route failures and coverage risks represent the primary operational risk factors.`;

    // Vulnerability narrative
    const vulnerabilityNarrative = `Vulnerability analysis indicates ${data.vulnerabilityMatrix.matrix.high} high-vulnerability areas, ${data.vulnerabilityMatrix.matrix.medium} medium-vulnerability areas, and ${data.vulnerabilityMatrix.matrix.low} low-vulnerability areas. Combined assessment suggests ${criticalGaps.length + highGaps.length} areas requiring priority intervention to prevent humanitarian impact.`;

    // Indicators narrative
    const achievedKPIs = data.territorialKPIs.filter(k => k.current_value !== null && k.target_value !== null && k.current_value >= k.target_value);
    const atRiskKPIs = data.territorialKPIs.filter(k => k.semaphore_status === 'red' || k.semaphore_status === 'critical');
    const indicatorsNarrative = `Performance monitoring tracks ${data.territorialKPIs.length} key indicators. ${achievedKPIs.length} indicators have achieved target performance. ${atRiskKPIs.length} indicators are at risk requiring intervention. Overall operational health is rated as ${summary?.overall_status ?? 'stable'}.`;

    // Alerts narrative
    const alertsNarrative = `The alert system has ${data.alertMetrics.total_active} active alerts: ${data.alertMetrics.critical_count} critical priority, ${data.alertMetrics.high_count} high priority, and ${data.alertMetrics.medium_count} medium priority. ${data.alertMetrics.alerts_last_24h} new alerts were generated in the last 24 hours. Average resolution time is ${data.alertMetrics.avg_resolution_hours?.toFixed(1) ?? 'N/A'} hours.`;

    // Atlas summary narrative
    const atlasNarrative = `The territorial atlas provides comprehensive documentation of ${summary?.total_entities ?? 0} total entities across ${data.coverage.length} geographic zones. Analysis includes coverage distribution, density classification, opportunity identification, gap assessment, and risk evaluation with actionable recommendations.`;

    // Field collection narrative
    const fieldNarrative = `Field operations recorded ${data.fieldCollectionStats.total_visits.toLocaleString()} total visits with an average of ${data.fieldCollectionStats.avg_per_month.toFixed(1)} visits per month. Peak activity occurred in ${data.fieldCollectionStats.peak_month ?? 'N/A'}. Collection efficiency supports operational coverage objectives.`;

    return {
      coverage: coverageNarrative,
      density: densityNarrative,
      opportunities: opportunitiesNarrative,
      gaps: gapsNarrative,
      risks: riskNarrative,
      vulnerability: vulnerabilityNarrative,
      indicators: indicatorsNarrative,
      alerts: alertsNarrative,
      atlas_summary: atlasNarrative,
      field_collection: fieldNarrative,
    };
  }

  // -------------------------------------------------------------------------
  // Automatic Recommendations Generation
  // -------------------------------------------------------------------------
  private generateRecommendations(data: {
    coverage: CoverageResult[];
    density: DensityResult[];
    opportunities: OpportunityResult[];
    gaps: GapResult[];
    alertMetrics: TerritorialAlertMetrics;
    riskMatrix: { matrix: Record<RiskLevel, number>; by_entity: Array<{ entity_id: string; risk_level: RiskLevel; score: number }> };
    vulnerabilityMatrix: { matrix: Record<VulnerabilityLevel, number>; by_entity: Array<{ entity_id: string; vulnerability_level: VulnerabilityLevel; score: number }> };
    priorityMatrix: { matrix: Record<PriorityLevel, number>; by_entity: Array<{ entity_id: string; priority_level: PriorityLevel; score: number }> };
  }): ExecutiveRecommendation[] {
    const recommendations: ExecutiveRecommendation[] = [];

    // Expansion recommendations
    const lowDensityZones = data.density.filter(d => d.density_class === 'low');
    if (lowDensityZones.length >= 3) {
      recommendations.push({
        id: crypto.randomUUID(),
        category: 'expansion',
        title: 'Strategic Expansion Initiative',
        description: `${lowDensityZones.length} low-density zones identified as expansion candidates with significant growth potential.`,
        priority: 'high',
        impact_score: 80,
        affected_areas: lowDensityZones.slice(0, 5).map(d => d.geo_name),
        action_items: [
          'Conduct detailed market assessment in identified zones',
          'Develop expansion business case with ROI projections',
          'Allocate field resources for expansion initiative',
          'Establish monitoring framework for new territories',
        ],
        estimated_timeline: '3-6 months',
        resource_requirements: 'Additional field agents, logistics support, marketing investment',
      });
    }

    // Commercial recommendations
    const saturatedZones = data.density.filter(d => d.density_class === 'saturated');
    if (saturatedZones.length >= 2) {
      recommendations.push({
        id: crypto.randomUUID(),
        category: 'commercial',
        title: 'Saturated Market Optimization',
        description: `${saturatedZones.length} zones have reached market saturation. Recommend resource optimization and graduation strategies.`,
        priority: 'medium',
        impact_score: 60,
        affected_areas: saturatedZones.slice(0, 3).map(d => d.geo_name),
        action_items: [
          'Analyze service delivery efficiency in saturated zones',
          'Optimize visit frequency based on performance data',
          'Consider graduation strategies for mature markets',
          'Reallocate resources to expansion zones',
        ],
        estimated_timeline: '2-3 months',
        resource_requirements: 'Operational review, reallocation planning',
      });
    }

    // Humanitarian recommendations
    const criticalGaps = data.gaps.filter(g => g.severity === 'critical');
    const vulnerabilityHigh = data.vulnerabilityMatrix.matrix.high;
    if (criticalGaps.length >= 3 || vulnerabilityHigh >= 3) {
      recommendations.push({
        id: crypto.randomUUID(),
        category: 'humanitarian',
        title: 'Humanitarian Priority Intervention',
        description: `${criticalGaps.length} critical coverage gaps with ${vulnerabilityHigh} high-vulnerability areas detected. Immediate humanitarian intervention required.`,
        priority: 'high',
        impact_score: 95,
        affected_areas: criticalGaps.slice(0, 5).map(g => g.geo_name),
        action_items: [
          'Deploy emergency field operations to critical zones',
          'Conduct humanitarian needs assessment',
          'Engage local stakeholders and coordination mechanisms',
          'Establish priority service delivery protocols',
          'Document vulnerable populations and access constraints',
        ],
        estimated_timeline: 'Immediate to 1 month',
        resource_requirements: 'Emergency response team, humanitarian supplies, local coordination',
      });
    }

    // Route optimization recommendations
    const overdueAlerts = data.alertMetrics.by_type['route_overdue'] ?? 0;
    const failedRoutes = data.alertMetrics.by_type['route_failure'] ?? 0;
    if (overdueAlerts >= 3 || failedRoutes >= 1) {
      recommendations.push({
        id: crypto.randomUUID(),
        category: 'route_optimization',
        title: 'Route Performance Optimization',
        description: `${failedRoutes} route failures and ${overdueAlerts} overdue routes detected. Operational optimization required.`,
        priority: 'high',
        impact_score: 75,
        affected_areas: [],
        action_items: [
          'Review route planning and scheduling processes',
          'Analyze route failure root causes',
          'Implement route recovery protocols',
          'Optimize agent assignment and workload distribution',
          'Update route planning calendar with buffer time',
        ],
        estimated_timeline: '1-2 months',
        resource_requirements: 'Operations review, scheduling tools, agent training',
      });
    }

    // Priority intervention recommendations
    const priorityLevel1 = data.priorityMatrix.matrix.level_1;
    if (priorityLevel1 >= 3) {
      const priorityAreas = data.priorityMatrix.by_entity
        .filter(e => e.priority_level === 'level_1')
        .slice(0, 5)
        .map(e => e.entity_id);

      recommendations.push({
        id: crypto.randomUUID(),
        category: 'priority_intervention',
        title: 'Priority Area Intervention Plan',
        description: `${priorityLevel1} Level 1 (Critical) priority areas requiring immediate resource allocation.`,
        priority: 'high',
        impact_score: 90,
        affected_areas: priorityAreas,
        action_items: [
          'Activate priority intervention protocols',
          'Allocate dedicated resources to Level 1 areas',
          'Establish weekly monitoring and reporting',
          'Define success criteria and graduation thresholds',
          'Coordinate with relevant stakeholders',
        ],
        estimated_timeline: 'Immediate to 3 months',
        resource_requirements: 'Dedicated field team, intervention budget, monitoring infrastructure',
      });
    }

    return recommendations;
  }

  // -------------------------------------------------------------------------
  // Report Title/Subtitle
  // -------------------------------------------------------------------------
  private generateTitle(type: ExecutiveReportType): string {
    const titles: Record<ExecutiveReportType, string> = {
      national: 'National Executive Report',
      provincial: 'Provincial Executive Report',
      municipal: 'Municipal Executive Report',
      corridor: 'Corridor Performance Report',
      commercial: 'Commercial Activity Report',
      humanitarian: 'Humanitarian Response Report',
    };
    return titles[type];
  }

  private generateSubtitle(type: ExecutiveReportType, periodStart: string, periodEnd: string): string {
    const start = new Date(periodStart).toLocaleDateString();
    const end = new Date(periodEnd).toLocaleDateString();
    const typeLabels: Record<ExecutiveReportType, string> = {
      national: 'National Territorial Intelligence',
      provincial: 'Provincial Territory Analysis',
      municipal: 'Municipal Operations Intelligence',
      corridor: 'Corridor Performance Analysis',
      commercial: 'Commercial Operations Insight',
      humanitarian: 'Humanitarian Response Assessment',
    };
    return `${typeLabels[type]} | Period: ${start} - ${end}`;
  }

  // -------------------------------------------------------------------------
  // Export to PDF
  // -------------------------------------------------------------------------
  async exportToPDF(report: ExecutiveReport): Promise<Blob> {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'pt',
      format: 'letter',
    });

    const pageWidth = 612;
    const margin = 40;
    let y = margin;

    // Title Page
    doc.setFontSize(28);
    doc.setFont('helvetica', 'bold');
    doc.text(report.title, pageWidth / 2, y + 100, { align: 'center' });
    y += 140;

    doc.setFontSize(14);
    doc.setFont('helvetica', 'normal');
    doc.text(report.subtitle, pageWidth / 2, y, { align: 'center' });
    y += 30;

    doc.setFontSize(10);
    doc.text(`Generated: ${new Date(report.generated_at).toLocaleDateString()}`, pageWidth / 2, y, { align: 'center' });
    y += 20;
    doc.text(`Status: ${report.status.toUpperCase()}`, pageWidth / 2, y, { align: 'center' });

    // Executive Summary Page
    doc.addPage();
    y = margin;

    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text('Executive Summary', margin, y);
    y += 30;

    // Key Metrics Table
    autoTable(doc, {
      startY: y,
      head: [['Metric', 'Value']],
      body: [
        ['Coverage Score', `${report.key_metrics.coverage_score}%`],
        ['Opportunity Score', `${report.key_metrics.opportunity_score}%`],
        ['Risk Level', report.key_metrics.risk_level.toUpperCase()],
        ['Total Entities', report.key_metrics.total_entities.toLocaleString()],
        ['Total Opportunities', report.key_metrics.total_opportunities.toLocaleString()],
        ['Critical Issues', report.key_metrics.critical_issues.toString()],
      ],
      margin: { left: margin },
      styles: { fontSize: 10 },
      headStyles: { fillColor: [59, 130, 246] },
    });

    y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable?.finalY ?? y + 100;

    // Alert Summary
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Alert Summary', margin, y + 20);
    y += 40;

    autoTable(doc, {
      startY: y,
      head: [['Alert Level', 'Count']],
      body: [
        ['Total Active', report.alert_summary.total_active.toString()],
        ['Critical', report.alert_summary.critical_count.toString()],
        ['High', report.alert_summary.high_count.toString()],
        ['Humanitarian Risks', report.alert_summary.humanitarian_risks.toString()],
      ],
      margin: { left: margin },
      styles: { fontSize: 10 },
      headStyles: { fillColor: [239, 68, 68] },
    });

    // Narrative Sections
    const narrativeSections: (keyof ExecutiveNarrative)[] = [
      'coverage', 'density', 'opportunities', 'gaps', 'risks',
      'vulnerability', 'indicators', 'alerts', 'atlas_summary', 'field_collection'
    ];

    for (const section of narrativeSections) {
      doc.addPage();
      y = margin;

      const sectionTitle = section.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
      doc.setFontSize(18);
      doc.setFont('helvetica', 'bold');
      doc.text(sectionTitle, margin, y);
      y += 30;

      doc.setFontSize(11);
      doc.setFont('helvetica', 'normal');
      const lines = doc.splitTextToSize(report.narrative[section], pageWidth - margin * 2);
      doc.text(lines, margin, y);
    }

    // Recommendations Page
    doc.addPage();
    y = margin;

    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text('Strategic Recommendations', margin, y);
    y += 30;

    for (const rec of report.recommendations) {
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text(`${rec.title} (${rec.priority.toUpperCase()})`, margin, y);
      y += 15;

      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      const descLines = doc.splitTextToSize(rec.description, pageWidth - margin * 2);
      doc.text(descLines, margin, y);
      y += descLines.length * 12 + 10;

      doc.text(`Timeline: ${rec.estimated_timeline}`, margin, y);
      y += 15;
      doc.text(`Resources: ${rec.resource_requirements}`, margin, y);
      y += 20;
    }

    return doc.output('blob');
  }

  // -------------------------------------------------------------------------
  // Export to DOCX
  // -------------------------------------------------------------------------
  async exportToDocx(report: ExecutiveReport): Promise<Blob> {
    const sections: Paragraph[] = [];

    // Cover page
    sections.push(new Paragraph({ spacing: { before: 3000 } }));
    sections.push(new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [new TextRun({ text: report.title, bold: true, size: 56, font: 'Calibri' })],
    }));
    sections.push(new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 200 },
      children: [new TextRun({ text: report.subtitle, size: 28, font: 'Calibri', color: '666666' })],
    }));
    sections.push(new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 200 },
      children: [new TextRun({ text: `Generated: ${new Date(report.generated_at).toLocaleDateString()}`, size: 20, font: 'Calibri', color: '999999' })],
    }));

    // Executive Summary
    sections.push(new Paragraph({ children: [new PageBreak()] }));
    sections.push(new Paragraph({
      heading: HeadingLevel.HEADING_1,
      children: [new TextRun({ text: 'Executive Summary', bold: true, size: 36, font: 'Calibri' })],
    }));

    const metricRows = [
      new TableRow({
        children: [
          new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Metric', bold: true })] })], shading: { fill: '3b82f6' } }),
          new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Value', bold: true, color: 'FFFFFF' })] })], shading: { fill: '3b82f6' } }),
        ],
      }),
      ...Object.entries(report.key_metrics).map(([k, v]) =>
        new TableRow({
          children: [
            new TableCell({ children: [new Paragraph({ children: [new TextRun(k.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()))] })] }),
            new TableCell({ children: [new Paragraph({ children: [new TextRun(typeof v === 'number' ? v.toLocaleString() : String(v))] })] }),
          ],
        })
      ),
    ];
    sections.push(new Paragraph({ children: [new Table({ rows: metricRows, width: { size: 100, type: WidthType.PERCENTAGE } })] }));

    // Narrative sections
    const narrativeSections: (keyof ExecutiveNarrative)[] = [
      'coverage', 'density', 'opportunities', 'gaps', 'risks',
      'vulnerability', 'indicators', 'alerts', 'atlas_summary', 'field_collection'
    ];

    for (const sectionKey of narrativeSections) {
      sections.push(new Paragraph({ children: [new PageBreak()] }));
      sections.push(new Paragraph({
        heading: HeadingLevel.HEADING_1,
        children: [new TextRun({ text: sectionKey.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()), bold: true, size: 36, font: 'Calibri' })],
      }));
      sections.push(new Paragraph({
        spacing: { before: 200 },
        children: [new TextRun({ text: report.narrative[sectionKey], size: 22, font: 'Calibri' })],
      }));
    }

    // Recommendations
    sections.push(new Paragraph({ children: [new PageBreak()] }));
    sections.push(new Paragraph({
      heading: HeadingLevel.HEADING_1,
      children: [new TextRun({ text: 'Strategic Recommendations', bold: true, size: 36, font: 'Calibri' })],
    }));

    for (const rec of report.recommendations) {
      sections.push(new Paragraph({
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 300 },
        children: [new TextRun({ text: `${rec.title} (${rec.priority.toUpperCase()})`, bold: true, size: 26, font: 'Calibri' })],
      }));
      sections.push(new Paragraph({
        spacing: { before: 100 },
        children: [new TextRun({ text: rec.description, size: 20, font: 'Calibri' })],
      }));
      sections.push(new Paragraph({
        spacing: { before: 100 },
        children: [new TextRun({ text: `Timeline: ${rec.estimated_timeline}`, size: 18, font: 'Calibri', italics: true })],
      }));
      sections.push(new Paragraph({
        children: [new TextRun({ text: `Resources: ${rec.resource_requirements}`, size: 18, font: 'Calibri', italics: true })],
      }));
    }

    const doc = new Document({
      sections: [{
        properties: {
          page: { size: { width: 12240, height: 15840 }, margin: { top: 1440, bottom: 1440, left: 1440, right: 1440 } },
        },
        children: sections,
      }],
    });

    return await Packer.toBlob(doc);
  }

  // -------------------------------------------------------------------------
  // Export to PowerPoint
  // -------------------------------------------------------------------------
  async exportToPowerPoint(report: ExecutiveReport): Promise<Blob> {
    const pptx = new PptxGenJS();

    // Title Slide
    const titleSlide = pptx.addSlide();
    titleSlide.addText(report.title, {
      x: 0.5, y: 2, w: '90%', h: 1,
      fontSize: 36, bold: true, align: 'center',
    });
    titleSlide.addText(report.subtitle, {
      x: 0.5, y: 3.2, w: '90%', h: 0.5,
      fontSize: 18, align: 'center', color: '666666',
    });
    titleSlide.addText(`Generated: ${new Date(report.generated_at).toLocaleDateString()}`, {
      x: 0.5, y: 4.5, w: '90%', h: 0.3,
      fontSize: 12, align: 'center', color: '999999',
    });

    // Executive Summary Slide
    const summarySlide = pptx.addSlide();
    summarySlide.addText('Executive Summary', {
      x: 0.5, y: 0.3, w: '90%', h: 0.6,
      fontSize: 24, bold: true,
    });

    summarySlide.addTable(
      [
        [{ text: 'Metric', options: { fill: { color: '3b82f6' }, color: 'FFFFFF', bold: true } },
         { text: 'Value', options: { fill: { color: '3b82f6' }, color: 'FFFFFF', bold: true } }],
        ...Object.entries(report.key_metrics).map(([k, v]) => [
          k.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
          typeof v === 'number' ? v.toLocaleString() : String(v),
        ]),
      ],
      { x: 0.5, y: 1.2, w: 9, h: 3, fontSize: 11 }
    );

    // Alert Summary Slide
    const alertSlide = pptx.addSlide();
    alertSlide.addText('Alert Summary', {
      x: 0.5, y: 0.3, w: '90%', h: 0.6,
      fontSize: 24, bold: true,
    });

    alertSlide.addTable(
      [
        [{ text: 'Level', options: { fill: { color: 'ef4444' }, color: 'FFFFFF', bold: true } },
         { text: 'Count', options: { fill: { color: 'ef4444' }, color: 'FFFFFF', bold: true } }],
        ['Total Active', report.alert_summary.total_active.toString()],
        ['Critical', report.alert_summary.critical_count.toString()],
        ['High', report.alert_summary.high_count.toString()],
        ['Humanitarian', report.alert_summary.humanitarian_risks.toString()],
      ],
      { x: 0.5, y: 1.2, w: 4, h: 2, fontSize: 11 }
    );

    // Narrative slides
    const narrativeSections: (keyof ExecutiveNarrative)[] = [
      'coverage', 'density', 'opportunities', 'gaps', 'risks',
      'vulnerability', 'indicators', 'alerts', 'atlas_summary', 'field_collection'
    ];

    for (const sectionKey of narrativeSections) {
      const slide = pptx.addSlide();
      slide.addText(sectionKey.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()), {
        x: 0.5, y: 0.3, w: '90%', h: 0.6,
        fontSize: 24, bold: true,
      });
      slide.addText(report.narrative[sectionKey], {
        x: 0.5, y: 1.2, w: '90%', h: 4,
        fontSize: 12, color: '333333',
      });
    }

    // Recommendations slides
    for (const rec of report.recommendations) {
      const recSlide = pptx.addSlide();
      recSlide.addText(rec.title, {
        x: 0.5, y: 0.3, w: '90%', h: 0.6,
        fontSize: 20, bold: true,
      });
      recSlide.addText(`Priority: ${rec.priority.toUpperCase()}`, {
        x: 0.5, y: 1, w: '90%', h: 0.3,
        fontSize: 12, color: rec.priority === 'high' ? 'ef4444' : rec.priority === 'medium' ? 'f59e0b' : '10b981',
      });
      recSlide.addText(rec.description, {
        x: 0.5, y: 1.4, w: '90%', h: 1.5,
        fontSize: 11, color: '333333',
      });
      recSlide.addText(`Timeline: ${rec.estimated_timeline}`, {
        x: 0.5, y: 3, w: '90%', h: 0.3,
        fontSize: 10, color: '666666',
      });
      recSlide.addText(`Resources: ${rec.resource_requirements}`, {
        x: 0.5, y: 3.3, w: '90%', h: 0.5,
        fontSize: 10, color: '666666',
      });
    }

    const pptxBlob = await pptx.write({ outputType: 'blob' });
    return pptxBlob as Blob;
  }

  // -------------------------------------------------------------------------
  // Persistence
  // -------------------------------------------------------------------------
  async saveReport(report: ExecutiveReport): Promise<void> {
    const { error } = await supabase
      .from('executive_reports')
      .insert(report);
    if (error) throw error;
  }

  async getReports(organizationId: string, limit = 20): Promise<ExecutiveReport[]> {
    const { data, error } = await supabase
      .from('executive_reports')
      .select('*')
      .eq('organization_id', organizationId)
      .order('generated_at', { ascending: false })
      .limit(limit);
    if (error) throw error;
    return (data ?? []) as ExecutiveReport[];
  }

  async updateReportStatus(id: string, status: 'draft' | 'published' | 'archived'): Promise<void> {
    const { error } = await supabase
      .from('executive_reports')
      .update({ status })
      .eq('id', id);
    if (error) throw error;
  }
}

export const territorialExecutiveReportingEngine = new TerritorialExecutiveReportingEngine();

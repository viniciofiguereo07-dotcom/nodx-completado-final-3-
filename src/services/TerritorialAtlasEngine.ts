import { supabase } from '../lib/supabase';
import { territorialIntelligenceEngine, type CoverageResult, type DensityResult, type OpportunityResult, type GapResult } from './TerritorialIntelligenceEngine';
import { territorialIndicatorEngine, type ExecutiveSummary, type CoverageKPIs, type DensityKPIs, type OpportunityKPIs, type GapKPIs } from './TerritorialIndicatorEngine';
import { territorialTabulationEngine, type TabulationReport } from './TerritorialTabulationEngine';
import { territorialAlertEngine, type TerritorialAlert, type TerritorialAlertMetrics } from './TerritorialAlertEngine';
import { reportingEngine } from './ReportingEngine';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import PptxGenJS from 'pptxgenjs';
import {
  Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType,
  Table, TableRow, TableCell, WidthType, BorderStyle, PageBreak,
} from 'docx';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
export type AtlasType = 'national' | 'provincial' | 'municipal' | 'corridor' | 'commercial' | 'humanitarian';
export type AtlasFormat = 'letter' | 'legal';
export type AtlasExportFormat = 'pdf' | 'word' | 'powerpoint';

export interface AtlasMapLayer {
  id: string;
  name: string;
  level: 'province' | 'municipality' | 'district' | 'sector' | 'corridor';
  features: AtlasMapFeature[];
  style: {
    fillColor: string;
    strokeColor: string;
    opacity: number;
  };
}

export interface AtlasMapFeature {
  id: string;
  name: string;
  geometry: GeoJSON.Polygon | GeoJSON.MultiPolygon | null;
  properties: Record<string, unknown>;
  centroid: { lat: number; lng: number } | null;
}

export interface AtlasSection {
  id: string;
  title: string;
  order: number;
  content: AtlasSectionContent;
  charts: AtlasChartData[];
  tables: AtlasTableData[];
  maps: AtlasMapLayer[];
}

export interface AtlasSectionContent {
  summary: string;
  highlights: string[];
  metrics: Record<string, number | string>;
  narrative: string;
}

export interface AtlasChartData {
  id: string;
  title: string;
  type: 'bar' | 'line' | 'pie' | 'radar' | 'map';
  data: Record<string, unknown>[];
  config: Record<string, unknown>;
}

export interface AtlasTableData {
  id: string;
  title: string;
  headers: string[];
  rows: (string | number)[][];
}

export interface AtlasGeneratedProduct {
  id: string;
  organization_id: string;
  atlas_type: AtlasType;
  title: string;
  subtitle: string;
  format: AtlasFormat;
  generated_at: string;
  generated_by: string | null;
  period_start: string;
  period_end: string;
  sections: AtlasSection[];
  executive_summary: ExecutiveSummary | null;
  total_entities: number;
  total_establishments: number;
  total_routes: number;
  total_visits: number;
  coverage_score: number;
  opportunity_score: number;
  risk_level: 'low' | 'medium' | 'high' | 'critical';
  status: 'draft' | 'published' | 'archived';
  file_urls: Record<AtlasExportFormat, string | null>;
}

// ---------------------------------------------------------------------------
// Main Engine
// ---------------------------------------------------------------------------
export class TerritorialAtlasEngine {

  // -------------------------------------------------------------------------
  // Generate Atlas
  // -------------------------------------------------------------------------
  async generateAtlas(
    organizationId: string,
    type: AtlasType,
    opts?: {
      format?: AtlasFormat;
      geoLevel?: string;
      geoName?: string;
      periodStart?: string;
      periodEnd?: string;
    }
  ): Promise<AtlasGeneratedProduct> {
    const format = opts?.format ?? 'letter';
    const periodStart = opts?.periodStart ?? new Date(new Date().getFullYear(), 0, 1).toISOString();
    const periodEnd = opts?.periodEnd ?? new Date().toISOString();

    // Gather all required data
    const [executiveSummary, coverageData, densityData, opportunities, gaps, alerts, routes, visits, indicators] = await Promise.all([
      this.fetchExecutiveSummary(organizationId, type, opts?.geoLevel),
      this.fetchCoverageData(organizationId, type, opts?.geoLevel, opts?.geoName),
      this.fetchDensityData(organizationId, type, opts?.geoLevel),
      this.fetchOpportunities(organizationId, type, opts?.geoLevel),
      this.fetchGaps(organizationId, type, opts?.geoLevel),
      this.fetchAlerts(organizationId, type),
      this.fetchRouteData(organizationId),
      this.fetchVisitData(organizationId),
      this.fetchIndicatorData(organizationId),
    ]);

    // Build all 12 sections
    const sections = await this.buildSections({
      type,
      executiveSummary,
      coverageData,
      densityData,
      opportunities,
      gaps,
      alerts,
      routes,
      visits,
      indicators,
      organizationId,
    });

    // Determine risk level
    const riskLevel = this.calculateRiskLevel(alerts, gaps);

    // Build atlas product
    const atlas: AtlasGeneratedProduct = {
      id: crypto.randomUUID(),
      organization_id: organizationId,
      atlas_type: type,
      title: this.generateTitle(type, opts?.geoName),
      subtitle: this.generateSubtitle(type, periodStart, periodEnd),
      format,
      generated_at: new Date().toISOString(),
      generated_by: null,
      period_start: periodStart,
      period_end: periodEnd,
      sections,
      executive_summary: executiveSummary,
      total_entities: executiveSummary?.total_entities ?? 0,
      total_establishments: coverageData.reduce((s, c) => s + c.total_establishments, 0),
      total_routes: routes.length,
      total_visits: visits.total,
      coverage_score: executiveSummary?.coverage_score ?? 0,
      opportunity_score: executiveSummary?.opportunity_score ?? 0,
      risk_level: riskLevel,
      status: 'draft',
      file_urls: { pdf: null, word: null, powerpoint: null },
    };

    return atlas;
  }

  // -------------------------------------------------------------------------
  // Section Builders
  // -------------------------------------------------------------------------
  private async buildSections(data: {
    type: AtlasType;
    executiveSummary: ExecutiveSummary | null;
    coverageData: CoverageResult[];
    densityData: DensityResult[];
    opportunities: OpportunityResult[];
    gaps: GapResult[];
    alerts: TerritorialAlert[];
    routes: Array<{ id: string; name: string; status: string; completion: number }>;
    visits: { total: number; byMonth: Array<{ month: string; count: number }> };
    indicators: Array<{ name: string; value: number; target: number }>;
    organizationId: string;
  }): Promise<AtlasSection[]> {
    const sections: AtlasSection[] = [];
    let order = 1;

    // Section 1: Cover Page
    sections.push(this.buildCoverPageSection(data.type, data.executiveSummary, order++));

    // Section 2: Executive Summary
    sections.push(this.buildExecutiveSummarySection(data.executiveSummary, order++));

    // Section 3: Coverage Analysis
    sections.push(this.buildCoverageSection(data.coverageData, order++));

    // Section 4: Density Analysis
    sections.push(this.buildDensitySection(data.densityData, order++));

    // Section 5: Territorial Opportunities
    sections.push(this.buildOpportunitiesSection(data.opportunities, order++));

    // Section 6: Coverage Gaps
    sections.push(this.buildGapsSection(data.gaps, order++));

    // Section 7: Risk Areas
    sections.push(this.buildRiskAreasSection(data.alerts, order++));

    // Section 8: Vulnerability Areas
    sections.push(this.buildVulnerabilitySection(data.alerts, data.gaps, order++));

    // Section 9: Priority Areas
    sections.push(this.buildPrioritySection(data.alerts, data.opportunities, order++));

    // Section 10: Route Performance
    sections.push(this.buildRoutePerformanceSection(data.routes, order++));

    // Section 11: Corridor Performance
    sections.push(await this.buildCorridorPerformanceSection(data.organizationId, order++));

    // Section 12: Field Collection Statistics
    sections.push(this.buildFieldCollectionSection(data.visits, order++));

    // Section 13: Indicators Dashboard
    sections.push(this.buildIndicatorsSection(data.indicators, order++));

    // Section 14: Maps Section
    sections.push(await this.buildMapsSection(data.organizationId, data.coverageData, order++));

    return sections;
  }

  // Section 1: Executive Summary
  private buildExecutiveSummarySection(summary: ExecutiveSummary | null, order: number): AtlasSection {
    const content: AtlasSectionContent = {
      summary: summary
        ? `The territorial overview shows an overall status of ${summary.overall_status} with ${summary.total_entities} total entities and ${summary.total_visited} visited. Coverage score is ${summary.coverage_score}% with ${summary.critical_issues} critical issues requiring attention.`
        : 'No territorial data available for executive summary.',
      highlights: summary ? [
        `Overall Status: ${summary.overall_status.toUpperCase()}`,
        `${summary.total_entities} total entities, ${summary.total_visited} visited`,
        `Coverage Score: ${summary.coverage_score}%`,
        `Opportunity Score: ${summary.opportunity_score}%`,
        `${summary.critical_issues} critical issues`,
      ] : ['No data available'],
      metrics: {
        'total_entities': summary?.total_entities ?? 0,
        'total_visited': summary?.total_visited ?? 0,
        'coverage_score': summary?.coverage_score ?? 0,
        'opportunity_score': summary?.opportunity_score ?? 0,
        'critical_issues': summary?.critical_issues ?? 0,
      },
      narrative: summary
        ? `The territorial intelligence analysis reveals a ${summary.overall_status} operational state with ${summary.coverage_score}% coverage efficiency. ${summary.total_opportunities} growth opportunities have been identified across the territory, with an estimated potential of significant expansion. The current gap analysis indicates ${summary.critical_issues} areas requiring immediate intervention.`
        : 'Insufficient data for territorial narrative.',
    };

    const charts: AtlasChartData[] = [{
      id: 'exec_radar',
      title: 'Territorial Scores',
      type: 'radar',
      data: [
        { metric: 'Coverage', value: summary?.coverage_score ?? 0 },
        { metric: 'Density', value: summary?.density_score ?? 0 },
        { metric: 'Opportunity', value: summary?.opportunity_score ?? 0 },
        { metric: 'Gap Health', value: summary?.gap_score ?? 0 },
      ],
      config: { type: 'radar', max: 100 },
    }];

    return {
      id: `section_1_executive`,
      title: 'Executive Summary',
      order,
      content,
      charts,
      tables: [],
      maps: [],
    };
  }

  // Section 2: Coverage Analysis
  private buildCoverageSection(coverage: CoverageResult[], order: number): AtlasSection {
    const avgCoverage = coverage.length > 0
      ? coverage.reduce((s, c) => s + c.coverage_pct, 0) / coverage.length
      : 0;

    const content: AtlasSectionContent = {
      summary: `Territorial coverage analysis shows an average of ${avgCoverage.toFixed(1)}% across ${coverage.length} geographic zones.`,
      highlights: [
        `Average Coverage: ${avgCoverage.toFixed(1)}%`,
        `${coverage.length} geographic zones analyzed`,
        `${coverage.filter(c => c.coverage_pct >= 80).length} zones above 80% coverage`,
        `${coverage.filter(c => c.coverage_pct < 30).length} zones below 30% (critical)`,
      ],
      metrics: {
        'avg_coverage': avgCoverage.toFixed(1),
        'total_zones': coverage.length,
        'above_80': coverage.filter(c => c.coverage_pct >= 80).length,
        'below_30': coverage.filter(c => c.coverage_pct < 30).length,
      },
      narrative: `The coverage analysis reveals significant variation across geographic zones. ${coverage.filter(c => c.coverage_pct >= 80).length} zones have achieved optimal coverage (>80%), while ${coverage.filter(c => c.coverage_pct < 30).length} zones remain critically underserved and require immediate attention.`,
    };

    const charts: AtlasChartData[] = [
      {
        id: 'coverage_bar',
        title: 'Coverage by Zone',
        type: 'bar',
        data: coverage.slice(0, 20).map(c => ({
          name: c.geo_name,
          coverage: c.coverage_pct,
          establishments: c.total_establishments,
        })),
        config: { xKey: 'name', yKey: 'coverage', color: '#3b82f6' },
      },
      {
        id: 'coverage_dist',
        title: 'Coverage Distribution',
        type: 'pie',
        data: [
          { name: 'Optimal (>80%)', value: coverage.filter(c => c.coverage_pct >= 80).length, color: '#10b981' },
          { name: 'Good (50-80%)', value: coverage.filter(c => c.coverage_pct >= 50 && c.coverage_pct < 80).length, color: '#3b82f6' },
          { name: 'Low (30-50%)', value: coverage.filter(c => c.coverage_pct >= 30 && c.coverage_pct < 50).length, color: '#f59e0b' },
          { name: 'Critical (<30%)', value: coverage.filter(c => c.coverage_pct < 30).length, color: '#ef4444' },
        ].filter(d => d.value > 0),
        config: { innerRadius: 40 },
      },
    ];

    const tables: AtlasTableData[] = [{
      id: 'coverage_table',
      title: 'Coverage Details by Zone',
      headers: ['Zone', 'Total', 'Active', 'Visited', 'Coverage %'],
      rows: coverage.slice(0, 50).map(c => [
        c.geo_name,
        c.total_establishments.toString(),
        c.active_establishments.toString(),
        c.visited_establishments.toString(),
        `${c.coverage_pct.toFixed(1)}%`,
      ]),
    }];

    return {
      id: `section_2_coverage`,
      title: 'Coverage Analysis',
      order,
      content,
      charts,
      tables,
      maps: [],
    };
  }

  // Section 3: Density Analysis
  private buildDensitySection(density: DensityResult[], order: number): AtlasSection {
    const saturated = density.filter(d => d.density_class === 'saturated');
    const normal = density.filter(d => d.density_class === 'normal');
    const low = density.filter(d => d.density_class === 'low');

    const content: AtlasSectionContent = {
      summary: `Density analysis identifies ${saturated.length} saturated zones, ${normal.length} normal zones, and ${low.length} low-density expansion candidates.`,
      highlights: [
        `${saturated.length} saturated zones (>50 establishments)`,
        `${normal.length} normal density zones (10-50)`,
        `${low.length} low-density expansion opportunities (<10)`,
        `Average density per zone: ${density.length > 0 ? (density.reduce((s, d) => s + d.establishment_count, 0) / density.length).toFixed(1) : 0}`,
      ],
      metrics: {
        'saturated_zones': saturated.length,
        'normal_zones': normal.length,
        'low_density_zones': low.length,
        'avg_density': density.length > 0 ? (density.reduce((s, d) => s + d.establishment_count, 0) / density.length).toFixed(1) : '0',
      },
      narrative: `The territorial density analysis shows a balanced distribution across zones. Saturated zones represent mature markets with potential for resource optimization, while low-density zones present significant expansion opportunities with minimal competitive pressure.`,
    };

    const charts: AtlasChartData[] = [{
      id: 'density_pie',
      title: 'Density Distribution',
      type: 'pie',
      data: [
        { name: 'Saturated', value: saturated.length, color: '#8b5cf6' },
        { name: 'Normal', value: normal.length, color: '#10b981' },
        { name: 'Low', value: low.length, color: '#f59e0b' },
      ].filter(d => d.value > 0),
      config: {},
    }];

    const tables: AtlasTableData[] = [{
      id: 'density_table',
      title: 'Density by Zone',
      headers: ['Zone', 'Establishments', 'Density Class'],
      rows: density.slice(0, 50).map(d => [
        d.geo_name,
        d.establishment_count.toString(),
        d.density_class.charAt(0).toUpperCase() + d.density_class.slice(1),
      ]),
    }];

    return {
      id: `section_3_density`,
      title: 'Density Analysis',
      order,
      content,
      charts,
      tables,
      maps: [],
    };
  }

  // Section 4: Territorial Opportunities
  private buildOpportunitiesSection(opportunities: OpportunityResult[], order: number): AtlasSection {
    const growthZones = opportunities.filter(o => o.opportunity_type === 'growth_zone');
    const underserved = opportunities.filter(o => o.opportunity_type === 'underserved_zone');
    const expansion = opportunities.filter(o => o.opportunity_type === 'expansion_zone');
    const totalPotential = opportunities.reduce((s, o) => s + o.estimated_potential, 0);

    const content: AtlasSectionContent = {
      summary: `${opportunities.length} territorial opportunities identified with an estimated potential of ${totalPotential.toLocaleString()} establishments.`,
      highlights: [
        `${growthZones.length} growth zones identified`,
        `${underserved.length} underserved zones requiring intervention`,
        `${expansion.length} expansion zones available`,
        `Total estimated potential: ${totalPotential.toLocaleString()} establishments`,
      ],
      metrics: {
        'total_opportunities': opportunities.length,
        'growth_zones': growthZones.length,
        'underserved_zones': underserved.length,
        'expansion_zones': expansion.length,
        'estimated_potential': totalPotential,
      },
      narrative: `Strategic analysis has identified significant territorial opportunities. Growth zones show organic expansion potential, while underserved zones require targeted intervention. Expansion zones offer blue ocean opportunities with minimal existing coverage.`,
    };

    const charts: AtlasChartData[] = [{
      id: 'opp_bar',
      title: 'Opportunity by Type',
      type: 'bar',
      data: [
        { type: 'Growth Zones', count: growthZones.length, potential: growthZones.reduce((s, o) => s + o.estimated_potential, 0) },
        { type: 'Underserved Zones', count: underserved.length, potential: underserved.reduce((s, o) => s + o.estimated_potential, 0) },
        { type: 'Expansion Zones', count: expansion.length, potential: expansion.reduce((s, o) => s + o.estimated_potential, 0) },
      ],
      config: { xKey: 'type', yKey: 'count', color: '#8b5cf6' },
    }];

    return {
      id: `section_4_opportunities`,
      title: 'Territorial Opportunities',
      order,
      content,
      charts,
      tables: [],
      maps: [],
    };
  }

  // Section 5: Coverage Gaps
  private buildGapsSection(gaps: GapResult[], order: number): AtlasSection {
    const critical = gaps.filter(g => g.severity === 'critical');
    const high = gaps.filter(g => g.severity === 'high');
    const medium = gaps.filter(g => g.severity === 'medium');
    const low = gaps.filter(g => g.severity === 'low');

    const content: AtlasSectionContent = {
      summary: `${gaps.length} coverage gaps identified across the territory, with ${critical.length + high.length} requiring urgent attention.`,
      highlights: [
        `${critical.length} critical gaps (>70% missing)`,
        `${high.length} high-severity gaps (50-70%)`,
        `${medium.length} medium gaps (30-50%)`,
        `${low.length} low-severity gaps (<30%)`,
        `Average gap: ${gaps.length > 0 ? (gaps.reduce((s, g) => s + g.gap_pct, 0) / gaps.length).toFixed(1) : 0}%`,
      ],
      metrics: {
        'total_gaps': gaps.length,
        'critical_gaps': critical.length,
        'high_gaps': high.length,
        'medium_gaps': medium.length,
        'low_gaps': low.length,
        'avg_gap_pct': gaps.length > 0 ? (gaps.reduce((s, g) => s + g.gap_pct, 0) / gaps.length).toFixed(1) : '0',
      },
      narrative: `Gap analysis reveals critical areas requiring immediate intervention. Critical and high-severity gaps should be prioritized for resource allocation and strategic planning to prevent humanitarian and operational risks.`,
    };

    const charts: AtlasChartData[] = [{
      id: 'gap_severity',
      title: 'Gap Severity Distribution',
      type: 'pie',
      data: [
        { name: 'Critical', value: critical.length, color: '#dc2626' },
        { name: 'High', value: high.length, color: '#ef4444' },
        { name: 'Medium', value: medium.length, color: '#f59e0b' },
        { name: 'Low', value: low.length, color: '#10b981' },
      ].filter(d => d.value > 0),
      config: {},
    }];

    const tables: AtlasTableData[] = [{
      id: 'gaps_table',
      title: 'Coverage Gaps Details',
      headers: ['Zone', 'Current', 'Expected', 'Gap %', 'Severity'],
      rows: gaps.slice(0, 30).map(g => [
        g.geo_name,
        g.current_value.toString(),
        g.expected_value.toString(),
        `${g.gap_pct.toFixed(1)}%`,
        g.severity.toUpperCase(),
      ]),
    }];

    return {
      id: `section_5_gaps`,
      title: 'Coverage Gaps',
      order,
      content,
      charts,
      tables,
      maps: [],
    };
  }

  // Section 6: Risk Areas
  private buildRiskAreasSection(alerts: TerritorialAlert[], order: number): AtlasSection {
    const riskAlerts = alerts.filter(a =>
      a.alert_type === 'route_failure' ||
      a.alert_type === 'critical_coverage' ||
      a.alert_type === 'humanitarian_risk'
    );

    const content: AtlasSectionContent = {
      summary: `${riskAlerts.length} risk alerts identified across operational and humanitarian domains.`,
      highlights: [
        `${riskAlerts.filter(a => a.alert_type === 'critical_coverage').length} critical coverage risks`,
        `${riskAlerts.filter(a => a.alert_type === 'route_failure').length} route failure risks`,
        `${riskAlerts.filter(a => a.alert_type === 'humanitarian_risk').length} humanitarian risks`,
        `Highest impact: ${riskAlerts.length > 0 ? Math.max(...riskAlerts.map(a => a.impact_score)).toFixed(0) : 0}`,
      ],
      metrics: {
        'total_risks': riskAlerts.length,
        'coverage_risks': riskAlerts.filter(a => a.alert_type === 'critical_coverage').length,
        'route_risks': riskAlerts.filter(a => a.alert_type === 'route_failure').length,
        'humanitarian_risks': riskAlerts.filter(a => a.alert_type === 'humanitarian_risk').length,
      },
      narrative: `Risk assessment identifies areas requiring immediate mitigation strategies. Critical coverage risks and humanitarian risks should be addressed with priority to prevent service disruption.`,
    };

    const charts: AtlasChartData[] = [{
      id: 'risk_types',
      title: 'Risk Types Distribution',
      type: 'pie',
      data: [
        { name: 'Coverage Risks', value: riskAlerts.filter(a => a.alert_type === 'critical_coverage').length, color: '#ef4444' },
        { name: 'Route Failures', value: riskAlerts.filter(a => a.alert_type === 'route_failure').length, color: '#f97316' },
        { name: 'Humanitarian', value: riskAlerts.filter(a => a.alert_type === 'humanitarian_risk').length, color: '#dc2626' },
        { name: 'Other', value: riskAlerts.filter(a => !['critical_coverage', 'route_failure', 'humanitarian_risk'].includes(a.alert_type)).length, color: '#6b7280' },
      ].filter(d => d.value > 0),
      config: {},
    }];

    return {
      id: `section_6_risks`,
      title: 'Risk Areas',
      order,
      content,
      charts,
      tables: [],
      maps: [],
    };
  }

  // Section 7: Vulnerability Areas
  private buildVulnerabilitySection(alerts: TerritorialAlert[], gaps: GapResult[], order: number): AtlasSection {
    const vulnerabilityClusters = alerts.filter(a => a.alert_type === 'vulnerability_cluster');
    const criticalGaps = gaps.filter(g => g.severity === 'critical');
    const highGaps = gaps.filter(g => g.severity === 'high');

    const content: AtlasSectionContent = {
      summary: `${vulnerabilityClusters.length} vulnerability clusters identified with ${criticalGaps.length + highGaps.length} high-priority areas.`,
      highlights: [
        `${vulnerabilityClusters.length} vulnerability clusters detected`,
        `${criticalGaps.length} critical vulnerability zones`,
        `${highGaps.length} high-vulnerability zones`,
        `Combined vulnerability index: ${((criticalGaps.length * 3 + highGaps.length * 2) / Math.max(1, gaps.length) * 100).toFixed(0)}%`,
      ],
      metrics: {
        'vulnerability_clusters': vulnerabilityClusters.length,
        'critical_zones': criticalGaps.length,
        'high_zones': highGaps.length,
        'vulnerability_index': ((criticalGaps.length * 3 + highGaps.length * 2) / Math.max(1, gaps.length) * 100).toFixed(0),
      },
      narrative: `Vulnerability analysis highlights areas where populations may be at risk due to inadequate service coverage. These areas require coordinated intervention strategies.`,
    };

    const tables: AtlasTableData[] = [{
      id: 'vulnerability_table',
      title: 'High Vulnerability Zones',
      headers: ['Zone', 'Gap %', 'Priority Score', 'Recommended Action'],
      rows: [...criticalGaps, ...highGaps].slice(0, 20).map(g => [
        g.geo_name,
        `${g.gap_pct.toFixed(1)}%`,
        g.severity === 'critical' ? '100' : '75',
        'Immediate intervention required',
      ]),
    }];

    return {
      id: `section_7_vulnerability`,
      title: 'Vulnerability Areas',
      order,
      content,
      charts: [],
      tables,
      maps: [],
    };
  }

  // Section 8: Priority Areas
  private buildPrioritySection(alerts: TerritorialAlert[], opportunities: OpportunityResult[], order: number): AtlasSection {
    const criticalAlerts = alerts.filter(a => a.priority === 'critical');
    const highAlerts = alerts.filter(a => a.priority === 'high');
    const topOpportunities = opportunities.slice(0, 10);

    const content: AtlasSectionContent = {
      summary: `${criticalAlerts.length + highAlerts.length} high-priority areas identified for immediate action.`,
      highlights: [
        `${criticalAlerts.length} critical priority areas`,
        `${highAlerts.length} high priority areas`,
        `${topOpportunities.length} strategic opportunity zones`,
        `Priority action items: ${alerts.filter(a => a.recommended_actions.length > 0).length}`,
      ],
      metrics: {
        'critical_priority': criticalAlerts.length,
        'high_priority': highAlerts.length,
        'opportunity_zones': opportunities.length,
        'action_items': alerts.filter(a => a.recommended_actions.length > 0).length,
      },
      narrative: `Priority assessment identifies areas requiring immediate resource allocation. Critical and high-priority areas should be addressed within the current operational cycle.`,
    };

    const tables: AtlasTableData[] = [{
      id: 'priority_table',
      title: 'Priority Action Items',
      headers: ['Area', 'Type', 'Priority', 'Urgency', 'First Action'],
      rows: [...criticalAlerts, ...highAlerts].slice(0, 20).map(a => [
        a.geo_name,
        a.alert_type.replace(/_/g, ' '),
        a.priority.toUpperCase(),
        a.urgency_score.toFixed(0),
        a.recommended_actions[0] ?? 'Review required',
      ]),
    }];

    return {
      id: `section_8_priority`,
      title: 'Priority Areas',
      order,
      content,
      charts: [],
      tables,
      maps: [],
    };
  }

  // Section 9: Route Performance
  private buildRoutePerformanceSection(
    routes: Array<{ id: string; name: string; status: string; completion: number }>,
    order: number
  ): AtlasSection {
    const completed = routes.filter(r => r.status === 'completed' || r.completion >= 100);
    const active = routes.filter(r => r.status === 'active' || r.status === 'in_progress');
    const pending = routes.filter(r => r.status === 'pending');
    const failed = routes.filter(r => r.status === 'failed');
    const avgCompletion = routes.length > 0
      ? routes.reduce((s, r) => s + r.completion, 0) / routes.length
      : 0;

    const content: AtlasSectionContent = {
      summary: `${routes.length} routes analyzed with ${avgCompletion.toFixed(1)}% average completion rate.`,
      highlights: [
        `${completed.length} routes completed`,
        `${active.length} routes in progress`,
        `${pending.length} routes pending`,
        `${failed.length} routes failed`,
        `Average completion: ${avgCompletion.toFixed(1)}%`,
      ],
      metrics: {
        'total_routes': routes.length,
        'completed': completed.length,
        'active': active.length,
        'pending': pending.length,
        'failed': failed.length,
        'avg_completion': avgCompletion.toFixed(1),
      },
      narrative: `Route performance analysis provides operational efficiency metrics. Failed routes require investigation and recovery planning.`,
    };

    const charts: AtlasChartData[] = [{
      id: 'route_status',
      title: 'Route Status Distribution',
      type: 'pie',
      data: [
        { name: 'Completed', value: completed.length, color: '#10b981' },
        { name: 'Active', value: active.length, color: '#3b82f6' },
        { name: 'Pending', value: pending.length, color: '#f59e0b' },
        { name: 'Failed', value: failed.length, color: '#ef4444' },
      ].filter(d => d.value > 0),
      config: {},
    }];

    return {
      id: `section_9_routes`,
      title: 'Route Performance',
      order,
      content,
      charts,
      tables: [],
      maps: [],
    };
  }

  // Section 10: Corridor Performance
  private async buildCorridorPerformanceSection(organizationId: string, order: number): Promise<AtlasSection> {
    const corridorMetrics = await territorialIntelligenceEngine.generateCorridorMetrics(organizationId);
    const density = corridorMetrics.density;
    const opportunities = corridorMetrics.opportunities;

    const content: AtlasSectionContent = {
      summary: `${density.length} corridors analyzed with ${opportunities.length} expansion opportunities.`,
      highlights: [
        `${density.length} active corridors`,
        `${density.filter(d => d.density_class === 'saturated').length} saturated corridors`,
        `${density.filter(d => d.density_class === 'low').length} expansion candidates`,
        `${opportunities.length} corridor opportunities`,
      ],
      metrics: {
        'total_corridors': density.length,
        'saturated': density.filter(d => d.density_class === 'saturated').length,
        'expansion_candidates': density.filter(d => d.density_class === 'low').length,
        'opportunities': opportunities.length,
      },
      narrative: `Corridor analysis identifies strategic territorial connections. Low-density corridors offer expansion potential while saturated corridors indicate mature service routes.`,
    };

    const tables: AtlasTableData[] = [{
      id: 'corridor_table',
      title: 'Corridor Performance',
      headers: ['Corridor', 'Establishments', 'Density', 'Status'],
      rows: density.slice(0, 20).map(c => [
        c.geo_name.slice(0, 20),
        c.establishment_count.toString(),
        c.density_class.charAt(0).toUpperCase() + c.density_class.slice(1),
        c.density_class === 'saturated' ? 'Mature' : c.density_class === 'low' ? 'Expansion' : 'Active',
      ]),
    }];

    return {
      id: `section_10_corridors`,
      title: 'Corridor Performance',
      order,
      content,
      charts: [],
      tables,
      maps: [],
    };
  }

  // Section 11: Field Collection Statistics
  private buildFieldCollectionSection(
    visits: { total: number; byMonth: Array<{ month: string; count: number }> },
    order: number
  ): AtlasSection {
    const content: AtlasSectionContent = {
      summary: `${visits.total} total field visits recorded with ${visits.byMonth.length} months of activity data.`,
      highlights: [
        `${visits.total.toLocaleString()} total visits`,
        `${visits.byMonth.length} months of activity`,
        `${visits.byMonth.length > 0 ? visits.byMonth.reduce((s, v) => s + v.count, 0) / visits.byMonth.length : 0} avg visits/month`,
        `Peak: ${visits.byMonth.length > 0 ? Math.max(...visits.byMonth.map(v => v.count)).toLocaleString() : 0} visits`,
      ],
      metrics: {
        'total_visits': visits.total,
        'active_months': visits.byMonth.length,
        'avg_per_month': visits.byMonth.length > 0 ? (visits.byMonth.reduce((s, v) => s + v.count, 0) / visits.byMonth.length).toFixed(0) : '0',
        'peak_visits': visits.byMonth.length > 0 ? Math.max(...visits.byMonth.map(v => v.count)) : 0,
      },
      narrative: `Field collection statistics demonstrate operational reach and coverage consistency. Monthly trends reveal seasonal patterns and resource allocation effectiveness.`,
    };

    const charts: AtlasChartData[] = [{
      id: 'visits_trend',
      title: 'Monthly Visit Trends',
      type: 'line',
      data: visits.byMonth.map(v => ({ month: v.month, visits: v.count })),
      config: { xKey: 'month', yKey: 'visits' },
    }];

    return {
      id: `section_11_collection`,
      title: 'Field Collection Statistics',
      order,
      content,
      charts,
      tables: [],
      maps: [],
    };
  }

  // Section 12: Indicators Dashboard
  private buildIndicatorsSection(
    indicators: Array<{ name: string; value: number; target: number }>,
    order: number
  ): AtlasSection {
    const achieved = indicators.filter(i => i.value >= i.target);
    const inProgress = indicators.filter(i => i.value < i.target && i.value >= i.target * 0.5);
    const atRisk = indicators.filter(i => i.value < i.target * 0.5);

    const content: AtlasSectionContent = {
      summary: `${indicators.length} key performance indicators tracked with ${achieved.length} targets achieved.`,
      highlights: [
        `${achieved.length} indicators on target`,
        `${inProgress.length} indicators in progress`,
        `${atRisk.length} indicators at risk`,
        `Overall KPI achievement: ${indicators.length > 0 ? ((achieved.length / indicators.length) * 100).toFixed(0) : 0}%`,
      ],
      metrics: {
        'total_indicators': indicators.length,
        'achieved': achieved.length,
        'in_progress': inProgress.length,
        'at_risk': atRisk.length,
        'achievement_rate': indicators.length > 0 ? ((achieved.length / indicators.length) * 100).toFixed(0) : '0',
      },
      narrative: `Indicator dashboard provides strategic performance visibility. At-risk indicators require intervention plans and resource reallocation.`,
    };

    const tables: AtlasTableData[] = [{
      id: 'indicators_table',
      title: 'KPI Summary',
      headers: ['Indicator', 'Current', 'Target', 'Status'],
      rows: indicators.slice(0, 20).map(i => [
        i.name,
        i.value.toString(),
        i.target.toString(),
        i.value >= i.target ? 'Achieved' : i.value >= i.target * 0.5 ? 'In Progress' : 'At Risk',
      ]),
    }];

    return {
      id: `section_12_indicators`,
      title: 'Indicators Dashboard',
      order,
      content,
      charts: [],
      tables,
      maps: [],
    };
  }

  // Section 1: Cover Page
  private buildCoverPageSection(type: AtlasType, summary: ExecutiveSummary | null, order: number): AtlasSection {
    const typeLabels: Record<AtlasType, string> = {
      national: 'National',
      provincial: 'Provincial',
      municipal: 'Municipal',
      corridor: 'Corridor',
      commercial: 'Commercial',
      humanitarian: 'Humanitarian',
    };

    const content: AtlasSectionContent = {
      summary: `${typeLabels[type]} Territorial Atlas — Comprehensive territorial intelligence knowledge product covering ${summary?.total_entities ?? 0} entities with ${summary?.coverage_score ?? 0}% coverage efficiency.`,
      highlights: [
        `Atlas Type: ${typeLabels[type]}`,
        `Total Entities: ${summary?.total_entities ?? 0}`,
        `Coverage Score: ${summary?.coverage_score ?? 0}%`,
        `Opportunity Score: ${summary?.opportunity_score ?? 0}%`,
        `Critical Issues: ${summary?.critical_issues ?? 0}`,
      ],
      metrics: {
        'atlas_type': typeLabels[type],
        'total_entities': summary?.total_entities ?? 0,
        'coverage_score': `${summary?.coverage_score ?? 0}%`,
        'opportunity_score': `${summary?.opportunity_score ?? 0}%`,
        'risk_level': summary?.overall_status ?? 'N/A',
      },
      narrative: `This ${typeLabels[type].toLowerCase()} territorial atlas provides a comprehensive analysis of territorial intelligence, covering entity distribution, coverage efficiency, opportunity identification, gap analysis, risk assessment, and strategic recommendations. The atlas is structured across 14 sections delivering actionable insights for territorial operations.`,
    };

    return {
      id: `section_0_cover`,
      title: 'Cover Page',
      order,
      content,
      charts: [],
      tables: [],
      maps: [],
    };
  }

  // Section 14: Maps Section
  private async buildMapsSection(organizationId: string, coverageData: CoverageResult[], order: number): Promise<AtlasSection> {
    const mapLayers = await this.generateMapLayers(organizationId, ['province', 'municipality', 'district', 'sector', 'corridor']);

    const content: AtlasSectionContent = {
      summary: `Territorial map visualization across ${mapLayers.length} geographic layers covering ${coverageData.length} zones with multi-level coverage representation.`,
      highlights: [
        `${mapLayers.length} map layers generated`,
        `Provinces: ${mapLayers.find(l => l.level === 'province')?.features.length ?? 0} features`,
        `Municipalities: ${mapLayers.find(l => l.level === 'municipality')?.features.length ?? 0} features`,
        `Districts: ${mapLayers.find(l => l.level === 'district')?.features.length ?? 0} features`,
        `Corridors: ${mapLayers.find(l => l.level === 'corridor')?.features.length ?? 0} features`,
      ],
      metrics: {
        'total_layers': mapLayers.length,
        'total_features': mapLayers.reduce((s, l) => s + l.features.length, 0),
        'province_features': mapLayers.find(l => l.level === 'province')?.features.length ?? 0,
        'municipality_features': mapLayers.find(l => l.level === 'municipality')?.features.length ?? 0,
        'district_features': mapLayers.find(l => l.level === 'district')?.features.length ?? 0,
      },
      narrative: `The maps section provides geospatial context for all territorial analysis. Each layer represents a distinct administrative level with coverage indicators, enabling spatial understanding of territorial performance and gap distribution.`,
    };

    const tables: AtlasTableData[] = [{
      id: 'map_layers_table',
      title: 'Map Layer Summary',
      headers: ['Layer', 'Level', 'Features', 'Fill Color', 'Opacity'],
      rows: mapLayers.map(l => [
        l.name,
        l.level.charAt(0).toUpperCase() + l.level.slice(1),
        l.features.length.toString(),
        l.style.fillColor,
        l.style.opacity.toFixed(2),
      ]),
    }];

    return {
      id: `section_13_maps`,
      title: 'Maps Section',
      order,
      content,
      charts: [],
      tables,
      maps: mapLayers,
    };
  }

  // -------------------------------------------------------------------------
  // Data Fetchers
  // -------------------------------------------------------------------------
  private async fetchExecutiveSummary(orgId: string, _type: AtlasType, geoLevel?: string): Promise<ExecutiveSummary | null> {
    try {
      return await territorialIndicatorEngine.getExecutiveSummary(orgId, geoLevel ?? 'municipality');
    } catch {
      return null;
    }
  }

  private async fetchCoverageData(orgId: string, _type: AtlasType, geoLevel?: string, _geoName?: string): Promise<CoverageResult[]> {
    try {
      return await territorialIntelligenceEngine.calculateCoverage(orgId, geoLevel ?? 'municipality');
    } catch {
      return [];
    }
  }

  private async fetchDensityData(orgId: string, _type: AtlasType, geoLevel?: string): Promise<DensityResult[]> {
    try {
      return await territorialIntelligenceEngine.calculateDensity(orgId, geoLevel ?? 'municipality');
    } catch {
      return [];
    }
  }

  private async fetchOpportunities(orgId: string, _type: AtlasType, geoLevel?: string): Promise<OpportunityResult[]> {
    try {
      const [growth, expansion] = await Promise.all([
        territorialIntelligenceEngine.detectGrowthZones(orgId, geoLevel ?? 'municipality'),
        territorialIntelligenceEngine.detectExpansionOpportunities(orgId, geoLevel ?? 'municipality'),
      ]);
      return [...growth, ...expansion];
    } catch {
      return [];
    }
  }

  private async fetchGaps(orgId: string, _type: AtlasType, geoLevel?: string): Promise<GapResult[]> {
    try {
      return await territorialIntelligenceEngine.detectCoverageGaps(orgId, geoLevel ?? 'municipality');
    } catch {
      return [];
    }
  }

  private async fetchAlerts(orgId: string, _type: AtlasType): Promise<TerritorialAlert[]> {
    try {
      return await territorialAlertEngine.getActiveAlerts(orgId);
    } catch {
      return [];
    }
  }

  private async fetchRouteData(orgId: string): Promise<Array<{ id: string; name: string; status: string; completion: number }>> {
    try {
      const { data } = await supabase
        .from('routes')
        .select('id, name, status, completion_percentage')
        .eq('organization_id', orgId);
      return (data ?? []).map(r => ({
        id: r.id,
        name: r.name,
        status: r.status ?? 'unknown',
        completion: r.completion_percentage ?? 0,
      }));
    } catch {
      return [];
    }
  }

  private async fetchVisitData(orgId: string): Promise<{ total: number; byMonth: Array<{ month: string; count: number }> }> {
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

      return {
        total: visits.length,
        byMonth: Object.entries(byMonth)
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([month, count]) => ({ month, count })),
      };
    } catch {
      return { total: 0, byMonth: [] };
    }
  }

  private async fetchIndicatorData(orgId: string): Promise<Array<{ name: string; value: number; target: number }>> {
    try {
      const kpis = await territorialIndicatorEngine.generateTerritorialKPIs(orgId);
      return kpis.map(k => ({
        name: k.name,
        value: k.current_value ?? 0,
        target: k.target_value ?? 100,
      }));
    } catch {
      return [];
    }
  }

  // -------------------------------------------------------------------------
  // Map Generation
  // -------------------------------------------------------------------------
  async generateMapLayers(organizationId: string, levels: ('province' | 'municipality' | 'district' | 'sector' | 'corridor')[]): Promise<AtlasMapLayer[]> {
    const layers: AtlasMapLayer[] = [];

    for (const level of levels) {
      let coverage: CoverageResult[] = [];
      try {
        coverage = await territorialIntelligenceEngine.calculateCoverage(organizationId, level);
      } catch {
        // Continue without coverage data
      }

      const features: AtlasMapFeature[] = coverage.map(c => ({
        id: `${level}_${c.geo_name}`,
        name: c.geo_name,
        geometry: null,
        properties: {
          coverage_pct: c.coverage_pct,
          total_establishments: c.total_establishments,
          visited: c.visited_establishments,
        },
        centroid: null,
      }));

      layers.push({
        id: `layer_${level}`,
        name: `${level.charAt(0).toUpperCase() + level.slice(1)} Coverage`,
        level,
        features,
        style: {
          fillColor: '#3b82f6',
          strokeColor: '#1e40af',
          opacity: 0.7,
        },
      });
    }

    return layers;
  }

  // -------------------------------------------------------------------------
  // Export Functions
  // -------------------------------------------------------------------------
  async exportToPDF(atlas: AtlasGeneratedProduct): Promise<Blob> {
    const format = atlas.format === 'legal' ? [612, 1008] : [612, 792];
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'pt',
      format,
    });

    const pageWidth = format[0];
    const margin = 40;
    let y = margin;

    // Title Page
    doc.setFontSize(28);
    doc.setFont('helvetica', 'bold');
    doc.text(atlas.title, pageWidth / 2, y + 100, { align: 'center' });
    y += 140;

    doc.setFontSize(14);
    doc.setFont('helvetica', 'normal');
    doc.text(atlas.subtitle, pageWidth / 2, y, { align: 'center' });
    y += 40;

    doc.setFontSize(10);
    doc.text(`Generated: ${new Date(atlas.generated_at).toLocaleDateString()}`, pageWidth / 2, y, { align: 'center' });
    y += 20;
    doc.text(`Status: ${atlas.status.toUpperCase()} | Risk Level: ${atlas.risk_level.toUpperCase()}`, pageWidth / 2, y, { align: 'center' });

    // Sections
    for (const section of atlas.sections) {
      doc.addPage();

      // Section Title
      doc.setFontSize(18);
      doc.setFont('helvetica', 'bold');
      doc.text(`${section.order}. ${section.title}`, margin, margin);

      // Summary
      doc.setFontSize(11);
      doc.setFont('helvetica', 'normal');
      const summaryLines = doc.splitTextToSize(section.content.summary, pageWidth - margin * 2);
      doc.text(summaryLines, margin, margin + 30);

      // Highlights
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text('Key Highlights:', margin, margin + 80);
      doc.setFont('helvetica', 'normal');
      let hy = margin + 95;
      for (const highlight of section.content.highlights.slice(0, 5)) {
        doc.text(`  • ${highlight}`, margin, hy);
        hy += 15;
      }

      // Metrics Table
      if (Object.keys(section.content.metrics).length > 0) {
        autoTable(doc, {
          startY: hy + 20,
          head: [['Metric', 'Value']],
          body: Object.entries(section.content.metrics).map(([k, v]) => [
            k.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
            typeof v === 'number' ? v.toLocaleString() : v,
          ]),
          margin: { left: margin },
          styles: { fontSize: 9 },
          headStyles: { fillColor: [59, 130, 246] },
        });
      }

      // Additional Tables
      for (const table of section.tables) {
        const finalY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable?.finalY ?? hy + 100;
        autoTable(doc, {
          startY: finalY + 20,
          head: [table.headers],
          body: table.rows,
          margin: { left: margin },
          styles: { fontSize: 8 },
          headStyles: { fillColor: [100, 100, 100] },
        });
      }
    }

    return doc.output('blob');
  }

  async exportToPowerPoint(atlas: AtlasGeneratedProduct): Promise<Blob> {
    const pptx = new PptxGenJS();

    // Title Slide
    const titleSlide = pptx.addSlide();
    titleSlide.addText(atlas.title, {
      x: 0.5, y: 2, w: '90%', h: 1,
      fontSize: 36, bold: true, align: 'center',
    });
    titleSlide.addText(atlas.subtitle, {
      x: 0.5, y: 3.2, w: '90%', h: 0.5,
      fontSize: 18, align: 'center', color: '666666',
    });
    titleSlide.addText(`Generated: ${new Date(atlas.generated_at).toLocaleDateString()}`, {
      x: 0.5, y: 4.5, w: '90%', h: 0.3,
      fontSize: 12, align: 'center', color: '999999',
    });

    // Section Slides
    for (const section of atlas.sections) {
      const slide = pptx.addSlide();

      slide.addText(`${section.order}. ${section.title}`, {
        x: 0.5, y: 0.3, w: '90%', h: 0.6,
        fontSize: 24, bold: true,
      });

      slide.addText(section.content.summary, {
        x: 0.5, y: 1.1, w: '90%', h: 0.8,
        fontSize: 12, color: '333333',
      });

      // Highlights
      const highlights = section.content.highlights.slice(0, 4);
      slide.addText('Key Highlights:', {
        x: 0.5, y: 2, w: '40%', h: 0.3,
        fontSize: 11, bold: true,
      });
      slide.addText(highlights.map(h => ({ text: `• ${h}\n`, options: { bullet: false } })), {
        x: 0.5, y: 2.3, w: '45%', h: 2,
        fontSize: 10, color: '444444',
      });

      // Metrics
      const metrics = Object.entries(section.content.metrics).slice(0, 5);
      slide.addText('Metrics:', {
        x: 5.2, y: 2, w: '40%', h: 0.3,
        fontSize: 11, bold: true,
      });

      const tableData = metrics.map(([k, v]) => [
        k.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
        typeof v === 'number' ? v.toLocaleString() : String(v),
      ]);

      slide.addTable([{ text: 'Metric' }, { text: 'Value' }], {
        x: 5.2, y: 2.3, w: 4.3, h: 0.3,
        fontSize: 9, color: 'ffffff', fill: { color: '3b82f6' },
      });
      slide.addTable(tableData, {
        x: 5.2, y: 2.6, w: 4.3, h: metrics.length * 0.35,
        fontSize: 9, color: '333333',
      });
    }

    // Generate blob
    const pptxBlob = await pptx.write({ outputType: 'blob' });
    return pptxBlob as Blob;
  }

  async exportToDocx(atlas: AtlasGeneratedProduct): Promise<Blob> {
    const sections: Paragraph[] = [];

    // Cover page
    sections.push(new Paragraph({ spacing: { before: 3000 } }));
    sections.push(new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [new TextRun({ text: atlas.title, bold: true, size: 56, font: 'Calibri' })],
    }));
    sections.push(new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 200 },
      children: [new TextRun({ text: atlas.subtitle, size: 28, font: 'Calibri', color: '666666' })],
    }));
    sections.push(new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 200 },
      children: [new TextRun({ text: `Generated: ${new Date(atlas.generated_at).toLocaleDateString()}`, size: 20, font: 'Calibri', color: '999999' })],
    }));
    sections.push(new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 100 },
      children: [new TextRun({ text: `Status: ${atlas.status.toUpperCase()} | Risk Level: ${atlas.risk_level.toUpperCase()}`, size: 20, font: 'Calibri' })],
    }));

    // Each atlas section
    for (const section of atlas.sections) {
      sections.push(new Paragraph({ children: [new PageBreak()] }));

      sections.push(new Paragraph({
        heading: HeadingLevel.HEADING_1,
        children: [new TextRun({ text: `${section.order}. ${section.title}`, bold: true, size: 36, font: 'Calibri' })],
      }));

      sections.push(new Paragraph({
        spacing: { before: 200 },
        children: [new TextRun({ text: section.content.summary, size: 22, font: 'Calibri' })],
      }));

      // Highlights
      sections.push(new Paragraph({
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 300 },
        children: [new TextRun({ text: 'Key Highlights', bold: true, size: 26, font: 'Calibri' })],
      }));

      for (const highlight of section.content.highlights) {
        sections.push(new Paragraph({
          spacing: { before: 80 },
          bullet: { level: 0 },
          children: [new TextRun({ text: highlight, size: 20, font: 'Calibri' })],
        }));
      }

      // Narrative
      if (section.content.narrative) {
        sections.push(new Paragraph({
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 300 },
          children: [new TextRun({ text: 'Analysis', bold: true, size: 26, font: 'Calibri' })],
        }));
        sections.push(new Paragraph({
          spacing: { before: 100 },
          children: [new TextRun({ text: section.content.narrative, size: 20, font: 'Calibri', italics: true })],
        }));
      }

      // Metrics table
      const metricEntries = Object.entries(section.content.metrics);
      if (metricEntries.length > 0) {
        sections.push(new Paragraph({
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 300 },
          children: [new TextRun({ text: 'Metrics', bold: true, size: 26, font: 'Calibri' })],
        }));

        const metricRows = [
          new TableRow({
            children: [
              new TableCell({
                width: { size: 50, type: WidthType.PERCENTAGE },
                children: [new Paragraph({ children: [new TextRun({ text: 'Metric', bold: true, size: 18, font: 'Calibri' })] })],
                shading: { fill: '3b82f6' },
              }),
              new TableCell({
                width: { size: 50, type: WidthType.PERCENTAGE },
                children: [new Paragraph({ children: [new TextRun({ text: 'Value', bold: true, size: 18, font: 'Calibri', color: 'FFFFFF' })] })],
                shading: { fill: '3b82f6' },
              }),
            ],
          }),
          ...metricEntries.map(([k, v]) =>
            new TableRow({
              children: [
                new TableCell({
                  width: { size: 50, type: WidthType.PERCENTAGE },
                  children: [new Paragraph({ children: [new TextRun({ text: k.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()), size: 18, font: 'Calibri' })] })],
                }),
                new TableCell({
                  width: { size: 50, type: WidthType.PERCENTAGE },
                  children: [new Paragraph({ children: [new TextRun({ text: typeof v === 'number' ? v.toLocaleString() : v, size: 18, font: 'Calibri' })] })],
                }),
              ],
            })
          ),
        ];

        sections.push(new Paragraph({
          children: [new Table({ rows: metricRows, width: { size: 100, type: WidthType.PERCENTAGE } })],
        }));
      }

      // Additional data tables
      for (const table of section.tables) {
        sections.push(new Paragraph({
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 300 },
          children: [new TextRun({ text: table.title, bold: true, size: 26, font: 'Calibri' })],
        }));

        const headerRow = new TableRow({
          children: table.headers.map(h =>
            new TableCell({
              children: [new Paragraph({ children: [new TextRun({ text: h, bold: true, size: 16, font: 'Calibri', color: 'FFFFFF' })] })],
              shading: { fill: '6b7280' },
            })
          ),
        });

        const dataRows = table.rows.map(row =>
          new TableRow({
            children: row.map(cell =>
              new TableCell({
                children: [new Paragraph({ children: [new TextRun({ text: String(cell), size: 16, font: 'Calibri' })] })],
              })
            ),
          })
        );

        sections.push(new Paragraph({
          children: [new Table({
            rows: [headerRow, ...dataRows],
            width: { size: 100, type: WidthType.PERCENTAGE },
          })],
        }));
      }
    }

    const doc = new Document({
      sections: [{
        properties: {
          page: {
            size: atlas.format === 'legal'
              ? { width: 12240, height: 20160 }
              : { width: 12240, height: 15840 },
            margin: { top: 1440, bottom: 1440, left: 1440, right: 1440 },
          },
        },
        children: sections,
      }],
    });

    return await Packer.toBlob(doc);
  }

  // -------------------------------------------------------------------------
  // Helpers
  // -------------------------------------------------------------------------
  private generateTitle(type: AtlasType, geoName?: string): string {
    const typeNames: Record<AtlasType, string> = {
      national: 'National Territorial Atlas',
      provincial: `Provincial Atlas: ${geoName ?? 'All Provinces'}`,
      municipal: `Municipal Atlas: ${geoName ?? 'All Municipalities'}`,
      corridor: 'Corridor Performance Atlas',
      commercial: 'Commercial Activity Atlas',
      humanitarian: 'Humanitarian Response Atlas',
    };
    return typeNames[type];
  }

  private generateSubtitle(type: AtlasType, periodStart: string, periodEnd: string): string {
    const start = new Date(periodStart).toLocaleDateString();
    const end = new Date(periodEnd).toLocaleDateString();
    return `Analysis Period: ${start} - ${end} | Type: ${type.charAt(0).toUpperCase() + type.slice(1)} Atlas`;
  }

  private calculateRiskLevel(alerts: TerritorialAlert[], gaps: GapResult[]): 'low' | 'medium' | 'high' | 'critical' {
    const criticalAlerts = alerts.filter(a => a.priority === 'critical').length;
    const criticalGaps = gaps.filter(g => g.severity === 'critical').length;

    if (criticalAlerts >= 3 || criticalGaps >= 5) return 'critical';
    if (criticalAlerts >= 1 || criticalGaps >= 3) return 'high';
    if (criticalGaps >= 1 || alerts.filter(a => a.priority === 'high').length >= 3) return 'medium';
    return 'low';
  }

  // -------------------------------------------------------------------------
  // Query Operations
  // -------------------------------------------------------------------------
  async getGeneratedAtlases(organizationId: string): Promise<AtlasGeneratedProduct[]> {
    const { data, error } = await supabase
      .from('territorial_atlases')
      .select('*')
      .eq('organization_id', organizationId)
      .order('generated_at', { ascending: false });
    if (error) throw error;
    return (data ?? []) as unknown as AtlasGeneratedProduct[];
  }

  async saveAtlas(atlas: AtlasGeneratedProduct): Promise<void> {
    const { error } = await supabase
      .from('territorial_atlases')
      .insert(atlas);
    if (error) throw error;
  }

  async updateAtlasStatus(id: string, status: 'draft' | 'published' | 'archived'): Promise<void> {
    const { error } = await supabase
      .from('territorial_atlases')
      .update({ status })
      .eq('id', id);
    if (error) throw error;
  }
}

export const territorialAtlasEngine = new TerritorialAtlasEngine();

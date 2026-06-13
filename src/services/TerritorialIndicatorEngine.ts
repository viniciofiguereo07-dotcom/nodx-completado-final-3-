import { supabase } from '../lib/supabase';
import { indicatorEngine, type KPIResult } from './IndicatorEngine';
import { territorialIntelligenceEngine, type CoverageResult, type DensityResult, type OpportunityResult, type GapResult } from './TerritorialIntelligenceEngine';
import { semaphoreEngine, type SemaphoreStatus, worstStatus, STATUS_COLORS } from './SemaphoreEngine';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
export interface TerritorialKPI {
  key: string;
  name: string;
  category: 'coverage' | 'density' | 'opportunity' | 'gap' | 'performance';
  current_value: number | null;
  target_value: number | null;
  unit: string;
  trend: 'improving' | 'stable' | 'declining' | 'unknown';
  trend_pct: number | null;
  semaphore_status: SemaphoreStatus;
  priority: 'high' | 'medium' | 'low';
  description: string;
}

export interface CoverageKPIs {
  avg_coverage_pct: number;
  total_entities: number;
  visited_entities: number;
  unvisited_entities: number;
  critical_gaps_count: number;
  coverage_trend: 'improving' | 'stable' | 'declining' | 'unknown';
  semaphore_status: SemaphoreStatus;
}

export interface DensityKPIs {
  saturated_zones_count: number;
  normal_zones_count: number;
  low_density_zones_count: number;
  avg_density_per_zone: number;
  expansion_candidates: number;
  semaphore_status: SemaphoreStatus;
}

export interface OpportunityKPIs {
  growth_zones_count: number;
  underserved_zones_count: number;
  expansion_zones_count: number;
  total_estimated_potential: number;
  avg_confidence_score: number;
  semaphore_status: SemaphoreStatus;
}

export interface GapKPIs {
  total_gaps: number;
  critical_gaps: number;
  high_gaps: number;
  medium_gaps: number;
  low_gaps: number;
  avg_gap_pct: number;
  semaphore_status: SemaphoreStatus;
}

export interface ExecutiveSummary {
  overall_status: SemaphoreStatus;
  coverage_score: number;
  density_score: number;
  opportunity_score: number;
  gap_score: number;
  total_entities: number;
  total_visited: number;
  total_opportunities: number;
  critical_issues: number;
  kpi_summary: TerritorialKPI[];
}

// ---------------------------------------------------------------------------
// Engine
// ---------------------------------------------------------------------------
export class TerritorialIndicatorEngine {

  // -------------------------------------------------------------------------
  // Coverage KPIs
  // -------------------------------------------------------------------------
  async getCoverageKPIs(organizationId: string, geoLevel = 'municipality'): Promise<CoverageKPIs> {
    const coverage = await territorialIntelligenceEngine.calculateCoverage(organizationId, geoLevel);

    if (coverage.length === 0) {
      return {
        avg_coverage_pct: 0,
        total_entities: 0,
        visited_entities: 0,
        unvisited_entities: 0,
        critical_gaps_count: 0,
        coverage_trend: 'unknown',
        semaphore_status: 'green',
      };
    }

    const totalEntities = coverage.reduce((s, c) => s + c.total_establishments, 0);
    const visitedEntities = coverage.reduce((s, c) => s + c.visited_establishments, 0);
    const avgCoverage = coverage.reduce((s, c) => s + c.coverage_pct, 0) / coverage.length;
    const criticalGaps = coverage.filter(c => c.coverage_pct < 30).length;

    const semaphoreStatus = this.evaluateCoverageStatus(avgCoverage);

    return {
      avg_coverage_pct: Math.round(avgCoverage * 100) / 100,
      total_entities: totalEntities,
      visited_entities: visitedEntities,
      unvisited_entities: totalEntities - visitedEntities,
      critical_gaps_count: criticalGaps,
      coverage_trend: 'stable',
      semaphore_status: semaphoreStatus,
    };
  }

  // -------------------------------------------------------------------------
  // Density KPIs
  // -------------------------------------------------------------------------
  async getDensityKPIs(organizationId: string, geoLevel = 'municipality'): Promise<DensityKPIs> {
    const density = await territorialIntelligenceEngine.calculateDensity(organizationId, geoLevel);

    if (density.length === 0) {
      return {
        saturated_zones_count: 0,
        normal_zones_count: 0,
        low_density_zones_count: 0,
        avg_density_per_zone: 0,
        expansion_candidates: 0,
        semaphore_status: 'green',
      };
    }

    const saturated = density.filter(d => d.density_class === 'saturated').length;
    const normal = density.filter(d => d.density_class === 'normal').length;
    const low = density.filter(d => d.density_class === 'low').length;
    const avgDensity = density.reduce((s, d) => s + d.establishment_count, 0) / density.length;

    const semaphoreStatus = low > saturated ? 'yellow' : 'green';

    return {
      saturated_zones_count: saturated,
      normal_zones_count: normal,
      low_density_zones_count: low,
      avg_density_per_zone: Math.round(avgDensity * 10) / 10,
      expansion_candidates: low,
      semaphore_status: semaphoreStatus,
    };
  }

  // -------------------------------------------------------------------------
  // Opportunity KPIs
  // -------------------------------------------------------------------------
  async getOpportunityKPIs(organizationId: string, geoLevel = 'municipality'): Promise<OpportunityKPIs> {
    const [growth, expansion] = await Promise.all([
      territorialIntelligenceEngine.detectGrowthZones(organizationId, geoLevel),
      territorialIntelligenceEngine.detectExpansionOpportunities(organizationId, geoLevel),
    ]);

    const allOpportunities = [...growth, ...expansion];
    const underserved = expansion.filter(o => o.opportunity_type === 'underserved_zone');
    const expansionZones = expansion.filter(o => o.opportunity_type === 'expansion_zone');

    const totalPotential = allOpportunities.reduce((s, o) => s + o.estimated_potential, 0);
    const avgConfidence = allOpportunities.length > 0
      ? allOpportunities.reduce((s, o) => s + o.confidence_score, 0) / allOpportunities.length
      : 0;

    const semaphoreStatus = allOpportunities.length > 5 ? 'green' : allOpportunities.length > 0 ? 'yellow' : 'red';

    return {
      growth_zones_count: growth.length,
      underserved_zones_count: underserved.length,
      expansion_zones_count: expansionZones.length,
      total_estimated_potential: Math.round(totalPotential),
      avg_confidence_score: Math.round(avgConfidence * 100) / 100,
      semaphore_status: semaphoreStatus,
    };
  }

  // -------------------------------------------------------------------------
  // Gap KPIs
  // -------------------------------------------------------------------------
  async getGapKPIs(organizationId: string, geoLevel = 'municipality'): Promise<GapKPIs> {
    const gaps = await territorialIntelligenceEngine.detectCoverageGaps(organizationId, geoLevel);

    if (gaps.length === 0) {
      return {
        total_gaps: 0,
        critical_gaps: 0,
        high_gaps: 0,
        medium_gaps: 0,
        low_gaps: 0,
        avg_gap_pct: 0,
        semaphore_status: 'green',
      };
    }

    const critical = gaps.filter(g => g.severity === 'critical').length;
    const high = gaps.filter(g => g.severity === 'high').length;
    const medium = gaps.filter(g => g.severity === 'medium').length;
    const low = gaps.filter(g => g.severity === 'low').length;
    const avgGap = gaps.reduce((s, g) => s + g.gap_pct, 0) / gaps.length;

    const semaphoreStatus = critical > 0 ? 'critical' : high > 0 ? 'red' : medium > 0 ? 'orange' : 'yellow';

    return {
      total_gaps: gaps.length,
      critical_gaps: critical,
      high_gaps: high,
      medium_gaps: medium,
      low_gaps: low,
      avg_gap_pct: Math.round(avgGap * 10) / 10,
      semaphore_status: semaphoreStatus,
    };
  }

  // -------------------------------------------------------------------------
  // Generate All Territorial KPIs
  // -------------------------------------------------------------------------
  async generateTerritorialKPIs(organizationId: string, geoLevel = 'municipality'): Promise<TerritorialKPI[]> {
    const [coverageKPIs, densityKPIs, opportunityKPIs, gapKPIs] = await Promise.all([
      this.getCoverageKPIs(organizationId, geoLevel),
      this.getDensityKPIs(organizationId, geoLevel),
      this.getOpportunityKPIs(organizationId, geoLevel),
      this.getGapKPIs(organizationId, geoLevel),
    ]);

    const kpis: TerritorialKPI[] = [
      {
        key: 'avg_coverage',
        name: 'Average Coverage',
        category: 'coverage',
        current_value: coverageKPIs.avg_coverage_pct,
        target_value: 80,
        unit: '%',
        trend: coverageKPIs.coverage_trend,
        trend_pct: null,
        semaphore_status: coverageKPIs.semaphore_status,
        priority: coverageKPIs.avg_coverage_pct < 50 ? 'high' : coverageKPIs.avg_coverage_pct < 70 ? 'medium' : 'low',
        description: 'Percentage of territorial entities visited at least once',
      },
      {
        key: 'critical_gaps',
        name: 'Critical Coverage Gaps',
        category: 'gap',
        current_value: coverageKPIs.critical_gaps_count,
        target_value: 0,
        unit: 'zones',
        trend: 'stable',
        trend_pct: null,
        semaphore_status: coverageKPIs.critical_gaps_count > 0 ? 'red' : 'green',
        priority: coverageKPIs.critical_gaps_count > 0 ? 'high' : 'low',
        description: 'Zones with less than 30% coverage requiring immediate attention',
      },
      {
        key: 'saturated_zones',
        name: 'Saturated Zones',
        category: 'density',
        current_value: densityKPIs.saturated_zones_count,
        target_value: null,
        unit: 'zones',
        trend: 'stable',
        trend_pct: null,
        semaphore_status: 'green',
        priority: 'low',
        description: 'Geographic areas with high establishment density (50+)',
      },
      {
        key: 'low_density_zones',
        name: 'Low Density Zones',
        category: 'density',
        current_value: densityKPIs.low_density_zones_count,
        target_value: null,
        unit: 'zones',
        trend: 'stable',
        trend_pct: null,
        semaphore_status: densityKPIs.low_density_zones_count > densityKPIs.saturated_zones_count ? 'yellow' : 'green',
        priority: densityKPIs.low_density_zones_count > densityKPIs.saturated_zones_count ? 'medium' : 'low',
        description: 'Geographic areas with low establishment density (<10)',
      },
      {
        key: 'growth_zones',
        name: 'Growth Zones',
        category: 'opportunity',
        current_value: opportunityKPIs.growth_zones_count,
        target_value: null,
        unit: 'zones',
        trend: 'stable',
        trend_pct: null,
        semaphore_status: opportunityKPIs.growth_zones_count > 0 ? 'green' : 'yellow',
        priority: 'medium',
        description: 'Areas showing potential for establishment growth',
      },
      {
        key: 'underserved_zones',
        name: 'Underserved Zones',
        category: 'opportunity',
        current_value: opportunityKPIs.underserved_zones_count,
        target_value: 0,
        unit: 'zones',
        trend: 'stable',
        trend_pct: null,
        semaphore_status: opportunityKPIs.underserved_zones_count > 3 ? 'orange' : opportunityKPIs.underserved_zones_count > 0 ? 'yellow' : 'green',
        priority: opportunityKPIs.underserved_zones_count > 0 ? 'high' : 'low',
        description: 'Areas with coverage below 30% needing expansion',
      },
      {
        key: 'expansion_potential',
        name: 'Expansion Potential',
        category: 'opportunity',
        current_value: opportunityKPIs.total_estimated_potential,
        target_value: null,
        unit: 'est.',
        trend: 'stable',
        trend_pct: null,
        semaphore_status: opportunityKPIs.total_estimated_potential > 100 ? 'green' : 'yellow',
        priority: 'medium',
        description: 'Total estimated new establishments possible across all opportunity zones',
      },
      {
        key: 'gap_severity',
        name: 'Gap Severity Index',
        category: 'gap',
        current_value: gapKPIs.avg_gap_pct,
        target_value: 0,
        unit: '%',
        trend: 'stable',
        trend_pct: null,
        semaphore_status: gapKPIs.semaphore_status,
        priority: gapKPIs.avg_gap_pct > 50 ? 'high' : gapKPIs.avg_gap_pct > 30 ? 'medium' : 'low',
        description: 'Average gap percentage across all detected coverage gaps',
      },
      {
        key: 'total_gaps_count',
        name: 'Total Coverage Gaps',
        category: 'gap',
        current_value: gapKPIs.total_gaps,
        target_value: 0,
        unit: 'gaps',
        trend: 'stable',
        trend_pct: null,
        semaphore_status: gapKPIs.total_gaps > 5 ? 'red' : gapKPIs.total_gaps > 0 ? 'yellow' : 'green',
        priority: gapKPIs.total_gaps > 5 ? 'high' : gapKPIs.total_gaps > 0 ? 'medium' : 'low',
        description: 'Total number of geographic areas with coverage gaps',
      },
    ];

    return kpis;
  }

  // -------------------------------------------------------------------------
  // Executive Summary
  // -------------------------------------------------------------------------
  async getExecutiveSummary(organizationId: string, geoLevel = 'municipality'): Promise<ExecutiveSummary> {
    const [coverageKPIs, densityKPIs, opportunityKPIs, gapKPIs, kpis] = await Promise.all([
      this.getCoverageKPIs(organizationId, geoLevel),
      this.getDensityKPIs(organizationId, geoLevel),
      this.getOpportunityKPIs(organizationId, geoLevel),
      this.getGapKPIs(organizationId, geoLevel),
      this.generateTerritorialKPIs(organizationId, geoLevel),
    ]);

    const coverageScore = coverageKPIs.avg_coverage_pct;
    const densityScore = densityKPIs.saturated_zones_count > 0
      ? (densityKPIs.saturated_zones_count / (densityKPIs.saturated_zones_count + densityKPIs.low_density_zones_count)) * 100
      : 50;
    const opportunityScore = opportunityKPIs.total_estimated_potential > 0 ? Math.min(100, opportunityKPIs.total_estimated_potential / 10) : 0;
    const gapScore = gapKPIs.total_gaps > 0 ? Math.max(0, 100 - gapKPIs.avg_gap_pct) : 100;

    const overallStatus = worstStatus([
      coverageKPIs.semaphore_status,
      densityKPIs.semaphore_status,
      opportunityKPIs.semaphore_status,
      gapKPIs.semaphore_status,
    ]);

    return {
      overall_status: overallStatus,
      coverage_score: Math.round(coverageScore),
      density_score: Math.round(densityScore),
      opportunity_score: Math.round(opportunityScore),
      gap_score: Math.round(gapScore),
      total_entities: coverageKPIs.total_entities,
      total_visited: coverageKPIs.visited_entities,
      total_opportunities: opportunityKPIs.growth_zones_count + opportunityKPIs.underserved_zones_count + opportunityKPIs.expansion_zones_count,
      critical_issues: gapKPIs.critical_gaps + gapKPIs.high_gaps,
      kpi_summary: kpis,
    };
  }

  // -------------------------------------------------------------------------
  // Historical Trend (placeholder - uses coverage metrics)
  // -------------------------------------------------------------------------
  async getHistoricalTrends(organizationId: string): Promise<{
    period: string;
    coverage_pct: number;
    visited_count: number;
    opportunity_count: number;
  }[]> {
    const { data, error } = await supabase
      .from('territorial_coverage_metrics')
      .select('created_at, coverage_pct, visited_establishments')
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: true })
      .limit(24);

    if (error || !data) return [];

    return data.map(row => ({
      period: row.created_at?.slice(0, 10) ?? '',
      coverage_pct: row.coverage_pct ?? 0,
      visited_count: row.visited_establishments ?? 0,
      opportunity_count: 0,
    }));
  }

  // -------------------------------------------------------------------------
  // Helpers
  // -------------------------------------------------------------------------
  private evaluateCoverageStatus(coveragePct: number): SemaphoreStatus {
    if (coveragePct >= 80) return 'green';
    if (coveragePct >= 60) return 'yellow';
    if (coveragePct >= 40) return 'orange';
    if (coveragePct >= 20) return 'red';
    return 'critical';
  }
}

export const territorialIndicatorEngine = new TerritorialIndicatorEngine();

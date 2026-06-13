import { supabase } from '../lib/supabase';
import type {
  TerritorialCoverageMetric,
  TerritorialDensityMetric,
  TerritorialOpportunityMetric,
  TerritorialGapAnalysis,
  TerritorialDensityClass,
  TerritorialGapSeverity,
} from '../types';

// ---------------------------------------------------------------------------
// Aggregation result types
// ---------------------------------------------------------------------------
export interface CoverageResult {
  geo_level: string;
  geo_name: string;
  total_establishments: number;
  active_establishments: number;
  assigned_establishments: number;
  visited_establishments: number;
  coverage_pct: number;
}

export interface DensityResult {
  geo_level: string;
  geo_name: string;
  establishment_count: number;
  area_km2: number | null;
  density_per_km2: number | null;
  density_class: TerritorialDensityClass;
}

export interface OpportunityResult {
  geo_level: string;
  geo_name: string;
  opportunity_type: 'growth_zone' | 'underserved_zone' | 'expansion_zone';
  current_establishments: number;
  estimated_potential: number;
  confidence_score: number;
  evidence: Record<string, unknown>;
}

export interface GapResult {
  geo_level: string;
  geo_name: string;
  gap_type: 'coverage_gap' | 'density_gap' | 'assignment_gap' | 'visit_gap';
  current_value: number;
  expected_value: number;
  gap_pct: number;
  severity: TerritorialGapSeverity;
}

// ---------------------------------------------------------------------------
// Main service
// ---------------------------------------------------------------------------
export class TerritorialIntelligenceEngine {

  // -----------------------------------------------------------------------
  // Coverage calculations
  // -----------------------------------------------------------------------
  async calculateCoverage(organizationId: string, geoLevel: string): Promise<CoverageResult[]> {
    const { data: entities, error } = await supabase
      .from('territorial_entities')
      .select('id, is_active, location:territorial_locations(province, municipality, district)')
      .eq('organization_id', organizationId);
    if (error) throw error;

    const geoField = this.geoLevelField(geoLevel);
    const grouped: Record<string, { total: number; active: number; assigned: number; visited: number }> = {};

    for (const entity of entities ?? []) {
      const loc = (entity as Record<string, unknown>).location as Record<string, unknown> | null;
      const geoName = loc ? (loc[geoField] as string) ?? 'Unknown' : 'Unknown';
      if (!grouped[geoName]) grouped[geoName] = { total: 0, active: 0, assigned: 0, visited: 0 };
      grouped[geoName].total++;
      if (entity.is_active) grouped[geoName].active++;
    }

    const { data: assignments } = await supabase
      .from('territorial_assignments')
      .select('entity_id')
      .eq('organization_id', organizationId)
      .eq('is_active', true);

    const assignedIds = new Set((assignments ?? []).map(a => a.entity_id));

    const { data: visits } = await supabase
      .from('territorial_visit_history')
      .select('entity_id')
      .eq('organization_id', organizationId);

    const visitedIds = new Set((visits ?? []).map(v => v.entity_id));

    const results: CoverageResult[] = [];
    for (const entity of entities ?? []) {
      const loc = (entity as Record<string, unknown>).location as Record<string, unknown> | null;
      const geoName = loc ? (loc[geoField] as string) ?? 'Unknown' : 'Unknown';
      if (assignedIds.has(entity.id)) grouped[geoName].assigned++;
      if (visitedIds.has(entity.id)) grouped[geoName].visited++;
    }

    for (const [geoName, counts] of Object.entries(grouped)) {
      results.push({
        geo_level: geoLevel,
        geo_name: geoName,
        total_establishments: counts.total,
        active_establishments: counts.active,
        assigned_establishments: counts.assigned,
        visited_establishments: counts.visited,
        coverage_pct: counts.total > 0 ? Math.round((counts.visited / counts.total) * 10000) / 100 : 0,
      });
    }

    return results.sort((a, b) => b.total_establishments - a.total_establishments);
  }

  // -----------------------------------------------------------------------
  // Density calculations
  // -----------------------------------------------------------------------
  async calculateDensity(organizationId: string, geoLevel: string): Promise<DensityResult[]> {
    const coverage = await this.calculateCoverage(organizationId, geoLevel);

    const results: DensityResult[] = coverage.map(c => {
      const densityClass = this.classifyDensity(c.active_establishments);
      return {
        geo_level: c.geo_level,
        geo_name: c.geo_name,
        establishment_count: c.active_establishments,
        area_km2: null,
        density_per_km2: null,
        density_class: densityClass,
      };
    });

    return results;
  }

  // -----------------------------------------------------------------------
  // Coverage gap detection
  // -----------------------------------------------------------------------
  async detectCoverageGaps(organizationId: string, geoLevel: string): Promise<GapResult[]> {
    const coverage = await this.calculateCoverage(organizationId, geoLevel);
    const gaps: GapResult[] = [];

    for (const c of coverage) {
      if (c.coverage_pct < 80) {
        gaps.push({
          geo_level: c.geo_level,
          geo_name: c.geo_name,
          gap_type: 'coverage_gap',
          current_value: c.visited_establishments,
          expected_value: c.total_establishments,
          gap_pct: Math.round((100 - c.coverage_pct) * 100) / 100,
          severity: c.coverage_pct < 30 ? 'critical' : c.coverage_pct < 50 ? 'high' : c.coverage_pct < 70 ? 'medium' : 'low',
        });
      }
    }

    return gaps.sort((a, b) => b.gap_pct - a.gap_pct);
  }

  // -----------------------------------------------------------------------
  // Saturation zone detection
  // -----------------------------------------------------------------------
  async detectSaturationZones(organizationId: string, geoLevel: string): Promise<DensityResult[]> {
    const density = await this.calculateDensity(organizationId, geoLevel);
    return density.filter(d => d.density_class === 'saturated');
  }

  // -----------------------------------------------------------------------
  // Growth zone detection
  // -----------------------------------------------------------------------
  async detectGrowthZones(organizationId: string, geoLevel: string): Promise<OpportunityResult[]> {
    const coverage = await this.calculateCoverage(organizationId, geoLevel);
    const density = await this.calculateDensity(organizationId, geoLevel);

    const densityMap = new Map(density.map(d => [d.geo_name, d]));
    const opportunities: OpportunityResult[] = [];

    for (const c of coverage) {
      const d = densityMap.get(c.geo_name);
      const densityClass = d?.density_class ?? 'low';

      if (densityClass === 'low' && c.active_establishments >= 1 && c.coverage_pct > 40) {
        opportunities.push({
          geo_level: c.geo_level,
          geo_name: c.geo_name,
          opportunity_type: 'growth_zone',
          current_establishments: c.active_establishments,
          estimated_potential: Math.round(c.active_establishments * 2.5 * 100) / 100,
          confidence_score: 0.6,
          evidence: { active_count: c.active_establishments, coverage_pct: c.coverage_pct, density_class: densityClass },
        });
      }
    }

    return opportunities;
  }

  // -----------------------------------------------------------------------
  // Expansion opportunity detection
  // -----------------------------------------------------------------------
  async detectExpansionOpportunities(organizationId: string, geoLevel: string): Promise<OpportunityResult[]> {
    const coverage = await this.calculateCoverage(organizationId, geoLevel);
    const density = await this.calculateDensity(organizationId, geoLevel);
    const densityMap = new Map(density.map(d => [d.geo_name, d]));

    const opportunities: OpportunityResult[] = [];

    for (const c of coverage) {
      const d = densityMap.get(c.geo_name);
      const densityClass = d?.density_class ?? 'low';

      if (c.coverage_pct < 30 && c.active_establishments > 0) {
        opportunities.push({
          geo_level: c.geo_level,
          geo_name: c.geo_name,
          opportunity_type: 'underserved_zone',
          current_establishments: c.active_establishments,
          estimated_potential: Math.round(c.total_establishments * 1.8 * 100) / 100,
          confidence_score: 0.75,
          evidence: { total: c.total_establishments, visited: c.visited_establishments, coverage_pct: c.coverage_pct },
        });
      }

      if (densityClass === 'low' && c.coverage_pct >= 50) {
        opportunities.push({
          geo_level: c.geo_level,
          geo_name: c.geo_name,
          opportunity_type: 'expansion_zone',
          current_establishments: c.active_establishments,
          estimated_potential: Math.round(c.active_establishments * 3 * 100) / 100,
          confidence_score: 0.65,
          evidence: { density_class: densityClass, active_count: c.active_establishments, coverage_pct: c.coverage_pct },
        });
      }
    }

    return opportunities;
  }

  // -----------------------------------------------------------------------
  // Municipality metrics
  // -----------------------------------------------------------------------
  async generateMunicipalityMetrics(organizationId: string): Promise<{
    coverage: CoverageResult[];
    density: DensityResult[];
    gaps: GapResult[];
  }> {
    const [coverage, density, gaps] = await Promise.all([
      this.calculateCoverage(organizationId, 'municipality'),
      this.calculateDensity(organizationId, 'municipality'),
      this.detectCoverageGaps(organizationId, 'municipality'),
    ]);
    return { coverage, density, gaps };
  }

  // -----------------------------------------------------------------------
  // Province metrics
  // -----------------------------------------------------------------------
  async generateProvinceMetrics(organizationId: string): Promise<{
    coverage: CoverageResult[];
    density: DensityResult[];
    gaps: GapResult[];
  }> {
    const [coverage, density, gaps] = await Promise.all([
      this.calculateCoverage(organizationId, 'province'),
      this.calculateDensity(organizationId, 'province'),
      this.detectCoverageGaps(organizationId, 'province'),
    ]);
    return { coverage, density, gaps };
  }

  // -----------------------------------------------------------------------
  // Corridor metrics
  // -----------------------------------------------------------------------
  async generateCorridorMetrics(organizationId: string): Promise<{
    density: DensityResult[];
    opportunities: OpportunityResult[];
  }> {
    const { data: memberships } = await supabase
      .from('territorial_corridor_memberships')
      .select('corridor_id, entity_id')
      .eq('organization_id', organizationId);

    const corridorMap: Record<string, number> = {};
    for (const m of memberships ?? []) {
      corridorMap[m.corridor_id] = (corridorMap[m.corridor_id] ?? 0) + 1;
    }

    const density: DensityResult[] = Object.entries(corridorMap).map(([corridorId, count]) => ({
      geo_level: 'corridor',
      geo_name: corridorId,
      establishment_count: count,
      area_km2: null,
      density_per_km2: null,
      density_class: this.classifyDensity(count),
    }));

    const opportunities: OpportunityResult[] = density
      .filter(d => d.density_class === 'low')
      .map(d => ({
        geo_level: 'corridor',
        geo_name: d.geo_name,
        opportunity_type: 'expansion_zone' as const,
        current_establishments: d.establishment_count,
        estimated_potential: Math.round(d.establishment_count * 3 * 100) / 100,
        confidence_score: 0.6,
        evidence: { density_class: d.density_class },
      }));

    return { density, opportunities };
  }

  // -----------------------------------------------------------------------
  // Persist metrics
  // -----------------------------------------------------------------------
  async saveCoverageMetrics(organizationId: string, results: CoverageResult[]): Promise<void> {
    if (results.length === 0) return;
    const rows = results.map(r => ({
      organization_id: organizationId,
      geo_level: r.geo_level,
      geo_name: r.geo_name,
      total_establishments: r.total_establishments,
      active_establishments: r.active_establishments,
      assigned_establishments: r.assigned_establishments,
      visited_establishments: r.visited_establishments,
      coverage_pct: r.coverage_pct,
    }));
    const { error } = await supabase.from('territorial_coverage_metrics').upsert(rows, { onConflict: 'organization_id,geo_level,geo_name' });
    if (error) throw error;
  }

  async saveDensityMetrics(organizationId: string, results: DensityResult[]): Promise<void> {
    if (results.length === 0) return;
    const rows = results.map(r => ({
      organization_id: organizationId,
      geo_level: r.geo_level,
      geo_name: r.geo_name,
      establishment_count: r.establishment_count,
      area_km2: r.area_km2,
      density_per_km2: r.density_per_km2,
      density_class: r.density_class,
    }));
    const { error } = await supabase.from('territorial_density_metrics').upsert(rows, { onConflict: 'organization_id,geo_level,geo_name' });
    if (error) throw error;
  }

  async saveOpportunityMetrics(organizationId: string, results: OpportunityResult[]): Promise<void> {
    if (results.length === 0) return;
    const rows = results.map(r => ({
      organization_id: organizationId,
      geo_level: r.geo_level,
      geo_name: r.geo_name,
      opportunity_type: r.opportunity_type,
      current_establishments: r.current_establishments,
      estimated_potential: r.estimated_potential,
      confidence_score: r.confidence_score,
      evidence: r.evidence,
    }));
    const { error } = await supabase.from('territorial_opportunity_metrics').insert(rows);
    if (error) throw error;
  }

  async saveGapAnalysis(organizationId: string, results: GapResult[]): Promise<void> {
    if (results.length === 0) return;
    const rows = results.map(r => ({
      organization_id: organizationId,
      geo_level: r.geo_level,
      geo_name: r.geo_name,
      gap_type: r.gap_type,
      current_value: r.current_value,
      expected_value: r.expected_value,
      gap_pct: r.gap_pct,
      severity: r.severity,
    }));
    const { error } = await supabase.from('territorial_gap_analysis').insert(rows);
    if (error) throw error;
  }

  // -----------------------------------------------------------------------
  // Load persisted metrics
  // -----------------------------------------------------------------------
  async getCoverageMetrics(organizationId: string, geoLevel?: string): Promise<TerritorialCoverageMetric[]> {
    let query = supabase.from('territorial_coverage_metrics').select('*').eq('organization_id', organizationId).order('coverage_pct', { ascending: true });
    if (geoLevel) query = query.eq('geo_level', geoLevel);
    const { data, error } = await query;
    if (error) throw error;
    return (data ?? []) as TerritorialCoverageMetric[];
  }

  async getDensityMetrics(organizationId: string, geoLevel?: string): Promise<TerritorialDensityMetric[]> {
    let query = supabase.from('territorial_density_metrics').select('*').eq('organization_id', organizationId).order('establishment_count', { ascending: false });
    if (geoLevel) query = query.eq('geo_level', geoLevel);
    const { data, error } = await query;
    if (error) throw error;
    return (data ?? []) as TerritorialDensityMetric[];
  }

  async getOpportunityMetrics(organizationId: string): Promise<TerritorialOpportunityMetric[]> {
    const { data, error } = await supabase.from('territorial_opportunity_metrics').select('*').eq('organization_id', organizationId).order('estimated_potential', { ascending: false });
    if (error) throw error;
    return (data ?? []) as TerritorialOpportunityMetric[];
  }

  async getGapAnalysis(organizationId: string): Promise<TerritorialGapAnalysis[]> {
    const { data, error } = await supabase.from('territorial_gap_analysis').select('*').eq('organization_id', organizationId).order('gap_pct', { ascending: false });
    if (error) throw error;
    return (data ?? []) as TerritorialGapAnalysis[];
  }

  // -----------------------------------------------------------------------
  // Helpers
  // -----------------------------------------------------------------------
  private geoLevelField(level: string): string {
    switch (level) {
      case 'province': return 'province';
      case 'municipality': return 'municipality';
      case 'district': return 'district';
      default: return 'province';
    }
  }

  private classifyDensity(count: number): TerritorialDensityClass {
    if (count >= 50) return 'saturated';
    if (count >= 10) return 'normal';
    return 'low';
  }
}

export const territorialIntelligenceEngine = new TerritorialIntelligenceEngine();

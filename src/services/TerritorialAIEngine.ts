import { supabase } from '../lib/supabase';
import { territorialAtlasEngine, type AtlasGeneratedProduct, type AtlasType } from './TerritorialAtlasEngine';
import { territorialIndicatorEngine, type ExecutiveSummary, type TerritorialKPI, type CoverageKPIs, type DensityKPIs, type OpportunityKPIs, type GapKPIs } from './TerritorialIndicatorEngine';
import { territorialAlertEngine, type TerritorialAlert, type TerritorialAlertMetrics } from './TerritorialAlertEngine';
import { territorialTabulationEngine, type RiskLevel, type VulnerabilityLevel, type PriorityLevel, type TabulationReport } from './TerritorialTabulationEngine';
import { territorialIntelligenceEngine, type CoverageResult, type DensityResult, type OpportunityResult, type GapResult } from './TerritorialIntelligenceEngine';
import { territorialExecutiveReportingEngine, type ExecutiveReport, type ExecutiveRecommendation } from './TerritorialExecutiveReportingEngine';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
export type PredictionHorizon = '7d' | '30d' | '90d' | '180d';
export type ForecastType = 'risk' | 'vulnerability' | 'growth' | 'coverage' | 'opportunity';

export interface ExpansionRecommendation {
  id: string;
  zone: string;
  type: 'high_potential' | 'adjacent' | 'greenfield' | 'underserved';
  confidence: number;
  estimated_value: number;
  timeline: string;
  rationale: string;
  prerequisites: string[];
  risk_factors: string[];
}

export interface CommercialOpportunity {
  id: string;
  zone: string;
  opportunity_type: 'market_expansion' | 'density_optimization' | 'route_efficiency' | 'service_gap';
  potential_revenue_impact: number;
  confidence_score: number;
  market_indicators: Record<string, number>;
  competition_level: 'low' | 'medium' | 'high';
  entry_barriers: string[];
  recommended_strategy: string;
}

export interface HumanitarianOpportunity {
  id: string;
  zone: string;
  vulnerability_score: number;
  urgency_level: 'critical' | 'high' | 'medium' | 'low';
  affected_population_estimate: number;
  service_gaps: string[];
  recommended_interventions: string[];
  coordination_requirements: string[];
  access_constraints: string[];
}

export interface CoverageOptimization {
  zone: string;
  current_coverage: number;
  optimized_coverage: number;
  resource_requirement: number;
  efficiency_gain: number;
  recommended_actions: string[];
  priority: 'critical' | 'high' | 'medium' | 'low';
}

export interface RouteOptimizationSuggestion {
  route_id: string;
  route_name: string;
  current_efficiency: number;
  optimized_efficiency: number;
  estimated_time_savings: number;
  recommended_modifications: string[];
  affected_entities: string[];
  implementation_complexity: 'low' | 'medium' | 'high';
}

export interface PriorityIntervention {
  id: string;
  zone: string;
  intervention_type: 'coverage_gap' | 'humanitarian' | 'operational' | 'strategic';
  urgency_score: number;
  impact_score: number;
  recommended_actions: string[];
  resource_allocation: {
    field_agents: number;
    vehicles: number;
    budget_estimate: number;
  };
  timeline: string;
  success_metrics: string[];
}

export interface TerritorialRiskForecast {
  horizon: PredictionHorizon;
  generated_at: string;
  forecasts: Array<{
    zone: string;
    current_risk: RiskLevel;
    predicted_risk: RiskLevel;
    risk_probability: number;
    contributing_factors: string[];
    mitigation_recommendations: string[];
  }>;
  overall_trend: 'improving' | 'stable' | 'declining';
  confidence: number;
}

export interface VulnerabilityForecast {
  horizon: PredictionHorizon;
  generated_at: string;
  forecasts: Array<{
    zone: string;
    current_vulnerability: VulnerabilityLevel;
    predicted_vulnerability: VulnerabilityLevel;
    change_probability: number;
    vulnerability_drivers: string[];
    intervention_window: string;
  }>;
  humanitarian_trend: 'improving' | 'stable' | 'worsening';
}

export interface GrowthZoneForecast {
  horizon: PredictionHorizon;
  generated_at: string;
  forecasts: Array<{
    zone: string;
    growth_potential: number;
    growth_probability: number;
    estimated_new_entities: number;
    growth_drivers: string[];
    recommended_timing: string;
  }>;
  total_growth_potential: number;
  recommended_investment_zones: string[];
}

export interface StrategicRecommendation {
  id: string;
  category: 'expansion' | 'optimization' | 'humanitarian' | 'commercial' | 'consolidation';
  title: string;
  description: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  impact_areas: string[];
  estimated_value: number;
  confidence: number;
  implementation_steps: string[];
  timeline: string;
  dependencies: string[];
  risks: string[];
  success_indicators: string[];
}

export interface AIPredictionEngineOutput {
  generated_at: string;
  organization_id: string;

  // Predictions
  expansion_recommendations: ExpansionRecommendation[];
  commercial_opportunities: CommercialOpportunity[];
  humanitarian_opportunities: HumanitarianOpportunity[];
  coverage_optimizations: CoverageOptimization[];
  route_optimizations: RouteOptimizationSuggestion[];
  priority_interventions: PriorityIntervention[];

  // Forecasts
  risk_forecast: TerritorialRiskForecast | null;
  vulnerability_forecast: VulnerabilityForecast | null;
  growth_forecast: GrowthZoneForecast | null;

  // Strategic Recommendations
  strategic_recommendations: StrategicRecommendation[];

  // Metadata
  data_sources: string[];
  confidence_level: number;
  prediction_horizon: PredictionHorizon;
}

// ---------------------------------------------------------------------------
// Main Engine
// ---------------------------------------------------------------------------
export class TerritorialAIEngine {

  // -------------------------------------------------------------------------
  // Generate Full AI Analysis
  // -------------------------------------------------------------------------
  async generateAnalysis(
    organizationId: string,
    horizon: PredictionHorizon = '30d'
  ): Promise<AIPredictionEngineOutput> {
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
      activeAlerts,
      executiveReports,
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
      territorialAlertEngine.getActiveAlerts(organizationId),
      territorialExecutiveReportingEngine.getReports(organizationId, 5),
    ]);

    // Generate recommendations
    const expansionRecommendations = this.generateExpansionRecommendations(coverage, density, opportunities, gaps);
    const commercialOpportunities = this.generateCommercialOpportunities(coverage, density, opportunities, gaps);
    const humanitarianOpportunities = this.generateHumanitarianOpportunities(gaps, alertMetrics, vulnerabilityMatrix);
    const coverageOptimizations = this.generateCoverageOptimizations(coverage, gaps, territorialKPIs);
    const routeOptimizations = await this.generateRouteOptimizations(organizationId);
    const priorityInterventions = this.generatePriorityInterventions(gaps, activeAlerts, vulnerabilityMatrix, priorityMatrix);

    // Generate forecasts
    const riskForecast = this.generateRiskForecast(horizon, riskMatrix, alertMetrics, gaps, coverage);
    const vulnerabilityForecast = this.generateVulnerabilityForecast(horizon, vulnerabilityMatrix, gaps, alertMetrics);
    const growthForecast = this.generateGrowthForecast(horizon, coverage, density, opportunities);

    // Generate strategic recommendations (consolidated AI output)
    const strategicRecommendations = this.generateStrategicRecommendations(
      expansionRecommendations,
      commercialOpportunities,
      humanitarianOpportunities,
      coverageOptimizations,
      riskForecast
    );

    return {
      generated_at: new Date().toISOString(),
      organization_id: organizationId,
      expansion_recommendations: expansionRecommendations,
      commercial_opportunities: commercialOpportunities,
      humanitarian_opportunities: humanitarianOpportunities,
      coverage_optimizations: coverageOptimizations,
      route_optimizations: routeOptimizations,
      priority_interventions: priorityInterventions,
      risk_forecast: riskForecast,
      vulnerability_forecast: vulnerabilityForecast,
      growth_forecast: growthForecast,
      strategic_recommendations: strategicRecommendations,
      data_sources: [
        'TerritorialAtlasEngine',
        'TerritorialIndicatorEngine',
        'TerritorialAlertEngine',
        'TerritorialTabulationEngine',
        'TerritorialIntelligenceEngine',
        'TerritorialExecutiveReportingEngine',
      ],
      confidence_level: this.calculateConfidenceLevel(coverage, gaps, alertMetrics),
      prediction_horizon: horizon,
    };
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
        total_active: 0, critical_count: 0, high_count: 0, medium_count: 0, low_count: 0,
        by_type: {} as Record<string, number>, by_geo_level: {}, avg_resolution_hours: null,
        alerts_last_24h: 0, trend_7d: [],
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

  // -------------------------------------------------------------------------
  // Expansion Recommendations
  // -------------------------------------------------------------------------
  private generateExpansionRecommendations(
    coverage: CoverageResult[],
    density: DensityResult[],
    opportunities: OpportunityResult[],
    gaps: GapResult[]
  ): ExpansionRecommendation[] {
    const recommendations: ExpansionRecommendation[] = [];

    // High potential zones: good coverage + low density = room for growth
    const highPotential = coverage.filter(c => {
      const d = density.find(d => d.geo_name === c.geo_name);
      return c.coverage_pct >= 50 && d?.density_class === 'low';
    });

    for (const zone of highPotential.slice(0, 10)) {
      recommendations.push({
        id: crypto.randomUUID(),
        zone: zone.geo_name,
        type: 'high_potential',
        confidence: 0.75 + (zone.coverage_pct / 400),
        estimated_value: Math.round(zone.total_establishments * 2.5),
        timeline: '3-6 months',
        rationale: `Zone shows ${zone.coverage_pct.toFixed(0)}% coverage with low density, indicating market maturity with expansion room.`,
        prerequisites: ['Market survey', 'Resource allocation', 'Route planning'],
        risk_factors: ['Competition entry', 'Market saturation risk'],
      });
    }

    // Underserved zones: low coverage + presence = priority expansion
    const underserved = coverage.filter(c => c.coverage_pct < 30 && c.active_establishments >= 3);
    for (const zone of underserved.slice(0, 5)) {
      recommendations.push({
        id: crypto.randomUUID(),
        zone: zone.geo_name,
        type: 'underserved',
        confidence: 0.85,
        estimated_value: Math.round(zone.total_establishments * 3),
        timeline: '1-3 months',
        rationale: `Zone has only ${zone.coverage_pct.toFixed(0)}% coverage with ${zone.active_establishments} active establishments - immediate opportunity.`,
        prerequisites: ['Resource prioritization', 'Accessibility assessment'],
        risk_factors: ['Access constraints', 'Security considerations'],
      });
    }

    // Adjacent zones: near saturated zones = spillover potential
    const saturated = density.filter(d => d.density_class === 'saturated');
    for (const sat of saturated.slice(0, 5)) {
      const adjacentLow = density.filter(d =>
        d.density_class === 'low' &&
        d.geo_name !== sat.geo_name
      ).slice(0, 2);

      for (const adj of adjacentLow) {
        recommendations.push({
          id: crypto.randomUUID(),
          zone: adj.geo_name,
          type: 'adjacent',
          confidence: 0.70,
          estimated_value: Math.round(sat.establishment_count * 0.5),
          timeline: '6-12 months',
          rationale: `Spillover opportunity from saturated zone ${sat.geo_name}.`,
          prerequisites: ['Corridor planning', 'Market connectivity analysis'],
          risk_factors: ['Market timing', 'Resource competition'],
        });
      }
    }

    return recommendations;
  }

  // -------------------------------------------------------------------------
  // Commercial Opportunities
  // -------------------------------------------------------------------------
  private generateCommercialOpportunities(
    coverage: CoverageResult[],
    density: DensityResult[],
    opportunities: OpportunityResult[],
    gaps: GapResult[]
  ): CommercialOpportunity[] {
    const commercial: CommercialOpportunity[] = [];

    // Market expansion opportunities
    const expansionZones = opportunities.filter(o => o.opportunity_type === 'expansion_zone');
    for (const zone of expansionZones.slice(0, 8)) {
      commercial.push({
        id: crypto.randomUUID(),
        zone: zone.geo_name,
        opportunity_type: 'market_expansion',
        potential_revenue_impact: zone.estimated_potential * 1000,
        confidence_score: zone.confidence_score,
        market_indicators: {
          current_establishments: zone.current_establishments,
          growth_potential: zone.estimated_potential,
        },
        competition_level: 'low',
        entry_barriers: ['Initial market entry cost', 'Brand establishment'],
        recommended_strategy: 'Phased market entry with pilot program',
      });
    }

    // Density optimization opportunities
    const saturated = density.filter(d => d.density_class === 'saturated');
    for (const zone of saturated.slice(0, 5)) {
      commercial.push({
        id: crypto.randomUUID(),
        zone: zone.geo_name,
        opportunity_type: 'density_optimization',
        potential_revenue_impact: zone.establishment_count * 500,
        confidence_score: 0.80,
        market_indicators: {
          establishment_count: zone.establishment_count,
          density_per_km2: zone.density_per_km2 ?? 0,
        },
        competition_level: 'high',
        entry_barriers: ['Market saturation', 'Customer switching costs'],
        recommended_strategy: 'Service differentiation and value addition',
      });
    }

    // Service gap opportunities
    const criticalGaps = gaps.filter(g => g.severity === 'critical');
    for (const gap of criticalGaps.slice(0, 5)) {
      commercial.push({
        id: crypto.randomUUID(),
        zone: gap.geo_name,
        opportunity_type: 'service_gap',
        potential_revenue_impact: (gap.expected_value - gap.current_value) * 800,
        confidence_score: 0.75,
        market_indicators: {
          gap_pct: gap.gap_pct,
          unmet_demand: gap.expected_value - gap.current_value,
        },
        competition_level: 'low',
        entry_barriers: ['Infrastructure requirements', 'Service establishment'],
        recommended_strategy: 'Rapid deployment to capture unmet demand',
      });
    }

    return commercial;
  }

  // -------------------------------------------------------------------------
  // Humanitarian Opportunities
  // -------------------------------------------------------------------------
  private generateHumanitarianOpportunities(
    gaps: GapResult[],
    alertMetrics: TerritorialAlertMetrics,
    vulnerabilityMatrix: { matrix: Record<VulnerabilityLevel, number>; by_entity: Array<{ entity_id: string; vulnerability_level: VulnerabilityLevel; score: number }> }
  ): HumanitarianOpportunity[] {
    const humanitarian: HumanitarianOpportunity[] = [];

    // Critical gaps are humanitarian priorities
    const criticalGaps = gaps.filter(g => g.severity === 'critical');
    for (const gap of criticalGaps) {
      const vulnerabilityLevel = vulnerabilityMatrix.by_entity.find(e => e.entity_id === gap.geo_name)?.vulnerability_level ?? 'medium';

      humanitarian.push({
        id: crypto.randomUUID(),
        zone: gap.geo_name,
        vulnerability_score: gap.gap_pct,
        urgency_level: gap.severity === 'critical' ? 'critical' : 'high',
        affected_population_estimate: Math.round(gap.expected_value * 50),
        service_gaps: ['Primary service delivery', 'Access to resources', 'Coverage intervention'],
        recommended_interventions: [
          'Immediate resource deployment',
          'Emergency service establishment',
          'Community engagement program',
          'Monitoring framework setup',
        ],
        coordination_requirements: ['Local authorities', 'Community leaders', 'Humanitarian partners'],
        access_constraints: ['Geographic accessibility', 'Security conditions'],
      });
    }

    // High vulnerability zones
    const highVulnerability = vulnerabilityMatrix.by_entity.filter(e => e.vulnerability_level === 'high');
    for (const vuln of highVulnerability.slice(0, 5)) {
      if (!humanitarian.find(h => h.zone === vuln.entity_id)) {
        humanitarian.push({
          id: crypto.randomUUID(),
          zone: vuln.entity_id,
          vulnerability_score: vuln.score,
          urgency_level: 'high',
          affected_population_estimate: Math.round(vuln.score * 10),
          service_gaps: ['Service coverage insufficiency', 'Access limitations'],
          recommended_interventions: [
            'Vulnerability assessment',
            'Targeted service delivery',
            'Community support program',
          ],
          coordination_requirements: ['Local coordination', 'Resource allocation'],
          access_constraints: ['Needs assessment required'],
        });
      }
    }

    return humanitarian;
  }

  // -------------------------------------------------------------------------
  // Coverage Optimizations
  // -------------------------------------------------------------------------
  private generateCoverageOptimizations(
    coverage: CoverageResult[],
    gaps: GapResult[],
    kpis: TerritorialKPI[]
  ): CoverageOptimization[] {
    const optimizations: CoverageOptimization[] = [];

    for (const gap of gaps.slice(0, 15)) {
      const cov = coverage.find(c => c.geo_name === gap.geo_name);
      if (!cov) continue;

      const currentCoverage = cov.coverage_pct;
      const optimizedCoverage = Math.min(100, currentCoverage + (gap.gap_pct * 0.6));
      const efficiencyGain = optimizedCoverage - currentCoverage;

      optimizations.push({
        zone: gap.geo_name,
        current_coverage: currentCoverage,
        optimized_coverage: optimizedCoverage,
        resource_requirement: Math.ceil(gap.gap_pct / 20),
        efficiency_gain: efficiencyGain,
        recommended_actions: [
          'Prioritize visit scheduling',
          'Allocate additional field resources',
          'Optimize route frequency',
          'Implement targeted outreach',
        ],
        priority: gap.severity === 'critical' ? 'critical' : gap.severity === 'high' ? 'high' : 'medium',
      });
    }

    return optimizations.sort((a, b) => b.efficiency_gain - a.efficiency_gain);
  }

  // -------------------------------------------------------------------------
  // Route Optimizations
  // -------------------------------------------------------------------------
  private async generateRouteOptimizations(organizationId: string): Promise<RouteOptimizationSuggestion[]> {
    try {
      const { data: routes } = await supabase
        .from('routes')
        .select('id, name, status, completion_percentage, assigned_to')
        .eq('organization_id', organizationId)
        .in('status', ['active', 'pending', 'in_progress']);

      const optimizations: RouteOptimizationSuggestion[] = [];

      for (const route of (routes ?? []).slice(0, 10)) {
        const currentEfficiency = (route.completion_percentage ?? 50) / 100;
        const optimizedEfficiency = Math.min(1, currentEfficiency + 0.15);

        optimizations.push({
          route_id: route.id,
          route_name: route.name,
          current_efficiency: currentEfficiency,
          optimized_efficiency: optimizedEfficiency,
          estimated_time_savings: Math.round((optimizedEfficiency - currentEfficiency) * 8 * 60),
          recommended_modifications: [
            'Sequence optimization',
            'Time window adjustment',
            'Resource balancing',
          ],
          affected_entities: [],
          implementation_complexity: currentEfficiency < 0.5 ? 'low' : 'medium',
        });
      }

      return optimizations;
    } catch {
      return [];
    }
  }

  // -------------------------------------------------------------------------
  // Priority Interventions
  // -------------------------------------------------------------------------
  private generatePriorityInterventions(
    gaps: GapResult[],
    alerts: TerritorialAlert[],
    vulnerabilityMatrix: { matrix: Record<VulnerabilityLevel, number>; by_entity: Array<{ entity_id: string; vulnerability_level: VulnerabilityLevel; score: number }> },
    priorityMatrix: { matrix: Record<PriorityLevel, number>; by_entity: Array<{ entity_id: string; priority_level: PriorityLevel; score: number }> }
  ): PriorityIntervention[] {
    const interventions: PriorityIntervention[] = [];

    // Critical gaps require immediate intervention
    const criticalGaps = gaps.filter(g => g.severity === 'critical');
    for (const gap of criticalGaps.slice(0, 10)) {
      interventions.push({
        id: crypto.randomUUID(),
        zone: gap.geo_name,
        intervention_type: 'coverage_gap',
        urgency_score: 95,
        impact_score: gap.gap_pct,
        recommended_actions: [
          'Deploy emergency field team',
          'Establish temporary service point',
          'Implement rapid coverage plan',
          'Monitor daily progress',
        ],
        resource_allocation: {
          field_agents: Math.ceil(gap.gap_pct / 20),
          vehicles: Math.ceil(gap.gap_pct / 40),
          budget_estimate: Math.round(gap.gap_pct * 100),
        },
        timeline: 'Immediate - 2 weeks',
        success_metrics: ['Coverage increase >50%', 'Vulnerability reduction', 'Service delivery confirmation'],
      });
    }

    // Critical alerts
    const criticalAlerts = alerts.filter(a => a.priority === 'critical');
    for (const alert of criticalAlerts.slice(0, 5)) {
      if (!interventions.find(i => i.zone === alert.geo_name && i.intervention_type !== 'coverage_gap')) {
        interventions.push({
          id: crypto.randomUUID(),
          zone: alert.geo_name,
          intervention_type: alert.alert_type.includes('humanitarian') ? 'humanitarian' : 'operational',
          urgency_score: alert.urgency_score,
          impact_score: alert.impact_score,
          recommended_actions: alert.recommended_actions,
          resource_allocation: {
            field_agents: 2,
            vehicles: 1,
            budget_estimate: Math.round(alert.impact_score * 50),
          },
          timeline: 'Immediate - 1 week',
          success_metrics: ['Alert resolution', 'Status improvement'],
        });
      }
    }

    // Level 1 priority areas
    const level1 = priorityMatrix.by_entity.filter(e => e.priority_level === 'level_1');
    for (const area of level1.slice(0, 5)) {
      if (!interventions.find(i => i.zone === area.entity_id)) {
        interventions.push({
          id: crypto.randomUUID(),
          zone: area.entity_id,
          intervention_type: 'strategic',
          urgency_score: area.score,
          impact_score: 80,
          recommended_actions: [
            'Comprehensive assessment',
            'Priority resource allocation',
            'Intervention planning',
            'Progress monitoring',
          ],
          resource_allocation: {
            field_agents: 3,
            vehicles: 2,
            budget_estimate: Math.round(area.score * 100),
          },
          timeline: '1-3 months',
          success_metrics: ['Priority level reduction', 'Coverage improvement'],
        });
      }
    }

    return interventions.sort((a, b) => b.urgency_score - a.urgency_score);
  }

  // -------------------------------------------------------------------------
  // Risk Forecast
  // -------------------------------------------------------------------------
  private generateRiskForecast(
    horizon: PredictionHorizon,
    riskMatrix: { matrix: Record<RiskLevel, number>; by_entity: Array<{ entity_id: string; risk_level: RiskLevel; score: number }> },
    alertMetrics: TerritorialAlertMetrics,
    gaps: GapResult[],
    coverage: CoverageResult[]
  ): TerritorialRiskForecast {
    const forecasts: TerritorialRiskForecast['forecasts'] = [];

    for (const entity of riskMatrix.by_entity.slice(0, 20)) {
      const gap = gaps.find(g => g.geo_name === entity.entity_id);
      const cov = coverage.find(c => c.geo_name === entity.entity_id);

      // Predictive model based on trends
      let riskTrend = 0;
      if (gap) riskTrend += gap.gap_pct / 200;
      if (cov && cov.coverage_pct < 50) riskTrend += 0.2;

      const predictedRisk: RiskLevel =
        entity.risk_level === 'high' && riskTrend > 0.3 ? 'high' :
        entity.risk_level === 'high' && riskTrend < 0.1 ? 'medium' :
        entity.risk_level === 'medium' && riskTrend > 0.4 ? 'high' :
        entity.risk_level === 'medium' && riskTrend < 0.1 ? 'low' :
        entity.risk_level;

      forecasts.push({
        zone: entity.entity_id,
        current_risk: entity.risk_level,
        predicted_risk: predictedRisk,
        risk_probability: Math.min(1, entity.score / 100 + riskTrend),
        contributing_factors: [
          ...(gap ? [`Coverage gap: ${gap.gap_pct.toFixed(0)}%`] : []),
          ...(cov && cov.coverage_pct < 50 ? [`Low coverage: ${cov.coverage_pct.toFixed(0)}%`] : []),
        ],
        mitigation_recommendations: [
          'Coverage improvement program',
          'Resource reallocation',
          'Priority intervention',
        ],
      });
    }

    const highRiskCount = forecasts.filter(f => f.predicted_risk === 'high').length;
    const overallTrend = highRiskCount > forecasts.length * 0.4 ? 'declining' :
                         highRiskCount < forecasts.length * 0.2 ? 'improving' : 'stable';

    return {
      horizon,
      generated_at: new Date().toISOString(),
      forecasts,
      overall_trend: overallTrend,
      confidence: Math.max(0.6, 1 - (gaps.length * 0.01)),
    };
  }

  // -------------------------------------------------------------------------
  // Vulnerability Forecast
  // -------------------------------------------------------------------------
  private generateVulnerabilityForecast(
    horizon: PredictionHorizon,
    vulnerabilityMatrix: { matrix: Record<VulnerabilityLevel, number>; by_entity: Array<{ entity_id: string; vulnerability_level: VulnerabilityLevel; score: number }> },
    gaps: GapResult[],
    alertMetrics: TerritorialAlertMetrics
  ): VulnerabilityForecast {
    const forecasts: VulnerabilityForecast['forecasts'] = [];

    for (const entity of vulnerabilityMatrix.by_entity.slice(0, 20)) {
      const gap = gaps.find(g => g.geo_name === entity.entity_id);
      const humanitarianAlerts = alertMetrics.by_type['humanitarian_risk'] ?? 0;

      let vulnerabilityTrend = 0;
      if (gap) vulnerabilityTrend += gap.severity === 'critical' ? 0.3 : 0.15;

      const predictedVulnerability: VulnerabilityLevel =
        entity.vulnerability_level === 'high' && vulnerabilityTrend > 0.2 ? 'high' :
        entity.vulnerability_level === 'high' && vulnerabilityTrend < 0.1 ? 'medium' :
        entity.vulnerability_level === 'medium' && vulnerabilityTrend > 0.25 ? 'high' :
        entity.vulnerability_level;

      forecasts.push({
        zone: entity.entity_id,
        current_vulnerability: entity.vulnerability_level,
        predicted_vulnerability: predictedVulnerability,
        change_probability: vulnerabilityTrend,
        vulnerability_drivers: [
          ...(gap ? [`Gap severity: ${gap.severity}`] : []),
          ...(humanitarianAlerts > 0 ? ['Humanitarian alerts active'] : []),
        ],
        intervention_window: horizon === '7d' ? 'Immediate' : horizon === '30d' ? '1-4 weeks' : '1-3 months',
      });
    }

    const worseningCount = forecasts.filter(f => f.change_probability > 0.2).length;
    const humanitarianTrend = worseningCount > forecasts.length * 0.3 ? 'worsening' :
                              worseningCount < forecasts.length * 0.15 ? 'improving' : 'stable';

    return {
      horizon,
      generated_at: new Date().toISOString(),
      forecasts,
      humanitarian_trend: humanitarianTrend,
    };
  }

  // -------------------------------------------------------------------------
  // Growth Forecast
  // -------------------------------------------------------------------------
  private generateGrowthForecast(
    horizon: PredictionHorizon,
    coverage: CoverageResult[],
    density: DensityResult[],
    opportunities: OpportunityResult[]
  ): GrowthZoneForecast {
    const forecasts: GrowthZoneForecast['forecasts'] = [];

    // Combine density and coverage for growth prediction
    for (const cov of coverage.slice(0, 20)) {
      const dens = density.find(d => d.geo_name === cov.geo_name);
      const opp = opportunities.find(o => o.geo_name === cov.geo_name);

      const growthPotential =
        (dens?.density_class === 'low' ? 30 : dens?.density_class === 'normal' ? 15 : 5) +
        (cov.coverage_pct > 50 ? 20 : 0) +
        (opp ? 25 : 0);

      const growthProbability = Math.min(1, growthPotential / 100 + (opp?.confidence_score ?? 0) * 0.3);

      if (growthPotential > 30) {
        forecasts.push({
          zone: cov.geo_name,
          growth_potential: growthPotential,
          growth_probability: growthProbability,
          estimated_new_entities: Math.round(cov.total_establishments * (growthPotential / 100)),
          growth_drivers: [
            ...(dens?.density_class === 'low' ? ['Market underdeveloped'] : []),
            ...(opp ? ['Opportunity identified'] : []),
            ...(cov.coverage_pct > 50 ? ['Established presence'] : []),
          ],
          recommended_timing: horizon === '90d' || horizon === '180d' ? 'Strategic planning phase' : 'Immediate opportunity',
        });
      }
    }

    const totalPotential = forecasts.reduce((s, f) => s + f.estimated_new_entities, 0);
    const recommendedZones = forecasts
      .filter(f => f.growth_probability > 0.6)
      .sort((a, b) => b.growth_potential - a.growth_potential)
      .slice(0, 5)
      .map(f => f.zone);

    return {
      horizon,
      generated_at: new Date().toISOString(),
      forecasts: forecasts.sort((a, b) => b.growth_potential - a.growth_potential),
      total_growth_potential: totalPotential,
      recommended_investment_zones: recommendedZones,
    };
  }

  // -------------------------------------------------------------------------
  // Strategic Recommendations (Consolidated AI Output)
  // -------------------------------------------------------------------------
  private generateStrategicRecommendations(
    expansion: ExpansionRecommendation[],
    commercial: CommercialOpportunity[],
    humanitarian: HumanitarianOpportunity[],
    coverage: CoverageOptimization[],
    riskForecast: TerritorialRiskForecast | null
  ): StrategicRecommendation[] {
    const recommendations: StrategicRecommendation[] = [];

    // Expansion strategy
    if (expansion.length > 2) {
      recommendations.push({
        id: crypto.randomUUID(),
        category: 'expansion',
        title: 'Territorial Expansion Program',
        description: `${expansion.length} zones identified for strategic expansion with high confidence.`,
        priority: 'high',
        impact_areas: expansion.slice(0, 5).map(e => e.zone),
        estimated_value: expansion.reduce((s, e) => s + e.estimated_value, 0),
        confidence: expansion.reduce((s, e) => s + e.confidence, 0) / expansion.length,
        implementation_steps: [
          'Prioritize zones by confidence and estimated value',
          'Conduct market validation studies',
          'Allocate expansion budget and resources',
          'Implement phased entry strategy',
          'Monitor KPIs and adjust approach',
        ],
        timeline: '3-12 months',
        dependencies: ['Budget approval', 'Resource availability', 'Market readiness'],
        risks: ['Competition response', 'Execution timing', 'Resource constraints'],
        success_indicators: ['New establishments added', 'Coverage increase', 'ROI achievement'],
      });
    }

    // Humanitarian strategy
    if (humanitarian.length > 0) {
      recommendations.push({
        id: crypto.randomUUID(),
        category: 'humanitarian',
        title: 'Humanitarian Priority Response',
        description: `${humanitarian.filter(h => h.urgency_level === 'critical' || h.urgency_level === 'high').length} zones require urgent humanitarian intervention.`,
        priority: 'critical',
        impact_areas: humanitarian.slice(0, 5).map(h => h.zone),
        estimated_value: humanitarian.reduce((s, h) => s + h.affected_population_estimate, 0) * 10,
        confidence: 0.85,
        implementation_steps: [
          'Deploy immediate response teams',
          'Establish service delivery points',
          'Coordinate with humanitarian partners',
          'Implement monitoring framework',
          'Scale based on impact assessment',
        ],
        timeline: 'Immediate - 6 months',
        dependencies: ['Emergency funding', 'Coordination agreements', 'Access assurance'],
        risks: ['Access constraints', 'Security conditions', 'Resource availability'],
        success_indicators: ['Population reached', 'Service gap closure', 'Vulnerability reduction'],
      });
    }

    // Optimization strategy
    if (coverage.filter(c => c.priority === 'critical' || c.priority === 'high').length > 3) {
      recommendations.push({
        id: crypto.randomUUID(),
        category: 'optimization',
        title: 'Coverage Optimization Initiative',
        description: `${coverage.filter(c => c.priority === 'critical' || c.priority === 'high').length} zones identified for immediate coverage improvement.`,
        priority: 'high',
        impact_areas: coverage.slice(0, 5).map(c => c.zone),
        estimated_value: coverage.reduce((s, c) => s + c.efficiency_gain, 0) * 100,
        confidence: 0.80,
        implementation_steps: [
          'Prioritize zones by efficiency gain potential',
          'Reallocate field resources',
          'Optimize visit schedules',
          'Implement targeted outreach',
          'Monitor weekly progress',
        ],
        timeline: '1-6 months',
        dependencies: ['Resource reallocation', 'Schedule flexibility', 'Agent availability'],
        risks: ['Resource constraints', 'Seasonal factors', 'Coverage resistance'],
        success_indicators: ['Coverage score improvement', 'Gap reduction', 'Visit efficiency'],
      });
    }

    // Risk mitigation strategy
    if (riskForecast && riskForecast.overall_trend === 'declining') {
      recommendations.push({
        id: crypto.randomUUID(),
        category: 'consolidation',
        title: 'Risk Mitigation Program',
        description: 'Risk trends indicate declining conditions requiring proactive intervention.',
        priority: 'critical',
        impact_areas: riskForecast.forecasts.filter(f => f.predicted_risk === 'high').map(f => f.zone),
        estimated_value: riskForecast.forecasts.length * 500,
        confidence: riskForecast.confidence,
        implementation_steps: [
          'Implement risk zone monitoring',
          'Deploy preventive measures',
          'Enhance early warning systems',
          'Coordinate stakeholder response',
          'Review and adapt strategies',
        ],
        timeline: 'Immediate - 3 months',
        dependencies: ['Stakeholder alignment', 'Early warning system', 'Response protocols'],
        risks: ['Trend acceleration', 'Resource overwhelm', 'Coordination gaps'],
        success_indicators: ['Risk level stabilization', 'Alert reduction', 'Trend reversal'],
      });
    }

    return recommendations.sort((a, b) => {
      const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });
  }

  // -------------------------------------------------------------------------
  // Confidence Calculation
  // -------------------------------------------------------------------------
  private calculateConfidenceLevel(
    coverage: CoverageResult[],
    gaps: GapResult[],
    alertMetrics: TerritorialAlertMetrics
  ): number {
    const dataQuality = Math.min(1, coverage.length / 50);
    const gapClarity = gaps.length > 0 ? Math.min(1, (gaps.filter(g => g.severity !== 'critical').length / gaps.length) + 0.3) : 1;
    const alertStability = Math.min(1, 1 - (alertMetrics.alerts_last_24h / 100));

    return Math.round((dataQuality + gapClarity + alertStability) / 3 * 100) / 100;
  }

  // -------------------------------------------------------------------------
  // Save Analysis
  // -------------------------------------------------------------------------
  async saveAnalysis(analysis: AIPredictionEngineOutput): Promise<void> {
    const { error } = await supabase
      .from('territorial_ai_analyses')
      .insert(analysis);
    if (error) {
      console.error('Failed to save AI analysis:', error);
    }
  }

  // -------------------------------------------------------------------------
  // Get Analysis History
  // -------------------------------------------------------------------------
  async getAnalysisHistory(organizationId: string, limit = 10): Promise<AIPredictionEngineOutput[]> {
    const { data, error } = await supabase
      .from('territorial_ai_analyses')
      .select('*')
      .eq('organization_id', organizationId)
      .order('generated_at', { ascending: false })
      .limit(limit);
    if (error) {
      console.error('Failed to fetch AI analysis history:', error);
      return [];
    }
    return (data ?? []) as AIPredictionEngineOutput[];
  }
}

export const territorialAIEngine = new TerritorialAIEngine();

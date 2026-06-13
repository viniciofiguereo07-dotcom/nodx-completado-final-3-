import { supabase } from '../lib/supabase';
import { territorialIntelligenceEngine, type CoverageResult, type GapResult } from './TerritorialIntelligenceEngine';
import { territorialIndicatorEngine, type CoverageKPIs, type DensityKPIs, type OpportunityKPIs, type GapKPIs } from './TerritorialIndicatorEngine';
import { alertEngine } from './AlertEngine';
import type { AlertSeverity, AlertEvent } from '../types';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
export type TerritorialAlertType =
  | 'coverage_gap'
  | 'critical_coverage'
  | 'saturation_alert'
  | 'low_density_alert'
  | 'unvisited_establishment'
  | 'route_failure'
  | 'route_overdue'
  | 'humanitarian_risk'
  | 'vulnerability_cluster'
  | 'opportunity_detected'
  | 'priority_escalation'
  | 'assignment_gap';

export type TerritorialAlertPriority = 'critical' | 'high' | 'medium' | 'low';

export interface TerritorialAlert {
  id: string;
  organization_id: string;
  alert_type: TerritorialAlertType;
  priority: TerritorialAlertPriority;
  title: string;
  description: string;
  geo_level: string;
  geo_name: string;
  entity_id: string | null;
  route_id: string | null;
  current_value: number;
  threshold_value: number | null;
  impact_score: number;
  urgency_score: number;
  recommended_actions: string[];
  evidence: Record<string, unknown>;
  status: 'active' | 'acknowledged' | 'resolved' | 'dismissed';
  acknowledged_by: string | null;
  acknowledged_at: string | null;
  resolved_by: string | null;
  resolved_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface TerritorialAlertMetrics {
  total_active: number;
  critical_count: number;
  high_count: number;
  medium_count: number;
  low_count: number;
  by_type: Record<TerritorialAlertType, number>;
  by_geo_level: Record<string, number>;
  avg_resolution_hours: number | null;
  alerts_last_24h: number;
  trend_7d: Array<{ date: string; count: number }>;
}

export interface AlertDetectionConfig {
  coverage_critical_threshold: number;
  coverage_warning_threshold: number;
  saturation_threshold: number;
  low_density_threshold: number;
  unvisited_days_threshold: number;
  route_overdue_hours: number;
  vulnerability_cluster_size: number;
}

const DEFAULT_CONFIG: AlertDetectionConfig = {
  coverage_critical_threshold: 30,
  coverage_warning_threshold: 50,
  saturation_threshold: 50,
  low_density_threshold: 10,
  unvisited_days_threshold: 30,
  route_overdue_hours: 48,
  vulnerability_cluster_size: 5,
};

// ---------------------------------------------------------------------------
// Main Engine
// ---------------------------------------------------------------------------
export class TerritorialAlertEngine {
  private config: AlertDetectionConfig = DEFAULT_CONFIG;

  // -------------------------------------------------------------------------
  // Configuration
  // -------------------------------------------------------------------------
  setConfig(config: Partial<AlertDetectionConfig>): void {
    this.config = { ...this.config, ...config };
  }

  getConfig(): AlertDetectionConfig {
    return { ...this.config };
  }

  // -------------------------------------------------------------------------
  // Run All Detection Scans
  // -------------------------------------------------------------------------
  async runAllDetections(organizationId: string, geoLevel = 'municipality'): Promise<TerritorialAlert[]> {
    const alerts: TerritorialAlert[] = [];

    const detections = await Promise.all([
      this.detectCoverageGaps(organizationId, geoLevel),
      this.detectCriticalCoverage(organizationId, geoLevel),
      this.detectSaturatedZones(organizationId, geoLevel),
      this.detectLowDensityZones(organizationId, geoLevel),
      this.detectUnvisitedEstablishments(organizationId),
      this.detectRouteFailures(organizationId),
      this.detectRouteOverdue(organizationId),
      this.detectVulnerabilityClusters(organizationId, geoLevel),
      this.detectOpportunities(organizationId, geoLevel),
    ]);

    for (const detected of detections) {
      alerts.push(...detected);
    }

    // Persist all alerts
    await this.persistAlerts(organizationId, alerts);

    return alerts;
  }

  // -------------------------------------------------------------------------
  // Coverage Gap Detection
  // -------------------------------------------------------------------------
  async detectCoverageGaps(organizationId: string, geoLevel: string): Promise<TerritorialAlert[]> {
    const gaps = await territorialIntelligenceEngine.detectCoverageGaps(organizationId, geoLevel);
    const alerts: TerritorialAlert[] = [];

    for (const gap of gaps) {
      const severity = gap.severity === 'critical' ? 'critical' :
                       gap.severity === 'high' ? 'high' :
                       gap.severity === 'medium' ? 'medium' : 'low';

      alerts.push({
        id: crypto.randomUUID(),
        organization_id: organizationId,
        alert_type: 'coverage_gap',
        priority: severity,
        title: `Coverage Gap: ${gap.geo_name}`,
        description: `${gap.geo_name} has a coverage gap of ${gap.gap_pct.toFixed(1)}%. Only ${gap.current_value} of ${gap.expected_value} expected establishments have been visited.`,
        geo_level: gap.geo_level,
        geo_name: gap.geo_name,
        entity_id: null,
        route_id: null,
        current_value: gap.gap_pct,
        threshold_value: 100,
        impact_score: gap.gap_pct / 100 * 40,
        urgency_score: gap.severity === 'critical' ? 90 : gap.severity === 'high' ? 70 : 50,
        recommended_actions: [
          'Prioritize visit scheduling for this area',
          'Assign additional field agents if available',
          'Review accessibility constraints',
          'Consider mobile collection strategies',
        ],
        evidence: {
          gap_type: gap.gap_type,
          expected_value: gap.expected_value,
          current_value: gap.current_value,
          severity: gap.severity,
        },
        status: 'active',
        acknowledged_by: null,
        acknowledged_at: null,
        resolved_by: null,
        resolved_at: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
    }

    return alerts;
  }

  // -------------------------------------------------------------------------
  // Critical Coverage Detection
  // -------------------------------------------------------------------------
  async detectCriticalCoverage(organizationId: string, geoLevel: string): Promise<TerritorialAlert[]> {
    const coverage = await territorialIntelligenceEngine.calculateCoverage(organizationId, geoLevel);
    const alerts: TerritorialAlert[] = [];

    const criticalZones = coverage.filter(c => c.coverage_pct < this.config.coverage_critical_threshold);

    for (const zone of criticalZones) {
      alerts.push({
        id: crypto.randomUUID(),
        organization_id: organizationId,
        alert_type: 'critical_coverage',
        priority: 'critical',
        title: `CRITICAL: ${zone.geo_name} Below ${this.config.coverage_critical_threshold}% Coverage`,
        description: `${zone.geo_name} has only ${zone.coverage_pct.toFixed(1)}% coverage (${zone.visited_establishments}/${zone.total_establishments}). Immediate intervention required.`,
        geo_level: zone.geo_level,
        geo_name: zone.geo_name,
        entity_id: null,
        route_id: null,
        current_value: zone.coverage_pct,
        threshold_value: this.config.coverage_critical_threshold,
        impact_score: 90,
        urgency_score: 100,
        recommended_actions: [
          'IMMEDIATE: Schedule emergency visitation route',
          'Assess humanitarian risk if applicable',
          'Engage local stakeholders',
          'Document access barriers',
        ],
        evidence: {
          total_establishments: zone.total_establishments,
          visited: zone.visited_establishments,
          unvisited: zone.total_establishments - zone.visited_establishments,
        },
        status: 'active',
        acknowledged_by: null,
        acknowledged_at: null,
        resolved_by: null,
        resolved_at: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
    }

    return alerts;
  }

  // -------------------------------------------------------------------------
  // Saturated Zone Detection
  // -------------------------------------------------------------------------
  async detectSaturatedZones(organizationId: string, geoLevel: string): Promise<TerritorialAlert[]> {
    const saturated = await territorialIntelligenceEngine.detectSaturationZones(organizationId, geoLevel);
    const alerts: TerritorialAlert[] = [];

    for (const zone of saturated) {
      alerts.push({
        id: crypto.randomUUID(),
        organization_id: organizationId,
        alert_type: 'saturation_alert',
        priority: 'medium',
        title: `Saturated Zone: ${zone.geo_name}`,
        description: `${zone.geo_name} has reached saturation with ${zone.establishment_count} establishments. Consider resource reallocation or new opportunity identification.`,
        geo_level: zone.geo_level,
        geo_name: zone.geo_name,
        entity_id: null,
        route_id: null,
        current_value: zone.establishment_count,
        threshold_value: this.config.saturation_threshold,
        impact_score: 30,
        urgency_score: 20,
        recommended_actions: [
          'Analyze resource allocation efficiency',
          'Identify underserved adjacent zones',
          'Review visit frequency optimization',
          'Consider graduation strategies',
        ],
        evidence: {
          density_class: zone.density_class,
          establishment_count: zone.establishment_count,
        },
        status: 'active',
        acknowledged_by: null,
        acknowledged_at: null,
        resolved_by: null,
        resolved_at: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
    }

    return alerts;
  }

  // -------------------------------------------------------------------------
  // Low Density Zone Detection
  // -------------------------------------------------------------------------
  async detectLowDensityZones(organizationId: string, geoLevel: string): Promise<TerritorialAlert[]> {
    const density = await territorialIntelligenceEngine.calculateDensity(organizationId, geoLevel);
    const alerts: TerritorialAlert[] = [];

    const lowDensity = density.filter(d => d.density_class === 'low');

    for (const zone of lowDensity) {
      alerts.push({
        id: crypto.randomUUID(),
        organization_id: organizationId,
        alert_type: 'low_density_alert',
        priority: 'low',
        title: `Expansion Opportunity: ${zone.geo_name}`,
        description: `${zone.geo_name} has low establishment density (${zone.establishment_count} establishments). Potential expansion opportunity.`,
        geo_level: zone.geo_level,
        geo_name: zone.geo_name,
        entity_id: null,
        route_id: null,
        current_value: zone.establishment_count,
        threshold_value: this.config.low_density_threshold,
        impact_score: 20,
        urgency_score: 15,
        recommended_actions: [
          'Conduct market assessment',
          'Identify potential new establishments',
          'Develop expansion strategy',
          'Evaluate resource requirements',
        ],
        evidence: {
          density_class: zone.density_class,
          establishment_count: zone.establishment_count,
        },
        status: 'active',
        acknowledged_by: null,
        acknowledged_at: null,
        resolved_by: null,
        resolved_at: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
    }

    return alerts;
  }

  // -------------------------------------------------------------------------
  // Unvisited Establishment Detection
  // -------------------------------------------------------------------------
  async detectUnvisitedEstablishments(organizationId: string): Promise<TerritorialAlert[]> {
    const thresholdDate = new Date();
    thresholdDate.setDate(thresholdDate.getDate() - this.config.unvisited_days_threshold);

    const { data: unvisited, error } = await supabase
      .from('territorial_entities')
      .select('id, name, created_at, location:territorial_locations(province, municipality, district)')
      .eq('organization_id', organizationId)
      .eq('is_active', true)
      .lt('created_at', thresholdDate.toISOString())
      .not('id', 'in', `(SELECT DISTINCT entity_id FROM territorial_visit_history WHERE organization_id = '${organizationId}')`);

    if (error || !unvisited) return [];

    const alerts: TerritorialAlert[] = [];

    for (const entity of unvisited) {
      const daysSinceCreation = Math.floor((Date.now() - new Date(entity.created_at).getTime()) / 86400000);
      const loc = (entity as Record<string, unknown>).location as Record<string, unknown> | null;

      alerts.push({
        id: crypto.randomUUID(),
        organization_id: organizationId,
        alert_type: 'unvisited_establishment',
        priority: daysSinceCreation > 60 ? 'high' : daysSinceCreation > 45 ? 'medium' : 'low',
        title: `Unvisited: ${entity.name}`,
        description: `${entity.name} has never been visited (${daysSinceCreation} days since registration).`,
        geo_level: 'establishment',
        geo_name: entity.name,
        entity_id: entity.id,
        route_id: null,
        current_value: daysSinceCreation,
        threshold_value: this.config.unvisited_days_threshold,
        impact_score: 40 + (daysSinceCreation - 30) * 0.5,
        urgency_score: 50 + (daysSinceCreation - 30) * 0.5,
        recommended_actions: [
          'Add to nearest route',
          'Schedule first visit',
          'Verify establishment status',
          'Check for access constraints',
        ],
        evidence: {
          days_unvisited: daysSinceCreation,
          created_at: entity.created_at,
          location: loc,
        },
        status: 'active',
        acknowledged_by: null,
        acknowledged_at: null,
        resolved_by: null,
        resolved_at: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
    }

    return alerts;
  }

  // -------------------------------------------------------------------------
  // Route Failure Detection
  // -------------------------------------------------------------------------
  async detectRouteFailures(organizationId: string): Promise<TerritorialAlert[]> {
    const { data: failedRoutes, error } = await supabase
      .from('routes')
      .select('id, name, status, completion_percentage, assigned_to, created_at')
      .eq('organization_id', organizationId)
      .eq('status', 'failed');

    if (error || !failedRoutes) return [];

    const alerts: TerritorialAlert[] = [];

    for (const route of failedRoutes) {
      alerts.push({
        id: crypto.randomUUID(),
        organization_id: organizationId,
        alert_type: 'route_failure',
        priority: 'critical',
        title: `Route Failed: ${route.name}`,
        description: `Route "${route.name}" has failed. Completion: ${route.completion_percentage ?? 0}%. Immediate investigation required.`,
        geo_level: 'route',
        geo_name: route.name,
        entity_id: null,
        route_id: route.id,
        current_value: route.completion_percentage ?? 0,
        threshold_value: 100,
        impact_score: 80,
        urgency_score: 90,
        recommended_actions: [
          'Review failure logs',
          'Contact assigned agent',
          'Asssist with route recovery',
          'Reschedule missed visits',
        ],
        evidence: {
          route_status: route.status,
          completion_pct: route.completion_percentage,
          assigned_to: route.assigned_to,
        },
        status: 'active',
        acknowledged_by: null,
        acknowledged_at: null,
        resolved_by: null,
        resolved_at: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
    }

    return alerts;
  }

  // -------------------------------------------------------------------------
  // Route Overdue Detection
  // -------------------------------------------------------------------------
  async detectRouteOverdue(organizationId: string): Promise<TerritorialAlert[]> {
    const thresholdDate = new Date();
    thresholdDate.setHours(thresholdDate.getHours() - this.config.route_overdue_hours);

    const { data: overdueRoutes, error } = await supabase
      .from('routes')
      .select('id, name, status, planned_date, assigned_to')
      .eq('organization_id', organizationId)
      .eq('status', 'pending')
      .lt('planned_date', thresholdDate.toISOString());

    if (error || !overdueRoutes) return [];

    const alerts: TerritorialAlert[] = [];

    for (const route of overdueRoutes) {
      const hoursOverdue = Math.floor((Date.now() - new Date(route.planned_date).getTime()) / 3600000);

      alerts.push({
        id: crypto.randomUUID(),
        organization_id: organizationId,
        alert_type: 'route_overdue',
        priority: hoursOverdue > 72 ? 'critical' : hoursOverdue > 24 ? 'high' : 'medium',
        title: `Route Overdue: ${route.name}`,
        description: `Route "${route.name}" is ${hoursOverdue} hours overdue. Planned date: ${route.planned_date}.`,
        geo_level: 'route',
        geo_name: route.name,
        entity_id: null,
        route_id: route.id,
        current_value: hoursOverdue,
        threshold_value: this.config.route_overdue_hours,
        impact_score: 60,
        urgency_score: 70 + (hoursOverdue / 24) * 10,
        recommended_actions: [
          'Contact assigned agent',
          'Reschedule or reassign route',
          'Assess coverage impact',
          'Update planning calendar',
        ],
        evidence: {
          planned_date: route.planned_date,
          hours_overdue: hoursOverdue,
          assigned_to: route.assigned_to,
        },
        status: 'active',
        acknowledged_by: null,
        acknowledged_at: null,
        resolved_by: null,
        resolved_at: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
    }

    return alerts;
  }

  // -------------------------------------------------------------------------
  // Vulnerability Cluster Detection (Humanitarian Risk)
  // -------------------------------------------------------------------------
  async detectVulnerabilityClusters(organizationId: string, geoLevel: string): Promise<TerritorialAlert[]> {
    const gapKPIs = await territorialIndicatorEngine.getGapKPIs(organizationId, geoLevel);
    const coverageKPIs = await territorialIndicatorEngine.getCoverageKPIs(organizationId, geoLevel);

    const alerts: TerritorialAlert[] = [];

    // Detect humanitarian risk when multiple critical conditions overlap
    if (gapKPIs.critical_gaps >= this.config.vulnerability_cluster_size &&
        coverageKPIs.avg_coverage_pct < 40) {
      alerts.push({
        id: crypto.randomUUID(),
        organization_id: organizationId,
        alert_type: 'vulnerability_cluster',
        priority: 'critical',
        title: `HUMANITARIAN RISK: ${geoLevel} Level`,
        description: `${gapKPIs.critical_gaps} critical coverage gaps detected with average coverage of ${coverageKPIs.avg_coverage_pct.toFixed(1)}%. Potential humanitarian vulnerability cluster.`,
        geo_level: geoLevel,
        geo_name: organizationId,
        entity_id: null,
        route_id: null,
        current_value: gapKPIs.critical_gaps,
        threshold_value: this.config.vulnerability_cluster_size,
        impact_score: 95,
        urgency_score: 100,
        recommended_actions: [
          'IMMEDIATE: Conduct humanitarian assessment',
          'Engage humanitarian coordination',
          'Prioritize life-saving interventions',
          'Document vulnerable populations',
          'Coordinate with local authorities',
        ],
        evidence: {
          critical_gaps: gapKPIs.critical_gaps,
          high_gaps: gapKPIs.high_gaps,
          avg_coverage_pct: coverageKPIs.avg_coverage_pct,
          total_entities: coverageKPIs.total_entities,
          unvisited_entities: coverageKPIs.unvisited_entities,
        },
        status: 'active',
        acknowledged_by: null,
        acknowledged_at: null,
        resolved_by: null,
        resolved_at: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
    }

    // Check for individual humanitarian risks in high-gap areas
    if (gapKPIs.high_gaps >= 3) {
      alerts.push({
        id: crypto.randomUUID(),
        organization_id: organizationId,
        alert_type: 'humanitarian_risk',
        priority: 'high',
        title: `Humanitarian Risk Alert: ${geoLevel} Level`,
        description: `${gapKPIs.high_gaps} high-severity gaps detected requiring humanitarian attention.`,
        geo_level: geoLevel,
        geo_name: organizationId,
        entity_id: null,
        route_id: null,
        current_value: gapKPIs.high_gaps,
        threshold_value: 3,
        impact_score: 80,
        urgency_score: 85,
        recommended_actions: [
          'Conduct targeted assessment',
          'Prioritize service delivery',
          'Engage community leaders',
          'Document access barriers',
        ],
        evidence: {
          high_gaps: gapKPIs.high_gaps,
          medium_gaps: gapKPIs.medium_gaps,
          avg_gap_pct: gapKPIs.avg_gap_pct,
        },
        status: 'active',
        acknowledged_by: null,
        acknowledged_at: null,
        resolved_by: null,
        resolved_at: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
    }

    return alerts;
  }

  // -------------------------------------------------------------------------
  // Opportunity Detection
  // -------------------------------------------------------------------------
  async detectOpportunities(organizationId: string, geoLevel: string): Promise<TerritorialAlert[]> {
    const opportunities = await territorialIndicatorEngine.getOpportunityKPIs(organizationId, geoLevel);
    const alerts: TerritorialAlert[] = [];

    if (opportunities.growth_zones_count >= 3) {
      alerts.push({
        id: crypto.randomUUID(),
        organization_id: organizationId,
        alert_type: 'opportunity_detected',
        priority: 'medium',
        title: `Growth Opportunity: ${opportunities.growth_zones_count} Zones Identified`,
        description: `${opportunities.growth_zones_count} growth zones with estimated potential of ${opportunities.total_estimated_potential.toLocaleString()} new establishments.`,
        geo_level: geoLevel,
        geo_name: organizationId,
        entity_id: null,
        route_id: null,
        current_value: opportunities.growth_zones_count,
        threshold_value: 3,
        impact_score: 40,
        urgency_score: 30,
        recommended_actions: [
          'Review growth zone details',
          'Develop expansion proposal',
          'Assess resource requirements',
          'Create pilot plan',
        ],
        evidence: {
          growth_zones: opportunities.growth_zones_count,
          underserved_zones: opportunities.underserved_zones_count,
          expansion_zones: opportunities.expansion_zones_count,
          estimated_potential: opportunities.total_estimated_potential,
        },
        status: 'active',
        acknowledged_by: null,
        acknowledged_at: null,
        resolved_by: null,
        resolved_at: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
    }

    return alerts;
  }

  // -------------------------------------------------------------------------
  // Persistence
  // -------------------------------------------------------------------------
  private async persistAlerts(organizationId: string, alerts: TerritorialAlert[]): Promise<void> {
    if (alerts.length === 0) return;

    const { error } = await supabase
      .from('territorial_alerts')
      .insert(alerts.map(a => ({
        ...a,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })));

    if (error) {
      console.error('Failed to persist territorial alerts:', error);
    }

    // Also create corresponding alert events in the main alert system
    for (const alert of alerts) {
      await alertEngine.generateAlert({
        organization_id: organizationId,
        rule_id: null,
        source_engine: 'territorial',
        source_type: alert.alert_type,
        source_id: alert.id,
        severity: this.mapPriorityToSeverity(alert.priority),
        title: alert.title,
        description: alert.description,
        evidence: alert.evidence,
        status: 'active',
        acknowledged_by: null,
        acknowledged_at: null,
        resolved_by: null,
        resolved_at: null,
        resolution_notes: null,
        dismissed_at: null,
      });
    }
  }

  private mapPriorityToSeverity(priority: TerritorialAlertPriority): AlertSeverity {
    switch (priority) {
      case 'critical': return 'critical';
      case 'high': return 'high';
      case 'medium': return 'medium';
      case 'low': return 'low';
    }
  }

  // -------------------------------------------------------------------------
  // Query Operations
  // -------------------------------------------------------------------------
  async getActiveAlerts(organizationId: string, opts?: {
    priority?: TerritorialAlertPriority;
    type?: TerritorialAlertType;
    geoLevel?: string;
    limit?: number;
  }): Promise<TerritorialAlert[]> {
    let query = supabase
      .from('territorial_alerts')
      .select('*')
      .eq('organization_id', organizationId)
      .in('status', ['active', 'acknowledged'])
      .order('priority')
      .order('created_at', { ascending: false });

    if (opts?.priority) query = query.eq('priority', opts.priority);
    if (opts?.type) query = query.eq('alert_type', opts.type);
    if (opts?.geoLevel) query = query.eq('geo_level', opts.geoLevel);
    if (opts?.limit) query = query.limit(opts.limit);
    else query = query.limit(100);

    const { data, error } = await query;
    if (error) throw error;
    return (data ?? []) as TerritorialAlert[];
  }

  async getCriticalAlerts(organizationId: string): Promise<TerritorialAlert[]> {
    const { data, error } = await supabase
      .from('territorial_alerts')
      .select('*')
      .eq('organization_id', organizationId)
      .in('priority', ['critical', 'high'])
      .in('status', ['active', 'acknowledged'])
      .order('created_at', { ascending: false })
      .limit(50);
    if (error) throw error;
    return (data ?? []) as TerritorialAlert[];
  }

  async getAlertHistory(organizationId: string, opts?: {
    from?: string;
    to?: string;
    type?: TerritorialAlertType;
    status?: string;
    limit?: number;
  }): Promise<TerritorialAlert[]> {
    let query = supabase
      .from('territorial_alerts')
      .select('*')
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false });

    if (opts?.type) query = query.eq('alert_type', opts.type);
    if (opts?.status) query = query.eq('status', opts.status);
    if (opts?.from) query = query.gte('created_at', opts.from);
    if (opts?.to) query = query.lte('created_at', opts.to);
    if (opts?.limit) query = query.limit(opts.limit);
    else query = query.limit(200);

    const { data, error } = await query;
    if (error) throw error;
    return (data ?? []) as TerritorialAlert[];
  }

  // -------------------------------------------------------------------------
  // Alert Lifecycle
  // -------------------------------------------------------------------------
  async acknowledgeAlert(id: string, userId: string): Promise<void> {
    const { error } = await supabase
      .from('territorial_alerts')
      .update({
        status: 'acknowledged',
        acknowledged_by: userId,
        acknowledged_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);
    if (error) throw error;
  }

  async resolveAlert(id: string, userId: string, notes?: string): Promise<void> {
    const { error } = await supabase
      .from('territorial_alerts')
      .update({
        status: 'resolved',
        resolved_by: userId,
        resolved_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);
    if (error) throw error;
  }

  async dismissAlert(id: string): Promise<void> {
    const { error } = await supabase
      .from('territorial_alerts')
      .update({
        status: 'dismissed',
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);
    if (error) throw error;
  }

  // -------------------------------------------------------------------------
  // Metrics
  // -------------------------------------------------------------------------
  async getAlertMetrics(organizationId: string): Promise<TerritorialAlertMetrics> {
    const { data, error } = await supabase
      .from('territorial_alerts')
      .select('priority, alert_type, geo_level, status, created_at, resolved_at')
      .eq('organization_id', organizationId);
    if (error) throw error;

    const alerts = data ?? [];
    const active = alerts.filter(a => a.status === 'active' || a.status === 'acknowledged');

    const byType: Record<TerritorialAlertType, number> = {
      coverage_gap: 0, critical_coverage: 0, saturation_alert: 0, low_density_alert: 0,
      unvisited_establishment: 0, route_failure: 0, route_overdue: 0, humanitarian_risk: 0,
      vulnerability_cluster: 0, opportunity_detected: 0, priority_escalation: 0, assignment_gap: 0,
    };
    const byGeoLevel: Record<string, number> = {};
    const byDate: Record<string, number> = {};
    let totalResolutionMs = 0;
    let resolutionCount = 0;

    for (const a of alerts) {
      byType[a.alert_type as TerritorialAlertType] = (byType[a.alert_type as TerritorialAlertType] ?? 0) + 1;
      byGeoLevel[a.geo_level] = (byGeoLevel[a.geo_level] ?? 0) + 1;
      const date = a.created_at?.slice(0, 10) ?? 'unknown';
      byDate[date] = (byDate[date] ?? 0) + 1;
      if (a.resolved_at && a.created_at) {
        totalResolutionMs += new Date(a.resolved_at).getTime() - new Date(a.created_at).getTime();
        resolutionCount++;
      }
    }

    const trend_7d = Object.entries(byDate)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-7)
      .map(([date, count]) => ({ date, count }));

    const last24h = new Date();
    last24h.setHours(last24h.getHours() - 24);
    const alertsLast24h = alerts.filter(a => new Date(a.created_at) >= last24h).length;

    return {
      total_active: active.length,
      critical_count: active.filter(a => a.priority === 'critical').length,
      high_count: active.filter(a => a.priority === 'high').length,
      medium_count: active.filter(a => a.priority === 'medium').length,
      low_count: active.filter(a => a.priority === 'low').length,
      by_type: byType,
      by_geo_level: byGeoLevel,
      avg_resolution_hours: resolutionCount > 0 ? Math.round((totalResolutionMs / resolutionCount) / 3600000 * 10) / 10 : null,
      alerts_last_24h: alertsLast24h,
      trend_7d,
    };
  }

  // -------------------------------------------------------------------------
  // Priority Dashboard Summary
  // -------------------------------------------------------------------------
  async getPriorityDashboard(organizationId: string): Promise<{
    critical_alerts: TerritorialAlert[];
    high_alerts: TerritorialAlert[];
    urgent_actions: Array<{ alert: TerritorialAlert; action: string }>;
    summary: {
      total_critical: number;
      total_high: number;
      humanitarian_risks: number;
      coverage_risks: number;
      operational_risks: number;
    };
  }> {
    const [critical, high, metrics] = await Promise.all([
      this.getActiveAlerts(organizationId, { priority: 'critical', limit: 10 }),
      this.getActiveAlerts(organizationId, { priority: 'high', limit: 20 }),
      this.getAlertMetrics(organizationId),
    ]);

    const urgentActions: Array<{ alert: TerritorialAlert; action: string }> = [];
    for (const alert of [...critical, ...high]) {
      if (alert.recommended_actions.length > 0) {
        urgentActions.push({ alert, action: alert.recommended_actions[0] });
      }
    }

    return {
      critical_alerts: critical,
      high_alerts: high,
      urgent_actions: urgentActions.slice(0, 10),
      summary: {
        total_critical: metrics.critical_count,
        total_high: metrics.high_count,
        humanitarian_risks: metrics.by_type['vulnerability_cluster'] + metrics.by_type['humanitarian_risk'],
        coverage_risks: metrics.by_type['coverage_gap'] + metrics.by_type['critical_coverage'],
        operational_risks: metrics.by_type['route_failure'] + metrics.by_type['route_overdue'] + metrics.by_type['unvisited_establishment'],
      },
    };
  }
}

export const territorialAlertEngine = new TerritorialAlertEngine();

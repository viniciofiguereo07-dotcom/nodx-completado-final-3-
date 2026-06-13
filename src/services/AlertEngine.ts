import { supabase } from '../lib/supabase';
import type {
  AlertRule, AlertEvent, AlertChannel, AlertSubscription, AlertNotification,
  AlertSeverity, AlertEventStatus, AlertSourceEngine, AlertType, AlertChannelType,
  ConditionRule,
} from '../types';
import { indicatorEngine } from './IndicatorEngine';
import { semaphoreEngine } from './SemaphoreEngine';
import { diagnosticEngine } from './DiagnosticEngine';
import { reportingEngine } from './ReportingEngine';

// ---------------------------------------------------------------------------
// Condition evaluation — reuses the same pattern as DiagnosticEngine
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

function evaluateConditions(rules: ConditionRule[], record: Record<string, unknown>): boolean {
  if (rules.length === 0) return false;
  return rules.reduce<boolean>((acc, rule, i) => {
    const result = evaluateCondition(rule, record);
    if (i === 0) return result;
    return rule.logical === 'OR' ? acc || result : acc && result;
  }, false);
}

// ---------------------------------------------------------------------------
// Main service
// ---------------------------------------------------------------------------
export class AlertEngine {
  // -----------------------------------------------------------------------
  // Rules CRUD
  // -----------------------------------------------------------------------
  async createRule(rule: Omit<AlertRule, 'id' | 'created_at' | 'updated_at' | 'last_triggered_at'>): Promise<AlertRule> {
    const { data, error } = await supabase
      .from('alert_rules')
      .insert(rule)
      .select()
      .single();
    if (error) throw error;
    return data as AlertRule;
  }

  async updateRule(id: string, patch: Partial<AlertRule>): Promise<void> {
    const { error } = await supabase
      .from('alert_rules')
      .update(patch)
      .eq('id', id);
    if (error) throw error;
  }

  async deleteRule(id: string): Promise<void> {
    const { error } = await supabase
      .from('alert_rules')
      .delete()
      .eq('id', id);
    if (error) throw error;
  }

  async getRules(organizationId: string, sourceEngine?: AlertSourceEngine): Promise<AlertRule[]> {
    let query = supabase
      .from('alert_rules')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('is_active', true)
      .order('priority');
    if (sourceEngine) query = query.eq('source_engine', sourceEngine);
    const { data, error } = await query;
    if (error) throw error;
    return (data ?? []) as AlertRule[];
  }

  // -----------------------------------------------------------------------
  // Evaluate rules against all source engines
  // -----------------------------------------------------------------------
  async evaluateRules(organizationId: string): Promise<AlertEvent[]> {
    const rules = await this.getRules(organizationId);
    const triggered: Omit<AlertEvent, 'id' | 'created_at' | 'updated_at'>[] = [];

    for (const rule of rules) {
      // Check cooldown
      if (rule.last_triggered_at) {
        const cooldownEnd = new Date(rule.last_triggered_at).getTime() + rule.cooldown_minutes * 60000;
        if (Date.now() < cooldownEnd) continue;
      }

      const records = await this.fetchSourceData(organizationId, rule.source_engine);
      for (const record of records) {
        if (evaluateConditions(rule.conditions, record)) {
          triggered.push({
            organization_id: organizationId,
            rule_id: rule.id,
            source_engine: rule.source_engine,
            source_type: (record['_source_type'] as string) ?? null,
            source_id: (record['_source_id'] as string) ?? null,
            severity: rule.severity,
            title: `Alert: ${rule.name}`,
            description: rule.description ?? `Alert rule "${rule.name}" triggered from ${rule.source_engine}`,
            evidence: record,
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

      if (triggered.length > 0) {
        // Update last_triggered_at
        await supabase
          .from('alert_rules')
          .update({ last_triggered_at: new Date().toISOString() })
          .eq('id', rule.id);
      }
    }

    // Persist triggered events
    const persisted: AlertEvent[] = [];
    if (triggered.length > 0) {
      const { data, error } = await supabase
        .from('alert_events')
        .insert(triggered)
        .select('*, rule:alert_rules(name, code, severity)');
      if (error) throw error;
      for (const row of data ?? []) persisted.push(row as AlertEvent);

      // Send notifications for each new event
      for (const event of persisted) {
        await this.sendNotification(organizationId, event);
      }
    }

    return persisted;
  }

  // -----------------------------------------------------------------------
  // Generate a single alert manually
  // -----------------------------------------------------------------------
  async generateAlert(alert: Omit<AlertEvent, 'id' | 'created_at' | 'updated_at'>): Promise<AlertEvent> {
    const { data, error } = await supabase
      .from('alert_events')
      .insert(alert)
      .select('*, rule:alert_rules(name, code, severity)')
      .single();
    if (error) throw error;
    const event = data as AlertEvent;

    await this.sendNotification(alert.organization_id, event);
    return event;
  }

  // -----------------------------------------------------------------------
  // Alert lifecycle
  // -----------------------------------------------------------------------
  async acknowledgeAlert(id: string, userId: string): Promise<void> {
    const { error } = await supabase
      .from('alert_events')
      .update({ status: 'acknowledged', acknowledged_by: userId, acknowledged_at: new Date().toISOString() })
      .eq('id', id);
    if (error) throw error;
  }

  async resolveAlert(id: string, userId: string, notes?: string): Promise<void> {
    const { error } = await supabase
      .from('alert_events')
      .update({ status: 'resolved', resolved_by: userId, resolved_at: new Date().toISOString(), resolution_notes: notes ?? null })
      .eq('id', id);
    if (error) throw error;
  }

  async dismissAlert(id: string): Promise<void> {
    const { error } = await supabase
      .from('alert_events')
      .update({ status: 'dismissed', dismissed_at: new Date().toISOString() })
      .eq('id', id);
    if (error) throw error;
  }

  // -----------------------------------------------------------------------
  // Query alerts
  // -----------------------------------------------------------------------
  async getActiveAlerts(organizationId: string, opts?: { severity?: AlertSeverity; source?: AlertSourceEngine; limit?: number }): Promise<AlertEvent[]> {
    let query = supabase
      .from('alert_events')
      .select('*, rule:alert_rules(name, code, severity)')
      .eq('organization_id', organizationId)
      .in('status', ['active', 'acknowledged'])
      .order('created_at', { ascending: false });
    if (opts?.severity) query = query.eq('severity', opts.severity);
    if (opts?.source) query = query.eq('source_engine', opts.source);
    if (opts?.limit) query = query.limit(opts.limit);
    else query = query.limit(100);
    const { data, error } = await query;
    if (error) throw error;
    return (data ?? []) as AlertEvent[];
  }

  async getCriticalAlerts(organizationId: string): Promise<AlertEvent[]> {
    const { data, error } = await supabase
      .from('alert_events')
      .select('*, rule:alert_rules(name, code, severity)')
      .eq('organization_id', organizationId)
      .in('severity', ['critical', 'high'])
      .in('status', ['active', 'acknowledged'])
      .order('created_at', { ascending: false })
      .limit(50);
    if (error) throw error;
    return (data ?? []) as AlertEvent[];
  }

  async getAlertHistory(organizationId: string, opts?: { from?: string; to?: string; severity?: AlertSeverity; source?: AlertSourceEngine; status?: AlertEventStatus; limit?: number }): Promise<AlertEvent[]> {
    let query = supabase
      .from('alert_events')
      .select('*, rule:alert_rules(name, code, severity)')
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false });
    if (opts?.severity) query = query.eq('severity', opts.severity);
    if (opts?.source) query = query.eq('source_engine', opts.source);
    if (opts?.status) query = query.eq('status', opts.status);
    if (opts?.from) query = query.gte('created_at', opts.from);
    if (opts?.to) query = query.lte('created_at', opts.to);
    if (opts?.limit) query = query.limit(opts.limit);
    else query = query.limit(200);
    const { data, error } = await query;
    if (error) throw error;
    return (data ?? []) as AlertEvent[];
  }

  // -----------------------------------------------------------------------
  // Channels CRUD
  // -----------------------------------------------------------------------
  async getChannels(organizationId: string): Promise<AlertChannel[]> {
    const { data, error } = await supabase
      .from('alert_channels')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('is_active', true)
      .order('name');
    if (error) throw error;
    return (data ?? []) as AlertChannel[];
  }

  async createChannel(channel: Omit<AlertChannel, 'id' | 'created_at' | 'updated_at'>): Promise<AlertChannel> {
    const { data, error } = await supabase
      .from('alert_channels')
      .insert(channel)
      .select()
      .single();
    if (error) throw error;
    return data as AlertChannel;
  }

  // -----------------------------------------------------------------------
  // Subscriptions CRUD
  // -----------------------------------------------------------------------
  async getSubscriptions(organizationId: string): Promise<AlertSubscription[]> {
    const { data, error } = await supabase
      .from('alert_subscriptions')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('is_active', true);
    if (error) throw error;
    return (data ?? []) as AlertSubscription[];
  }

  async createSubscription(sub: Omit<AlertSubscription, 'id' | 'created_at' | 'updated_at'>): Promise<AlertSubscription> {
    const { data, error } = await supabase
      .from('alert_subscriptions')
      .insert(sub)
      .select()
      .single();
    if (error) throw error;
    return data as AlertSubscription;
  }

  // -----------------------------------------------------------------------
  // Notifications
  // -----------------------------------------------------------------------
  async getNotifications(organizationId: string, userId?: string, limit = 50): Promise<AlertNotification[]> {
    let query = supabase
      .from('alert_notifications')
      .select('*')
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false })
      .limit(limit);
    if (userId) query = query.eq('user_id', userId);
    const { data, error } = await query;
    if (error) throw error;
    return (data ?? []) as AlertNotification[];
  }

  async sendNotification(organizationId: string, event: AlertEvent): Promise<void> {
    // Find subscriptions for this event's rule (or all rules)
    const { data: subs } = await supabase
      .from('alert_subscriptions')
      .select('*, channel:alert_channels(channel_type, name, config)')
      .eq('organization_id', organizationId)
      .eq('is_active', true)
      .or(`rule_id.eq.${event.rule_id ?? 'null'},rule_id.is.null`);

    if (!subs || subs.length === 0) return;

    const notifications: Omit<AlertNotification, 'id' | 'created_at'>[] = [];
    for (const sub of subs) {
      // Apply severity filter if set
      if (sub.severity_filter.length > 0 && !sub.severity_filter.includes(event.severity)) continue;

      const channel = sub.channel as AlertChannel | null;
      notifications.push({
        organization_id: organizationId,
        event_id: event.id,
        channel_id: sub.channel_id,
        user_id: sub.user_id,
        recipient: channel?.channel_type === 'email'
          ? (channel.config['email'] as string) ?? sub.user_id
          : sub.user_id,
        status: 'pending',
        sent_at: null,
        delivered_at: null,
        opened_at: null,
        error_message: null,
      });
    }

    if (notifications.length === 0) return;

    // Insert notifications and mark as sent (in-app is instant, others would need real integrations)
    const { data: inserted, error } = await supabase
      .from('alert_notifications')
      .insert(notifications.map(n => ({
        ...n,
        status: 'sent',
        sent_at: new Date().toISOString(),
      })))
      .select();
    if (error) throw error;

    // Mark in-app as delivered immediately
    if (inserted) {
      const inAppIds = inserted
        .filter(n => {
          const sub = subs.find(s => s.channel_id === n.channel_id);
          const ch = sub?.channel as AlertChannel | null;
          return ch?.channel_type === 'in_app';
        })
        .map(n => n.id);

      if (inAppIds.length > 0) {
        await supabase
          .from('alert_notifications')
          .update({ delivered_at: new Date().toISOString(), status: 'delivered' })
          .in('id', inAppIds);
      }
    }
  }

  // -----------------------------------------------------------------------
  // Metrics for dashboard
  // -----------------------------------------------------------------------
  async getAlertMetrics(organizationId: string): Promise<{
    activeCount: number;
    criticalCount: number;
    resolvedCount: number;
    alertRate: number;
    bySeverity: Record<string, number>;
    bySource: Record<string, number>;
    byStatus: Record<string, number>;
    trend: Array<{ date: string; count: number }>;
    avgResolutionHours: number | null;
  }> {
    const { data, error } = await supabase
      .from('alert_events')
      .select('severity, status, source_engine, created_at, resolved_at')
      .eq('organization_id', organizationId);
    if (error) throw error;
    const events = data ?? [];

    const bySeverity: Record<string, number> = {};
    const bySource: Record<string, number> = {};
    const byStatus: Record<string, number> = {};
    const byDate: Record<string, number> = {};
    let totalResolutionMs = 0;
    let resolutionCount = 0;

    for (const e of events) {
      bySeverity[e.severity] = (bySeverity[e.severity] ?? 0) + 1;
      bySource[e.source_engine] = (bySource[e.source_engine] ?? 0) + 1;
      byStatus[e.status] = (byStatus[e.status] ?? 0) + 1;
      const date = e.created_at?.slice(0, 10) ?? 'unknown';
      byDate[date] = (byDate[date] ?? 0) + 1;
      if (e.resolved_at && e.created_at) {
        totalResolutionMs += new Date(e.resolved_at).getTime() - new Date(e.created_at).getTime();
        resolutionCount++;
      }
    }

    const trend = Object.entries(byDate)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-14)
      .map(([date, count]) => ({ date, count }));

    const active = events.filter(e => e.status === 'active' || e.status === 'acknowledged');
    const critical = active.filter(e => e.severity === 'critical' || e.severity === 'high');
    const resolved = events.filter(e => e.status === 'resolved');

    // Alert rate: alerts per day over last 7 days
    const last7 = Object.values(byDate).slice(-7);
    const alertRate = last7.length > 0 ? last7.reduce((s, c) => s + c, 0) / last7.length : 0;

    return {
      activeCount: active.length,
      criticalCount: critical.length,
      resolvedCount: resolved.length,
      alertRate: Math.round(alertRate * 10) / 10,
      bySeverity,
      bySource,
      byStatus,
      trend,
      avgResolutionHours: resolutionCount > 0 ? Math.round((totalResolutionMs / resolutionCount) / 3600000 * 10) / 10 : null,
    };
  }

  // -----------------------------------------------------------------------
  // Source data fetchers — consume outputs from other engines
  // -----------------------------------------------------------------------
  private async fetchSourceData(organizationId: string, source: AlertSourceEngine): Promise<Record<string, unknown>[]> {
    try {
      switch (source) {
        case 'indicator':       return await this.fetchIndicatorData(organizationId);
        case 'semaphore':       return await this.fetchSemaphoreData(organizationId);
        case 'diagnostic':      return await this.fetchDiagnosticData(organizationId);
        case 'reporting':       return await this.fetchReportingData(organizationId);
        case 'data_quality':    return await this.fetchDataQualityData(organizationId);
        case 'route_performance': return await this.fetchRoutePerformanceData(organizationId);
        case 'coverage':        return await this.fetchCoverageData(organizationId);
        case 'risk':            return await this.fetchRiskData(organizationId);
        case 'territorial':     return await this.fetchTerritorialData(organizationId);
        default:                return [];
      }
    } catch {
      return [];
    }
  }

  private async fetchIndicatorData(orgId: string): Promise<Record<string, unknown>[]> {
    const kpis = await indicatorEngine.generateKPIs(orgId);
    return kpis.map(k => ({
      _source_type: 'kpi',
      _source_id: k.indicator_id,
      indicator_name: k.indicator_name,
      indicator_code: k.indicator_code,
      current_value: k.current_value,
      target_value: k.target_value,
      progress_pct: k.progress_pct,
      trend: k.trend,
      compliance_pct: k.compliance_pct,
      quality_score: k.quality_score,
    }));
  }

  private async fetchSemaphoreData(orgId: string): Promise<Record<string, unknown>[]> {
    const results = await semaphoreEngine.getLatestResults(orgId);
    return results.map(r => ({
      _source_type: 'semaphore_result',
      _source_id: r.id,
      rule_id: r.rule_id,
      metric_value: r.metric_value,
      status: r.status,
      previous_status: r.previous_status,
    }));
  }

  private async fetchDiagnosticData(orgId: string): Promise<Record<string, unknown>[]> {
    const findings = await diagnosticEngine.getFindings(orgId, { status: 'open', limit: 50 });
    return findings.map(f => ({
      _source_type: 'diagnostic_finding',
      _source_id: f.id,
      finding_type: f.finding_type,
      severity: f.severity,
      confidence_score: f.confidence_score,
      urgency_score: f.urgency_score,
      impact_score: f.impact_score,
      priority_score: f.priority_score,
      title: f.title,
    }));
  }

  private async fetchReportingData(orgId: string): Promise<Record<string, unknown>[]> {
    const instances = await reportingEngine.getInstances(orgId, { limit: 20 });
    return instances.map(i => ({
      _source_type: 'report_instance',
      _source_id: i.id,
      report_type: i.report_type,
      status: i.status,
      total_sections: i.total_sections,
      error_message: i.error_message,
    }));
  }

  private async fetchDataQualityData(orgId: string): Promise<Record<string, unknown>[]> {
    const { data } = await supabase
      .from('data_quality_issues')
      .select('*')
      .eq('organization_id', orgId)
      .eq('status', 'open')
      .limit(50);
    return (data ?? []).map((d: Record<string, unknown>) => ({
      _source_type: 'data_quality_issue',
      _source_id: d.id,
      ...d,
    }));
  }

  private async fetchRoutePerformanceData(orgId: string): Promise<Record<string, unknown>[]> {
    const { data } = await supabase
      .from('routes')
      .select('*')
      .eq('organization_id', orgId)
      .eq('status', 'active')
      .limit(50);
    return (data ?? []).map((r: Record<string, unknown>) => ({
      _source_type: 'route',
      _source_id: r.id,
      completion_percentage: r.completion_percentage,
      status: r.status,
    }));
  }

  private async fetchCoverageData(orgId: string): Promise<Record<string, unknown>[]> {
    const { data } = await supabase
      .from('indicator_values')
      .select('*, indicator:indicator_catalog(code, name, sector)')
      .eq('organization_id', orgId)
      .is('value', null)
      .limit(50);
    return (data ?? []).map((v: Record<string, unknown>) => ({
      _source_type: 'coverage_gap',
      _source_id: v.id,
      indicator_id: v.indicator_id,
      geo_unit_id: v.geo_unit_id,
    }));
  }

  private async fetchRiskData(orgId: string): Promise<Record<string, unknown>[]> {
    const { data } = await supabase
      .from('risk_layers')
      .select('*')
      .eq('organization_id', orgId)
      .eq('is_active', true)
      .limit(50);
    return (data ?? []).map((r: Record<string, unknown>) => ({
      _source_type: 'risk_layer',
      _source_id: r.id,
      risk_type: r.risk_type,
      severity: r.severity,
    }));
  }

  private async fetchTerritorialData(orgId: string): Promise<Record<string, unknown>[]> {
    const { data } = await supabase
      .from('observatory_alerts')
      .select('*')
      .eq('organization_id', orgId)
      .eq('status', 'active')
      .limit(50);
    return (data ?? []).map((a: Record<string, unknown>) => ({
      _source_type: 'observatory_alert',
      _source_id: a.id,
      alert_type: a.alert_type,
      severity: a.severity,
      title: a.title,
    }));
  }
}

export const alertEngine = new AlertEngine();

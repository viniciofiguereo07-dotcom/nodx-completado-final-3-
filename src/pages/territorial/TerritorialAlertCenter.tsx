import { useState, useEffect, useCallback } from 'react';
import {
  AlertTriangle, Bell, Shield, Zap, MapPin, Route, Clock,
  RefreshCw, Eye, CheckCircle, XCircle, Activity, Filter,
  ChevronDown, ChevronRight, AlertCircle, Target, Layers,
  TrendingUp, Users, Calendar, Settings, Play, Pause,
} from 'lucide-react';
import { useOrg } from '../../contexts/OrgContext';
import { useAuth } from '../../contexts/AuthContext';
import { PageHeader } from '../../components/common/PageHeader';
import { EmptyState } from '../../components/common/EmptyState';
import { Modal } from '../../components/common/Modal';
import {
  territorialAlertEngine,
  type TerritorialAlert,
  type TerritorialAlertType,
  type TerritorialAlertPriority,
  type TerritorialAlertMetrics,
} from '../../services/TerritorialAlertEngine';
import {
  BarChart as RechartsBarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from 'recharts';

const PRIORITY_COLORS: Record<TerritorialAlertPriority, { bg: string; text: string; border: string }> = {
  critical: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200' },
  high: { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200' },
  medium: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
  low: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
};

const TYPE_ICONS: Record<TerritorialAlertType, React.ComponentType<{ className?: string }>> = {
  coverage_gap: MapPin,
  critical_coverage: AlertTriangle,
  saturation_alert: Layers,
  low_density_alert: Target,
  unvisited_establishment: Eye,
  route_failure: Route,
  route_overdue: Clock,
  humanitarian_risk: Shield,
  vulnerability_cluster: Users,
  opportunity_detected: TrendingUp,
  priority_escalation: Zap,
  assignment_gap: Calendar,
};

const TYPE_LABELS: Record<TerritorialAlertType, string> = {
  coverage_gap: 'Coverage Gap',
  critical_coverage: 'Critical Coverage',
  saturation_alert: 'Saturated Zone',
  low_density_alert: 'Low Density Zone',
  unvisited_establishment: 'Unvisited Establishment',
  route_failure: 'Route Failure',
  route_overdue: 'Route Overdue',
  humanitarian_risk: 'Humanitarian Risk',
  vulnerability_cluster: 'Vulnerability Cluster',
  opportunity_detected: 'Opportunity Detected',
  priority_escalation: 'Priority Escalation',
  assignment_gap: 'Assignment Gap',
};

// Priority Badge
function PriorityBadge({ priority }: { priority: TerritorialAlertPriority }) {
  const colors = PRIORITY_COLORS[priority];
  return (
    <span className={`px-2.5 py-1 text-xs font-semibold rounded-full ${colors.bg} ${colors.text} ${colors.border} border`}>
      {priority.toUpperCase()}
    </span>
  );
}

// Alert Type Icon
function AlertTypeIcon({ type, className = 'w-5 h-5' }: { type: TerritorialAlertType; className?: string }) {
  const Icon = TYPE_ICONS[type] ?? AlertCircle;
  return <Icon className={className} />;
}

// Priority Summary Card
function PrioritySummaryCard({
  metrics,
  onFilter,
}: {
  metrics: TerritorialAlertMetrics;
  onFilter: (priority: TerritorialAlertPriority) => void;
}) {
  const chartData = [
    { name: 'Critical', value: metrics.critical_count, color: '#ef4444' },
    { name: 'High', value: metrics.high_count, color: '#f97316' },
    { name: 'Medium', value: metrics.medium_count, color: '#f59e0b' },
    { name: 'Low', value: metrics.low_count, color: '#3b82f6' },
  ].filter(d => d.value > 0);

  return (
    <div className="bg-white rounded-xl border border-gray-100 p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold text-gray-800">Priority Distribution</h3>
        <div className="flex items-center gap-2 px-3 py-1 bg-gray-50 rounded-full">
          <Bell className="w-4 h-4 text-gray-400" />
          <span className="text-sm font-medium text-gray-600">{metrics.total_active} active</span>
        </div>
      </div>

      <div className="flex items-center gap-4">
        {chartData.length > 0 && (
          <div className="w-28 h-28">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={30}
                  outerRadius={50}
                  paddingAngle={2}
                >
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}

        <div className="flex-1 grid grid-cols-2 gap-2">
          {[{ key: 'critical', count: metrics.critical_count, color: 'red' },
            { key: 'high', count: metrics.high_count, color: 'orange' },
            { key: 'medium', count: metrics.medium_count, color: 'amber' },
            { key: 'low', count: metrics.low_count, color: 'blue' },
          ].map((item) => (
            <button
              key={item.key}
              onClick={() => onFilter(item.key as TerritorialAlertPriority)}
              className={`p-3 rounded-lg border text-left transition-colors hover:bg-${item.color}-50`}
              style={{ borderColor: `var(--${item.color}-200, #e5e7eb)` }}
            >
              <div className="text-xl font-bold text-gray-900">{item.count}</div>
              <div className="text-xs text-gray-500 capitalize">{item.key}</div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// Risk Summary
function RiskSummary({
  summary,
}: {
  summary: {
    total_critical: number;
    total_high: number;
    humanitarian_risks: number;
    coverage_risks: number;
    operational_risks: number;
  };
}) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
      <div className="p-4 bg-red-50 rounded-xl border border-red-200">
        <div className="flex items-center gap-2 text-red-600 mb-1">
          <Shield className="w-4 h-4" />
          <span className="text-xs font-medium">Critical</span>
        </div>
        <div className="text-2xl font-bold text-gray-900">{summary.total_critical}</div>
      </div>
      <div className="p-4 bg-orange-50 rounded-xl border border-orange-200">
        <div className="flex items-center gap-2 text-orange-600 mb-1">
          <AlertTriangle className="w-4 h-4" />
          <span className="text-xs font-medium">High</span>
        </div>
        <div className="text-2xl font-bold text-gray-900">{summary.total_high}</div>
      </div>
      <div className="p-4 bg-rose-50 rounded-xl border border-rose-200">
        <div className="flex items-center gap-2 text-rose-600 mb-1">
          <Users className="w-4 h-4" />
          <span className="text-xs font-medium">Humanitarian</span>
        </div>
        <div className="text-2xl font-bold text-gray-900">{summary.humanitarian_risks}</div>
      </div>
      <div className="p-4 bg-blue-50 rounded-xl border border-blue-200">
        <div className="flex items-center gap-2 text-blue-600 mb-1">
          <MapPin className="w-4 h-4" />
          <span className="text-xs font-medium">Coverage</span>
        </div>
        <div className="text-2xl font-bold text-gray-900">{summary.coverage_risks}</div>
      </div>
      <div className="p-4 bg-purple-50 rounded-xl border border-purple-200">
        <div className="flex items-center gap-2 text-purple-600 mb-1">
          <Route className="w-4 h-4" />
          <span className="text-xs font-medium">Operational</span>
        </div>
        <div className="text-2xl font-bold text-gray-900">{summary.operational_risks}</div>
      </div>
    </div>
  );
}

// Urgent Actions Card
function UrgentActionsCard({
  actions,
  onSelect,
}: {
  actions: Array<{ alert: TerritorialAlert; action: string }>;
  onSelect: (alert: TerritorialAlert) => void;
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Zap className="w-5 h-5 text-amber-500" />
          <h3 className="font-bold text-gray-800">Urgent Actions</h3>
        </div>
        <span className="text-xs text-gray-500">{actions.length} pending</span>
      </div>

      <div className="space-y-2 max-h-64 overflow-y-auto">
        {actions.length === 0 ? (
          <div className="text-center py-4 text-gray-400 text-sm">No urgent actions</div>
        ) : (
          actions.map((item, i) => (
            <div
              key={i}
              onClick={() => onSelect(item.alert)}
              className="p-3 bg-gray-50 rounded-lg hover:bg-gray-100 cursor-pointer transition-colors"
            >
              <div className="flex items-start gap-3">
                <PriorityBadge priority={item.alert.priority} />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-gray-800 truncate">{item.alert.title}</div>
                  <div className="text-xs text-gray-500 mt-1">{item.action}</div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// Alert Card
function AlertCard({
  alert,
  onClick,
  onAcknowledge,
  onResolve,
  onDismiss,
}: {
  alert: TerritorialAlert;
  onClick: () => void;
  onAcknowledge: () => void;
  onResolve: () => void;
  onDismiss: () => void;
}) {
  const colors = PRIORITY_COLORS[alert.priority];

  return (
    <div
      className={`p-4 rounded-xl border ${colors.bg} ${colors.border} hover:shadow-md transition-shadow`}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3">
          <div className={`p-2 rounded-lg ${colors.bg}`}>
            <AlertTypeIcon type={alert.alert_type} className={`w-5 h-5 ${colors.text}`} />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <PriorityBadge priority={alert.priority} />
              <span className="text-xs text-gray-500">{TYPE_LABELS[alert.alert_type]}</span>
            </div>
            <button onClick={onClick} className="text-left">
              <h4 className="font-semibold text-gray-900 hover:text-gray-700">{alert.title}</h4>
            </button>
            <p className="text-sm text-gray-600 mt-1 line-clamp-2">{alert.description}</p>
            <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
              <span className="flex items-center gap-1">
                <MapPin className="w-3 h-3" />
                {alert.geo_name}
              </span>
              <span>{new Date(alert.created_at).toLocaleDateString()}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {alert.status === 'active' && (
            <>
              <button
                onClick={onAcknowledge}
                className="p-2 hover:bg-white rounded-lg text-gray-500"
                title="Acknowledge"
              >
                <Eye className="w-4 h-4" />
              </button>
              <button
                onClick={onResolve}
                className="p-2 hover:bg-white rounded-lg text-emerald-600"
                title="Resolve"
              >
                <CheckCircle className="w-4 h-4" />
              </button>
              <button
                onClick={onDismiss}
                className="p-2 hover:bg-white rounded-lg text-gray-400"
                title="Dismiss"
              >
                <XCircle className="w-4 h-4" />
              </button>
            </>
          )}
          {alert.status === 'acknowledged' && (
            <button
              onClick={onResolve}
              className="p-2 hover:bg-white rounded-lg text-emerald-600"
              title="Resolve"
            >
              <CheckCircle className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// Alert Detail Modal
function AlertDetailModal({
  alert,
  onClose,
  onAcknowledge,
  onResolve,
  onDismiss,
}: {
  alert: TerritorialAlert | null;
  onClose: () => void;
  onAcknowledge: () => void;
  onResolve: () => void;
  onDismiss: () => void;
}) {
  if (!alert) return null;

  const colors = PRIORITY_COLORS[alert.priority];

  return (
    <Modal
      open={!!alert}
      onClose={onClose}
      title={alert.title}
      footer={
        <div className="flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-xl"
          >
            Close
          </button>
          <div className="flex items-center gap-2">
            {alert.status === 'active' && (
              <>
                <button
                  onClick={onDismiss}
                  className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-xl"
                >
                  Dismiss
                </button>
                <button
                  onClick={onAcknowledge}
                  className="px-4 py-2 text-sm text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-xl"
                >
                  Acknowledge
                </button>
                <button
                  onClick={onResolve}
                  className="px-4 py-2 text-sm text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl"
                >
                  Resolve
                </button>
              </>
            )}
            {alert.status === 'acknowledged' && (
              <>
                <button
                  onClick={onDismiss}
                  className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-xl"
                >
                  Dismiss
                </button>
                <button
                  onClick={onResolve}
                  className="px-4 py-2 text-sm text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl"
                >
                  Resolve
                </button>
              </>
            )}
          </div>
        </div>
      }
    >
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-start gap-4">
          <div className={`p-3 rounded-xl ${colors.bg}`}>
            <AlertTypeIcon type={alert.alert_type} className={`w-8 h-8 ${colors.text}`} />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <PriorityBadge priority={alert.priority} />
              <span className={`text-xs px-2 py-0.5 rounded-full ${
                alert.status === 'active' ? 'bg-red-100 text-red-700' :
                alert.status === 'acknowledged' ? 'bg-blue-100 text-blue-700' :
                alert.status === 'resolved' ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-700'
              }`}>
                {alert.status}
              </span>
            </div>
            <p className="text-sm text-gray-600">{alert.description}</p>
          </div>
        </div>

        {/* Details Grid */}
        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 bg-gray-50 rounded-lg">
            <div className="text-xs text-gray-500">Alert Type</div>
            <div className="text-sm font-medium text-gray-800">{TYPE_LABELS[alert.alert_type]}</div>
          </div>
          <div className="p-3 bg-gray-50 rounded-lg">
            <div className="text-xs text-gray-500">Location</div>
            <div className="text-sm font-medium text-gray-800">{alert.geo_name} ({alert.geo_level})</div>
          </div>
          <div className="p-3 bg-gray-50 rounded-lg">
            <div className="text-xs text-gray-500">Current Value</div>
            <div className="text-sm font-medium text-gray-800">{alert.current_value}</div>
          </div>
          <div className="p-3 bg-gray-50 rounded-lg">
            <div className="text-xs text-gray-500">Threshold</div>
            <div className="text-sm font-medium text-gray-800">{alert.threshold_value ?? 'N/A'}</div>
          </div>
          <div className="p-3 bg-gray-50 rounded-lg">
            <div className="text-xs text-gray-500">Impact Score</div>
            <div className="text-sm font-medium text-gray-800">{alert.impact_score.toFixed(1)}</div>
          </div>
          <div className="p-3 bg-gray-50 rounded-lg">
            <div className="text-xs text-gray-500">Urgency Score</div>
            <div className="text-sm font-medium text-gray-800">{alert.urgency_score.toFixed(1)}</div>
          </div>
        </div>

        {/* Recommended Actions */}
        <div className="p-4 bg-blue-50 rounded-xl border border-blue-200">
          <div className="flex items-center gap-2 text-blue-700 font-medium mb-2">
            <Zap className="w-4 h-4" />
            Recommended Actions
          </div>
          <ul className="space-y-1">
            {alert.recommended_actions.map((action, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-blue-800">
                <span className="text-blue-400">{i + 1}.</span>
                {action}
              </li>
            ))}
          </ul>
        </div>

        {/* Timeline */}
        <div className="p-4 bg-gray-50 rounded-lg">
          <div className="text-xs font-medium text-gray-600 mb-2">Timeline</div>
          <div className="space-y-2 text-sm text-gray-600">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-gray-400" />
              Created: {new Date(alert.created_at).toLocaleString()}
            </div>
            {alert.acknowledged_at && (
              <div className="flex items-center gap-2">
                <Eye className="w-4 h-4 text-blue-400" />
                Acknowledged: {new Date(alert.acknowledged_at).toLocaleString()}
              </div>
            )}
            {alert.resolved_at && (
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-400" />
                Resolved: {new Date(alert.resolved_at).toLocaleString()}
              </div>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
}

// Run Detection Modal
function RunDetectionModal({
  open,
  onClose,
  onRun,
  running,
}: {
  open: boolean;
  onClose: () => void;
  onRun: (geoLevel: string) => void;
  running: boolean;
}) {
  const [geoLevel, setGeoLevel] = useState('municipality');

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Run Alert Detection"
      footer={
        <div className="flex items-center gap-2">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-xl">
            Cancel
          </button>
          <button
            onClick={() => onRun(geoLevel)}
            disabled={running}
            className="flex items-center gap-2 px-4 py-2 text-sm text-white bg-blue-600 hover:bg-blue-700 rounded-xl disabled:opacity-50"
          >
            {running ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
            {running ? 'Running...' : 'Run Detection'}
          </button>
        </div>
      }
    >
      <div className="space-y-4">
        <p className="text-sm text-gray-600">
          This will run all alert detection scans across your territorial data and generate new alerts for any detected issues.
        </p>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Geographic Level</label>
          <select
            value={geoLevel}
            onChange={(e) => setGeoLevel(e.target.value)}
            className="w-full px-3 py-2 border border-gray-200 rounded-xl"
          >
            <option value="municipality">Municipality</option>
            <option value="province">Province</option>
          </select>
        </div>
        <div className="p-3 bg-gray-50 rounded-lg">
          <div className="text-xs font-medium text-gray-600 mb-2">Detection Types:</div>
          <div className="grid grid-cols-2 gap-1 text-xs text-gray-500">
            <span>Coverage Gaps</span>
            <span>Critical Coverage</span>
            <span>Saturation Alerts</span>
            <span>Low Density Zones</span>
            <span>Unvisited Establishments</span>
            <span>Route Failures</span>
            <span>Route Overdue</span>
            <span>Vulnerability Clusters</span>
            <span>Humanitarian Risks</span>
            <span>Opportunities</span>
          </div>
        </div>
      </div>
    </Modal>
  );
}

// Main Page
export function TerritorialAlertCenter() {
  const { org } = useOrg();
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [alerts, setAlerts] = useState<TerritorialAlert[]>([]);
  const [metrics, setMetrics] = useState<TerritorialAlertMetrics | null>(null);
  const [priorityDashboard, setPriorityDashboard] = useState<{
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
  } | null>(null);

  const [selectedAlert, setSelectedAlert] = useState<TerritorialAlert | null>(null);
  const [showRunModal, setShowRunModal] = useState(false);

  // Filter state
  const [filterPriority, setFilterPriority] = useState<TerritorialAlertPriority | null>(null);
  const [filterType, setFilterType] = useState<TerritorialAlertType | null>(null);
  const [viewMode, setViewMode] = useState<'all' | 'critical' | 'acknowledged'>('all');

  const load = useCallback(async () => {
    if (!org) return;
    setLoading(true);

    try {
      const [alertsData, metricsData, dashboard] = await Promise.all([
        territorialAlertEngine.getActiveAlerts(org.id),
        territorialAlertEngine.getAlertMetrics(org.id),
        territorialAlertEngine.getPriorityDashboard(org.id),
      ]);

      setAlerts(alertsData);
      setMetrics(metricsData);
      setPriorityDashboard(dashboard);
    } catch (e) {
      console.error('Failed to load alert data:', e);
    } finally {
      setLoading(false);
    }
  }, [org]);

  useEffect(() => {
    load();
  }, [load]);

  const handleRunDetection = async (geoLevel: string) => {
    if (!org) return;
    setRunning(true);
    setShowRunModal(false);

    try {
      await territorialAlertEngine.runAllDetections(org.id, geoLevel);
      await load();
    } catch (e) {
      console.error('Failed to run detection:', e);
    } finally {
      setRunning(false);
    }
  };

  const handleAcknowledge = async (alert: TerritorialAlert) => {
    if (!user) return;
    try {
      await territorialAlertEngine.acknowledgeAlert(alert.id, user.id);
      await load();
      setSelectedAlert(null);
    } catch (e) {
      console.error('Failed to acknowledge:', e);
    }
  };

  const handleResolve = async (alert: TerritorialAlert) => {
    if (!user) return;
    try {
      await territorialAlertEngine.resolveAlert(alert.id, user.id);
      await load();
      setSelectedAlert(null);
    } catch (e) {
      console.error('Failed to resolve:', e);
    }
  };

  const handleDismiss = async (alert: TerritorialAlert) => {
    try {
      await territorialAlertEngine.dismissAlert(alert.id);
      await load();
      setSelectedAlert(null);
    } catch (e) {
      console.error('Failed to dismiss:', e);
    }
  };

  // Apply filters
  let filteredAlerts = alerts;
  if (filterPriority) {
    filteredAlerts = filteredAlerts.filter(a => a.priority === filterPriority);
  }
  if (filterType) {
    filteredAlerts = filteredAlerts.filter(a => a.alert_type === filterType);
  }
  if (viewMode === 'critical') {
    filteredAlerts = filteredAlerts.filter(a => a.priority === 'critical' || a.priority === 'high');
  } else if (viewMode === 'acknowledged') {
    filteredAlerts = filteredAlerts.filter(a => a.status === 'acknowledged');
  }

  return (
    <div>
      <PageHeader
        title="Territorial Alert Center"
        subtitle="Intelligent monitoring and alerting for territorial operations"
        actions={
          <div className="flex items-center gap-3">
            <button
              onClick={load}
              disabled={loading}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl"
            >
              <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={() => setShowRunModal(true)}
              disabled={running}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 disabled:opacity-50"
            >
              {running ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" /> Running...
                </>
              ) : (
                <>
                  <Play className="w-4 h-4" /> Run Detection
                </>
              )}
            </button>
          </div>
        }
      />

      {loading ? (
        <div className="text-center py-12 text-gray-400">Loading alert data...</div>
      ) : (
        <div className="space-y-6">
          {/* Risk Summary */}
          {priorityDashboard && <RiskSummary summary={priorityDashboard.summary} />}

          {/* Priority Dashboard */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {metrics && (
              <PrioritySummaryCard
                metrics={metrics}
                onFilter={(p) => setFilterPriority(filterPriority === p ? null : p)}
              />
            )}
            {priorityDashboard && (
              <UrgentActionsCard
                actions={priorityDashboard.urgent_actions}
                onSelect={setSelectedAlert}
              />
            )}
          </div>

          {/* Filters */}
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex rounded-lg border border-gray-200 overflow-hidden">
              {(['all', 'critical', 'acknowledged'] as const).map((mode) => (
                <button
                  key={mode}
                  onClick={() => setViewMode(mode)}
                  className={`px-3 py-1.5 text-sm font-medium ${
                    viewMode === mode
                      ? 'bg-blue-600 text-white'
                      : 'bg-white text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  {mode.charAt(0).toUpperCase() + mode.slice(1)}
                </button>
              ))}
            </div>

            <select
              value={filterType ?? ''}
              onChange={(e) => setFilterType(e.target.value ? e.target.value as TerritorialAlertType : null)}
              className="px-3 py-2 text-sm border border-gray-200 rounded-xl bg-white"
            >
              <option value="">All Types</option>
              {Object.entries(TYPE_LABELS).map(([key, label]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>

            {filterPriority && (
              <button
                onClick={() => setFilterPriority(null)}
                className="flex items-center gap-1 px-3 py-1.5 text-sm text-gray-600 bg-gray-100 rounded-full"
              >
                {filterPriority}
                <XCircle className="w-3 h-3" />
              </button>
            )}
            {filterType && (
              <button
                onClick={() => setFilterType(null)}
                className="flex items-center gap-1 px-3 py-1.5 text-sm text-gray-600 bg-gray-100 rounded-full"
              >
                {TYPE_LABELS[filterType]}
                <XCircle className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* Alert List */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-gray-900">Active Alerts</h3>
              <span className="text-sm text-gray-500">{filteredAlerts.length} alerts</span>
            </div>

            {filteredAlerts.length === 0 ? (
              <EmptyState
                icon={<Bell className="w-6 h-6" />}
                title="No Alerts"
                description={filterPriority || filterType ? 'No alerts match your filters' : 'All clear! No active territorial alerts.'}
              />
            ) : (
              <div className="space-y-3">
                {filteredAlerts.map((alert) => (
                  <AlertCard
                    key={alert.id}
                    alert={alert}
                    onClick={() => setSelectedAlert(alert)}
                    onAcknowledge={() => handleAcknowledge(alert)}
                    onResolve={() => handleResolve(alert)}
                    onDismiss={() => handleDismiss(alert)}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Metrics */}
          {metrics && metrics.trend_7d.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-100 p-5">
              <h3 className="font-bold text-gray-800 mb-4">Alert Trend (Last 7 Days)</h3>
              <ResponsiveContainer width="100%" height={200}>
                <RechartsBarChart data={metrics.trend_7d}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                </RechartsBarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      )}

      {/* Alert Detail Modal */}
      <AlertDetailModal
        alert={selectedAlert}
        onClose={() => setSelectedAlert(null)}
        onAcknowledge={() => selectedAlert && handleAcknowledge(selectedAlert)}
        onResolve={() => selectedAlert && handleResolve(selectedAlert)}
        onDismiss={() => selectedAlert && handleDismiss(selectedAlert)}
      />

      {/* Run Detection Modal */}
      <RunDetectionModal
        open={showRunModal}
        onClose={() => setShowRunModal(false)}
        onRun={handleRunDetection}
        running={running}
      />
    </div>
  );
}

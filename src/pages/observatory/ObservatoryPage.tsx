import { useState, useEffect, useCallback } from 'react';
import {
  Telescope, Map, AlertTriangle, BarChart2, TrendingDown, TrendingUp, Minus,
  RefreshCw, Plus, Bell, CheckCircle2, XCircle, Globe, Layers, Loader2, Info, Clock
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useOrg } from '../../contexts/OrgContext';
import { useAuth } from '../../contexts/AuthContext';
import type { ObservatoryDashboard, ObservatoryAlert, GeographicUnit, IndicatorCatalogItem } from '../../types';

type ActiveTab = 'alerts' | 'dashboards' | 'geographic';

interface KPIData {
  criticalAlerts: number;
  activeDashboards: number;
  indicatorsTracked: number;
}

const ALERT_TYPE_COLORS: Record<string, { bg: string; text: string; dot: string }> = {
  indicator_threshold: { bg: 'bg-blue-50', text: 'text-blue-700', dot: 'bg-blue-600' },
  data_gap: { bg: 'bg-orange-50', text: 'text-orange-700', dot: 'bg-orange-600' },
  project_delay: { bg: 'bg-amber-50', text: 'text-amber-700', dot: 'bg-amber-600' },
  new_risk: { bg: 'bg-red-50', text: 'text-red-700', dot: 'bg-red-600' },
  trend_deterioration: { bg: 'bg-purple-50', text: 'text-purple-700', dot: 'bg-purple-600' },
  custom: { bg: 'bg-slate-50', text: 'text-slate-700', dot: 'bg-slate-600' },
};

const SEVERITY_COLORS: Record<string, { icon: React.ComponentType<{ className?: string }>; color: string }> = {
  critical: { icon: XCircle, color: 'text-red-600' },
  high: { icon: AlertTriangle, color: 'text-orange-600' },
  medium: { icon: AlertTriangle, color: 'text-amber-600' },
  low: { icon: Info, color: 'text-blue-600' },
};

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' });
}

function formatTime(dateString: string): string {
  const date = new Date(dateString);
  const hours = date.getHours();
  const minutes = date.getMinutes();
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
}

export function ObservatoryPage() {
  const { org } = useOrg();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<ActiveTab>('alerts');
  const [loading, setLoading] = useState(true);
  const [kpis, setKpis] = useState<KPIData>({ criticalAlerts: 0, activeDashboards: 0, indicatorsTracked: 0 });

  // Alerts
  const [alerts, setAlerts] = useState<ObservatoryAlert[]>([]);
  const [loadingAlerts, setLoadingAlerts] = useState(false);

  // Dashboards
  const [dashboards, setDashboards] = useState<ObservatoryDashboard[]>([]);
  const [loadingDashboards, setLoadingDashboards] = useState(false);

  // Geographic View
  const [geoUnits, setGeoUnits] = useState<GeographicUnit[]>([]);
  const [loadingGeo, setLoadingGeo] = useState(false);

  // Load KPIs
  useEffect(() => {
    if (!org) return;

    const loadKpis = async () => {
      try {
        const [alertsData, dashboardsData, indicatorsData] = await Promise.all([
          supabase
            .from('observatory_alerts')
            .select('*')
            .eq('organization_id', org.id)
            .eq('severity', 'critical'),
          supabase
            .from('observatory_dashboards')
            .select('*')
            .eq('organization_id', org.id),
          supabase
            .from('indicator_catalog_items')
            .select('*')
            .eq('organization_id', org.id),
        ]);

        setKpis({
          criticalAlerts: alertsData.data?.length ?? 0,
          activeDashboards: dashboardsData.data?.length ?? 0,
          indicatorsTracked: indicatorsData.data?.length ?? 0,
        });
      } catch (err) {
        console.error('Error loading KPIs:', err);
      }
    };

    loadKpis();
  }, [org]);

  // Load Alerts
  const loadAlerts = useCallback(async () => {
    if (!org) return;

    setLoadingAlerts(true);
    try {
      const { data, error } = await supabase
        .from('observatory_alerts')
        .select('*')
        .eq('organization_id', org.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAlerts(data ?? []);
    } catch (err) {
      console.error('Error loading alerts:', err);
    } finally {
      setLoadingAlerts(false);
    }
  }, [org]);

  // Load Dashboards
  const loadDashboards = useCallback(async () => {
    if (!org) return;

    setLoadingDashboards(true);
    try {
      const { data, error } = await supabase
        .from('observatory_dashboards')
        .select('*')
        .eq('organization_id', org.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setDashboards(data ?? []);
    } catch (err) {
      console.error('Error loading dashboards:', err);
    } finally {
      setLoadingDashboards(false);
    }
  }, [org]);

  // Load Geographic Units
  const loadGeoUnits = useCallback(async () => {
    if (!org) return;

    setLoadingGeo(true);
    try {
      const { data, error } = await supabase
        .from('geographic_units')
        .select('*, level:geographic_levels(*)')
        .eq('organization_id', org.id)
        .order('level_id');

      if (error) throw error;
      setGeoUnits(data ?? []);
    } catch (err) {
      console.error('Error loading geographic units:', err);
    } finally {
      setLoadingGeo(false);
    }
  }, [org]);

  // Load data on tab change
  useEffect(() => {
    setLoading(true);
    Promise.all([
      activeTab === 'alerts' ? loadAlerts() : Promise.resolve(),
      activeTab === 'dashboards' ? loadDashboards() : Promise.resolve(),
      activeTab === 'geographic' ? loadGeoUnits() : Promise.resolve(),
    ]).finally(() => setLoading(false));
  }, [activeTab, loadAlerts, loadDashboards, loadGeoUnits]);

  // Acknowledge Alert
  const acknowledgeAlert = async (alertId: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('observatory_alerts')
        .update({
          status: 'acknowledged',
          acknowledged_by: user.id,
        })
        .eq('id', alertId);

      if (error) throw error;

      // Optimistically update local state
      setAlerts(prev =>
        prev.map(alert =>
          alert.id === alertId ? { ...alert, status: 'acknowledged', acknowledged_by: user.id } : alert
        )
      );

      // Update KPIs
      setKpis(prev => ({
        ...prev,
        criticalAlerts: Math.max(0, prev.criticalAlerts - 1),
      }));
    } catch (err) {
      console.error('Error acknowledging alert:', err);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header */}
      <div className="bg-white border-b border-slate-200">
        <div className="px-6 py-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 bg-blue-100 rounded-lg">
              <Telescope className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-slate-900">Territorial Observatory</h1>
              <p className="text-slate-600 text-sm mt-1">Monitor alerts, dashboards, and geographic performance</p>
            </div>
          </div>

          {/* KPI Strip */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
            <div className="bg-gradient-to-br from-red-50 to-red-100 border border-red-200 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-red-600">Active Alerts (Critical)</p>
                  <p className="text-3xl font-bold text-red-700 mt-1">{kpis.criticalAlerts}</p>
                </div>
                <Bell className="w-10 h-10 text-red-600 opacity-20" />
              </div>
            </div>

            <div className="bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-blue-600">Active Dashboards</p>
                  <p className="text-3xl font-bold text-blue-700 mt-1">{kpis.activeDashboards}</p>
                </div>
                <BarChart2 className="w-10 h-10 text-blue-600 opacity-20" />
              </div>
            </div>

            <div className="bg-gradient-to-br from-purple-50 to-purple-100 border border-purple-200 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-purple-600">Indicators Tracked</p>
                  <p className="text-3xl font-bold text-purple-700 mt-1">{kpis.indicatorsTracked}</p>
                </div>
                <Layers className="w-10 h-10 text-purple-600 opacity-20" />
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-t border-slate-200 bg-slate-50">
          {(['alerts', 'dashboards', 'geographic'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 px-6 py-4 text-center font-medium transition border-b-2 ${
                activeTab === tab
                  ? 'border-blue-600 text-blue-600 bg-white'
                  : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              {tab === 'alerts' && 'Alerts'}
              {tab === 'dashboards' && 'Dashboards'}
              {tab === 'geographic' && 'Geographic View'}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="px-6 py-8 max-w-7xl mx-auto">
        {/* Alerts Tab */}
        {activeTab === 'alerts' && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-slate-900">Observatory Alerts</h2>
              <button
                onClick={loadAlerts}
                className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition"
              >
                <RefreshCw className={`w-4 h-4 ${loadingAlerts ? 'animate-spin' : ''}`} />
                Refresh
              </button>
            </div>

            {loadingAlerts ? (
              <div className="py-12 text-center">
                <Loader2 className="w-8 h-8 text-blue-600 animate-spin mx-auto mb-4" />
                <p className="text-slate-600">Loading alerts...</p>
              </div>
            ) : alerts.length === 0 ? (
              <div className="py-12 text-center">
                <CheckCircle2 className="w-12 h-12 text-green-600 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-slate-900 mb-2">All Clear</h3>
                <p className="text-slate-600">No active alerts at this time</p>
              </div>
            ) : (
              <div className="space-y-3">
                {alerts.map(alert => {
                  const SeverityIcon = SEVERITY_COLORS[alert.severity]?.icon || AlertTriangle;
                  const severityColor = SEVERITY_COLORS[alert.severity]?.color || 'text-slate-600';
                  const alertTypeConfig = ALERT_TYPE_COLORS[alert.alert_type] || ALERT_TYPE_COLORS.custom;

                  return (
                    <div
                      key={alert.id}
                      className={`${alertTypeConfig.bg} border border-slate-200 rounded-lg p-4 transition hover:shadow-md`}
                    >
                      <div className="flex items-start gap-4">
                        <SeverityIcon className={`${severityColor} w-5 h-5 mt-0.5 flex-shrink-0`} />

                        <div className="flex-1 min-w-0">
                          <div className="flex items-start gap-2 mb-1 flex-wrap">
                            <h3 className="font-semibold text-slate-900 text-sm">{alert.title}</h3>
                            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${alertTypeConfig.bg} ${alertTypeConfig.text} flex-shrink-0 capitalize`}>
                              {alert.alert_type.replace(/_/g, ' ')}
                            </span>
                            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                              alert.severity === 'critical' ? 'bg-red-100 text-red-700' :
                              alert.severity === 'high' ? 'bg-orange-100 text-orange-700' :
                              alert.severity === 'medium' ? 'bg-amber-100 text-amber-700' :
                              'bg-blue-100 text-blue-700'
                            } flex-shrink-0 capitalize`}>
                              {alert.severity}
                            </span>
                            {alert.status === 'acknowledged' && (
                              <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-green-100 text-green-700">
                                Acknowledged
                              </span>
                            )}
                          </div>

                          <p className="text-sm text-slate-700 mb-2">{alert.description}</p>

                          <div className="flex flex-wrap items-center gap-4 text-xs text-slate-600">
                            {alert.geo_unit_id ? (
                              <span className="flex items-center gap-1">
                                <Globe className="w-3.5 h-3.5" />
                                Geo Unit: {alert.geo_unit_id}
                              </span>
                            ) : (
                              <span className="flex items-center gap-1">
                                <Globe className="w-3.5 h-3.5" />
                                Global
                              </span>
                            )}

                            {alert.indicator_id && (
                              <span className="flex items-center gap-1">
                                <BarChart2 className="w-3.5 h-3.5" />
                                Indicator: {alert.indicator_id}
                              </span>
                            )}

                            <span className="flex items-center gap-1">
                              <Clock className="w-3.5 h-3.5" />
                              {formatDate(alert.created_at)} at {formatTime(alert.created_at)}
                            </span>
                          </div>
                        </div>

                        {alert.status === 'active' && (
                          <button
                            onClick={() => acknowledgeAlert(alert.id)}
                            className="flex-shrink-0 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition"
                          >
                            Acknowledge
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Dashboards Tab */}
        {activeTab === 'dashboards' && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-slate-900">Observatory Dashboards</h2>
              <div className="flex gap-3">
                <button
                  onClick={loadDashboards}
                  className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition"
                >
                  <RefreshCw className={`w-4 h-4 ${loadingDashboards ? 'animate-spin' : ''}`} />
                  Refresh
                </button>
                <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition">
                  <Plus className="w-4 h-4" />
                  New Dashboard
                </button>
              </div>
            </div>

            {loadingDashboards ? (
              <div className="py-12 text-center">
                <Loader2 className="w-8 h-8 text-blue-600 animate-spin mx-auto mb-4" />
                <p className="text-slate-600">Loading dashboards...</p>
              </div>
            ) : dashboards.length === 0 ? (
              <div className="py-12 text-center">
                <BarChart2 className="w-12 h-12 text-slate-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-slate-900 mb-2">No Dashboards</h3>
                <p className="text-slate-600 mb-6">Create your first dashboard to monitor indicators and alerts</p>
                <button className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition">
                  Create Dashboard
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {dashboards.map(dashboard => (
                  <div key={dashboard.id} className="bg-white border border-slate-200 rounded-lg overflow-hidden hover:shadow-md transition">
                    <div className="p-4 border-b border-slate-100">
                      <h3 className="font-semibold text-slate-900 truncate">{dashboard.name}</h3>
                      <p className="text-sm text-slate-600 line-clamp-2 mt-1">{dashboard.description || 'No description'}</p>
                    </div>

                    <div className="p-4 space-y-2 text-sm">
                      <div className="flex items-center gap-2 text-slate-600">
                        <Layers className="w-4 h-4" />
                        <span>{dashboard.widgets?.length || 0} widgets</span>
                      </div>

                      {dashboard.geo_level && (
                        <div className="flex items-center gap-2 text-slate-600">
                          <Map className="w-4 h-4" />
                          <span className="capitalize">{dashboard.geo_level}</span>
                        </div>
                      )}

                      {dashboard.is_public && (
                        <div className="flex items-center gap-2 text-blue-600">
                          <Globe className="w-4 h-4" />
                          <span>Public</span>
                        </div>
                      )}

                      <div className="flex items-center gap-2 text-slate-600">
                        <Clock className="w-4 h-4" />
                        <span>{formatDate(dashboard.created_at)}</span>
                      </div>
                    </div>

                    <div className="p-4 border-t border-slate-100 flex gap-2">
                      <button className="flex-1 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition">
                        Open
                      </button>
                      <button className="flex-1 px-4 py-2 bg-slate-100 text-slate-700 text-sm font-medium rounded-lg hover:bg-slate-200 transition">
                        Edit
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Geographic View Tab */}
        {activeTab === 'geographic' && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-slate-900">Geographic Hierarchy</h2>
              <button
                onClick={loadGeoUnits}
                className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition"
              >
                <RefreshCw className={`w-4 h-4 ${loadingGeo ? 'animate-spin' : ''}`} />
                Refresh
              </button>
            </div>

            {loadingGeo ? (
              <div className="py-12 text-center">
                <Loader2 className="w-8 h-8 text-blue-600 animate-spin mx-auto mb-4" />
                <p className="text-slate-600">Loading geographic data...</p>
              </div>
            ) : geoUnits.length === 0 ? (
              <div className="py-12 text-center">
                <Map className="w-12 h-12 text-slate-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-slate-900 mb-2">No Geographic Data</h3>
                <p className="text-slate-600">Geographic units will appear here once created</p>
              </div>
            ) : (
              <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
                <div className="overflow-x-auto">
                  <div className="min-w-full">
                    {/* Geographic Level Headers */}
                    <div className="bg-slate-100 border-b border-slate-200 p-4 grid grid-cols-5 gap-4 sticky top-0">
                      <div className="font-semibold text-slate-900 text-sm">Level</div>
                      <div className="font-semibold text-slate-900 text-sm">Name</div>
                      <div className="font-semibold text-slate-900 text-sm text-center">Trend</div>
                      <div className="font-semibold text-slate-900 text-sm text-center">Active Projects</div>
                      <div className="font-semibold text-slate-900 text-sm text-center">Alerts</div>
                    </div>

                    {/* Geographic Units Rows */}
                    <div className="divide-y divide-slate-200">
                      {geoUnits.slice(0, 20).map((unit, idx) => {
                        // Mock trend data for demo
                        const trends = [TrendingUp, TrendingDown, Minus];
                        const Trend = trends[Math.floor(Math.random() * trends.length)];
                        const trendColor = Trend === TrendingUp ? 'text-green-600' : Trend === TrendingDown ? 'text-red-600' : 'text-slate-600';

                        return (
                          <div key={unit.id} className="p-4 hover:bg-slate-50 transition grid grid-cols-5 gap-4 items-center">
                            <div className="text-sm font-medium text-slate-900 capitalize">
                              {(unit.level as any)?.name || 'Unknown'}
                            </div>

                            <div className="text-sm text-slate-700">{unit.name}</div>

                            <div className="flex justify-center">
                              <Trend className={`${trendColor} w-5 h-5`} />
                            </div>

                            <div className="text-center text-sm font-medium text-slate-900">
                              {Math.floor(Math.random() * 15)}
                            </div>

                            <div className="text-center">
                              <span className={`text-sm font-medium px-2.5 py-1 rounded-full ${
                                Math.random() > 0.5 ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
                              }`}>
                                {Math.floor(Math.random() * 5)}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {geoUnits.length > 20 && (
                      <div className="p-4 text-center text-sm text-slate-600 border-t border-slate-200 bg-slate-50">
                        Showing 20 of {geoUnits.length} geographic units
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

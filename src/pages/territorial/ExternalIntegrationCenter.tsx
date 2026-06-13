import React, { useState, useEffect } from 'react';
import { Plug, Activity, Shield, Bell, Heart, FileText, Plus, Settings, Trash2, CreditCard as Edit2, RefreshCw, CheckCircle2, XCircle, AlertTriangle, Clock, Power, Link2, Key, Webhook as WebhookIcon, BarChart2, Search, Filter, ChevronDown, ChevronRight, Eye, EyeOff, Save, X, ExternalLink } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useOrg } from '../../contexts/OrgContext';
import {
  territorialExternalIntegrationEngine,
  type APIEndpoint,
  type Connector,
  type Webhook,
  type HealthStatus,
  type IntegrationAuditLog,
  type IntegrationProvider,
  type AuthConfig,
  type WebhookEvent,
} from '../../services/TerritorialExternalIntegrationEngine';

type TabType = 'dashboard' | 'connectors' | 'authentication' | 'webhooks' | 'health' | 'audit';

const PROVIDER_LABELS: Record<IntegrationProvider, { name: string; color: string }> = {
  powerbi: { name: 'Power BI', color: 'yellow' },
  arcgis: { name: 'ArcGIS', color: 'blue' },
  qgis: { name: 'QGIS', color: 'green' },
  dhis2: { name: 'DHIS2', color: 'purple' },
  kobo: { name: 'KoboToolbox', color: 'orange' },
  odk: { name: 'ODK Central', color: 'teal' },
  google_sheets: { name: 'Google Sheets', color: 'emerald' },
};

const WEBHOOK_EVENTS: WebhookEvent[] = [
  'sync.started', 'sync.completed', 'sync.failed',
  'data.created', 'data.updated', 'data.deleted',
  'error.critical', 'health.degraded', 'auth.expired', 'quota.exceeded',
];

export function ExternalIntegrationCenter() {
  const { user } = useAuth();
  const { org } = useOrg();

  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  const [loading, setLoading] = useState(true);

  // Data states
  const [connectors, setConnectors] = useState<Connector[]>([]);
  const [webhooks, setWebhooks] = useState<Webhook[]>([]);
  const [healthStatuses, setHealthStatuses] = useState<HealthStatus[]>([]);
  const [auditLogs, setAuditLogs] = useState<IntegrationAuditLog[]>([]);
  const [stats, setStats] = useState<{
    totalRequests: number;
    successRate: number;
    avgResponseTime: number;
    errorCounts: Record<string, number>;
    byProvider: Record<IntegrationProvider, { requests: number; errors: number }>;
  } | null>(null);

  // Modal states
  const [showConnectorModal, setShowConnectorModal] = useState(false);
  const [showWebhookModal, setShowWebhookModal] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState<string | null>(null);

  // Connector form
  const [connectorForm, setConnectorForm] = useState({
    provider: 'powerbi' as IntegrationProvider,
    displayName: '',
    authType: 'bearer' as AuthConfig['type'],
    apiKey: '',
    apiSecret: '',
    bearerToken: '',
    username: '',
    password: '',
    oauthClientId: '',
    oauthClientSecret: '',
  });

  // Webhook form
  const [webhookForm, setWebhookForm] = useState({
    name: '',
    provider: 'powerbi' as IntegrationProvider,
    connectorId: '',
    endpointUrl: '',
    secretKey: '',
    events: [] as WebhookEvent[],
    enabled: true,
  });

  useEffect(() => {
    if (org) loadAll();
  }, [org]);

  const loadAll = async () => {
    if (!org) return;
    setLoading(true);
    try {
      const [connectorsData, webhooksData, healthData, logsData, statsData] = await Promise.all([
        territorialExternalIntegrationEngine.listConnectors(org.id),
        territorialExternalIntegrationEngine.listWebhooks(org.id),
        territorialExternalIntegrationEngine.getAllHealthStatuses(org.id),
        territorialExternalIntegrationEngine.getAuditLogs(org.id, { limit: 100 }),
        territorialExternalIntegrationEngine.getAuditStats(org.id),
      ]);
      setConnectors(connectorsData);
      setWebhooks(webhooksData);
      setHealthStatuses(healthData);
      setAuditLogs(logsData);
      setStats(statsData);
    } catch (e) {
      console.error('Failed to load integration data:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateConnector = async () => {
    if (!org || !user) return;
    try {
      const authConfig: AuthConfig = {
        type: connectorForm.authType,
        apiKey: connectorForm.apiKey || undefined,
        apiSecret: connectorForm.apiSecret || undefined,
        bearerToken: connectorForm.bearerToken || undefined,
        username: connectorForm.username || undefined,
        password: connectorForm.password || undefined,
        oauthClientId: connectorForm.oauthClientId || undefined,
        oauthClientSecret: connectorForm.oauthClientSecret || undefined,
      };

      await territorialExternalIntegrationEngine.createConnector({
        organizationId: org.id,
        provider: connectorForm.provider,
        displayName: connectorForm.displayName || PROVIDER_LABELS[connectorForm.provider].name,
        authConfig,
        enabled: true,
      }, user.id);

      setShowConnectorModal(false);
      setConnectorForm({
        provider: 'powerbi',
        displayName: '',
        authType: 'bearer',
        apiKey: '',
        apiSecret: '',
        bearerToken: '',
        username: '',
        password: '',
        oauthClientId: '',
        oauthClientSecret: '',
      });
      loadAll();
    } catch (e) {
      console.error('Failed to create connector:', e);
    }
  };

  const handleDeleteConnector = async (connectorId: string) => {
    if (!user || !confirm('Are you sure you want to delete this connector?')) return;
    try {
      await territorialExternalIntegrationEngine.deleteConnector(connectorId, user.id);
      loadAll();
    } catch (e) {
      console.error('Failed to delete connector:', e);
    }
  };

  const handleToggleConnector = async (connectorId: string, enabled: boolean) => {
    if (!user) return;
    try {
      if (enabled) {
        await territorialExternalIntegrationEngine.enableConnector(connectorId, user.id);
      } else {
        await territorialExternalIntegrationEngine.disableConnector(connectorId, user.id);
      }
      loadAll();
    } catch (e) {
      console.error('Failed to toggle connector:', e);
    }
  };

  const handleCreateWebhook = async () => {
    if (!org || !user) return;
    try {
      await territorialExternalIntegrationEngine.createWebhook({
        organizationId: org.id,
        name: webhookForm.name,
        provider: webhookForm.provider,
        connectorId: webhookForm.connectorId || undefined,
        endpointUrl: webhookForm.endpointUrl,
        secretKey: webhookForm.secretKey || undefined,
        events: webhookForm.events,
        enabled: webhookForm.enabled,
      }, user.id);

      setShowWebhookModal(false);
      setWebhookForm({
        name: '',
        provider: 'powerbi',
        connectorId: '',
        endpointUrl: '',
        secretKey: '',
        events: [],
        enabled: true,
      });
      loadAll();
    } catch (e) {
      console.error('Failed to create webhook:', e);
    }
  };

  const handleDeleteWebhook = async (webhookId: string) => {
    if (!user || !confirm('Are you sure you want to delete this webhook?')) return;
    try {
      await territorialExternalIntegrationEngine.deleteWebhook(webhookId, user.id);
      loadAll();
    } catch (e) {
      console.error('Failed to delete webhook:', e);
    }
  };

  const handleCheckHealth = async (connectorId: string) => {
    try {
      await territorialExternalIntegrationEngine.checkConnectorHealth(connectorId);
      loadAll();
    } catch (e) {
      console.error('Health check failed:', e);
    }
  };

  const getHealthColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'green';
      case 'degraded': return 'amber';
      case 'unhealthy': return 'red';
      default: return 'slate';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'green';
      case 'inactive': return 'slate';
      case 'error': case 'failed': return 'red';
      case 'pending': return 'blue';
      case 'disabled': return 'gray';
      default: return 'slate';
    }
  };

  const renderDashboard = () => (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-4 border border-slate-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <Plug className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <div className="text-2xl font-bold text-slate-900">{connectors.length}</div>
              <div className="text-sm text-slate-500">Connectors</div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-4 border border-slate-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <Activity className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <div className="text-2xl font-bold text-slate-900">
                {healthStatuses.filter(h => h.status === 'healthy').length}
              </div>
              <div className="text-sm text-slate-500">Healthy</div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-4 border border-slate-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
              <Bell className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <div className="text-2xl font-bold text-slate-900">{webhooks.length}</div>
              <div className="text-sm text-slate-500">Webhooks</div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-4 border border-slate-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
              <BarChart2 className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <div className="text-2xl font-bold text-slate-900">
                {stats ? `${stats.successRate.toFixed(0)}%` : '—'}
              </div>
              <div className="text-sm text-slate-500">Success Rate</div>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-xl border border-slate-200">
        <div className="px-4 py-3 border-b border-slate-200">
          <h3 className="font-semibold text-slate-900">Recent Activity</h3>
        </div>
        <div className="divide-y divide-slate-100">
          {auditLogs.slice(0, 10).map(log => (
            <div key={log.id} className="px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                {log.status === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 text-green-600" />
                ) : log.status === 'partial' ? (
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                ) : (
                  <XCircle className="w-4 h-4 text-red-600" />
                )}
                <div>
                  <div className="text-sm font-medium text-slate-900">{log.action}</div>
                  <div className="text-xs text-slate-500">{log.provider}</div>
                </div>
              </div>
              <div className="text-xs text-slate-500">
                {new Date(log.created_at).toLocaleString()}
              </div>
            </div>
          ))}
          {auditLogs.length === 0 && (
            <div className="px-4 py-8 text-center text-slate-500">No activity yet</div>
          )}
        </div>
      </div>
    </div>
  );

  const renderConnectors = () => (
    <div className="space-y-6">
      {/* Provider Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {territorialExternalIntegrationEngine.listAvailableProviders().map(provider => {
          const existingConnector = connectors.find(c => c.provider === provider.key);
          return (
            <div key={provider.key} className="bg-white rounded-xl p-4 border border-slate-200">
              <div className="flex items-start justify-between mb-3">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center bg-${PROVIDER_LABELS[provider.key].color}-100`}>
                  <Plug className={`w-5 h-5 text-${PROVIDER_LABELS[provider.key].color}-600`} />
                </div>
                {existingConnector && (
                  <span className={`px-2 py-1 rounded text-xs font-medium bg-${getStatusColor(existingConnector.status)}-100 text-${getStatusColor(existingConnector.status)}-700`}>
                    {existingConnector.status}
                  </span>
                )}
              </div>
              <h3 className="font-semibold text-slate-900">{provider.name}</h3>
              <p className="text-xs text-slate-500 mt-1">{provider.category}</p>
              {existingConnector ? (
                <div className="mt-3 flex items-center gap-2">
                  <button
                    onClick={() => handleToggleConnector(existingConnector.id, !existingConnector.enabled)}
                    className="flex-1 text-xs px-2 py-1 rounded border border-slate-200 hover:bg-slate-50"
                  >
                    {existingConnector.enabled ? 'Disable' : 'Enable'}
                  </button>
                  <button
                    onClick={() => handleDeleteConnector(existingConnector.id)}
                    className="p-1 text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => {
                    setConnectorForm(prev => ({ ...prev, provider: provider.key }));
                    setShowConnectorModal(true);
                  }}
                  className="mt-3 w-full text-xs px-2 py-1.5 rounded bg-blue-600 text-white hover:bg-blue-700"
                >
                  <Plus className="w-3 h-3 inline mr-1" /> Connect
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Connector List */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <table className="w-full">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600">Connector</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600">Provider</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600">Status</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600">Last Sync</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600">Auth</th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {connectors.map(connector => (
              <tr key={connector.id} className="hover:bg-slate-50">
                <td className="px-4 py-3">
                  <div className="font-medium text-slate-900">{connector.display_name}</div>
                </td>
                <td className="px-4 py-3">
                  <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded text-xs font-medium bg-${PROVIDER_LABELS[connector.provider].color}-100 text-${PROVIDER_LABELS[connector.provider].color}-700`}>
                    {PROVIDER_LABELS[connector.provider].name}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-${getStatusColor(connector.status)}-100 text-${getStatusColor(connector.status)}-700`}>
                    {connector.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm text-slate-600">
                  {connector.last_sync_at ? new Date(connector.last_sync_at).toLocaleString() : 'Never'}
                  {connector.last_sync_status && (
                    <span className={`ml-2 inline-flex items-center gap-1 text-xs ${connector.last_sync_status === 'success' ? 'text-green-600' : connector.last_sync_status === 'partial' ? 'text-amber-600' : 'text-red-600'}`}>
                      {connector.last_sync_status === 'success' ? <CheckCircle2 className="w-3 h-3" /> : <AlertTriangle className="w-3 h-3" />}
                    </span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <span className="text-xs text-slate-600">{connector.auth_type.toUpperCase()}</span>
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <button
                      onClick={() => setShowAuthModal(connector.id)}
                      className="p-1 text-slate-600 hover:text-slate-700"
                      title="Edit Auth"
                    >
                      <Key className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleCheckHealth(connector.id)}
                      className="p-1 text-slate-600 hover:text-slate-700"
                      title="Health Check"
                    >
                      <Heart className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteConnector(connector.id)}
                      className="p-1 text-red-600 hover:text-red-700"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {connectors.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                  No connectors configured. Click Connect on a provider above.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderAuthentication = () => (
    <div className="space-y-6">
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <table className="w-full">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600">Connector</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600">Auth Type</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600">Status</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600">Last Validated</th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {connectors.map(connector => (
              <tr key={connector.id} className="hover:bg-slate-50">
                <td className="px-4 py-3">
                  <div className="font-medium text-slate-900">{connector.display_name}</div>
                  <div className="text-xs text-slate-500">{PROVIDER_LABELS[connector.provider].name}</div>
                </td>
                <td className="px-4 py-3">
                  <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded text-xs font-medium bg-slate-100 text-slate-700">
                    <Shield className="w-3 h-3" />
                    {connector.auth_type.toUpperCase()}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-${connector.enabled ? 'green' : 'slate'}-100 text-${connector.enabled ? 'green' : 'slate'}-700`}>
                    {connector.enabled ? 'Configured' : 'Not Configured'}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm text-slate-600">
                  {connector.updated_at ? new Date(connector.updated_at).toLocaleString() : '—'}
                </td>
                <td className="px-4 py-3 text-right">
                  <button
                    onClick={() => setShowAuthModal(connector.id)}
                    className="px-3 py-1.5 text-xs rounded bg-slate-100 text-slate-700 hover:bg-slate-200"
                  >
                    Edit Credentials
                  </button>
                </td>
              </tr>
            ))}
            {connectors.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-slate-500">
                  No connectors configured
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderWebhooks = () => (
    <div className="space-y-6">
      {/* Create Webhook Button */}
      <div className="flex justify-end">
        <button
          onClick={() => setShowWebhookModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
        >
          <Plus className="w-4 h-4" />
          Create Webhook
        </button>
      </div>

      {/* Webhooks Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <table className="w-full">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600">Webhook</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600">Provider</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600">Events</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600">Status</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600">Last Triggered</th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {webhooks.map(wh => (
              <tr key={wh.id} className="hover:bg-slate-50">
                <td className="px-4 py-3">
                  <div className="font-medium text-slate-900">{wh.name}</div>
                  <div className="text-xs text-slate-500 font-mono truncate max-w-xs">{wh.endpoint_url}</div>
                </td>
                <td className="px-4 py-3">
                  <span className="text-sm text-slate-600">{PROVIDER_LABELS[wh.provider].name}</span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-1">
                    {wh.events.slice(0, 3).map(event => (
                      <span key={event} className="px-2 py-0.5 rounded text-xs bg-slate-100 text-slate-600">
                        {event}
                      </span>
                    ))}
                    {wh.events.length > 3 && (
                      <span className="px-2 py-0.5 rounded text-xs bg-slate-100 text-slate-600">
                        +{wh.events.length - 3} more
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-${getStatusColor(wh.status)}-100 text-${getStatusColor(wh.status)}-700`}>
                    {wh.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm text-slate-600">
                  {wh.last_triggered_at ? new Date(wh.last_triggered_at).toLocaleString() : 'Never'}
                </td>
                <td className="px-4 py-3 text-right">
                  <button
                    onClick={() => handleDeleteWebhook(wh.id)}
                    className="p-1 text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
            {webhooks.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                  No webhooks configured
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderHealthMonitor = () => (
    <div className="space-y-6">
      {/* Health Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {['healthy', 'degraded', 'unhealthy'].map(status => (
          <div key={status} className="bg-white rounded-xl p-4 border border-slate-200">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center bg-${getHealthColor(status)}-100`}>
                {status === 'healthy' ? (
                  <CheckCircle2 className={`w-5 h-5 text-${getHealthColor(status)}-600`} />
                ) : status === 'degraded' ? (
                  <AlertTriangle className={`w-5 h-5 text-${getHealthColor(status)}-600`} />
                ) : (
                  <XCircle className={`w-5 h-5 text-${getHealthColor(status)}-600`} />
                )}
              </div>
              <div>
                <div className="text-2xl font-bold text-slate-900">
                  {healthStatuses.filter(h => h.status === status).length}
                </div>
                <div className="text-sm text-slate-500 capitalize">{status}</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Health Details */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <table className="w-full">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600">Connector</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600">Status</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600">Response Time</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600">Error Rate (24h)</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600">Last Check</th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {healthStatuses.map(health => {
              const connector = connectors.find(c => c.id === health.connector_id);
              return (
                <tr key={health.connector_id} className="hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <div className="font-medium text-slate-900">{connector?.display_name || 'Unknown'}</div>
                    <div className="text-xs text-slate-500">{health.provider}</div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-${getHealthColor(health.status)}-100 text-${getHealthColor(health.status)}-700`}>
                      {health.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-600">
                    {health.response_time_ms ? `${health.response_time_ms}ms` : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-2 bg-slate-200 rounded-full overflow-hidden">
                        <div
                          className={`h-full ${health.error_count_24h > 10 ? 'bg-red-500' : health.error_count_24h > 0 ? 'bg-amber-500' : 'bg-green-500'}`}
                          style={{ width: `${Math.min(100, (health.error_count_24h / 50) * 100)}%` }}
                        />
                      </div>
                      <span className="text-xs text-slate-600">{health.error_count_24h}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-600">
                    {health.last_check_at ? new Date(health.last_check_at).toLocaleString() : 'Never'}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => handleCheckHealth(health.connector_id)}
                      className="flex items-center gap-1 px-3 py-1.5 text-xs rounded bg-slate-100 text-slate-700 hover:bg-slate-200"
                    >
                      <RefreshCw className="w-3 h-3" />
                      Check
                    </button>
                  </td>
                </tr>
              );
            })}
            {healthStatuses.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                  No health data available. Configure connectors first.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderAuditLogs = () => (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search logs..."
            className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        <select className="px-3 py-2 border border-slate-300 rounded-lg text-sm">
          <option value="">All Providers</option>
          {Object.keys(PROVIDER_LABELS).map(p => (
            <option key={p} value={p}>{PROVIDER_LABELS[p as IntegrationProvider].name}</option>
          ))}
        </select>
        <select className="px-3 py-2 border border-slate-300 rounded-lg text-sm">
          <option value="">All Status</option>
          <option value="success">Success</option>
          <option value="failure">Failure</option>
          <option value="partial">Partial</option>
        </select>
      </div>

      {/* Logs Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <table className="w-full">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600">Timestamp</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600">Action</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600">Provider</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600">Status</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600">Duration</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600">Details</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {auditLogs.map(log => (
              <tr key={log.id} className="hover:bg-slate-50">
                <td className="px-4 py-3 text-sm text-slate-600">
                  {new Date(log.created_at).toLocaleString()}
                </td>
                <td className="px-4 py-3">
                  <span className="font-medium text-slate-900">{log.action}</span>
                </td>
                <td className="px-4 py-3">
                  <span className="text-sm text-slate-600">{PROVIDER_LABELS[log.provider]?.name || log.provider}</span>
                </td>
                <td className="px-4 py-3">
                  <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                    log.status === 'success' ? 'bg-green-100 text-green-700' :
                    log.status === 'partial' ? 'bg-amber-100 text-amber-700' :
                    'bg-red-100 text-red-700'
                  }`}>
                    {log.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm text-slate-600">
                  {log.duration_ms ? `${log.duration_ms}ms` : '—'}
                </td>
                <td className="px-4 py-3">
                  {log.error_message && (
                    <span className="text-xs text-red-600 truncate max-w-xs block">{log.error_message}</span>
                  )}
                </td>
              </tr>
            ))}
            {auditLogs.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                  No audit logs
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-indigo-100 rounded-xl flex items-center justify-center">
              <Plug className="w-6 h-6 text-indigo-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">External Integrations</h1>
              <p className="text-sm text-slate-500">Manage connectors, webhooks, and external API integrations</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Tabs */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          {([
            { key: 'dashboard', label: 'Dashboard', icon: BarChart2 },
            { key: 'connectors', label: 'Connectors', icon: Plug },
            { key: 'authentication', label: 'Authentication', icon: Shield },
            { key: 'webhooks', label: 'Webhooks', icon: Bell },
            { key: 'health', label: 'Health Monitor', icon: Heart },
            { key: 'audit', label: 'Audit Logs', icon: FileText },
          ] as const).map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                activeTab === tab.key
                  ? 'bg-slate-900 text-white'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <RefreshCw className="w-6 h-6 text-slate-400 animate-spin" />
          </div>
        ) : (
          <>
            {activeTab === 'dashboard' && renderDashboard()}
            {activeTab === 'connectors' && renderConnectors()}
            {activeTab === 'authentication' && renderAuthentication()}
            {activeTab === 'webhooks' && renderWebhooks()}
            {activeTab === 'health' && renderHealthMonitor()}
            {activeTab === 'audit' && renderAuditLogs()}
          </>
        )}
      </div>

      {/* Create Connector Modal */}
      {showConnectorModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-lg p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-900">Create Connector</h3>
              <button onClick={() => setShowConnectorModal(false)}>
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Provider</label>
              <select
                value={connectorForm.provider}
                onChange={e => setConnectorForm(prev => ({ ...prev, provider: e.target.value as IntegrationProvider }))}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg"
              >
                {Object.keys(PROVIDER_LABELS).map(p => (
                  <option key={p} value={p}>{PROVIDER_LABELS[p as IntegrationProvider].name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Display Name</label>
              <input
                type="text"
                value={connectorForm.displayName}
                onChange={e => setConnectorForm(prev => ({ ...prev, displayName: e.target.value }))}
                placeholder={PROVIDER_LABELS[connectorForm.provider].name}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Authentication Type</label>
              <select
                value={connectorForm.authType}
                onChange={e => setConnectorForm(prev => ({ ...prev, authType: e.target.value as AuthConfig['type'] }))}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg"
              >
                <option value="api_key">API Key</option>
                <option value="bearer">Bearer Token</option>
                <option value="basic">Basic Auth</option>
                <option value="oauth2">OAuth 2.0</option>
              </select>
            </div>

            {connectorForm.authType === 'api_key' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">API Key</label>
                  <input
                    type="password"
                    value={connectorForm.apiKey}
                    onChange={e => setConnectorForm(prev => ({ ...prev, apiKey: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">API Secret (optional)</label>
                  <input
                    type="password"
                    value={connectorForm.apiSecret}
                    onChange={e => setConnectorForm(prev => ({ ...prev, apiSecret: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  />
                </div>
              </>
            )}

            {connectorForm.authType === 'bearer' && (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Bearer Token</label>
                <input
                  type="password"
                  value={connectorForm.bearerToken}
                  onChange={e => setConnectorForm(prev => ({ ...prev, bearerToken: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                />
              </div>
            )}

            {connectorForm.authType === 'basic' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Username</label>
                  <input
                    type="text"
                    value={connectorForm.username}
                    onChange={e => setConnectorForm(prev => ({ ...prev, username: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
                  <input
                    type="password"
                    value={connectorForm.password}
                    onChange={e => setConnectorForm(prev => ({ ...prev, password: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  />
                </div>
              </>
            )}

            {connectorForm.authType === 'oauth2' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Client ID</label>
                  <input
                    type="text"
                    value={connectorForm.oauthClientId}
                    onChange={e => setConnectorForm(prev => ({ ...prev, oauthClientId: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Client Secret</label>
                  <input
                    type="password"
                    value={connectorForm.oauthClientSecret}
                    onChange={e => setConnectorForm(prev => ({ ...prev, oauthClientSecret: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  />
                </div>
              </>
            )}

            <button
              onClick={handleCreateConnector}
              className="w-full py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
            >
              Create Connector
            </button>
          </div>
        </div>
      )}

      {/* Create Webhook Modal */}
      {showWebhookModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-lg p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-900">Create Webhook</h3>
              <button onClick={() => setShowWebhookModal(false)}>
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Name</label>
              <input
                type="text"
                value={webhookForm.name}
                onChange={e => setWebhookForm(prev => ({ ...prev, name: e.target.value }))}
                placeholder="My Webhook"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Provider</label>
              <select
                value={webhookForm.provider}
                onChange={e => setWebhookForm(prev => ({ ...prev, provider: e.target.value as IntegrationProvider }))}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg"
              >
                {Object.keys(PROVIDER_LABELS).map(p => (
                  <option key={p} value={p}>{PROVIDER_LABELS[p as IntegrationProvider].name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Endpoint URL</label>
              <input
                type="url"
                value={webhookForm.endpointUrl}
                onChange={e => setWebhookForm(prev => ({ ...prev, endpointUrl: e.target.value }))}
                placeholder="https://example.com/webhook"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Secret Key (optional)</label>
              <input
                type="password"
                value={webhookForm.secretKey}
                onChange={e => setWebhookForm(prev => ({ ...prev, secretKey: e.target.value }))}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Events</label>
              <div className="grid grid-cols-2 gap-2">
                {WEBHOOK_EVENTS.map(event => (
                  <label key={event} className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={webhookForm.events.includes(event)}
                      onChange={e => {
                        if (e.target.checked) {
                          setWebhookForm(prev => ({ ...prev, events: [...prev.events, event] }));
                        } else {
                          setWebhookForm(prev => ({ ...prev, events: prev.events.filter(ev => ev !== event) }));
                        }
                      }}
                      className="rounded border-slate-300"
                    />
                    {event}
                  </label>
                ))}
              </div>
            </div>

            <button
              onClick={handleCreateWebhook}
              className="w-full py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
            >
              Create Webhook
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

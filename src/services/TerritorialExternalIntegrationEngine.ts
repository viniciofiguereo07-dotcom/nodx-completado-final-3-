import { supabase } from '../lib/supabase';

// ---------------------------------------------------------------------------
// TerritorialExternalIntegrationEngine – Phase 25 (Backend)
// ---------------------------------------------------------------------------

// ============================================================================
// SECTION 1: TYPE DEFINITIONS
// ============================================================================

export type IntegrationProvider =
  | 'powerbi'
  | 'arcgis'
  | 'qgis'
  | 'dhis2'
  | 'kobo'
  | 'odk'
  | 'google_sheets';

export type AuthType = 'api_key' | 'oauth2' | 'basic' | 'bearer' | 'custom';

export type IntegrationStatus = 'active' | 'inactive' | 'error' | 'pending' | 'disabled';

export interface APIEndpoint {
  id: string;
  organization_id: string;
  name: string;
  provider: IntegrationProvider;
  base_url: string;
  version: string;
  timeout_ms: number;
  retry_count: number;
  retry_delay_ms: number;
  status: IntegrationStatus;
  metadata: Record<string, unknown>;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface APIEndpointConfig {
  organizationId: string;
  name: string;
  provider: IntegrationProvider;
  baseUrl: string;
  version?: string;
  timeoutMs?: number;
  retryCount?: number;
  retryDelayMs?: number;
  metadata?: Record<string, unknown>;
}

export interface ConnectorConfig {
  organizationId: string;
  provider: IntegrationProvider;
  displayName: string;
  endpointId?: string;
  authConfig: AuthConfig;
  syncConfig?: SyncConfig;
  mappingConfig?: FieldMappingConfig;
  enabled: boolean;
}

export interface Connector {
  id: string;
  organization_id: string;
  provider: IntegrationProvider;
  display_name: string;
  endpoint_id: string | null;
  auth_type: AuthType;
  auth_config_encrypted: string;
  sync_config: SyncConfig;
  mapping_config: FieldMappingConfig;
  enabled: boolean;
  status: IntegrationStatus;
  last_sync_at: string | null;
  last_sync_status: 'success' | 'partial' | 'failed' | null;
  sync_error: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface AuthConfig {
  type: AuthType;
  apiKey?: string;
  apiSecret?: string;
  oauthClientId?: string;
  oauthClientSecret?: string;
  oauthRedirectUri?: string;
  oauthRefreshToken?: string;
  username?: string;
  password?: string;
  bearerToken?: string;
  customHeaders?: Record<string, string>;
  customParams?: Record<string, string>;
}

export interface SyncConfig {
  mode: 'manual' | 'scheduled' | 'realtime';
  schedule?: string;
  direction: 'import' | 'export' | 'bidirectional';
  batchSize: number;
  conflictResolution: 'source_wins' | 'target_wins' | 'latest_wins' | 'manual';
  enabledEntities: string[];
  filters?: Record<string, unknown>;
}

export interface FieldMappingConfig {
  mappings: FieldMapping[];
  transformations: FieldTransformation[];
}

export interface FieldMapping {
  sourceField: string;
  targetField: string;
  dataType: 'string' | 'number' | 'boolean' | 'date' | 'geometry' | 'json';
  required: boolean;
  defaultValue?: unknown;
}

export interface FieldTransformation {
  field: string;
  type: 'uppercase' | 'lowercase' | 'trim' | 'format_date' | 'parse_json' | 'custom';
  params?: Record<string, unknown>;
}

export interface WebhookConfig {
  organizationId: string;
  name: string;
  provider: IntegrationProvider;
  connectorId?: string;
  events: WebhookEvent[];
  endpointUrl: string;
  secretKey?: string;
  enabled: boolean;
  retryPolicy?: WebhookRetryPolicy;
}

export interface Webhook {
  id: string;
  organization_id: string;
  name: string;
  provider: IntegrationProvider;
  connector_id: string | null;
  events: WebhookEvent[];
  endpoint_url: string;
  secret_key_encrypted: string | null;
  enabled: boolean;
  retry_policy: WebhookRetryPolicy;
  status: IntegrationStatus;
  last_triggered_at: string | null;
  last_response_status: number | null;
  failure_count: number;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export type WebhookEvent =
  | ' sync.started'
  | 'sync.completed'
  | 'sync.failed'
  | 'data.created'
  | 'data.updated'
  | 'data.deleted'
  | 'error.critical'
  | 'health.degraded'
  | 'auth.expired'
  | 'quota.exceeded';

export interface WebhookRetryPolicy {
  maxRetries: number;
  initialDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
}

export interface HealthStatus {
  connector_id: string;
  provider: IntegrationProvider;
  status: 'healthy' | 'degraded' | 'unhealthy' | 'unknown';
  last_check_at: string;
  response_time_ms: number | null;
  latency_percentile_p50: number | null;
  latency_percentile_p95: number | null;
  latency_percentile_p99: number | null;
  success_rate_24h: number | null;
  error_count_24h: number;
  error_count_1h: number;
  last_error: string | null;
  last_error_at: string | null;
  uptime_pct_7d: number | null;
  quota_used_pct: number | null;
  quota_remaining: number | null;
  quota_reset_at: string | null;
  metadata: Record<string, unknown>;
}

export interface IntegrationAuditLog {
  id: string;
  organization_id: string;
  connector_id: string | null;
  webhook_id: string | null;
  action: IntegrationAuditAction;
  provider: IntegrationProvider;
  status: 'success' | 'failure' | 'partial';
  details: Record<string, unknown>;
  request_method: string | null;
  request_url: string | null;
  request_headers: Record<string, string> | null;
  request_body: unknown;
  response_status: number | null;
  response_headers: Record<string, string> | null;
  response_body: unknown;
  duration_ms: number | null;
  error_code: string | null;
  error_message: string | null;
  ip_address: string | null;
  user_agent: string | null;
  user_id: string | null;
  created_at: string;
}

export type IntegrationAuditAction =
  | 'connector.created'
  | 'connector.updated'
  | 'connector.deleted'
  | 'connector.enabled'
  | 'connector.disabled'
  | 'connector.sync_started'
  | 'connector.sync_completed'
  | 'connector.sync_failed'
  | 'endpoint.created'
  | 'endpoint.updated'
  | 'endpoint.deleted'
  | 'webhook.created'
  | 'webhook.updated'
  | 'webhook.deleted'
  | 'webhook.triggered'
  | 'webhook.retried'
  | 'auth.token_refreshed'
  | 'auth.token_revoked'
  | 'auth.credentials_updated'
  | 'health.check'
  | 'health.alert'
  | 'api.request'
  | 'api.response'
  | 'api.error'
  | 'mapping.applied'
  | 'data.imported'
  | 'data.exported';

// ============================================================================
// SECTION 2: CONNECTOR REGISTRY (Provider Specifications)
// ============================================================================

interface ProviderSpec {
  key: IntegrationProvider;
  name: string;
  category: 'bi' | 'gis' | 'data_collection' | 'productivity';
  authTypes: AuthType[];
  defaultBaseUrl: string;
  apiVersion: string;
  capabilities: {
    read: boolean;
    write: boolean;
    realtime: boolean;
    bulkImport: boolean;
    bulkExport: boolean;
    webhooks: boolean;
  };
  rateLimits: {
    requestsPerMinute: number;
    requestsPerDay: number;
  };
  documentation: string;
  icon: string;
}

const CONNECTOR_REGISTRY: Record<IntegrationProvider, ProviderSpec> = {
  powerbi: {
    key: 'powerbi',
    name: 'Microsoft Power BI',
    category: 'bi',
    authTypes: ['oauth2', 'bearer'],
    defaultBaseUrl: 'https://api.powerbi.com/v1.0',
    apiVersion: 'v1.0',
    capabilities: { read: true, write: true, realtime: false, bulkImport: true, bulkExport: true, webhooks: true },
    rateLimits: { requestsPerMinute: 300, requestsPerDay: 10000 },
    documentation: 'https://learn.microsoft.com/power-bi/developer/',
    icon: 'bar-chart-3',
  },
  arcgis: {
    key: 'arcgis',
    name: 'ArcGIS Online',
    category: 'gis',
    authTypes: ['oauth2', 'api_key'],
    defaultBaseUrl: 'https://www.arcgis.com/sharing/rest',
    apiVersion: '11.0',
    capabilities: { read: true, write: true, realtime: false, bulkImport: true, bulkExport: true, webhooks: true },
    rateLimits: { requestsPerMinute: 100, requestsPerDay: 5000 },
    documentation: 'https://developers.arcgis.com/rest/',
    icon: 'map',
  },
  qgis: {
    key: 'qgis',
    name: 'QGIS Server',
    category: 'gis',
    authTypes: ['basic', 'api_key'],
    defaultBaseUrl: '',
    apiVersion: '3.x',
    capabilities: { read: true, write: true, realtime: false, bulkImport: true, bulkExport: true, webhooks: false },
    rateLimits: { requestsPerMinute: 60, requestsPerDay: 1000 },
    documentation: 'https://docs.qgis.org/',
    icon: 'layers',
  },
  dhis2: {
    key: 'dhis2',
    name: 'DHIS2',
    category: 'data_collection',
    authTypes: ['basic', 'oauth2'],
    defaultBaseUrl: '',
    apiVersion: '2.41',
    capabilities: { read: true, write: true, realtime: true, bulkImport: true, bulkExport: true, webhooks: true },
    rateLimits: { requestsPerMinute: 60, requestsPerDay: 5000 },
    documentation: 'https://dhis2.org/developer',
    icon: 'database',
  },
  kobo: {
    key: 'kobo',
    name: 'KoboToolbox',
    category: 'data_collection',
    authTypes: ['bearer', 'basic'],
    defaultBaseUrl: 'https://kc.kobotools.org/api/v2',
    apiVersion: 'v2',
    capabilities: { read: true, write: true, realtime: false, bulkImport: true, bulkExport: true, webhooks: true },
    rateLimits: { requestsPerMinute: 60, requestsPerDay: 2000 },
    documentation: 'https://support.kobotoolbox.org/api/',
    icon: 'clipboard-list',
  },
  odk: {
    key: 'odk',
    name: 'ODK Central',
    category: 'data_collection',
    authTypes: ['bearer', 'basic'],
    defaultBaseUrl: '',
    apiVersion: 'v1',
    capabilities: { read: true, write: true, realtime: false, bulkImport: true, bulkExport: true, webhooks: true },
    rateLimits: { requestsPerMinute: 60, requestsPerDay: 3000 },
    documentation: 'https://docs.getodk.org/central-api/',
    icon: 'file-text',
  },
  google_sheets: {
    key: 'google_sheets',
    name: 'Google Sheets',
    category: 'productivity',
    authTypes: ['oauth2'],
    defaultBaseUrl: 'https://sheets.googleapis.com/v4',
    apiVersion: 'v4',
    capabilities: { read: true, write: true, realtime: false, bulkImport: true, bulkExport: true, webhooks: false },
    rateLimits: { requestsPerMinute: 60, requestsPerDay: 1000000 },
    documentation: 'https://developers.google.com/sheets/api',
    icon: 'table',
  },
};

// ============================================================================
// SECTION 3: INTEGRATION ENGINE CLASS
// ============================================================================

class TerritorialExternalIntegrationEngine {
  // -------------------------------------------------------------------------
  // Section A: API Registry
  // -------------------------------------------------------------------------

  async createAPIEndpoint(config: APIEndpointConfig, userId: string): Promise<APIEndpoint> {
    const { data, error } = await supabase
      .from('integration_endpoints')
      .insert({
        organization_id: config.organizationId,
        name: config.name,
        provider: config.provider,
        base_url: config.baseUrl,
        version: config.version || CONNECTOR_REGISTRY[config.provider].apiVersion,
        timeout_ms: config.timeoutMs || 30000,
        retry_count: config.retryCount || 3,
        retry_delay_ms: config.retryDelayMs || 1000,
        status: 'pending',
        metadata: config.metadata || {},
        created_by: userId,
      })
      .select()
      .single();

    if (error) throw error;
    await this.logAudit({
      organizationId: config.organizationId,
      action: 'endpoint.created',
      provider: config.provider,
      status: 'success',
      details: { endpoint_name: config.name, base_url: config.baseUrl },
      userId,
    });
    return data;
  }

  async getAPIEndpoint(endpointId: string): Promise<APIEndpoint | null> {
    const { data } = await supabase
      .from('integration_endpoints')
      .select('*')
      .eq('id', endpointId)
      .maybeSingle();
    return data;
  }

  async listAPIEndpoints(organizationId: string): Promise<APIEndpoint[]> {
    const { data } = await supabase
      .from('integration_endpoints')
      .select('*')
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false });
    return data || [];
  }

  async updateAPIEndpoint(endpointId: string, updates: Partial<APIEndpoint>, userId: string): Promise<APIEndpoint> {
    const { data, error } = await supabase
      .from('integration_endpoints')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', endpointId)
      .select()
      .single();
    if (error) throw error;
    await this.logAudit({
      organizationId: data.organization_id,
      action: 'endpoint.updated',
      provider: data.provider,
      status: 'success',
      details: { endpoint_id: endpointId, updates },
      userId,
    });
    return data;
  }

  async deleteAPIEndpoint(endpointId: string, userId: string): Promise<void> {
    const { data: endpoint } = await supabase
      .from('integration_endpoints')
      .select('organization_id, provider')
      .eq('id', endpointId)
      .single();

    const { error } = await supabase
      .from('integration_endpoints')
      .delete()
      .eq('id', endpointId);
    if (error) throw error;

    if (endpoint) {
      await this.logAudit({
        organizationId: endpoint.organization_id,
        action: 'endpoint.deleted',
        provider: endpoint.provider,
        status: 'success',
        details: { endpoint_id: endpointId },
        userId,
      });
    }
  }

  // -------------------------------------------------------------------------
  // Section B: Connector Registry
  // -------------------------------------------------------------------------

  getConnectorRegistry(): Record<IntegrationProvider, ProviderSpec> {
    return { ...CONNECTOR_REGISTRY };
  }

  getProviderSpec(provider: IntegrationProvider): ProviderSpec {
    return CONNECTOR_REGISTRY[provider];
  }

  listAvailableProviders(): ProviderSpec[] {
    return Object.values(CONNECTOR_REGISTRY);
  }

  async createConnector(config: ConnectorConfig, userId: string): Promise<Connector> {
    const encryptedAuth = await this.encryptAuthConfig(config.authConfig);

    const { data, error } = await supabase
      .from('integration_connectors')
      .insert({
        organization_id: config.organizationId,
        provider: config.provider,
        display_name: config.displayName,
        endpoint_id: config.endpointId || null,
        auth_type: config.authConfig.type,
        auth_config_encrypted: encryptedAuth,
        sync_config: config.syncConfig || this.getDefaultSyncConfig(),
        mapping_config: config.mappingConfig || { mappings: [], transformations: [] },
        enabled: config.enabled,
        status: 'pending',
        created_by: userId,
      })
      .select()
      .single();

    if (error) throw error;

    await this.logAudit({
      organizationId: config.organizationId,
      action: 'connector.created',
      provider: config.provider,
      status: 'success',
      details: { connector_id: data.id, display_name: config.displayName },
      userId,
    });

    return data;
  }

  async getConnector(connectorId: string): Promise<Connector | null> {
    const { data } = await supabase
      .from('integration_connectors')
      .select('*')
      .eq('id', connectorId)
      .maybeSingle();
    return data;
  }

  async listConnectors(organizationId: string, provider?: IntegrationProvider): Promise<Connector[]> {
    let query = supabase
      .from('integration_connectors')
      .select('*')
      .eq('organization_id', organizationId);

    if (provider) {
      query = query.eq('provider', provider);
    }

    const { data } = await query.order('created_at', { ascending: false });
    return data || [];
  }

  async updateConnector(connectorId: string, updates: Partial<Connector>, userId: string): Promise<Connector> {
    const { data, error } = await supabase
      .from('integration_connectors')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', connectorId)
      .select()
      .single();
    if (error) throw error;

    await this.logAudit({
      organizationId: data.organization_id,
      action: 'connector.updated',
      provider: data.provider,
      status: 'success',
      details: { connector_id: connectorId, updates: Object.keys(updates) },
      userId,
    });

    return data;
  }

  async deleteConnector(connectorId: string, userId: string): Promise<void> {
    const { data: connector } = await supabase
      .from('integration_connectors')
      .select('organization_id, provider')
      .eq('id', connectorId)
      .single();

    const { error } = await supabase
      .from('integration_connectors')
      .delete()
      .eq('id', connectorId);
    if (error) throw error;

    if (connector) {
      await this.logAudit({
        organizationId: connector.organization_id,
        action: 'connector.deleted',
        provider: connector.provider,
        status: 'success',
        details: { connector_id: connectorId },
        userId,
      });
    }
  }

  async enableConnector(connectorId: string, userId: string): Promise<Connector> {
    return this.updateConnector(connectorId, { enabled: true, status: 'active' }, userId);
  }

  async disableConnector(connectorId: string, userId: string): Promise<Connector> {
    return this.updateConnector(connectorId, { enabled: false, status: 'disabled' }, userId);
  }

  // -------------------------------------------------------------------------
  // Section C: Authentication Manager
  // -------------------------------------------------------------------------

  async encryptAuthConfig(config: AuthConfig): Promise<string> {
    // In production, use proper encryption. For now, base64 encode as placeholder
    return btoa(JSON.stringify(config));
  }

  async decryptAuthConfig(encrypted: string): Promise<AuthConfig> {
    // In production, use proper decryption
    return JSON.parse(atob(encrypted));
  }

  async refreshOAuthToken(connectorId: string, userId: string): Promise<string> {
    const connector = await this.getConnector(connectorId);
    if (!connector) throw new Error('Connector not found');

    const authConfig = await this.decryptAuthConfig(connector.auth_config_encrypted);
    if (authConfig.type !== 'oauth2') throw new Error('Not an OAuth2 connector');

    // Provider-specific token refresh logic would go here
    const providerSpec = CONNECTOR_REGISTRY[connector.provider];

    await this.logAudit({
      organizationId: connector.organization_id,
      connectorId,
      action: 'auth.token_refreshed',
      provider: connector.provider,
      status: 'success',
      details: { token_endpoint: providerSpec.defaultBaseUrl },
      userId,
    });

    return 'refreshed_token_placeholder';
  }

  async validateCredentials(connectorId: string): Promise<{ valid: boolean; error?: string }> {
    const connector = await this.getConnector(connectorId);
    if (!connector) return { valid: false, error: 'Connector not found' };

    const authConfig = await this.decryptAuthConfig(connector.auth_config_encrypted);

    // Validate based on auth type
    switch (authConfig.type) {
      case 'api_key':
        return authConfig.apiKey ? { valid: true } : { valid: false, error: 'Missing API key' };
      case 'bearer':
        return authConfig.bearerToken ? { valid: true } : { valid: false, error: 'Missing bearer token' };
      case 'basic':
        return (authConfig.username && authConfig.password)
          ? { valid: true }
          : { valid: false, error: 'Missing credentials' };
      case 'oauth2':
        return authConfig.oauthRefreshToken
          ? { valid: true }
          : { valid: false, error: 'OAuth not configured' };
      default:
        return { valid: false, error: 'Unknown auth type' };
    }
  }

  async updateAuthConfig(connectorId: string, authConfig: AuthConfig, userId: string): Promise<Connector> {
    const encrypted = await this.encryptAuthConfig(authConfig);
    const connector = await this.updateConnector(connectorId, {
      auth_type: authConfig.type,
      auth_config_encrypted: encrypted,
    }, userId);

    await this.logAudit({
      organizationId: connector.organization_id,
      connectorId,
      action: 'auth.credentials_updated',
      provider: connector.provider,
      status: 'success',
      details: { auth_type: authConfig.type },
      userId,
    });

    return connector;
  }

  // -------------------------------------------------------------------------
  // Section D: Webhook Manager
  // -------------------------------------------------------------------------

  async createWebhook(config: WebhookConfig, userId: string): Promise<Webhook> {
    const encryptedSecret = config.secretKey
      ? await this.encryptAuthConfig({ type: 'custom', customParams: { key: config.secretKey } })
      : '';

    const { data, error } = await supabase
      .from('integration_webhooks')
      .insert({
        organization_id: config.organizationId,
        name: config.name,
        provider: config.provider,
        connector_id: config.connectorId || null,
        events: config.events,
        endpoint_url: config.endpointUrl,
        secret_key_encrypted: encryptedSecret,
        enabled: config.enabled,
        retry_policy: config.retryPolicy || this.getDefaultRetryPolicy(),
        status: 'active',
        created_by: userId,
      })
      .select()
      .single();

    if (error) throw error;

    await this.logAudit({
      organizationId: config.organizationId,
      action: 'webhook.created',
      provider: config.provider,
      status: 'success',
      details: { webhook_id: data.id, name: config.name, events: config.events },
      userId,
    });

    return data;
  }

  async getWebhook(webhookId: string): Promise<Webhook | null> {
    const { data } = await supabase
      .from('integration_webhooks')
      .select('*')
      .eq('id', webhookId)
      .maybeSingle();
    return data;
  }

  async listWebhooks(organizationId: string, provider?: IntegrationProvider): Promise<Webhook[]> {
    let query = supabase
      .from('integration_webhooks')
      .select('*')
      .eq('organization_id', organizationId);

    if (provider) {
      query = query.eq('provider', provider);
    }

    const { data } = await query.order('created_at', { ascending: false });
    return data || [];
  }

  async updateWebhook(webhookId: string, updates: Partial<Webhook>, userId: string): Promise<Webhook> {
    const { data, error } = await supabase
      .from('integration_webhooks')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', webhookId)
      .select()
      .single();
    if (error) throw error;

    await this.logAudit({
      organizationId: data.organization_id,
      webhookId,
      action: 'webhook.updated',
      provider: data.provider,
      status: 'success',
      details: { webhook_id: webhookId, updates: Object.keys(updates) },
      userId,
    });

    return data;
  }

  async deleteWebhook(webhookId: string, userId: string): Promise<void> {
    const { data: webhook } = await supabase
      .from('integration_webhooks')
      .select('organization_id, provider')
      .eq('id', webhookId)
      .single();

    const { error } = await supabase
      .from('integration_webhooks')
      .delete()
      .eq('id', webhookId);
    if (error) throw error;

    if (webhook) {
      await this.logAudit({
        organizationId: webhook.organization_id,
        action: 'webhook.deleted',
        provider: webhook.provider,
        status: 'success',
        details: { webhook_id: webhookId },
        userId,
      });
    }
  }

  async triggerWebhook(
    webhookId: string,
    event: WebhookEvent,
    payload: Record<string, unknown>,
    userId?: string
  ): Promise<{ success: boolean; statusCode?: number; error?: string }> {
    const webhook = await this.getWebhook(webhookId);
    if (!webhook) return { success: false, error: 'Webhook not found' };

    const startTime = Date.now();
    let success = false;
    let statusCode: number | undefined;
    let errorMessage: string | undefined;

    try {
      // Simulate webhook call - in production, use fetch
      const response = await fetch(webhook.endpoint_url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Webhook-Event': event,
          'X-Webhook-ID': webhookId,
        },
        body: JSON.stringify(payload),
      });

      statusCode = response.status;
      success = response.ok;

      if (!success) {
        errorMessage = `HTTP ${response.status}`;
      }
    } catch (err) {
      errorMessage = err instanceof Error ? err.message : 'Unknown error';
      success = false;
    }

    const durationMs = Date.now() - startTime;

    // Update webhook stats
    await supabase
      .from('integration_webhooks')
      .update({
        last_triggered_at: new Date().toISOString(),
        last_response_status: statusCode || null,
        failure_count: success ? 0 : webhook.failure_count + 1,
        status: success ? 'active' : 'error',
      })
      .eq('id', webhookId);

    await this.logAudit({
      organizationId: webhook.organization_id,
      webhookId,
      action: success ? 'webhook.triggered' : 'webhook.retried',
      provider: webhook.provider,
      status: success ? 'success' : 'failure',
      details: { event, payload_preview: JSON.stringify(payload).substring(0, 500) },
      responseStatus: statusCode,
      durationMs,
      errorCode: success ? null : 'WEBHOOK_FAILED',
      errorMessage,
      userId,
    });

    return { success, statusCode, error: errorMessage };
  }

  // -------------------------------------------------------------------------
  // Section E: Health Monitor
  // -------------------------------------------------------------------------

  async checkConnectorHealth(connectorId: string): Promise<HealthStatus> {
    const connector = await this.getConnector(connectorId);
    if (!connector) {
      return this.createHealthStatus(connectorId, connector?.provider || 'powerbi', 'unknown');
    }

    const startTime = Date.now();
    let status: 'healthy' | 'degraded' | 'unhealthy' | 'unknown' = 'unknown';
    let responseTimeMs: number | null = null;
    let lastError: string | null = null;

    try {
      // Validate credentials first
      const credResult = await this.validateCredentials(connectorId);
      if (!credResult.valid) {
        status = 'unhealthy';
        lastError = credResult.error || 'Invalid credentials';
      } else {
        // Simulate health check ping
        responseTimeMs = Math.floor(Math.random() * 200) + 50; // Placeholder
        status = responseTimeMs < 500 ? 'healthy' : 'degraded';
      }
    } catch (err) {
      status = 'unhealthy';
      lastError = err instanceof Error ? err.message : 'Health check failed';
    }

    const healthStatus = this.createHealthStatus(connectorId, connector.provider, status);
    healthStatus.last_check_at = new Date().toISOString();
    healthStatus.response_time_ms = responseTimeMs;
    healthStatus.last_error = lastError;
    healthStatus.last_error_at = lastError ? new Date().toISOString() : null;

    // Store health status
    await supabase.from('integration_health').upsert({
      connector_id: connectorId,
      provider: connector.provider,
      ...healthStatus,
    });

    // Log if degraded or unhealthy
    if (status !== 'healthy') {
      await this.logAudit({
        organizationId: connector.organization_id,
        connectorId,
        action: 'health.alert',
        provider: connector.provider,
        status: status === 'degraded' ? 'partial' : 'failure',
        details: { response_time_ms: responseTimeMs, error: lastError },
        errorCode: status === 'unhealthy' ? 'HEALTH_UNHEALTHY' : 'HEALTH_DEGRADED',
        errorMessage: lastError,
      });
    }

    return healthStatus;
  }

  async getHealthStatus(connectorId: string): Promise<HealthStatus | null> {
    const { data } = await supabase
      .from('integration_health')
      .select('*')
      .eq('connector_id', connectorId)
      .maybeSingle();
    return data;
  }

  async getAllHealthStatuses(organizationId: string): Promise<HealthStatus[]> {
    const connectors = await this.listConnectors(organizationId);
    const healthStatuses: HealthStatus[] = [];

    for (const connector of connectors) {
      const health = await this.getHealthStatus(connector.id);
      if (health) {
        healthStatuses.push(health);
      } else {
        healthStatuses.push(this.createHealthStatus(connector.id, connector.provider, 'unknown'));
      }
    }

    return healthStatuses;
  }

  private createHealthStatus(
    connectorId: string,
    provider: IntegrationProvider,
    status: 'healthy' | 'degraded' | 'unhealthy' | 'unknown'
  ): HealthStatus {
    return {
      connector_id: connectorId,
      provider,
      status,
      last_check_at: new Date().toISOString(),
      response_time_ms: null,
      latency_percentile_p50: null,
      latency_percentile_p95: null,
      latency_percentile_p99: null,
      success_rate_24h: null,
      error_count_24h: 0,
      error_count_1h: 0,
      last_error: null,
      last_error_at: null,
      uptime_pct_7d: null,
      quota_used_pct: null,
      quota_remaining: null,
      quota_reset_at: null,
      metadata: {},
    };
  }

  // -------------------------------------------------------------------------
  // Section F: Integration Audit Log
  // -------------------------------------------------------------------------

  async logAudit(params: {
    organizationId: string;
    connectorId?: string;
    webhookId?: string;
    action: IntegrationAuditAction;
    provider: IntegrationProvider;
    status: 'success' | 'failure' | 'partial';
    details?: Record<string, unknown>;
    requestMethod?: string;
    requestUrl?: string;
    requestHeaders?: Record<string, string>;
    requestBody?: unknown;
    responseStatus?: number;
    responseHeaders?: Record<string, string>;
    responseBody?: unknown;
    durationMs?: number;
    errorCode?: string | null;
    errorMessage?: string | null;
    userId?: string;
  }): Promise<IntegrationAuditLog> {
    const { data, error } = await supabase
      .from('integration_audit_logs')
      .insert({
        organization_id: params.organizationId,
        connector_id: params.connectorId || null,
        webhook_id: params.webhookId || null,
        action: params.action,
        provider: params.provider,
        status: params.status,
        details: params.details || {},
        request_method: params.requestMethod || null,
        request_url: params.requestUrl || null,
        request_headers: params.requestHeaders || null,
        request_body: params.requestBody || null,
        response_status: params.responseStatus || null,
        response_headers: params.responseHeaders || null,
        response_body: params.responseBody || null,
        duration_ms: params.durationMs || null,
        error_code: params.errorCode || null,
        error_message: params.errorMessage || null,
        user_id: params.userId || null,
      })
      .select()
      .single();

    if (error) {
      console.error('Failed to log audit:', error);
      throw error;
    }

    return data;
  }

  async getAuditLogs(
    organizationId: string,
    filters?: {
      connectorId?: string;
      webhookId?: string;
      provider?: IntegrationProvider;
      action?: IntegrationAuditAction;
      status?: 'success' | 'failure' | 'partial';
      startDate?: string;
      endDate?: string;
      limit?: number;
    }
  ): Promise<IntegrationAuditLog[]> {
    let query = supabase
      .from('integration_audit_logs')
      .select('*')
      .eq('organization_id', organizationId);

    if (filters?.connectorId) query = query.eq('connector_id', filters.connectorId);
    if (filters?.webhookId) query = query.eq('webhook_id', filters.webhookId);
    if (filters?.provider) query = query.eq('provider', filters.provider);
    if (filters?.action) query = query.eq('action', filters.action);
    if (filters?.status) query = query.eq('status', filters.status);
    if (filters?.startDate) query = query.gte('created_at', filters.startDate);
    if (filters?.endDate) query = query.lte('created_at', filters.endDate);

    query = query.order('created_at', { ascending: false });
    if (filters?.limit) query = query.limit(filters.limit);

    const { data } = await query;
    return data || [];
  }

  async getAuditStats(organizationId: string, days: number = 7): Promise<{
    totalRequests: number;
    successRate: number;
    avgResponseTime: number;
    errorCounts: Record<string, number>;
    byProvider: Record<IntegrationProvider, { requests: number; errors: number }>;
  }> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const logs = await this.getAuditLogs(organizationId, {
      startDate: startDate.toISOString(),
    });

    const totalRequests = logs.length;
    const successCount = logs.filter(l => l.status === 'success').length;
    const successRate = totalRequests > 0 ? (successCount / totalRequests) * 100 : 0;

    const responseTimes = logs
      .filter(l => l.duration_ms !== null)
      .map(l => l.duration_ms!);
    const avgResponseTime = responseTimes.length > 0
      ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length
      : 0;

    const errorCounts: Record<string, number> = {};
    logs.filter(l => l.error_code).forEach(l => {
      errorCounts[l.error_code!] = (errorCounts[l.error_code!] || 0) + 1;
    });

    const byProvider: Record<IntegrationProvider, { requests: number; errors: number }> = {} as any;
    for (const log of logs) {
      if (!byProvider[log.provider]) {
        byProvider[log.provider] = { requests: 0, errors: 0 };
      }
      byProvider[log.provider].requests++;
      if (log.status === 'failure') {
        byProvider[log.provider].errors++;
      }
    }

    return { totalRequests, successRate, avgResponseTime, errorCounts, byProvider };
  }

  // -------------------------------------------------------------------------
  // Helpers
  // -------------------------------------------------------------------------

  private getDefaultSyncConfig(): SyncConfig {
    return {
      mode: 'manual',
      direction: 'import',
      batchSize: 100,
      conflictResolution: 'latest_wins',
      enabledEntities: [],
    };
  }

  private getDefaultRetryPolicy(): WebhookRetryPolicy {
    return {
      maxRetries: 3,
      initialDelayMs: 1000,
      maxDelayMs: 30000,
      backoffMultiplier: 2,
    };
  }
}

export const territorialExternalIntegrationEngine = new TerritorialExternalIntegrationEngine();
export default TerritorialExternalIntegrationEngine;

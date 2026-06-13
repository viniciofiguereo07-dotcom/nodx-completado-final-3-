export type UserRole =
  | 'super_admin'
  | 'org_admin'
  | 'project_manager'
  | 'supervisor'
  | 'agent'
  | 'auditor'
  | 'viewer';

export interface Profile {
  id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface Organization {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  is_active: boolean;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface OrgMember {
  id: string;
  organization_id: string;
  user_id: string;
  role: UserRole;
  is_active: boolean;
  invited_at: string;
  joined_at: string | null;
  created_at: string;
  profile?: Profile;
}

export interface Plan {
  id: string;
  name: string;
  description: string | null;
  max_members: number;
  max_devices: number;
  max_territories: number;
  max_storage_gb: number;
  included_modules: string[];
  is_active: boolean;
  created_at: string;
}

export interface License {
  id: string;
  organization_id: string;
  plan_id: string;
  status: 'active' | 'expired' | 'suspended' | 'trial';
  starts_at: string;
  expires_at: string | null;
  created_at: string;
  plan?: Plan;
}

export interface Module {
  id: string;
  key: string;
  name: string;
  description: string | null;
  icon: string | null;
  is_core: boolean;
  created_at: string;
}

export interface OrgModule {
  id: string;
  organization_id: string;
  module_key: string;
  is_active: boolean;
  enabled_at: string;
}

export interface Permission {
  id: string;
  key: string;
  name: string;
  description: string | null;
  module: string;
  created_at: string;
}

export interface Role {
  id: string;
  organization_id: string | null;
  name: string;
  display_name: string;
  description: string | null;
  is_system: boolean;
  color: string;
  created_at: string;
}

export interface RolePermission {
  id: string;
  role_id: string;
  permission_key: string;
  created_at: string;
}

export type TerritoryLevel =
  | 'country'
  | 'region'
  | 'province'
  | 'municipality'
  | 'district'
  | 'sector'
  | 'zone'
  | 'microzone';

export interface Territory {
  id: string;
  organization_id: string;
  parent_id: string | null;
  name: string;
  level: TerritoryLevel;
  level_order: number;
  description: string | null;
  color: string;
  boundary: GeoJSONPolygon | null;
  center_lat: number | null;
  center_lng: number | null;
  assigned_to: string | null;
  is_active: boolean;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  children?: Territory[];
}

export interface GeoJSONPolygon {
  type: 'Polygon' | 'MultiPolygon';
  coordinates: number[][][];
}

export interface Waypoint {
  index: number;
  lat: number;
  lng: number;
  label: string;
  address?: string;
  expected_duration_minutes?: number;
}

export interface Route {
  id: string;
  organization_id: string;
  territory_id: string | null;
  name: string;
  description: string | null;
  assigned_to: string | null;
  waypoints: Waypoint[];
  optimized_order: number[];
  status: 'draft' | 'active' | 'archived';
  recurrence: 'none' | 'daily' | 'weekly' | 'monthly';
  distance_km: number;
  estimated_duration_minutes: number;
  completion_percentage: number;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  territory?: Territory;
}

export interface Visit {
  id: string;
  organization_id: string;
  route_id: string | null;
  territory_id: string | null;
  agent_id: string | null;
  location: { lat: number; lng: number; accuracy?: number } | null;
  address: string | null;
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
  started_at: string | null;
  completed_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export type FormFieldType =
  | 'text'
  | 'textarea'
  | 'number'
  | 'decimal'
  | 'currency'
  | 'select'
  | 'multiselect'
  | 'dropdown'
  | 'checkbox'
  | 'boolean'
  | 'date'
  | 'time'
  | 'datetime'
  | 'photo'
  | 'photo_multi'
  | 'audio'
  | 'video'
  | 'signature'
  | 'location'
  | 'barcode'
  | 'qr'
  | 'ranking'
  | 'matrix'
  | 'likert'
  | 'calculated'
  | 'repeat_group';

export interface FormField {
  id: string;
  type: FormFieldType;
  label: string;
  name: string;
  required: boolean;
  placeholder?: string;
  help_text?: string;
  options?: string[];
  rows?: string[];     // matrix row labels
  columns?: string[];  // matrix column labels / likert labels
  formula?: string;    // for calculated fields
  currency_code?: string;
  min_value?: number;
  max_value?: number;
  validation?: { min?: number; max?: number; pattern?: string; min_length?: number; max_length?: number };
  conditions?: Array<{ field_id: string; operator: 'eq' | 'neq' | 'gt' | 'lt' | 'contains'; value: unknown }>;
  fields?: FormField[];
  group_id?: string;
}

export interface FormLogic {
  id: string;
  type: 'skip' | 'show' | 'require';
  target_field_id: string;
  conditions: Array<{ field_id: string; operator: string; value: unknown }>;
}

export interface FormSchema {
  fields: FormField[];
  logic: FormLogic[] | LogicRule[];
  groups: Array<{ id: string; name: string; field_ids: string[] }>;
}

export interface FormTemplate {
  id: string;
  organization_id: string;
  name: string;
  description: string | null;
  schema: FormSchema;
  version: number;
  status: 'draft' | 'published' | 'archived';
  tags: string[];
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface FormSubmission {
  id: string;
  organization_id: string;
  template_id: string;
  template_version: number;
  visit_id: string | null;
  submitted_by: string | null;
  data: Record<string, unknown>;
  location: { lat: number; lng: number } | null;
  attachments: string[];
  status: 'submitted' | 'reviewed' | 'rejected' | 'draft';
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
  template?: FormTemplate;
}

export interface Device {
  id: string;
  organization_id: string;
  name: string;
  serial_number: string | null;
  model: string | null;
  platform: 'android' | 'ios' | 'web';
  os_version: string | null;
  app_version: string | null;
  assigned_to: string | null;
  status: 'active' | 'inactive' | 'lost' | 'decommissioned';
  last_seen_at: string | null;
  last_location: { lat: number; lng: number; timestamp: string } | null;
  push_token: string | null;
  metadata: Record<string, unknown>;
  registered_at: string;
  created_at: string;
}

export interface InventoryItem {
  id: string;
  organization_id: string;
  territory_id: string | null;
  name: string;
  sku: string | null;
  description: string | null;
  unit: string;
  quantity_on_hand: number;
  quantity_reserved: number;
  reorder_threshold: number;
  center_lat: number | null;
  center_lng: number | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface InventoryTransaction {
  id: string;
  organization_id: string;
  item_id: string;
  visit_id: string | null;
  type: 'receipt' | 'issue' | 'adjustment' | 'return' | 'transfer';
  quantity: number;
  notes: string | null;
  performed_by: string | null;
  location: { lat: number; lng: number } | null;
  created_at: string;
}

export interface WorkflowNode {
  id: string;
  type: 'trigger' | 'form' | 'validation' | 'review' | 'approval' | 'inventory' | 'analytics' | 'ai' | 'notification' | 'condition' | 'end';
  label: string;
  x: number;
  y: number;
  config: Record<string, unknown>;
}

export interface WorkflowEdge {
  id: string;
  source: string;
  target: string;
  label?: string;
  condition?: string;
}

export interface WorkflowDefinition {
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
}

export interface Workflow {
  id: string;
  organization_id: string;
  name: string;
  description: string | null;
  definition: WorkflowDefinition;
  status: 'draft' | 'active' | 'archived';
  trigger_type: 'manual' | 'form_submit' | 'visit_complete' | 'inventory_low' | 'schedule';
  trigger_config: Record<string, unknown>;
  execution_count: number;
  last_executed_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface WorkflowExecution {
  id: string;
  organization_id: string;
  workflow_id: string;
  triggered_by: string | null;
  status: 'running' | 'completed' | 'failed' | 'paused';
  current_node: string | null;
  context: Record<string, unknown>;
  logs: Array<{ timestamp: string; node: string; message: string; level: 'info' | 'warning' | 'error' }>;
  started_at: string;
  completed_at: string | null;
  created_at: string;
}

export interface AIQuery {
  id: string;
  organization_id: string;
  // AI Engine fields
  user_id: string;
  prompt: string;
  query_type: 'general' | 'anomaly' | 'classification' | 'recommendation' | 'trend' | 'summary';
  context: Record<string, unknown>;
  result: Record<string, unknown> | null;
  summary: string | null;
  insights: Array<{ type: string; message: string; severity: 'info' | 'warning' | 'critical' }>;
  status: 'pending' | 'running' | 'processing' | 'completed' | 'failed';
  error: string | null;
  tokens_used: number;
  created_at: string;
  completed_at: string | null;
  // AI Analyst fields
  asked_by?: string;
  question?: string;
  answer?: string | null;
  context_types?: string[];
  context_ids?: string[];
  model_used?: string | null;
  confidence?: number | null;
}

export interface SyncQueueItem {
  id: string;
  organization_id: string;
  user_id: string;
  device_id: string | null;
  operation: 'insert' | 'update' | 'delete';
  resource_type: string;
  resource_id: string | null;
  payload: Record<string, unknown>;
  status: 'pending' | 'processing' | 'synced' | 'conflict' | 'failed';
  conflict_data: Record<string, unknown> | null;
  retry_count: number;
  error_message: string | null;
  synced_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface AuditLog {
  id: string;
  organization_id: string | null;
  actor_id: string | null;
  actor_role: string | null;
  action: string;
  resource_type: string | null;
  resource_id: string | null;
  before: Record<string, unknown> | null;
  after: Record<string, unknown> | null;
  ip_address: string | null;
  user_agent: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

export const TERRITORY_LEVELS: TerritoryLevel[] = [
  'country', 'region', 'province', 'municipality', 'district', 'sector', 'zone', 'microzone'
];

export const TERRITORY_LEVEL_LABELS: Record<TerritoryLevel, string> = {
  country: 'Country',
  region: 'Region',
  province: 'Province',
  municipality: 'Municipality',
  district: 'District',
  sector: 'Sector',
  zone: 'Zone',
  microzone: 'Microzone',
};

export const ROLE_LABELS: Record<UserRole, string> = {
  super_admin: 'Super Admin',
  org_admin: 'Org Admin',
  project_manager: 'Project Manager',
  supervisor: 'Supervisor',
  agent: 'Field Agent',
  auditor: 'Auditor',
  viewer: 'Viewer',
};

export const ROLE_COLORS: Record<UserRole, string> = {
  super_admin: 'bg-red-100 text-red-800',
  org_admin: 'bg-orange-100 text-orange-800',
  project_manager: 'bg-blue-100 text-blue-800',
  supervisor: 'bg-purple-100 text-purple-800',
  agent: 'bg-green-100 text-green-800',
  auditor: 'bg-yellow-100 text-yellow-800',
  viewer: 'bg-gray-100 text-gray-800',
};

// ============================================================
// GPS & Geolocation
// ============================================================
export interface GPSCapture {
  lat: number;
  lng: number;
  accuracy: number;
  altitude: number | null;
  timestamp: string;
}

// ============================================================
// Conditional Logic Engine
// ============================================================
export type LogicOperator =
  | 'equals' | 'not_equals'
  | 'contains' | 'not_contains'
  | 'greater_than' | 'less_than'
  | 'is_empty' | 'is_not_empty'
  | 'in' | 'not_in';

export type LogicAction =
  | 'show' | 'hide'
  | 'require' | 'unrequire'
  | 'jump_to_section'
  | 'end_survey'
  | 'set_value';

export interface LogicRule {
  id: string;
  trigger_field: string;
  operator: LogicOperator;
  value: unknown;
  action: LogicAction;
  target_fields?: string[];
  target_sections?: string[];
}

// ============================================================
// Geometry Engine
// ============================================================
export interface GeoJSONGeometry {
  type: 'Point' | 'LineString' | 'Polygon';
  coordinates: number[] | number[][] | number[][][];
}

export interface GeometryLayer {
  id: string;
  organization_id: string;
  name: string;
  description: string | null;
  geometry_type: 'point' | 'line' | 'polygon' | 'mixed';
  color: string;
  is_visible: boolean;
  source: 'manual' | 'import' | 'derived';
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface GeometryFeature {
  id: string;
  organization_id: string;
  layer_id: string | null;
  name: string;
  type: 'point' | 'line' | 'polygon';
  geometry: GeoJSONGeometry;
  properties: Record<string, unknown>;
  style: { color?: string; weight?: number; fill?: string; opacity?: number };
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

// ============================================================
// Risk Mapping
// ============================================================
export interface RiskLayer {
  id: string;
  organization_id: string;
  name: string;
  category: 'hazard' | 'vulnerability' | 'exposure' | 'risk';
  hazard_type: string | null;
  severity: 1 | 2 | 3 | 4 | 5;
  geometry_feature_id: string | null;
  properties: Record<string, unknown>;
  source: string | null;
  assessment_date: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface VulnerabilityAssessment {
  id: string;
  organization_id: string;
  territory_id: string | null;
  indicator_name: string;
  indicator_value: number | null;
  indicator_score: 1 | 2 | 3 | 4 | 5 | null;
  assessment_date: string | null;
  source: string | null;
  created_at: string;
}

// ============================================================
// Import Engine
// ============================================================
export interface ImportJob {
  id: string;
  organization_id: string;
  created_by: string | null;
  target_table: string;
  file_name: string;
  file_format: string;
  status: 'pending' | 'parsing' | 'validating' | 'importing' | 'completed' | 'failed' | 'rolled_back';
  total_rows: number | null;
  imported_rows: number;
  skipped_rows: number;
  failed_rows: number;
  error_log: Array<{ row: number; field: string; error: string }>;
  field_mapping: Record<string, string> | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
}

// ============================================================
// Humanitarian: Households
// ============================================================
export interface Household {
  id: string;
  organization_id: string;
  territory_id: string | null;
  household_id: string | null;
  head_of_household: string | null;
  head_sex: 'male' | 'female' | 'other' | null;
  household_size: number | null;
  lat: number | null;
  lng: number | null;
  address: string | null;
  displacement_status: 'resident' | 'idp' | 'returnee' | 'refugee' | 'unknown' | null;
  registration_date: string | null;
  properties: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface HouseholdMember {
  id: string;
  household_id: string;
  organization_id: string;
  name: string | null;
  sex: 'male' | 'female' | 'other' | null;
  age_years: number | null;
  age_months: number | null;
  relationship: string | null;
  disability: boolean;
  education_level: string | null;
  occupation: string | null;
  created_at: string;
}

// ============================================================
// Humanitarian: WASH
// ============================================================
export interface WashWaterPoint {
  id: string;
  organization_id: string;
  territory_id: string | null;
  name: string;
  type: 'borehole' | 'spring' | 'piped' | 'surface' | 'rainwater' | 'other' | null;
  status: 'functional' | 'non_functional' | 'needs_repair' | 'decommissioned';
  lat: number | null;
  lng: number | null;
  population_served: number | null;
  water_quality_score: 1 | 2 | 3 | 4 | 5 | null;
  chlorine_residual_mgl: number | null;
  turbidity_ntu: number | null;
  last_tested_at: string | null;
  last_maintained_at: string | null;
  properties: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface WashSanitationFacility {
  id: string;
  organization_id: string;
  territory_id: string | null;
  name: string;
  facility_type: 'latrine' | 'toilet' | 'slab' | 'open_defecation_free' | 'other' | null;
  status: 'functional' | 'non_functional' | 'needs_repair';
  lat: number | null;
  lng: number | null;
  households_served: number | null;
  has_handwashing: boolean;
  last_cleaned_at: string | null;
  properties: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

// ============================================================
// M&E Indicators
// ============================================================
export interface MEIndicator {
  id: string;
  organization_id: string;
  name: string;
  code: string | null;
  sector: string | null;
  unit_of_measure: string | null;
  direction: 'higher_better' | 'lower_better';
  baseline_value: number | null;
  baseline_date: string | null;
  target_value: number | null;
  target_date: string | null;
  disaggregations: string[];
  source_form_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface MEIndicatorValue {
  id: string;
  organization_id: string;
  indicator_id: string;
  territory_id: string | null;
  period_start: string;
  period_end: string;
  actual_value: number | null;
  numerator: number | null;
  denominator: number | null;
  disaggregation: Record<string, unknown>;
  data_source: string | null;
  collected_by: string | null;
  verified: boolean;
  notes: string | null;
  created_at: string;
}

// ============================================================
// Food Security
// ============================================================
export interface FoodConsumptionSurvey {
  id: string;
  organization_id: string;
  household_id: string | null;
  territory_id: string | null;
  survey_date: string;
  recall_period_days: number;
  fcs_score: number | null;
  fcs_group: 'poor' | 'borderline' | 'acceptable' | null;
  hdds_score: number | null;
  rcsi_score: number | null;
  hhs_score: number | null;
  staples_days: number | null;
  pulses_days: number | null;
  vegetables_days: number | null;
  fruits_days: number | null;
  meat_days: number | null;
  dairy_days: number | null;
  sugar_days: number | null;
  oils_days: number | null;
  relied_less_preferred_foods: boolean | null;
  limited_portion_size: boolean | null;
  reduced_meals_frequency: boolean | null;
  borrowed_food: boolean | null;
  surveyor_id: string | null;
  created_at: string;
}

// ============================================================
// Phase E – Geographic Hierarchy
// ============================================================
export interface GeographicLevel {
  id: string;
  organization_id: string | null;
  name: string;
  code: string;
  rank: number;
  parent_level_id: string | null;
  is_system: boolean;
  created_at: string;
  updated_at: string;
}

export interface GeographicUnit {
  id: string;
  organization_id: string | null;
  level_id: string;
  parent_id: string | null;
  name: string;
  code: string | null;
  pcode: string | null;
  iso_code: string | null;
  centroid: { lat: number; lng: number } | null;
  boundary: GeoJSONGeometry | null;
  population: number | null;
  area_km2: number | null;
  metadata: Record<string, unknown>;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  level?: GeographicLevel;
  children?: GeographicUnit[];
}

export interface GeographicHierarchy {
  id: string;
  organization_id: string;
  name: string;
  description: string | null;
  country_code: string | null;
  levels: string[];
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

// ============================================================
// Phase F – i18n / Multi-language
// ============================================================
export type SupportedLanguage = 'es' | 'en' | 'fr' | 'de' | 'pt' | 'zh' | 'ja';

export interface LanguageConfig {
  code: SupportedLanguage;
  label: string;
  nativeLabel: string;
  rtl?: boolean;
}

export interface TranslationNamespace {
  id: string;
  organization_id: string | null;
  key: string;
  description: string | null;
  is_system: boolean;
  created_at: string;
}

export interface TranslationKey {
  id: string;
  organization_id: string | null;
  namespace_id: string;
  key: string;
  description: string | null;
  default_value: string | null;
  is_system: boolean;
  created_at: string;
  updated_at: string;
}

export interface TranslationValue {
  id: string;
  organization_id: string | null;
  key_id: string;
  language_code: SupportedLanguage;
  value: string;
  is_machine: boolean;
  reviewed: boolean;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface OrganizationLanguage {
  id: string;
  organization_id: string;
  language_code: SupportedLanguage;
  label: string;
  is_default: boolean;
  is_active: boolean;
  sort_order: number;
  created_at: string;
}

// ============================================================
// Phase G – Data Governance
// ============================================================
export type PolicyType = 'retention' | 'archiving' | 'purge' | 'export' | 'consent';
export type ArchiveJobStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';

export interface DataPolicy {
  id: string;
  organization_id: string;
  name: string;
  description: string | null;
  policy_type: PolicyType;
  applies_to: string[];
  rules: Record<string, unknown>;
  is_active: boolean;
  effective_from: string | null;
  effective_to: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface RetentionPolicy {
  id: string;
  organization_id: string;
  name: string;
  table_name: string;
  retention_days: number;
  archive_after_days: number | null;
  purge_after_days: number | null;
  exemption_fields: string[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ArchiveJob {
  id: string;
  organization_id: string;
  policy_id: string | null;
  table_name: string;
  status: ArchiveJobStatus;
  records_scanned: number;
  records_archived: number;
  records_purged: number;
  error_log: string[];
  started_at: string | null;
  completed_at: string | null;
  triggered_by: string | null;
  created_at: string;
}

export interface DataExportRequest {
  id: string;
  organization_id: string;
  requested_by: string;
  export_type: 'full' | 'filtered' | 'table' | 'custom';
  tables: string[] | null;
  filters: Record<string, unknown>;
  format: 'csv' | 'xlsx' | 'json' | 'geojson';
  status: 'pending' | 'processing' | 'ready' | 'failed' | 'expired';
  file_url: string | null;
  expires_at: string | null;
  record_count: number | null;
  created_at: string;
  completed_at: string | null;
}

// ============================================================
// Phase H – Document Management
// ============================================================
export interface DocumentCategory {
  id: string;
  organization_id: string;
  name: string;
  description: string | null;
  parent_id: string | null;
  color: string | null;
  icon: string | null;
  created_at: string;
}

export interface Document {
  id: string;
  organization_id: string;
  category_id: string | null;
  name: string;
  description: string | null;
  file_type: string | null;
  mime_type: string | null;
  current_version: number;
  storage_path: string | null;
  file_size_bytes: number | null;
  tags: string[];
  linked_record_type: string | null;
  linked_record_id: string | null;
  is_archived: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  category?: DocumentCategory;
}

export interface DocumentVersion {
  id: string;
  document_id: string;
  organization_id: string;
  version_number: number;
  storage_path: string;
  file_size_bytes: number | null;
  change_summary: string | null;
  checksum: string | null;
  uploaded_by: string | null;
  created_at: string;
}

export type DocumentAuditAction = 'created' | 'viewed' | 'downloaded' | 'edited' | 'version_added' | 'archived' | 'deleted' | 'shared' | 'tagged';

export interface DocumentAuditEntry {
  id: string;
  document_id: string;
  organization_id: string;
  action: DocumentAuditAction;
  actor_id: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

// ============================================================
// Phase I – Diagnostic & Intelligence Engine
// ============================================================
export type DiagnosticCategory = 'data_quality' | 'completeness' | 'anomaly' | 'threshold' | 'compliance' | 'custom';
export type DiagnosticSeverity = 'critical' | 'high' | 'medium' | 'low' | 'info';
export type DiagnosticActionType = 'alert' | 'flag' | 'block' | 'recommend' | 'notify';

export interface ConditionRule {
  field: string;
  operator: 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'contains' | 'not_contains' | 'is_null' | 'is_not_null';
  value?: unknown;
  logical?: 'AND' | 'OR';
}

export interface DiagnosticRule {
  id: string;
  organization_id: string;
  name: string;
  description: string | null;
  category: DiagnosticCategory;
  severity: DiagnosticSeverity;
  applies_to_table: string;
  condition_sql: string | null;
  condition_rules: ConditionRule[];
  action_type: DiagnosticActionType;
  action_payload: Record<string, unknown>;
  is_active: boolean;
  run_frequency: 'realtime' | 'hourly' | 'daily' | 'weekly' | 'on_demand';
  last_run_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface DiagnosticResult {
  id: string;
  organization_id: string;
  rule_id: string;
  record_type: string;
  record_id: string | null;
  severity: DiagnosticSeverity;
  status: 'open' | 'acknowledged' | 'resolved' | 'dismissed';
  finding: string;
  recommendation: string | null;
  evidence: Record<string, unknown>;
  acknowledged_by: string | null;
  resolved_by: string | null;
  resolved_at: string | null;
  created_at: string;
  rule?: DiagnosticRule;
}

export interface RecommendationTemplate {
  id: string;
  organization_id: string | null;
  code: string;
  title: string;
  description: string | null;
  sector: string | null;
  trigger_conditions: ConditionRule[];
  recommended_actions: { label: string; type: string; payload?: Record<string, unknown> }[];
  priority: number;
  is_system: boolean;
  is_active: boolean;
  created_at: string;
}

export interface RecommendationInstance {
  id: string;
  organization_id: string;
  template_id: string | null;
  linked_record_type: string | null;
  linked_record_id: string | null;
  title: string;
  description: string | null;
  priority: number;
  status: 'pending' | 'in_progress' | 'completed' | 'dismissed';
  assigned_to: string | null;
  due_date: string | null;
  completed_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

// ============================================================
// Phase I-B – Diagnostic Intelligence Engine (extended)
// ============================================================
export type DiagnosticFindingType = 'threshold_violation' | 'anomaly' | 'negative_trend' | 'missing_evidence' | 'compliance_gap' | 'custom';
export type DiagnosticExecutionType = 'full' | 'incremental' | 'on_demand' | 'scheduled';

export interface DiagnosticCatalogItem {
  id: string;
  organization_id: string;
  code: string;
  name: string;
  description: string | null;
  category: DiagnosticCategory;
  check_type: string;
  applies_to_table: string;
  condition_rules: ConditionRule[];
  default_severity: DiagnosticSeverity;
  default_action: Record<string, unknown>;
  parameters: Record<string, unknown>;
  is_system: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface DiagnosticExecution {
  id: string;
  organization_id: string;
  execution_type: DiagnosticExecutionType;
  status: 'pending' | 'running' | 'completed' | 'failed';
  rules_evaluated: number;
  findings_count: number;
  started_at: string;
  completed_at: string | null;
  duration_ms: number | null;
  error_message: string | null;
  metadata: Record<string, unknown>;
  triggered_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface DiagnosticFinding {
  id: string;
  organization_id: string;
  execution_id: string | null;
  rule_id: string | null;
  catalog_id: string | null;
  record_type: string;
  record_id: string | null;
  finding_type: DiagnosticFindingType;
  severity: DiagnosticSeverity;
  confidence_score: number;
  urgency_score: number;
  impact_score: number;
  priority_score: number;
  title: string;
  description: string | null;
  recommendation: string | null;
  evidence: Record<string, unknown>;
  status: 'open' | 'acknowledged' | 'resolved' | 'dismissed';
  acknowledged_by: string | null;
  resolved_by: string | null;
  resolved_at: string | null;
  assigned_to: string | null;
  due_date: string | null;
  created_at: string;
  updated_at: string;
  rule?: DiagnosticRule;
  catalog?: DiagnosticCatalogItem;
}

export interface RecommendationCatalogItem {
  id: string;
  organization_id: string | null;
  code: string;
  title: string;
  description: string | null;
  sector: string | null;
  trigger_conditions: ConditionRule[];
  recommended_actions: { label: string; type: string; payload?: Record<string, unknown> }[];
  priority: number;
  estimated_effort: string | null;
  tags: string[];
  is_system: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface RecommendationAction {
  id: string;
  organization_id: string;
  recommendation_id: string;
  action_label: string;
  action_type: string;
  payload: Record<string, unknown>;
  status: 'pending' | 'in_progress' | 'completed' | 'skipped';
  assigned_to: string | null;
  completed_at: string | null;
  completion_notes: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

// ============================================================
// Phase I-C – Reporting Engine
// ============================================================
export type ReportType = 'executive_summary' | 'detailed_findings' | 'kpi_dashboard' | 'compliance_audit' | 'indicator_progress' | 'diagnostic_overview' | 'custom';

export interface ReportSectionConfig {
  key: string;
  title: string;
  type: 'kpi_summary' | 'semaphore_rollup' | 'diagnostic_findings' | 'indicator_trends' | 'tabulation_scores' | 'compliance_gaps' | 'recommendations' | 'custom';
  parameters: Record<string, unknown>;
  sort_order: number;
}

export interface ReportSection {
  key: string;
  title: string;
  type: ReportSectionConfig['type'];
  data: Record<string, unknown>;
  sort_order: number;
}

export interface ReportTemplate {
  id: string;
  organization_id: string | null;
  code: string;
  name: string;
  description: string | null;
  report_type: ReportType;
  sections: ReportSectionConfig[];
  parameters: Record<string, unknown>;
  schedule_cron: string | null;
  is_system: boolean;
  is_active: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface ReportInstance {
  id: string;
  organization_id: string;
  template_id: string | null;
  name: string;
  report_type: ReportType;
  status: 'pending' | 'generating' | 'completed' | 'failed';
  parameters: Record<string, unknown>;
  sections_data: ReportSection[];
  summary: string | null;
  kpi_snapshot: Record<string, unknown>;
  semaphore_snapshot: Record<string, unknown>;
  diagnostic_snapshot: Record<string, unknown>;
  tabulation_snapshot: Record<string, unknown>;
  total_sections: number;
  generated_at: string | null;
  generation_ms: number | null;
  error_message: string | null;
  file_url: string | null;
  file_format: string | null;
  expires_at: string | null;
  generated_by: string | null;
  created_at: string;
  updated_at: string;
  template?: ReportTemplate;
}

export interface ReportDistribution {
  id: string;
  organization_id: string;
  report_id: string;
  recipient_type: 'user' | 'email' | 'webhook';
  recipient_id: string | null;
  recipient_email: string | null;
  status: 'pending' | 'sent' | 'delivered' | 'failed';
  sent_at: string | null;
  opened_at: string | null;
  created_at: string;
}

// ============================================================
// Phase I-D – Alert Engine
// ============================================================
export type AlertType = 'threshold' | 'comparison' | 'trend' | 'anomaly' | 'inactivity' | 'coverage' | 'diagnostic' | 'custom';
export type AlertSourceEngine = 'indicator' | 'semaphore' | 'diagnostic' | 'reporting' | 'data_quality' | 'route_performance' | 'coverage' | 'risk' | 'territorial' | 'custom';
export type AlertSeverity = 'info' | 'low' | 'medium' | 'high' | 'critical';
export type AlertEventStatus = 'active' | 'acknowledged' | 'resolved' | 'dismissed';
export type AlertChannelType = 'in_app' | 'email' | 'sms' | 'webhook';
export type AlertNotificationStatus = 'pending' | 'sent' | 'delivered' | 'failed';

export interface AlertRule {
  id: string;
  organization_id: string;
  code: string;
  name: string;
  description: string | null;
  alert_type: AlertType;
  source_engine: AlertSourceEngine;
  severity: AlertSeverity;
  priority: number;
  conditions: ConditionRule[];
  cooldown_minutes: number;
  is_active: boolean;
  last_triggered_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface AlertEvent {
  id: string;
  organization_id: string;
  rule_id: string | null;
  source_engine: AlertSourceEngine;
  source_type: string | null;
  source_id: string | null;
  severity: AlertSeverity;
  title: string;
  description: string | null;
  evidence: Record<string, unknown>;
  status: AlertEventStatus;
  acknowledged_by: string | null;
  acknowledged_at: string | null;
  resolved_by: string | null;
  resolved_at: string | null;
  resolution_notes: string | null;
  dismissed_at: string | null;
  created_at: string;
  updated_at: string;
  rule?: AlertRule;
}

export interface AlertChannel {
  id: string;
  organization_id: string;
  channel_type: AlertChannelType;
  name: string;
  config: Record<string, unknown>;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface AlertSubscription {
  id: string;
  organization_id: string;
  rule_id: string | null;
  channel_id: string | null;
  user_id: string | null;
  severity_filter: AlertSeverity[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface AlertNotification {
  id: string;
  organization_id: string;
  event_id: string;
  channel_id: string | null;
  user_id: string | null;
  recipient: string | null;
  status: AlertNotificationStatus;
  sent_at: string | null;
  delivered_at: string | null;
  opened_at: string | null;
  error_message: string | null;
  created_at: string;
}

// ============================================================
// Phase J – Humanitarian Taxonomies
// ============================================================
export type HumanitarianSector = 'WASH' | 'Food Security' | 'Nutrition' | 'Education' | 'Protection' | 'Shelter' | 'Livelihoods' | 'Agriculture' | 'Health' | 'M&E';

export interface TaxonomyGroup {
  id: string;
  organization_id: string | null;
  name: string;
  sector: HumanitarianSector;
  description: string | null;
  is_system: boolean;
  created_at: string;
}

export interface TaxonomyItem {
  id: string;
  organization_id: string | null;
  group_id: string;
  parent_id: string | null;
  code: string;
  label: string;
  description: string | null;
  metadata: Record<string, unknown>;
  sort_order: number;
  is_active: boolean;
  is_system: boolean;
  created_at: string;
  updated_at: string;
  children?: TaxonomyItem[];
}

// ============================================================
// Offline Sync
// ============================================================
export interface OfflineSubmission {
  id: string;
  form_id: string;
  form_name: string;
  organization_id: string;
  data: Record<string, unknown>;
  location: GPSCapture | null;
  media_keys: string[];
  status: 'pending' | 'uploading' | 'synced' | 'conflict' | 'failed';
  retry_count: number;
  error: string | null;
  created_at: string;
  synced_at: string | null;
}

// ============================================================
// Phase AA – Form Versioning
// ============================================================
export type FormLifecycleStatus = 'draft' | 'review' | 'approved' | 'published' | 'archived';

export interface FormVersion {
  id: string;
  organization_id: string;
  form_id: string;
  version_number: number;
  schema: Record<string, unknown>;
  lifecycle_status: FormLifecycleStatus;
  change_summary: string | null;
  published_at: string | null;
  archived_at: string | null;
  created_by: string | null;
  reviewed_by: string | null;
  approved_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface FormVersionMigration {
  id: string;
  organization_id: string;
  form_id: string;
  from_version: number;
  to_version: number;
  migration_map: Record<string, unknown>;
  is_backward_compatible: boolean;
  notes: string | null;
  created_by: string | null;
  created_at: string;
}

// ============================================================
// Phase AB – Universal Indicator Catalog
// ============================================================
export type IndicatorDataType = 'numeric' | 'percentage' | 'boolean' | 'text' | 'score' | 'index';
export type IndicatorAggregation = 'sum' | 'average' | 'min' | 'max' | 'count' | 'last' | 'custom';

export interface IndicatorCatalogItem {
  id: string;
  organization_id: string | null;
  parent_id: string | null;
  code: string;
  name: string;
  description: string | null;
  sector: string | null;
  unit: string | null;
  data_type: IndicatorDataType;
  formula: string | null;
  aggregation: IndicatorAggregation;
  is_composite: boolean;
  is_system: boolean;
  sort_order: number;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  children?: IndicatorCatalogItem[];
  thresholds?: IndicatorThreshold[];
}

export interface IndicatorThreshold {
  id: string;
  indicator_id: string;
  organization_id: string | null;
  label: string;
  min_value: number | null;
  max_value: number | null;
  color: string | null;
  severity: 'critical' | 'high' | 'medium' | 'low' | 'ok' | null;
  created_at: string;
}

export interface IndicatorValue {
  id: string;
  organization_id: string;
  indicator_id: string;
  geo_unit_id: string | null;
  project_id: string | null;
  period_start: string | null;
  period_end: string | null;
  value: number | null;
  text_value: string | null;
  source: 'manual' | 'form_submission' | 'calculated' | 'imported';
  source_record_id: string | null;
  quality_score: number | null;
  notes: string | null;
  recorded_by: string | null;
  created_at: string;
  indicator?: IndicatorCatalogItem;
}

// ============================================================
// Phase AC – Data Quality Engine
// ============================================================
export type DataQualityCheckType =
  | 'duplicate' | 'impossible_gps' | 'missing_evidence' | 'inconsistent_dates'
  | 'invalid_value' | 'incomplete_survey' | 'orphan_record' | 'range_check'
  | 'cross_field' | 'temporal_consistency' | 'custom';

export interface DataQualityRule {
  id: string;
  organization_id: string;
  name: string;
  description: string | null;
  check_type: DataQualityCheckType;
  applies_to: string;
  field_path: string | null;
  condition_rules: Record<string, unknown>[];
  severity: 'error' | 'warning' | 'info';
  score_impact: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface DataQualityIssue {
  id: string;
  organization_id: string;
  rule_id: string;
  record_type: string;
  record_id: string;
  severity: 'error' | 'warning' | 'info';
  issue_code: string;
  description: string;
  field_path: string | null;
  status: 'open' | 'acknowledged' | 'fixed' | 'false_positive';
  fixed_by: string | null;
  fixed_at: string | null;
  created_at: string;
  rule?: DataQualityRule;
}

// ============================================================
// Phase AD – Approval Workflow
// ============================================================
export type ApprovalStatus = 'draft' | 'submitted' | 'under_review' | 'validated' | 'approved' | 'published' | 'rejected' | 'withdrawn';
export type ApprovalAction = 'submitted' | 'approved' | 'rejected' | 'returned' | 'withdrawn' | 'commented';

export interface ApprovalStageConfig {
  index: number;
  name: string;
  required_role?: string;
  reviewer_id?: string;
}

export interface ApprovalWorkflow {
  id: string;
  organization_id: string;
  name: string;
  description: string | null;
  applies_to: 'form_submission' | 'project' | 'indicator_value' | 'document' | 'custom';
  stages: ApprovalStageConfig[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ApprovalInstance {
  id: string;
  organization_id: string;
  workflow_id: string;
  record_type: string;
  record_id: string;
  current_stage: number;
  status: ApprovalStatus;
  submitted_by: string | null;
  submitted_at: string | null;
  completed_at: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  workflow?: ApprovalWorkflow;
  stage_records?: ApprovalStageRecord[];
}

export interface ApprovalStageRecord {
  id: string;
  organization_id: string;
  instance_id: string;
  stage_index: number;
  stage_name: string;
  action: ApprovalAction;
  actor_id: string;
  comment: string | null;
  rejection_reason: string | null;
  created_at: string;
}

// ============================================================
// Phase AE – Project Management
// ============================================================
export type ProjectStatus = 'draft' | 'active' | 'completed' | 'suspended' | 'cancelled' | 'archived';
export type ActivityStatus = 'planned' | 'in_progress' | 'completed' | 'delayed' | 'cancelled';

export interface Program {
  id: string;
  organization_id: string;
  name: string;
  code: string | null;
  description: string | null;
  sector: string | null;
  start_date: string | null;
  end_date: string | null;
  budget: number | null;
  currency: string;
  status: 'draft' | 'active' | 'completed' | 'suspended' | 'cancelled';
  lead_by: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface Project {
  id: string;
  organization_id: string;
  program_id: string | null;
  name: string;
  code: string | null;
  description: string | null;
  objectives: string[];
  start_date: string | null;
  end_date: string | null;
  budget: number | null;
  currency: string;
  status: ProjectStatus;
  geo_coverage: string[];
  beneficiary_target: number | null;
  beneficiary_actual: number | null;
  lead_by: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  program?: Program;
}

export interface Activity {
  id: string;
  organization_id: string;
  project_id: string;
  name: string;
  description: string | null;
  activity_type: string | null;
  start_date: string | null;
  end_date: string | null;
  status: ActivityStatus;
  target_count: number | null;
  actual_count: number | null;
  assigned_to: string | null;
  geo_unit_id: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface ProjectIndicator {
  id: string;
  organization_id: string;
  project_id: string;
  indicator_id: string;
  baseline_value: number | null;
  target_value: number | null;
  current_value: number | null;
  unit: string | null;
  measurement_frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'annual' | 'one_time' | null;
  data_source: string | null;
  notes: string | null;
  created_at: string;
  indicator?: IndicatorCatalogItem;
}

// ============================================================
// Phase AF – Evidence Management
// ============================================================
export type EvidenceType = 'photo' | 'video' | 'audio' | 'pdf' | 'document' | 'gps' | 'signature' | 'other';

export interface EvidenceItem {
  id: string;
  organization_id: string;
  linked_type: 'form_submission' | 'project' | 'activity' | 'diagnostic' | 'task' | 'indicator_value' | 'custom';
  linked_id: string;
  evidence_type: EvidenceType;
  name: string;
  description: string | null;
  storage_path: string | null;
  file_size_bytes: number | null;
  mime_type: string | null;
  duration_sec: number | null;
  gps_lat: number | null;
  gps_lng: number | null;
  gps_accuracy: number | null;
  thumbnail_path: string | null;
  version: number;
  tags: string[];
  captured_at: string | null;
  captured_by: string | null;
  is_verified: boolean;
  verified_by: string | null;
  verified_at: string | null;
  created_at: string;
}

// ============================================================
// Phase AG – Knowledge Library
// ============================================================
export type KnowledgeDocumentType = 'manual' | 'sop' | 'protocol' | 'policy' | 'methodology' | 'technical' | 'article' | 'faq';

export interface KnowledgeCategory {
  id: string;
  organization_id: string;
  name: string;
  description: string | null;
  parent_id: string | null;
  icon: string | null;
  color: string | null;
  sort_order: number;
  created_at: string;
}

export interface KnowledgeArticle {
  id: string;
  organization_id: string;
  category_id: string | null;
  title: string;
  content: string | null;
  document_type: KnowledgeDocumentType;
  tags: string[];
  version: number;
  lifecycle_status: FormLifecycleStatus;
  is_public: boolean;
  storage_path: string | null;
  file_size_bytes: number | null;
  mime_type: string | null;
  author_id: string | null;
  approved_by: string | null;
  approved_at: string | null;
  published_at: string | null;
  view_count: number;
  created_at: string;
  updated_at: string;
  category?: KnowledgeCategory;
}

// ============================================================
// Phase AH – Task & Action Engine
// ============================================================
export type TaskPriority = 'critical' | 'high' | 'medium' | 'low';
export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled' | 'blocked' | 'overdue';
export type TaskType = 'action' | 'investigation' | 'collection' | 'review' | 'approval' | 'intervention' | 'follow_up';

export interface Task {
  id: string;
  organization_id: string;
  title: string;
  description: string | null;
  task_type: TaskType;
  priority: TaskPriority;
  status: TaskStatus;
  source_type: 'diagnostic' | 'indicator' | 'recommendation' | 'manual' | 'project' | 'evidence' | null;
  source_id: string | null;
  project_id: string | null;
  assigned_to: string | null;
  assigned_by: string | null;
  due_date: string | null;
  completed_at: string | null;
  completion_notes: string | null;
  geo_unit_id: string | null;
  tags: string[];
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface TaskComment {
  id: string;
  task_id: string;
  organization_id: string;
  author_id: string;
  content: string;
  created_at: string;
}

// ============================================================
// Phase AI – Global Search
// ============================================================
export interface SearchIndexEntry {
  id: string;
  organization_id: string;
  record_type: string;
  record_id: string;
  title: string;
  body: string | null;
  tags: string[];
  category: string | null;
  geo_unit_id: string | null;
  project_id: string | null;
  metadata: Record<string, unknown>;
  indexed_at: string;
}

export interface SearchResult {
  entry: SearchIndexEntry;
  rank: number;
  highlighted_title?: string;
  highlighted_body?: string;
}

// ============================================================
// Phase AJ – Territorial Observatory
// ============================================================
export interface ObservatoryWidget {
  id: string;
  type: 'indicator_map' | 'trend_chart' | 'heat_map' | 'kpi_card' | 'alert_list' | 'project_list';
  title: string;
  indicator_id?: string;
  geo_level?: string;
  config: Record<string, unknown>;
  position: { x: number; y: number; w: number; h: number };
}

export interface ObservatoryDashboard {
  id: string;
  organization_id: string;
  name: string;
  description: string | null;
  geo_level: string | null;
  geo_unit_id: string | null;
  widgets: ObservatoryWidget[];
  is_public: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface ObservatoryAlert {
  id: string;
  organization_id: string;
  dashboard_id: string | null;
  geo_unit_id: string | null;
  alert_type: 'indicator_threshold' | 'data_gap' | 'project_delay' | 'new_risk' | 'trend_deterioration' | 'custom';
  severity: 'critical' | 'high' | 'medium' | 'low';
  title: string;
  description: string | null;
  indicator_id: string | null;
  status: 'active' | 'acknowledged' | 'resolved';
  acknowledged_by: string | null;
  resolved_at: string | null;
  created_at: string;
}

// ============================================================
// Phase AL – Territorial Master Registry
// ============================================================
export type TerritorialBusinessType =
  | 'colmado' | 'minimarket' | 'supermarket' | 'pharmacy'
  | 'hardware_store' | 'agro_store' | 'cafeteria' | 'restaurant'
  | 'beauty_salon' | 'other';

export type TerritorialSize = 'micro' | 'small' | 'medium' | 'large';
export type TerritorialPotential = 'low' | 'medium' | 'high';

export type TerritorialOperationType = 'commercial' | 'humanitarian' | 'government';

export type TerritorialCommercialRole =
  | 'client' | 'supplier' | 'distributor' | 'commercial_partner';
export type TerritorialHumanitarianRole =
  | 'beneficiary' | 'monitoring' | 'distribution' | 'assessment_point';
export type TerritorialGovernmentRole =
  | 'service' | 'census' | 'monitoring_point';

export type TerritorialOperationRole =
  | TerritorialCommercialRole
  | TerritorialHumanitarianRole
  | TerritorialGovernmentRole;

export interface TerritorialEntity {
  id: string;
  organization_id: string;
  nodx_uid: string;
  business_name: string;
  commercial_name: string | null;
  legal_name: string | null;
  is_active: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  owner?: TerritorialOwner;
  location?: TerritorialLocation;
  classification?: TerritorialClassification;
  operations?: TerritorialOperation[];
  potential_score?: TerritorialPotentialScore;
}

export interface TerritorialOwner {
  id: string;
  organization_id: string;
  entity_id: string;
  name: string;
  known_name: string | null;
  phone: string | null;
  mobile: string | null;
  whatsapp: string | null;
  email: string | null;
  created_at: string;
  updated_at: string;
}

export interface TerritorialLocation {
  id: string;
  organization_id: string;
  entity_id: string;
  country: string | null;
  province: string | null;
  municipality: string | null;
  district: string | null;
  sector: string | null;
  neighborhood: string | null;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  created_at: string;
  updated_at: string;
}

export interface TerritorialClassification {
  id: string;
  organization_id: string;
  entity_id: string;
  business_type: TerritorialBusinessType | null;
  size: TerritorialSize | null;
  potential: TerritorialPotential | null;
  created_at: string;
  updated_at: string;
}

export interface TerritorialOperation {
  id: string;
  organization_id: string;
  entity_id: string;
  operation_type: TerritorialOperationType;
  operation_role: TerritorialOperationRole;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface TerritorialAssignment {
  id: string;
  organization_id: string;
  entity_id: string;
  user_id: string | null;
  route_id: string | null;
  corridor_id: string | null;
  is_active: boolean;
  assigned_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface TerritorialVisitHistory {
  id: string;
  organization_id: string;
  entity_id: string;
  visit_date: string;
  user_id: string | null;
  status: string;
  notes: string | null;
  created_at: string;
}

export interface TerritorialRouteMembership {
  id: string;
  organization_id: string;
  entity_id: string;
  route_id: string;
  created_at: string;
}

export interface TerritorialCorridorMembership {
  id: string;
  organization_id: string;
  entity_id: string;
  corridor_id: string;
  created_at: string;
}

export interface TerritorialGeometry {
  id: string;
  organization_id: string;
  entity_id: string;
  geometry_type: 'point' | 'polygon';
  geojson: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface TerritorialPotentialScore {
  id: string;
  organization_id: string;
  entity_id: string;
  potential_score: number | null;
  confidence_score: number | null;
  last_calculated_at: string | null;
  created_at: string;
  updated_at: string;
}

// ============================================================
// Phase AM – Territorial Intelligence Engine
// ============================================================
export type TerritorialDensityClass = 'low' | 'normal' | 'saturated';
export type TerritorialOpportunityType = 'growth_zone' | 'underserved_zone' | 'expansion_zone';
export type TerritorialGapType = 'coverage_gap' | 'density_gap' | 'assignment_gap' | 'visit_gap';
export type TerritorialGapSeverity = 'low' | 'medium' | 'high' | 'critical';

export interface TerritorialCoverageMetric {
  id: string;
  organization_id: string;
  geo_level: string;
  geo_name: string;
  geo_code: string | null;
  total_establishments: number;
  active_establishments: number;
  assigned_establishments: number;
  visited_establishments: number;
  coverage_pct: number | null;
  calculated_at: string;
  created_at: string;
  updated_at: string;
}

export interface TerritorialDensityMetric {
  id: string;
  organization_id: string;
  geo_level: string;
  geo_name: string;
  geo_code: string | null;
  establishment_count: number;
  area_km2: number | null;
  density_per_km2: number | null;
  density_class: TerritorialDensityClass | null;
  calculated_at: string;
  created_at: string;
  updated_at: string;
}

export interface TerritorialOpportunityMetric {
  id: string;
  organization_id: string;
  geo_level: string;
  geo_name: string;
  geo_code: string | null;
  opportunity_type: TerritorialOpportunityType;
  current_establishments: number;
  estimated_potential: number | null;
  confidence_score: number | null;
  evidence: Record<string, unknown>;
  calculated_at: string;
  created_at: string;
  updated_at: string;
}

export interface TerritorialGapAnalysis {
  id: string;
  organization_id: string;
  geo_level: string;
  geo_name: string;
  geo_code: string | null;
  gap_type: TerritorialGapType;
  current_value: number | null;
  expected_value: number | null;
  gap_pct: number | null;
  severity: TerritorialGapSeverity | null;
  recommendations: unknown[];
  calculated_at: string;
  created_at: string;
  updated_at: string;
}

// ============================================================
// Phase AK – AI Analyst
// ============================================================
export type AIInsightType = 'risk_summary' | 'project_status' | 'indicator_trend' | 'forecast' | 'recommendation' | 'anomaly' | 'summary';

export interface AIInsight {
  id: string;
  organization_id: string;
  insight_type: AIInsightType;
  title: string;
  content: string;
  confidence: number | null;
  linked_type: string | null;
  linked_id: string | null;
  geo_unit_id: string | null;
  generated_at: string;
  expires_at: string | null;
  is_pinned: boolean;
  created_at: string;
}

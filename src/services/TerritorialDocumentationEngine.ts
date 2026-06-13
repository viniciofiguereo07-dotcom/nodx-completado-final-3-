import { supabase } from '../lib/supabase';
import { territorialAtlasEngine, type AtlasGeneratedProduct } from './TerritorialAtlasEngine';
import { territorialExecutiveReportingEngine, type ExecutiveReport } from './TerritorialExecutiveReportingEngine';
import { territorialAIEngine, type AIPredictionEngineOutput } from './TerritorialAIEngine';
import { territorialFieldCollectionEngine, type TerritorialForm, type TerritorialSubmission } from './TerritorialFieldCollectionEngine';
import { territorialIntelligenceEngine, type CoverageResult, type DensityResult, type OpportunityResult, type GapResult } from './TerritorialIntelligenceEngine';
import { territorialIndicatorEngine, type ExecutiveSummary, type TerritorialKPI } from './TerritorialIndicatorEngine';
import { territorialAlertEngine, type TerritorialAlertMetrics } from './TerritorialAlertEngine';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType,
  Table, TableRow, TableCell, WidthType, PageBreak,
} from 'docx';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
export type DocumentType =
  | 'user_manual'
  | 'administrator_manual'
  | 'operational_manual'
  | 'institutional_manual'
  | 'field_collection_guide'
  | 'route_management_guide';

export type DocumentExportFormat = 'pdf' | 'docx';

export interface GeneratedDocument {
  id: string;
  organization_id: string;
  document_type: DocumentType;
  title: string;
  subtitle: string;
  version: string;
  generated_at: string;
  generated_by: string | null;
  author_name: string;
  author_role: string;
  organization_name: string;
  status: 'draft' | 'published' | 'archived';
  table_of_contents: TableOfContentsEntry[];
  sections: DocumentSection[];
  metadata: DocumentMetadata;
  file_urls: Record<DocumentExportFormat, string | null>;
}

export interface TableOfContentsEntry {
  order: number;
  title: string;
  page: number;
}

export interface DocumentSection {
  id: string;
  order: number;
  title: string;
  content: string;
  subsections: DocumentSubsection[];
  tables: DocumentTable[];
  highlights: string[];
}

export interface DocumentSubsection {
  id: string;
  title: string;
  content: string;
  order: number;
}

export interface DocumentTable {
  id: string;
  title: string;
  headers: string[];
  rows: (string | number)[][];
}

export interface DocumentMetadata {
  total_pages: number;
  word_count: number;
  data_sources: string[];
  territorial_coverage_pct: number | null;
  entities_count: number | null;
  routes_count: number | null;
  forms_count: number | null;
  last_updated: string;
}

// ---------------------------------------------------------------------------
// Main Engine
// ---------------------------------------------------------------------------
export class TerritorialDocumentationEngine {

  // -------------------------------------------------------------------------
  // Generate Document
  // -------------------------------------------------------------------------
  async generateDocument(
    organizationId: string,
    documentType: DocumentType,
    opts?: {
      version?: string;
      authorName?: string;
      authorRole?: string;
      organizationName?: string;
    }
  ): Promise<GeneratedDocument> {
    const version = opts?.version ?? '1.0';
    const authorName = opts?.authorName ?? 'System';
    const authorRole = opts?.authorRole ?? 'Administrator';
    const orgName = opts?.organizationName ?? 'Organization';

    // Gather data from existing engines
    const [
      executiveSummary,
      territorialKPIs,
      alertMetrics,
      coverage,
      density,
      opportunities,
      gaps,
      forms,
      submissionStats,
      atlasProducts,
      executiveReports,
      aiAnalyses,
      routes,
    ] = await Promise.all([
      this.fetchExecutiveSummary(organizationId),
      this.fetchTerritorialKPIs(organizationId),
      this.fetchAlertMetrics(organizationId),
      this.fetchCoverage(organizationId),
      this.fetchDensity(organizationId),
      this.fetchOpportunities(organizationId),
      this.fetchGaps(organizationId),
      territorialFieldCollectionEngine.getForms(organizationId, { limit: 50 }),
      territorialFieldCollectionEngine.getSubmissionStats(organizationId),
      territorialAtlasEngine.getGeneratedAtlases(organizationId).catch(() => [] as AtlasGeneratedProduct[]),
      territorialExecutiveReportingEngine.getReports(organizationId, 10).catch(() => [] as ExecutiveReport[]),
      territorialAIEngine.getAnalysisHistory(organizationId, 5).catch(() => [] as AIPredictionEngineOutput[]),
      this.fetchRoutes(organizationId),
    ]);

    // Generate sections based on document type
    const sections = await this.buildDocumentSections(documentType, {
      executiveSummary,
      territorialKPIs,
      alertMetrics,
      coverage,
      density,
      opportunities,
      gaps,
      forms,
      submissionStats,
      atlasProducts,
      executiveReports,
      aiAnalyses,
      routes,
      organizationId,
    });

    // Build table of contents
    const tableOfContents = this.buildTableOfContents(sections);

    // Calculate metadata
    const metadata = this.calculateMetadata(sections, {
      coverage,
      routes,
      forms,
    });

    const document: GeneratedDocument = {
      id: crypto.randomUUID(),
      organization_id: organizationId,
      document_type: documentType,
      title: this.getDocumentTitle(documentType),
      subtitle: this.getDocumentSubtitle(documentType, orgName),
      version,
      generated_at: new Date().toISOString(),
      generated_by: null,
      author_name: authorName,
      author_role: authorRole,
      organization_name: orgName,
      status: 'draft',
      table_of_contents,
      sections,
      metadata,
      file_urls: { pdf: null, docx: null },
    };

    return document;
  }

  // -------------------------------------------------------------------------
  // Document Section Builders
  // -------------------------------------------------------------------------
  private async buildDocumentSections(
    documentType: DocumentType,
    data: {
      executiveSummary: ExecutiveSummary | null;
      territorialKPIs: TerritorialKPI[];
      alertMetrics: TerritorialAlertMetrics;
      coverage: CoverageResult[];
      density: DensityResult[];
      opportunities: OpportunityResult[];
      gaps: GapResult[];
      forms: TerritorialForm[];
      submissionStats: { total: number; byStatus: Record<string, number>; thisMonth: number };
      atlasProducts: AtlasGeneratedProduct[];
      executiveReports: ExecutiveReport[];
      aiAnalyses: AIPredictionEngineOutput[];
      routes: Array<{ id: string; name: string; status: string; completion: number }>;
      organizationId: string;
    }
  ): Promise<DocumentSection[]> {
    switch (documentType) {
      case 'user_manual':
        return this.buildUserManualSections(data);
      case 'administrator_manual':
        return this.buildAdministratorManualSections(data);
      case 'operational_manual':
        return this.buildOperationalManualSections(data);
      case 'institutional_manual':
        return this.buildInstitutionalManualSections(data);
      case 'field_collection_guide':
        return this.buildFieldCollectionGuideSections(data);
      case 'route_management_guide':
        return this.buildRouteManagementGuideSections(data);
      default:
        return [];
    }
  }

  // -------------------------------------------------------------------------
  // User Manual Sections
  // -------------------------------------------------------------------------
  private buildUserManualSections(data: {
    executiveSummary: ExecutiveSummary | null;
    coverage: CoverageResult[];
    forms: TerritorialForm[];
    routes: Array<{ id: string; name: string; status: string; completion: number }>;
  }): DocumentSection[] {
    const sections: DocumentSection[] = [];
    let order = 1;

    // Section: Introduction
    sections.push({
      id: 'intro',
      order: order++,
      title: 'Introduction',
      content: `This User Manual provides comprehensive guidance for field agents and operational staff using the NODX Enterprise platform. The manual covers essential workflows, data collection procedures, and system navigation.`,
      subsections: [
        { id: 'intro_purpose', title: 'Purpose', content: 'To enable effective territorial operations through standardized procedures and clear operational guidelines.', order: 1 },
        { id: 'intro_audience', title: 'Target Audience', content: 'Field agents, data collectors, territory managers, and operational staff involved in daily territorial activities.', order: 2 },
        { id: 'intro_scope', title: 'Scope', content: 'This manual covers platform navigation, form submission, route management, and data collection workflows.', order: 3 },
      ],
      tables: [],
      highlights: [
        'Platform designed for offline-first field operations',
        'GPS-enabled data collection with photo documentation',
        'Real-time synchronization when connectivity is available',
      ],
    });

    // Section: Getting Started
    sections.push({
      id: 'getting_started',
      order: order++,
      title: 'Getting Started',
      content: 'This section provides the initial setup and login procedures for new users.',
      subsections: [
        { id: 'gs_login', title: 'Login Process', content: 'Access the platform using your organization-provided credentials. Enter your username and password on the login screen. For first-time users, you will be prompted to change your temporary password.', order: 1 },
        { id: 'gs_dashboard', title: 'Dashboard Overview', content: 'The main dashboard displays territorial coverage metrics, active routes, pending visits, and recent alerts. Navigate using the sidebar menu to access different modules.', order: 2 },
        { id: 'gs_profile', title: 'User Profile', content: 'Update your profile information including contact details and notification preferences from the user settings menu.', order: 3 },
      ],
      tables: [],
      highlights: [
        'Secure login with multi-factor authentication support',
        'Role-based access control determines available features',
        'Profile settings include notification preferences',
      ],
    });

    // Section: Field Data Collection
    sections.push({
      id: 'data_collection',
      order: order++,
      title: 'Field Data Collection',
      content: `${data.forms.length} active forms are available for data collection. This section explains how to create, edit, and submit field data.`,
      subsections: [
        { id: 'dc_forms', title: 'Accessing Forms', content: `Navigate to Forms > Active Forms to view the ${data.forms.length} available data collection forms. Each form is designed for specific data collection scenarios.`, order: 1 },
        { id: 'dc_create', title: 'Creating New Entries', content: 'Select the appropriate form, fill in all required fields, capture GPS location, and attach photos when required. Save as draft if you need to complete later.', order: 2 },
        { id: 'dc_submit', title: 'Submitting Data', content: 'Review your entries for completeness, ensure GPS coordinates are accurate, and submit. Data will sync automatically when connectivity is available.', order: 3 },
        { id: 'dc_photos', title: 'Photo Documentation', content: 'Capture photos directly through the app. Photos are automatically tagged with GPS coordinates and timestamps. Ensure good lighting and clear subject visibility.', order: 4 },
      ],
      tables: [{
        id: 'active_forms_table',
        title: 'Available Data Collection Forms',
        headers: ['Form Name', 'Version', 'Status'],
        rows: data.forms.slice(0, 10).map(f => [f.name, `v${f.version}`, f.is_active ? 'Active' : 'Inactive']),
      }],
      highlights: [
        'All forms support offline completion',
        'Photos are compressed for efficient storage',
        'Draft entries can be completed later',
      ],
    });

    // Section: Route Navigation
    sections.push({
      id: 'route_nav',
      order: order++,
      title: 'Route Navigation',
      content: 'Navigate assigned routes efficiently using the built-in mapping and navigation features.',
      subsections: [
        { id: 'rn_view', title: 'Viewing Assigned Routes', content: `${data.routes.length} routes are available in the system. Access your assigned routes from the Routes menu to see daily assignments and completion status.`, order: 1 },
        { id: 'rn_navigation', title: 'Following Routes', content: 'Each route displays an optimized sequence of visits. Follow the suggested order for maximum efficiency. Mark each location as visited when complete.', order: 2 },
        { id: 'rn_completion', title: 'Route Completion', content: 'Complete all assigned visits within the route. Update route status as you progress. Report any access issues or deviations through the issue reporting feature.', order: 3 },
      ],
      tables: [{
        id: 'routes_table',
        title: 'Route Status Summary',
        headers: ['Route Name', 'Status', 'Completion %'],
        rows: data.routes.slice(0, 10).map(r => [r.name, r.status, `${r.completion}%`]),
      }],
      highlights: [
        'Routes are optimized for efficiency',
        'GPS navigation assists with finding locations',
        'Report obstacles or access issues immediately',
      ],
    });

    // Section: Sync & Offline Operations
    sections.push({
      id: 'sync',
      order: order++,
      title: 'Synchronization & Offline Operations',
      content: 'The platform supports full offline operation with automatic synchronization.',
      subsections: [
        { id: 'sync_offline', title: 'Working Offline', content: 'All core functions work offline. Data is stored locally and syncs automatically when connectivity is restored. Check sync status in the Settings menu.', order: 1 },
        { id: 'sync_manual', title: 'Manual Sync', content: 'Trigger manual sync from the Sync menu when connectivity is available. Monitor sync progress and resolve any conflicts through the conflict resolution interface.', order: 2 },
        { id: 'sync_troubleshoot', title: 'Troubleshooting Sync Issues', content: 'If sync fails, check your connection status. Conflicts are highlighted for manual review. Contact support if issues persist.', order: 3 },
      ],
      tables: [],
      highlights: [
        'Full offline capability ensures continuous operations',
        'Automatic conflict detection and resolution',
        'Sync status visible in notification area',
      ],
    });

    // Section: Support & Resources
    sections.push({
      id: 'support',
      order: order++,
      title: 'Support & Resources',
      content: 'Access help resources and contact support for assistance.',
      subsections: [
        { id: 'sup_help', title: 'Help Center', content: 'Access comprehensive documentation through the Help menu. Search for specific topics or browse categorized guides.', order: 1 },
        { id: 'sup_contact', title: 'Contacting Support', content: 'For technical issues, contact your organization administrator first. Escalate to platform support through the ticket system for unresolved issues.', order: 2 },
      ],
      tables: [],
      highlights: [
        'Help center available 24/7',
        'Submit support tickets through the platform',
        'Training resources available for new users',
      ],
    });

    return sections;
  }

  // -------------------------------------------------------------------------
  // Administrator Manual Sections
  // -------------------------------------------------------------------------
  private buildAdministratorManualSections(data: {
    executiveSummary: ExecutiveSummary | null;
    territorialKPIs: TerritorialKPI[];
    alertMetrics: TerritorialAlertMetrics;
    coverage: CoverageResult[];
    density: DensityResult[];
    forms: TerritorialForm[];
    atlasProducts: AtlasGeneratedProduct[];
    executiveReports: ExecutiveReport[];
    aiAnalyses: AIPredictionEngineOutput[];
  }): DocumentSection[] {
    const sections: DocumentSection[] = [];
    let order = 1;

    // Section: System Administration Overview
    sections.push({
      id: 'admin_overview',
      order: order++,
      title: 'System Administration Overview',
      content: 'This manual provides guidance for system administrators managing the NODX Enterprise platform. Administrators have elevated access to configuration, user management, and system monitoring.',
      subsections: [
        { id: 'ao_scope', title: 'Administrative Scope', content: 'Administrators manage users, configure forms, set up territories, manage routes, monitor system health, and access reporting dashboards.', order: 1 },
        { id: 'ao_permissions', title: 'Permission Levels', content: 'The platform supports hierarchical permission levels: Super Admin, Organization Admin, Territory Manager, and Field Agent. Each level has defined access boundaries.', order: 2 },
      ],
      tables: [],
      highlights: [
        'Role-based access control with granular permissions',
        'Comprehensive audit logging for administrative actions',
        'Multi-organization support with isolated data',
      ],
    });

    // Section: User Management
    sections.push({
      id: 'user_mgmt',
      order: order++,
      title: 'User Management',
      content: 'Manage user accounts, roles, and access permissions through the Members administration panel.',
      subsections: [
        { id: 'um_create', title: 'Creating Users', content: 'Navigate to Members > Add User. Enter user details, assign role, select accessible territories, and set initial password. Users will be prompted to change password on first login.', order: 1 },
        { id: 'um_roles', title: 'Role Assignment', content: 'Assign appropriate roles based on user responsibilities. Review permission matrices before assignment. Roles can be modified as needed.', order: 2 },
        { id: 'um_deactivate', title: 'Deactivating Users', content: 'Deactivate users who no longer require access. Deactivated users cannot log in but their data is retained for audit purposes.', order: 3 },
      ],
      tables: [],
      highlights: [
        'Bulk user import available for large teams',
        'Password policies enforce security standards',
        'Audit trail tracks all user management actions',
      ],
    });

    // Section: Form Builder Administration
    sections.push({
      id: 'form_admin',
      order: order++,
      title: 'Form Builder Administration',
      content: `${data.forms.length} forms are currently configured. Administrators can create, modify, and manage data collection forms.`,
      subsections: [
        { id: 'fa_create', title: 'Creating Forms', content: 'Use the Form Builder to create new data collection instruments. Define fields, validation rules, and conditional logic. Test forms before deployment.', order: 1 },
        { id: 'fa_versioning', title: 'Form Versioning', content: 'Forms support versioning. Create new versions to change structure while preserving existing data. Previous versions remain accessible.', order: 2 },
        { id: 'fa_activation', title: 'Activation & Deployment', content: 'Activate forms to make them available to field agents. Monitor submission rates and data quality through the forms dashboard.', order: 3 },
      ],
      tables: [{
        id: 'forms_admin_table',
        title: 'Form Configuration Status',
        headers: ['Form Name', 'Version', 'Status', 'Submissions'],
        rows: data.forms.slice(0, 10).map(f => [f.name, `v${f.version}`, f.is_active ? 'Active' : 'Inactive', '-']),
      }],
      highlights: [
        'Drag-and-drop form builder interface',
        'Advanced validation and conditional logic',
        'Version history with rollback capability',
      ],
    });

    // Section: Territory & Route Management
    sections.push({
      id: 'territory_mgmt',
      order: order++,
      title: 'Territory & Route Management',
      content: 'Configure territorial boundaries, assign entities, and create operational routes.',
      subsections: [
        { id: 'tm_territories', title: 'Territory Configuration', content: `${data.coverage.length} territorial zones are defined. Use the Territory Designer to create, modify, and assign territories to agents.`, order: 1 },
        { id: 'tm_routes', title: 'Route Planning', content: 'Create efficient routes by combining territory assignments. Use the Route Builder to optimize visit sequences. Monitor route completion metrics.', order: 2 },
        { id: 'tm_assignment', title: 'Agent Assignment', content: 'Assign territories and routes to field agents based on workload and geographic proximity. Balance assignments for optimal coverage.', order: 3 },
      ],
      tables: [{
        id: 'territory_table',
        title: 'Territory Coverage Summary',
        headers: ['Zone', 'Entities', 'Coverage %', 'Density'],
        rows: data.coverage.slice(0, 15).map(c => {
          const d = data.density.find(d => d.geo_name === c.geo_name);
          return [c.geo_name, c.total_establishments.toString(), `${c.coverage_pct.toFixed(0)}%`, d?.density_class ?? '-'];
        }),
      }],
      highlights: [
        'Geographic boundary editing tools',
        'Route optimization algorithms',
        'Workload balancing analytics',
      ],
    });

    // Section: Reporting & Analytics Administration
    sections.push({
      id: 'reporting_admin',
      order: order++,
      title: 'Reporting & Analytics Administration',
      content: `${data.executiveReports.length} executive reports and ${data.atlasProducts.length} atlases have been generated. Administrators configure reporting parameters and distribute reports.`,
      subsections: [
        { id: 'ra_exec', title: 'Executive Reports', content: 'Generate comprehensive executive reports summarizing territorial performance. Configure report parameters, select time periods, and export to PDF or DOCX.', order: 1 },
        { id: 'ra_atlas', title: 'Territorial Atlases', content: 'Create detailed territorial atlases with geographic analysis, coverage metrics, and strategic recommendations. Atlases serve as comprehensive reference documents.', order: 2 },
        { id: 'ra_ai', title: 'AI Analysis Review', content: `${data.aiAnalyses.length} AI-generated analyses are available. Review AI recommendations, expansion opportunities, and risk forecasts. Export insights for strategic planning.`, order: 3 },
      ],
      tables: [{
        id: 'reports_summary',
        title: 'Generated Reports Summary',
        headers: ['Report Type', 'Count', 'Latest'],
        rows: [
          ['Executive Reports', data.executiveReports.length.toString(), data.executiveReports[0]?.generated_at ? new Date(data.executiveReports[0].generated_at).toLocaleDateString() : 'N/A'],
          ['Territorial Atlases', data.atlasProducts.length.toString(), data.atlasProducts[0]?.generated_at ? new Date(data.atlasProducts[0].generated_at).toLocaleDateString() : 'N/A'],
          ['AI Analyses', data.aiAnalyses.length.toString(), data.aiAnalyses[0]?.generated_at ? new Date(data.aiAnalyses[0].generated_at).toLocaleDateString() : 'N/A'],
        ],
      }],
      highlights: [
        'Automated report scheduling available',
        'Multi-format export (PDF, DOCX, PowerPoint)',
        'Distribution lists for stakeholder sharing',
      ],
    });

    // Section: System Monitoring
    sections.push({
      id: 'monitoring',
      order: order++,
      title: 'System Monitoring & Alerts',
      content: 'Monitor system health, review alert configurations, and manage notification settings.',
      subsections: [
        { id: 'mon_health', title: 'System Health Dashboard', content: 'Access real-time system metrics including sync status, database performance, and API response times from the Diagnostics menu.', order: 1 },
        { id: 'mon_alerts', title: 'Alert Configuration', content: `${data.alertMetrics.total_active} active alerts currently require attention. Configure alert thresholds, notification rules, and escalation procedures through the Alert Center.`, order: 2 },
        { id: 'mon_audit', title: 'Audit Trail Review', content: 'Review comprehensive audit logs for all user actions, data modifications, and system events. Export audit logs for compliance reporting.', order: 3 },
      ],
      tables: [{
        id: 'alert_summary',
        title: 'Alert Status Summary',
        headers: ['Alert Level', 'Count'],
        rows: [
          ['Critical', data.alertMetrics.critical_count.toString()],
          ['High', data.alertMetrics.high_count.toString()],
          ['Medium', data.alertMetrics.medium_count.toString()],
          ['Low', data.alertMetrics.low_count.toString()],
        ],
      }],
      highlights: [
        'Real-time system monitoring',
        'Configurable alert thresholds',
        'Comprehensive audit logging',
      ],
    });

    return sections;
  }

  // -------------------------------------------------------------------------
  // Operational Manual Sections
  // -------------------------------------------------------------------------
  private buildOperationalManualSections(data: {
    executiveSummary: ExecutiveSummary | null;
    territorialKPIs: TerritorialKPI[];
    coverage: CoverageResult[];
    density: DensityResult[];
    opportunities: OpportunityResult[];
    gaps: GapResult[];
    alertMetrics: TerritorialAlertMetrics;
    routes: Array<{ id: string; name: string; status: string; completion: number }>;
  }): DocumentSection[] {
    const sections: DocumentSection[] = [];
    let order = 1;

    // Section: Operational Overview
    sections.push({
      id: 'ops_overview',
      order: order++,
      title: 'Operational Overview',
      content: `Territorial coverage stands at ${data.executiveSummary?.coverage_score ?? 0}% with ${data.executiveSummary?.total_entities ?? 0} total entities tracked. This manual outlines operational procedures for achieving coverage targets and maintaining service quality.`,
      subsections: [
        { id: 'oo_metrics', title: 'Key Performance Metrics', content: `Current operational metrics: Coverage Score ${data.executiveSummary?.coverage_score ?? 0}%, Opportunity Score ${data.executiveSummary?.opportunity_score ?? 0}%, ${data.executiveSummary?.critical_issues ?? 0} critical issues requiring attention.`, order: 1 },
        { id: 'oo_targets', title: 'Operational Targets', content: 'Annual coverage target is 100% of assigned territories. Monthly visit targets are set per route. Performance is measured against these targets for incentive calculations.', order: 2 },
      ],
      tables: [{
        id: 'kpi_table',
        title: 'Key Performance Indicators',
        headers: ['KPI', 'Current', 'Target', 'Status'],
        rows: data.territorialKPIs.slice(0, 10).map(k => [
          k.name,
          k.current_value?.toString() ?? '-',
          k.target_value?.toString() ?? '-',
          k.semaphore_status ?? 'N/A',
        ]),
      }],
      highlights: [
        `Coverage efficiency: ${data.executiveSummary?.coverage_score ?? 0}%`,
        `${data.opportunities.length} expansion opportunities identified`,
        `${data.gaps.filter(g => g.severity === 'critical').length} critical gaps to address`,
      ],
    });

    // Section: Coverage Operations
    sections.push({
      id: 'coverage_ops',
      order: order++,
      title: 'Coverage Operations',
      content: `${data.coverage.length} territorial zones require ongoing coverage operations. This section details the procedures for maintaining optimal coverage levels.`,
      subsections: [
        { id: 'co_monitoring', title: 'Coverage Monitoring', content: 'Monitor daily coverage progress through the Operations Dashboard. Identify emerging gaps early and reallocate resources accordingly.', order: 1 },
        { id: 'co_prioritization', title: 'Prioritization Framework', content: `${data.gaps.filter(g => g.severity === 'critical').length} critical zones require immediate attention. Priority is assigned based on gap severity, population density, and humanitarian impact.`, order: 2 },
        { id: 'co_actions', title: 'Coverage Recovery Actions', content: 'For zones below target coverage: (1) Assess access constraints, (2) Deploy additional resources, (3) Increase visit frequency, (4) Monitor weekly progress.', order: 3 },
      ],
      tables: [{
        id: 'gap_table',
        title: 'Coverage Gap Priority List',
        headers: ['Zone', 'Current Coverage', 'Gap %', 'Severity'],
        rows: data.gaps.slice(0, 15).map(g => [
          g.geo_name,
          `${(100 - g.gap_pct).toFixed(0)}%`,
          `${g.gap_pct.toFixed(1)}%`,
          g.severity.toUpperCase(),
        ]),
      }],
      highlights: [
        'Gap severity: Critical >70%, High 50-70%, Medium 30-50%, Low <30%',
        'Weekly coverage reviews mandatory for critical zones',
        'Escalation procedures for persistent gaps',
      ],
    });

    // Section: Density & Territory Management
    sections.push({
      id: 'density_ops',
      order: order++,
      title: 'Density & Territory Management',
      content: `Territorial density analysis identifies ${data.density.filter(d => d.density_class === 'saturated').length} saturated zones, ${data.density.filter(d => d.density_class === 'normal').length} normal zones, and ${data.density.filter(d => d.density_class === 'low').length} low-density expansion candidates.`,
      subsections: [
        { id: 'do_saturated', title: 'Saturated Zone Operations', content: 'Saturated zones require optimization strategies. Focus on efficiency improvements, service quality, and graduation preparation.', order: 1 },
        { id: 'do_normal', title: 'Normal Zone Operations', content: 'Normal density zones require standard operational procedures. Maintain monthly visit cadence and address emerging gaps proactively.', order: 2 },
        { id: 'do_expansion', title: 'Expansion Zone Operations', content: `${data.density.filter(d => d.density_class === 'low').length} low-density zones offer expansion opportunities. Prioritize based on strategic value and resource availability.`, order: 3 },
      ],
      tables: [{
        id: 'density_table',
        title: 'Density Classification Summary',
        headers: ['Zone', 'Establishments', 'Density Class'],
        rows: data.density.slice(0, 15).map(d => [
          d.geo_name,
          d.establishment_count.toString(),
          d.density_class.charAt(0).toUpperCase() + d.density_class.slice(1),
        ]),
      }],
      highlights: [
        'Saturated: >50 establishments in territory',
        'Normal: 10-50 establishments',
        'Low density: <10 establishments (expansion candidates)',
      ],
    });

    // Section: Route Operations
    sections.push({
      id: 'route_ops',
      order: order++,
      title: 'Route Operations',
      content: `${data.routes.length} routes are configured with average completion rate of ${data.routes.length > 0 ? (data.routes.reduce((s, r) => s + r.completion, 0) / data.routes.length).toFixed(0) : 0}%.`,
      subsections: [
        { id: 'ro_execution', title: 'Route Execution', content: 'Field agents execute assigned routes daily. Each route has an optimized visit sequence. Complete all visits within the scheduled period.', order: 1 },
        { id: 'ro_monitoring', title: 'Route Monitoring', content: 'Supervisors monitor route completion in real-time. Delays trigger alerts for intervention. Review route performance weekly.', order: 2 },
        { id: 'ro_recovery', title: 'Route Recovery', content: 'For incomplete routes: (1) Identify bottlenecks, (2) Assess resource needs, (3) Implement recovery measures, (4) Document obstacles and solutions.', order: 3 },
      ],
      tables: [{
        id: 'routes_ops_table',
        title: 'Route Performance Summary',
        headers: ['Route', 'Status', 'Completion'],
        rows: data.routes.slice(0, 15).map(r => [r.name, r.status, `${r.completion}%`]),
      }],
      highlights: [
        'Target: 100% route completion weekly',
        'Real-time monitoring through Operations Dashboard',
        'Escalation after 2 consecutive incomplete routes',
      ],
    });

    // Section: Alert Response Procedures
    sections.push({
      id: 'alert_response',
      order: order++,
      title: 'Alert Response Procedures',
      content: `${data.alertMetrics.total_active} active alerts require management. Follow standardized response procedures based on alert type and priority.`,
      subsections: [
        { id: 'ar_critical', title: 'Critical Alert Response', content: `${data.alertMetrics.critical_count} critical alerts require immediate attention. Response time target: 24 hours. Escalate unresolved alerts immediately.`, order: 1 },
        { id: 'ar_high', title: 'High Priority Alert Response', content: `${data.alertMetrics.high_count} high-priority alerts require attention within 72 hours. Document response actions and outcomes.`, order: 2 },
        { id: 'ar_procedures', title: 'Standard Response Procedures', content: 'For all alerts: (1) Acknowledge alert, (2) Investigate cause, (3) Implement response, (4) Document resolution, (5) Monitor recurrence.', order: 3 },
      ],
      tables: [],
      highlights: [
        `Critical alerts: ${data.alertMetrics.critical_count} (Target response: 24h)`,
        `High priority: ${data.alertMetrics.high_count} (Target response: 72h)`,
        'All responses must be documented in the system',
      ],
    });

    // Section: Performance Management
    sections.push({
      id: 'performance',
      order: order++,
      title: 'Performance Management',
      content: 'Operational performance is measured through territorial KPIs, visit completion rates, and data quality metrics.',
      subsections: [
        { id: 'pm_metrics', title: 'Performance Metrics', content: 'Key metrics include: Coverage %, Visit Completion %, Data Quality Score, Route Efficiency %, and Alert Resolution Time.', order: 1 },
        { id: 'pm_reviews', title: 'Performance Reviews', content: 'Monthly performance reviews are conducted with all field agents. Territory-level reviews occur quarterly with management participation.', order: 2 },
        { id: 'pm_improvement', title: 'Performance Improvement', content: 'Agents below target receive additional training and support. Improvement plans are documented with specific goals and timelines.', order: 3 },
      ],
      tables: [],
      highlights: [
        'Monthly individual performance reviews',
        'Quarterly territory-level reviews',
        'Performance-linked incentive structure',
      ],
    });

    return sections;
  }

  // -------------------------------------------------------------------------
  // Institutional Manual Sections
  // -------------------------------------------------------------------------
  private buildInstitutionalManualSections(data: {
    executiveSummary: ExecutiveSummary | null;
    coverage: CoverageResult[];
    gaps: GapResult[];
    executiveReports: ExecutiveReport[];
    aiAnalyses: AIPredictionEngineOutput[];
  }): DocumentSection[] {
    const sections: DocumentSection[] = [];
    let order = 1;

    // Section: Institutional Framework
    sections.push({
      id: 'institutional_framework',
      order: order++,
      title: 'Institutional Framework',
      content: 'This manual establishes the institutional framework for territorial management, defining organizational structure, governance principles, and coordination mechanisms.',
      subsections: [
        { id: 'if_mission', title: 'Mission & Vision', content: 'The territorial management program aims to achieve comprehensive coverage of all assigned territories through systematic data collection, monitoring, and intervention strategies.', order: 1 },
        { id: 'if_values', title: 'Core Values', content: 'Excellence in service delivery, data-driven decision making, humanitarian focus, community engagement, and continuous improvement guide our operations.', order: 2 },
      ],
      tables: [],
      highlights: [
        'Comprehensive territorial coverage as primary objective',
        'Humanitarian-centered approach to service delivery',
        'Evidence-based operational planning',
      ],
    });

    // Section: Governance Structure
    sections.push({
      id: 'governance',
      order: order++,
      title: 'Governance Structure',
      content: 'The governance structure establishes clear accountability chains, decision-making authority, and coordination mechanisms.',
      subsections: [
        { id: 'gov_levels', title: 'Organizational Levels', content: 'Leadership: Strategic direction and policy. Management: Operational planning and coordination. Field Operations: Data collection and service delivery.', order: 1 },
        { id: 'gov_committees', title: 'Coordination Committees', content: 'Territorial Coordination Committee meets monthly to review operations. Emergency Response Committee convenes for critical situations.', order: 2 },
        { id: 'gov_reporting', title: 'Reporting Lines', content: 'Field agents report to Territory Supervisors. Supervisors report to Regional Managers. Regional Managers report to National Leadership.', order: 3 },
      ],
      tables: [],
      highlights: [
        'Clear hierarchical reporting structure',
        'Monthly coordination committee meetings',
        'Emergency protocols for critical situations',
      ],
    });

    // Section: Strategic Planning
    sections.push({
      id: 'strategic_planning',
      order: order++,
      title: 'Strategic Planning Framework',
      content: `${data.executiveReports.length} strategic reports inform annual and quarterly planning cycles. The framework aligns territorial objectives with organizational priorities.`,
      subsections: [
        { id: 'sp_annual', title: 'Annual Planning Cycle', content: 'Annual planning begins Q4. Review previous year performance, set coverage targets, allocate resources, and establish KPIs for the coming year.', order: 1 },
        { id: 'sp_quarterly', title: 'Quarterly Review Cycle', content: 'Quarterly reviews assess progress against annual targets. Adjust strategies based on performance data and emerging conditions.', order: 2 },
        { id: 'sp_ai', title: 'AI-Informed Strategy', content: `${data.aiAnalyses.length} AI analyses provide predictive insights for strategic planning. Expansion recommendations and risk forecasts inform resource allocation.`, order: 3 },
      ],
      tables: [],
      highlights: [
        'Annual planning cycle: Q4 target setting',
        'Quarterly performance reviews and adjustments',
        'AI-powered strategic recommendations',
      ],
    });

    // Section: Humanitarian Response Framework
    sections.push({
      id: 'humanitarian',
      order: order++,
      title: 'Humanitarian Response Framework',
      content: `${data.gaps.filter(g => g.severity === 'critical').length} critical gaps represent humanitarian priorities requiring coordinated response.`,
      subsections: [
        { id: 'hf_principles', title: 'Humanitarian Principles', content: 'Humanity, neutrality, impartiality, and independence guide all humanitarian activities. Priority is given to populations with greatest need.', order: 1 },
        { id: 'hf_coordination', title: 'Coordination Mechanisms', content: 'Humanitarian activities are coordinated with local authorities, partner organizations, and community structures. Joint planning ensures effective resource utilization.', order: 2 },
        { id: 'hf_response', title: 'Response Protocols', content: 'Critical zones trigger immediate response protocols. Emergency teams deploy within 48 hours. Needs assessments precede intervention planning.', order: 3 },
      ],
      tables: [{
        id: 'humanitarian_priority',
        title: 'Humanitarian Priority Zones',
        headers: ['Zone', 'Gap %', 'Severity'],
        rows: data.gaps.filter(g => g.severity === 'critical' || g.severity === 'high').slice(0, 10).map(g => [
          g.geo_name,
          `${g.gap_pct.toFixed(1)}%`,
          g.severity.toUpperCase(),
        ]),
      }],
      highlights: [
        'Humanitarian principles guide all activities',
        'Coordinated response with partners',
        'Priority-based resource allocation',
      ],
    });

    // Section: Quality Assurance
    sections.push({
      id: 'quality',
      order: order++,
      title: 'Quality Assurance Framework',
      content: 'Quality assurance mechanisms ensure data integrity, service delivery standards, and continuous improvement.',
      subsections: [
        { id: 'qa_data', title: 'Data Quality Standards', content: 'Data must be complete, accurate, timely, and validated. Quality scores are calculated for all submissions. Low-quality submissions are flagged for review.', order: 1 },
        { id: 'qa_audits', title: 'Quality Audits', content: 'Quarterly quality audits review processes, data accuracy, and compliance. Findings inform improvement initiatives.', order: 2 },
        { id: 'qa_feedback', title: 'Feedback Mechanisms', content: 'Community feedback, agent observations, and partner inputs are systematically collected and analyzed. Feedback drives continuous improvement.', order: 3 },
      ],
      tables: [],
      highlights: [
        'Data quality standards: completeness, accuracy, timeliness',
        'Quarterly quality audits',
        'Continuous improvement driven by feedback',
      ],
    });

    return sections;
  }

  // -------------------------------------------------------------------------
  // Field Collection Guide Sections
  // -------------------------------------------------------------------------
  private buildFieldCollectionGuideSections(data: {
    forms: TerritorialForm[];
    submissionStats: { total: number; byStatus: Record<string, number>; thisMonth: number };
    coverage: CoverageResult[];
    routes: Array<{ id: string; name: string; status: string; completion: number }>;
  }): DocumentSection[] {
    const sections: DocumentSection[] = [];
    let order = 1;

    // Section: Field Collection Overview
    sections.push({
      id: 'fc_overview',
      order: order++,
      title: 'Field Collection Overview',
      content: `Field data collection is the foundation of territorial management. ${data.submissionStats.total} submissions have been recorded, with ${data.submissionStats.thisMonth} this month.`,
      subsections: [
        { id: 'fco_importance', title: 'Importance of Data Collection', content: 'Accurate field data drives coverage calculations, identifies gaps, informs strategy, and enables evidence-based decision making at all organizational levels.', order: 1 },
        { id: 'fco_responsibility', title: 'Field Agent Responsibilities', content: 'Field agents are responsible for: accurate data collection, GPS verification, photo documentation, timely submission, and data quality assurance.', order: 2 },
      ],
      tables: [],
      highlights: [
        `Total submissions: ${data.submissionStats.total.toLocaleString()}`,
        `This month: ${data.submissionStats.thisMonth}`,
        `${data.forms.length} active forms available`,
      ],
    });

    // Section: Data Collection Workflow
    sections.push({
      id: 'workflow',
      order: order++,
      title: 'Data Collection Workflow',
      content: 'Follow the standardized workflow for all field data collection activities.',
      subsections: [
        { id: 'wf_preparation', title: 'Preparation', content: 'Before field work: Review assigned route, check equipment (GPS, camera), ensure offline data sync, and confirm visit objectives.', order: 1 },
        { id: 'wf_collection', title: 'Collection Process', content: 'At each location: (1) Verify GPS accuracy, (2) Confirm entity identity, (3) Complete form entries, (4) Capture photos, (5) Obtain signatures if required.', order: 2 },
        { id: 'wf_submission', title: 'Submission', content: 'After collection: Review entries for completeness, verify mandatory fields, and submit. Data syncs automatically when connection is available.', order: 3 },
      ],
      tables: [],
      highlights: [
        'Preparation: Route review, equipment check, sync verification',
        'Collection: GPS verification, form completion, photo documentation',
        'Submission: Review, verify, submit, sync',
      ],
    });

    // Section: Form Completion Guidelines
    sections.push({
      id: 'form_guidelines',
      order: order++,
      title: 'Form Completion Guidelines',
      content: `${data.forms.length} active forms require specific data collection procedures.`,
      subsections: [
        { id: 'fg_general', title: 'General Guidelines', content: 'Complete all mandatory fields. Use consistent formatting. Provide detailed observations. Avoid abbreviations not defined in the glossary.', order: 1 },
        { id: 'fg_validation', title: 'Validation Rules', content: 'The system validates entries against defined rules. Invalid entries are highlighted and must be corrected before submission.', order: 2 },
        { id: 'fg_handling', title: 'Handling Special Cases', content: 'For unavailable data: Select "Not Available" option where provided, or add explanatory note. Do not leave mandatory fields blank.', order: 3 },
      ],
      tables: [{
        id: 'forms_guide_table',
        title: 'Available Data Collection Forms',
        headers: ['Form Name', 'Purpose', 'Key Fields'],
        rows: data.forms.slice(0, 10).map(f => [
          f.name,
          f.description ?? 'General data collection',
          'See form for details',
        ]),
      }],
      highlights: [
        'Complete all mandatory fields',
        'Use consistent formatting',
        'Provide detailed observations',
      ],
    });

    // Section: GPS & Location Verification
    sections.push({
      id: 'gps_guide',
      order: order++,
      title: 'GPS & Location Verification',
      content: 'GPS verification ensures data spatial accuracy and enables territorial mapping.',
      subsections: [
        { id: 'gps_check', title: 'GPS Verification Process', content: 'Enable GPS on your device. Wait for accuracy indicator to show green (ideal: <10m). Record coordinates at the exact location of the entity.', order: 1 },
        { id: 'gps_accuracy', title: 'Accuracy Standards', content: 'Target accuracy: <10m (green). Acceptable: <20m (yellow). Unacceptable: >20m (red) - seek better positioning before recording.', order: 2 },
        { id: 'gps_troubleshoot', title: 'GPS Troubleshooting', content: 'If GPS is unavailable: Move to an open area away from buildings. Restart GPS. If persistent, use manual coordinate entry with location description.', order: 3 },
      ],
      tables: [],
      highlights: [
        'Target GPS accuracy: <10 meters',
        'Green indicator: Good accuracy',
        'Red indicator: Seek better positioning',
      ],
    });

    // Section: Photo Documentation
    sections.push({
      id: 'photo_guide',
      order: order++,
      title: 'Photo Documentation',
      content: `${data.submissionStats.withPhotos} submissions include photo documentation. Photos provide visual evidence and context for data entries.`,
      subsections: [
        { id: 'pg_standards', title: 'Photo Standards', content: 'Photos must be: Clear and in focus, Well-lit, Showing the relevant subject, Free from obstructions, Taken at the correct location.', order: 1 },
        { id: 'pg_required', title: 'Required Photos', content: 'Specific forms require photos. Check form instructions for photo requirements. Capture all required angles and perspectives.', order: 2 },
        { id: 'pg_bestpractices', title: 'Best Practices', content: 'Capture photos in natural light when possible. Include context (surroundings) where relevant. Add captions to explain photo content.', order: 3 },
      ],
      tables: [],
      highlights: [
        'Clear, well-lit photos required',
        'Check form for specific photo requirements',
        'Add captions for context',
      ],
    });

    // Section: Signature Collection
    sections.push({
      id: 'signature_guide',
      order: order++,
      title: 'Signature Collection',
      content: `${data.submissionStats.withSignatures} submissions include signatures. Signatures verify data accuracy and consent.`,
      subsections: [
        { id: 'sg_process', title: 'Signature Collection Process', content: 'For forms requiring signatures: Explain the purpose to the signatory, obtain consent, capture signature on screen, verify signer details.', order: 1 },
        { id: 'sg_verification', title: 'Signatory Verification', content: 'Record signer name, role, and date. For official documents, verify signatory identity and authority.', order: 2 },
      ],
      tables: [],
      highlights: [
        'Explain purpose before requesting signature',
        'Record complete signer information',
        'Verify authority for official documents',
      ],
    });

    // Section: Data Quality
    sections.push({
      id: 'data_quality',
      order: order++,
      title: 'Data Quality Assurance',
      content: 'Data quality is essential for accurate territorial analysis and decision making.',
      subsections: [
        { id: 'dq_standards', title: 'Quality Standards', content: 'Data must be: Complete (no missing mandatory fields), Accurate (reflecting actual conditions), Timely (submitted the same day), Validated (GPS and photo evidence).', order: 1 },
        { id: 'dq_review', title: 'Self-Review Process', content: 'Before submitting: Review all entries, verify GPS accuracy, confirm photo attachments, check mandatory fields, resolve any highlighted issues.', order: 2 },
        { id: 'dq_common', title: 'Common Issues', content: 'Avoid: Missing GPS coordinates, incomplete forms, blurry photos, incorrect entity selection, delayed submission.', order: 3 },
      ],
      tables: [],
      highlights: [
        'Completeness: All mandatory fields filled',
        'Accuracy: Data reflects actual conditions',
        'Timeliness: Submit same day',
      ],
    });

    return sections;
  }

  // -------------------------------------------------------------------------
  // Route Management Guide Sections
  // -------------------------------------------------------------------------
  private buildRouteManagementGuideSections(data: {
    routes: Array<{ id: string; name: string; status: string; completion: number }>;
    coverage: CoverageResult[];
    density: DensityResult[];
    gaps: GapResult[];
  }): DocumentSection[] {
    const sections: DocumentSection[] = [];
    let order = 1;

    // Section: Route Management Overview
    sections.push({
      id: 'route_overview',
      order: order++,
      title: 'Route Management Overview',
      content: `${data.routes.length} routes are configured with an average completion rate of ${data.routes.length > 0 ? (data.routes.reduce((s, r) => s + r.completion, 0) / data.routes.length).toFixed(0) : 0}%.`,
      subsections: [
        { id: 'ro_purpose', title: 'Purpose of Route Management', content: 'Routes organize field visits into efficient sequences, ensuring comprehensive coverage while optimizing agent time and resources.', order: 1 },
        { id: 'ro_types', title: 'Route Types', content: 'Regular Routes: Daily or weekly standard visits. Priority Routes: Urgent coverage gaps or humanitarian needs. Survey Routes: Special data collection campaigns.', order: 2 },
      ],
      tables: [],
      highlights: [
        `${data.routes.length} total routes configured`,
        `${data.routes.filter(r => r.status === 'active').length} active routes`,
        `${data.routes.filter(r => r.status === 'completed').length} completed routes`,
      ],
    });

    // Section: Route Planning
    sections.push({
      id: 'route_planning',
      order: order++,
      title: 'Route Planning',
      content: 'Effective route planning balances coverage needs with operational efficiency.',
      subsections: [
        { id: 'rp_principles', title: 'Planning Principles', content: 'Routes should: Minimize travel distance, Balance workload evenly, Prioritize critical zones, Allow buffer time for unexpected issues.', order: 1 },
        { id: 'rp_factors', title: 'Planning Factors', content: 'Consider: Entity density, Geographic accessibility, Agent expertise, Time constraints, Priority requirements, and Seasonal factors.', order: 2 },
        { id: 'rp_tools', title: 'Planning Tools', content: 'Use the Route Builder to create and modify routes. The optimization feature suggests efficient visit sequences based on geographic proximity.', order: 3 },
      ],
      tables: [],
      highlights: [
        'Minimize travel distance between visits',
        'Balance workload across agents',
        'Prioritize critical and underserved zones',
      ],
    });

    // Section: Route Assignment
    sections.push({
      id: 'route_assignment',
      order: order++,
      title: 'Route Assignment',
      content: 'Assign routes to agents based on geographic proximity, expertise, and workload balance.',
      subsections: [
        { id: 'ra_criteria', title: 'Assignment Criteria', content: 'Consider: Agent location relative to route, Previous experience in area, Current workload, Language skills, Special assignment needs.', order: 1 },
        { id: 'ra_process', title: 'Assignment Process', content: 'Review available agents, Verify geographical compatibility, Check workload balance, Assign route, Communicate assignment details, Confirm receipt.', order: 2 },
        { id: 'ra_monitoring', title: 'Assignment Monitoring', content: 'Track assignment confirmations. Monitor for unacknowledged assignments. Reassign if agents are unavailable.', order: 3 },
      ],
      tables: [{
        id: 'routes_assign_table',
        title: 'Route Status Overview',
        headers: ['Route Name', 'Status', 'Completion'],
        rows: data.routes.slice(0, 15).map(r => [r.name, r.status, `${r.completion}%`]),
      }],
      highlights: [
        'Geographic proximity is primary criterion',
        'Balance workload across available agents',
        'Monitor assignment acknowledgments',
      ],
    });

    // Section: Route Execution
    sections.push({
      id: 'route_execution',
      order: order++,
      title: 'Route Execution',
      content: 'Execute routes according to planned sequences while adapting to field conditions.',
      subsections: [
        { id: 're_sequence', title: 'Visit Sequence', content: 'Follow the suggested visit sequence for optimal efficiency. Deviations should be documented with reasons.', order: 1 },
        { id: 're_tracking', title: 'Progress Tracking', content: 'Update visit status in real-time. Mark locations as visited, skipped (with reason), or inaccessible (with details).', order: 2 },
        { id: 're_completion', title: 'Route Completion', content: 'Complete all visits within the scheduled period. Address skipped or inaccessible locations through follow-up routes.', order: 3 },
      ],
      tables: [],
      highlights: [
        'Follow suggested visit sequence',
        'Update status in real-time',
        'Document any deviations or issues',
      ],
    });

    // Section: Route Monitoring
    sections.push({
      id: 'route_monitoring',
      order: order++,
      title: 'Route Monitoring',
      content: 'Monitor route progress through the Operations Dashboard for real-time visibility.',
      subsections: [
        { id: 'rm_metrics', title: 'Monitoring Metrics', content: 'Track: Completion percentage, Visit duration, Deviations from route, Data submission rate, and Geographic coverage.', order: 1 },
        { id: 'rm_alerts', title: 'Route Alerts', content: 'Alerts trigger for: Overdue routes (>24h past scheduled), Low completion (<50% mid-week), Inactivity, and Route failures.', order: 2 },
        { id: 'rm_interventions', title: 'Monitoring Interventions', content: 'For problematic routes: Contact agent immediately, Identify obstacles, Provide support or reassign, Document intervention.', order: 3 },
      ],
      tables: [],
      highlights: [
        'Real-time dashboard visibility',
        'Automated alerts for delays and issues',
        'Proactive intervention protocols',
      ],
    });

    // Section: Route Optimization
    sections.push({
      id: 'route_optimization',
      order: order++,
      title: 'Route Optimization',
      content: 'Regularly optimize routes based on performance data and changing conditions.',
      subsections: [
        { id: 'ro_review', title: 'Optimization Review', content: 'Weekly: Review completion metrics. Monthly: Analyze route efficiency. Quarterly: Comprehensive route restructuring.', order: 1 },
        { id: 'ro_adjustments', title: 'Common Adjustments', content: 'Add new entities to existing routes, Split over-long routes, Combine under-utilized routes, Reassign based on geography changes.', order: 2 },
        { id: 'ro_metrics', title: 'Efficiency Metrics', content: 'Measure: Visits per hour, Travel time ratio, Completion rate, Data quality per route, and Agent feedback.', order: 3 },
      ],
      tables: [],
      highlights: [
        'Weekly performance reviews',
        'Monthly efficiency analysis',
        'Quarterly comprehensive restructuring',
      ],
    });

    // Section: Coverage Integration
    sections.push({
      id: 'coverage_integration',
      order: order++,
      title: 'Route & Coverage Integration',
      content: 'Routes are designed to achieve territorial coverage targets efficiently.',
      subsections: [
        { id: 'ci_targets', title: 'Coverage Targets', content: 'Each route contributes to zone coverage. Ensure routes are designed to visit all entities at required frequency for target achievement.', order: 1 },
        { id: 'ci_gaps', title: 'Addressing Coverage Gaps', content: `${data.gaps.filter(g => g.severity === 'critical').length} critical gaps require priority route assignments. Create priority routes for immediate gap closure.`, order: 2 },
        { id: 'ci_density', title: 'Density-Based Planning', content: 'High-density areas require more frequent routes. Low-density areas can be served with less frequent, combined routes.', order: 3 },
      ],
      tables: [{
        id: 'coverage_route_table',
        title: 'Coverage Integration Summary',
        headers: ['Zone', 'Entities', 'Coverage %', 'Gap Status'],
        rows: data.gaps.slice(0, 10).map(g => [
          g.geo_name,
          g.expected_value.toString(),
          `${(100 - g.gap_pct).toFixed(0)}%`,
          g.severity.toUpperCase(),
        ]),
      }],
      highlights: [
        'Routes designed for coverage targets',
        'Priority routes for critical gaps',
        'Density-based visit frequency',
      ],
    });

    return sections;
  }

  // -------------------------------------------------------------------------
  // Export to PDF
  // -------------------------------------------------------------------------
  async exportToPDF(document: GeneratedDocument): Promise<Blob> {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'pt',
      format: 'letter',
    });

    const pageWidth = 612;
    const margin = 40;
    let y = margin;
    let pageNum = 1;

    // Cover Page
    doc.setFontSize(28);
    doc.setFont('helvetica', 'bold');
    doc.text(document.title, pageWidth / 2, y + 100, { align: 'center' });
    y += 140;

    doc.setFontSize(14);
    doc.setFont('helvetica', 'normal');
    doc.text(document.subtitle, pageWidth / 2, y, { align: 'center' });
    y += 30;

    doc.setFontSize(10);
    doc.text(`Version: ${document.version}`, pageWidth / 2, y, { align: 'center' });
    y += 15;
    doc.text(`Generated: ${new Date(document.generated_at).toLocaleDateString()}`, pageWidth / 2, y, { align: 'center' });
    y += 15;
    doc.text(`Author: ${document.author_name} (${document.author_role})`, pageWidth / 2, y, { align: 'center' });
    y += 15;
    doc.text(`Status: ${document.status.toUpperCase()}`, pageWidth / 2, y, { align: 'center' });

    // Table of Contents
    doc.addPage();
    pageNum++;
    y = margin;

    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text('Table of Contents', margin, y);
    y += 30;

    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    for (const entry of document.table_of_contents) {
      doc.text(`${entry.order}. ${entry.title}`, margin, y);
      doc.text(`Page ${entry.page}`, pageWidth - margin - 30, y, { align: 'right' });
      y += 18;
      if (y > 750) {
        doc.addPage();
        pageNum++;
        y = margin;
      }
    }

    // Document sections
    for (const section of document.sections.sort((a, b) => a.order - b.order)) {
      doc.addPage();
      pageNum++;
      y = margin;

      // Section title
      doc.setFontSize(18);
      doc.setFont('helvetica', 'bold');
      doc.text(`${section.order}. ${section.title}`, margin, y);
      y += 30;

      // Section content
      doc.setFontSize(11);
      doc.setFont('helvetica', 'normal');
      const contentLines = doc.splitTextToSize(section.content, pageWidth - margin * 2);
      doc.text(contentLines, margin, y);
      y += contentLines.length * 14 + 20;

      // Highlights
      if (section.highlights.length > 0) {
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text('Key Points:', margin, y);
        y += 20;

        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        for (const highlight of section.highlights) {
          doc.text(`  • ${highlight}`, margin, y);
          y += 15;
        }
        y += 10;
      }

      // Subsections
      for (const subsection of section.subsections.sort((a, b) => a.order - b.order)) {
        if (y > 700) {
          doc.addPage();
          pageNum++;
          y = margin;
        }

        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text(`${section.order}.${subsection.order} ${subsection.title}`, margin, y);
        y += 20;

        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        const subLines = doc.splitTextToSize(subsection.content, pageWidth - margin * 2);
        doc.text(subLines, margin, y);
        y += subLines.length * 12 + 15;
      }

      // Tables
      for (const table of section.tables) {
        if (y > 650) {
          doc.addPage();
          pageNum++;
          y = margin;
        }

        autoTable(doc, {
          startY: y + 10,
          head: [table.headers],
          body: table.rows,
          margin: { left: margin },
          styles: { fontSize: 8 },
          headStyles: { fillColor: [59, 130, 246] },
        });

        y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable?.finalY ?? y + 50;
      }
    }

    return doc.output('blob');
  }

  // -------------------------------------------------------------------------
  // Export to DOCX
  // -------------------------------------------------------------------------
  async exportToDocx(document: GeneratedDocument): Promise<Blob> {
    const sections: Paragraph[] = [];

    // Cover page
    sections.push(new Paragraph({ spacing: { before: 3000 } }));
    sections.push(new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [new TextRun({ text: document.title, bold: true, size: 56, font: 'Calibri' })],
    }));
    sections.push(new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 200 },
      children: [new TextRun({ text: document.subtitle, size: 28, font: 'Calibri', color: '666666' })],
    }));
    sections.push(new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 200 },
      children: [new TextRun({ text: `Version: ${document.version}`, size: 20, font: 'Calibri', color: '999999' })],
    }));
    sections.push(new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [new TextRun({ text: `Generated: ${new Date(document.generated_at).toLocaleDateString()}`, size: 20, font: 'Calibri', color: '999999' })],
    }));
    sections.push(new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [new TextRun({ text: `Author: ${document.author_name} (${document.author_role})`, size: 20, font: 'Calibri' })],
    }));
    sections.push(new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [new TextRun({ text: `Status: ${document.status.toUpperCase()}`, size: 20, font: 'Calibri' })],
    }));

    // Table of Contents
    sections.push(new Paragraph({ children: [new PageBreak()] }));
    sections.push(new Paragraph({
      heading: HeadingLevel.HEADING_1,
      children: [new TextRun({ text: 'Table of Contents', bold: true, size: 36, font: 'Calibri' })],
    }));

    for (const entry of document.table_of_contents) {
      sections.push(new Paragraph({
        spacing: { before: 80 },
        children: [new TextRun({ text: `${entry.order}. ${entry.title}`, size: 22, font: 'Calibri' })],
      }));
    }

    // Document sections
    for (const section of document.sections.sort((a, b) => a.order - b.order)) {
      sections.push(new Paragraph({ children: [new PageBreak()] }));

      // Section header
      sections.push(new Paragraph({
        heading: HeadingLevel.HEADING_1,
        children: [new TextRun({ text: `${section.order}. ${section.title}`, bold: true, size: 36, font: 'Calibri' })],
      }));

      // Section content
      sections.push(new Paragraph({
        spacing: { before: 200 },
        children: [new TextRun({ text: section.content, size: 22, font: 'Calibri' })],
      }));

      // Highlights
      if (section.highlights.length > 0) {
        sections.push(new Paragraph({
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 300 },
          children: [new TextRun({ text: 'Key Points', bold: true, size: 26, font: 'Calibri' })],
        }));

        for (const highlight of section.highlights) {
          sections.push(new Paragraph({
            spacing: { before: 80 },
            bullet: { level: 0 },
            children: [new TextRun({ text: highlight, size: 20, font: 'Calibri' })],
          }));
        }
      }

      // Subsections
      for (const subsection of section.subsections.sort((a, b) => a.order - b.order)) {
        sections.push(new Paragraph({
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 300 },
          children: [new TextRun({ text: `${section.order}.${subsection.order} ${subsection.title}`, bold: true, size: 26, font: 'Calibri' })],
        }));

        sections.push(new Paragraph({
          spacing: { before: 100 },
          children: [new TextRun({ text: subsection.content, size: 20, font: 'Calibri' })],
        }));
      }

      // Tables
      for (const table of section.tables) {
        sections.push(new Paragraph({
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 300 },
          children: [new TextRun({ text: table.title, bold: true, size: 26, font: 'Calibri' })],
        }));

        const headerRow = new TableRow({
          children: table.headers.map(h =>
            new TableCell({
              children: [new Paragraph({ children: [new TextRun({ text: h, bold: true, size: 18, font: 'Calibri', color: 'FFFFFF' })] })],
              shading: { fill: '3b82f6' },
            })
          ),
        });

        const dataRows = table.rows.map(row =>
          new TableRow({
            children: row.map(cell =>
              new TableCell({
                children: [new Paragraph({ children: [new TextRun({ text: String(cell), size: 18, font: 'Calibri' })] })],
              })
            ),
          })
        );

        sections.push(new Paragraph({
          spacing: { before: 100 },
          children: [new Table({
            rows: [headerRow, ...dataRows],
            width: { size: 100, type: WidthType.PERCENTAGE },
          })],
        }));
      }
    }

    const doc = new Document({
      sections: [{
        properties: {
          page: { size: { width: 12240, height: 15840 }, margin: { top: 1440, bottom: 1440, left: 1440, right: 1440 } },
        },
        children: sections,
      }],
    });

    return await Packer.toBlob(doc);
  }

  // -------------------------------------------------------------------------
  // Persistence
  // -------------------------------------------------------------------------
  async saveDocument(document: GeneratedDocument): Promise<void> {
    const { error } = await supabase
      .from('territorial_documents')
      .insert(document);
    if (error) throw error;
  }

  async getDocuments(organizationId: string, limit = 20): Promise<GeneratedDocument[]> {
    const { data, error } = await supabase
      .from('territorial_documents')
      .select('*')
      .eq('organization_id', organizationId)
      .order('generated_at', { ascending: false })
      .limit(limit);
    if (error) throw error;
    return (data ?? []) as GeneratedDocument[];
  }

  async getDocumentsByType(organizationId: string, documentType: DocumentType): Promise<GeneratedDocument[]> {
    const { data, error } = await supabase
      .from('territorial_documents')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('document_type', documentType)
      .order('generated_at', { ascending: false });
    if (error) throw error;
    return (data ?? []) as GeneratedDocument[];
  }

  async updateDocumentStatus(id: string, status: 'draft' | 'published' | 'archived'): Promise<void> {
    const { error } = await supabase
      .from('territorial_documents')
      .update({ status })
      .eq('id', id);
    if (error) throw error;
  }

  // -------------------------------------------------------------------------
  // Data Fetchers (consume existing engines - NO DUPLICATION)
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

  private async fetchRoutes(orgId: string): Promise<Array<{ id: string; name: string; status: string; completion: number }>> {
    try {
      const { data } = await supabase
        .from('routes')
        .select('id, name, status, completion_percentage')
        .eq('organization_id', orgId);
      return (data ?? []).map(r => ({
        id: r.id,
        name: r.name,
        status: r.status ?? 'unknown',
        completion: r.completion_percentage ?? 0,
      }));
    } catch {
      return [];
    }
  }

  // -------------------------------------------------------------------------
  // Helper Methods
  // -------------------------------------------------------------------------
  private buildTableOfContents(sections: DocumentSection[]): TableOfContentsEntry[] {
    return sections
      .sort((a, b) => a.order - b.order)
      .map((section, index) => ({
        order: section.order,
        title: section.title,
        page: index + 3, // Cover + TOC pages
      }));
  }

  private calculateMetadata(
    sections: DocumentSection[],
    data: {
      coverage: CoverageResult[];
      routes: Array<{ id: string; name: string; status: string; completion: number }>;
      forms: TerritorialForm[];
    }
  ): DocumentMetadata {
    const wordCount = sections.reduce((total, section) => {
      const sectionWords = section.content.split(/\s+/).length;
      const subWords = section.subsections.reduce((acc, sub) => acc + sub.content.split(/\s+/).length, 0);
      return total + sectionWords + subWords;
    }, 0);

    const avgCoverage = data.coverage.length > 0
      ? data.coverage.reduce((s, c) => s + c.coverage_pct, 0) / data.coverage.length
      : null;

    return {
      total_pages: sections.length + 2,
      word_count: wordCount,
      data_sources: [
        'TerritorialAtlasEngine',
        'TerritorialExecutiveReportingEngine',
        'TerritorialAIEngine',
        'TerritorialFieldCollectionEngine',
        'TerritorialIntelligenceEngine',
        'TerritorialIndicatorEngine',
        'TerritorialAlertEngine',
      ],
      territorial_coverage_pct: avgCoverage,
      entities_count: data.coverage.reduce((s, c) => s + c.total_establishments, 0),
      routes_count: data.routes.length,
      forms_count: data.forms.length,
      last_updated: new Date().toISOString(),
    };
  }

  private getDocumentTitle(type: DocumentType): string {
    const titles: Record<DocumentType, string> = {
      user_manual: 'NODX Enterprise User Manual',
      administrator_manual: 'NODX Enterprise Administrator Manual',
      operational_manual: 'NODX Enterprise Operational Manual',
      institutional_manual: 'NODX Enterprise Institutional Manual',
      field_collection_guide: 'Field Data Collection Guide',
      route_management_guide: 'Route Management Guide',
    };
    return titles[type];
  }

  private getDocumentSubtitle(type: DocumentType, orgName: string): string {
    const subtitles: Record<DocumentType, string> = {
      user_manual: `Field Operations Guide | ${orgName}`,
      administrator_manual: `System Administration Guide | ${orgName}`,
      operational_manual: `Territorial Operations Guide | ${orgName}`,
      institutional_manual: `Governance & Institutional Framework | ${orgName}`,
      field_collection_guide: `Data Collection Procedures | ${orgName}`,
      route_management_guide: `Route Planning & Execution Guide | ${orgName}`,
    };
    return subtitles[type];
  }
}

export const territorialDocumentationEngine = new TerritorialDocumentationEngine();

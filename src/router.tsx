import { createBrowserRouter, Navigate, Outlet } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import { useOrg } from './contexts/OrgContext';
import { AppShell } from './components/layout/AppShell';
import { LoginPage } from './pages/auth/LoginPage';
import { BootstrapPage } from './pages/auth/BootstrapPage';
import { ChangePasswordPage } from './pages/auth/ChangePasswordPage';
import { SetupPage } from './pages/setup/SetupPage';
import { DashboardPage } from './pages/dashboard/DashboardPage';
import { TerritoryDesignerPage } from './pages/territories/TerritoryDesignerPage';
import { RouteBuilderPage } from './pages/routes/RouteBuilderPage';
import { FormsEnginePage } from './pages/forms/FormsEnginePage';
import { GeospatialPage } from './pages/geospatial/GeospatialPage';
import { WorkflowEnginePage } from './pages/workflows/WorkflowEnginePage';
import { AnalyticsEnginePage } from './pages/analytics/AnalyticsEnginePage';
import { AIEnginePage } from './pages/ai/AIEnginePage';
import { SyncEnginePage } from './pages/sync/SyncEnginePage';
import { PermissionsEnginePage } from './pages/permissions/PermissionsEnginePage';
import { LicensingEnginePage } from './pages/licensing/LicensingEnginePage';
import { VisitsPage } from './pages/visits/VisitsPage';
import { MembersPage } from './pages/members/MembersPage';
import { InventoryPage } from './pages/inventory/InventoryPage';
import { AuditPage } from './pages/audit/AuditPage';
import { BulkImportPage } from './pages/import/BulkImportPage';
import { RiskMappingPage } from './pages/risk/RiskMappingPage';
import { GeographyPage } from './pages/geography/GeographyPage';
import { I18nPage } from './pages/i18n/I18nPage';
import { GovernancePage } from './pages/governance/GovernancePage';
import { DiagnosticDashboard } from './pages/diagnostics/DiagnosticDashboard';
import { TaxonomyPage } from './pages/taxonomy/TaxonomyPage';
import { ProjectsPage } from './pages/projects/ProjectsPage';
import { IndicatorsPage } from './pages/indicators/IndicatorsPage';
import { IndicatorDashboard } from './pages/indicators/IndicatorDashboard';
import { ScoreDashboard } from './pages/indicators/ScoreDashboard';
import { SemaphoreDashboard } from './pages/indicators/SemaphoreDashboard';
import { HistoricalTrendView } from './pages/indicators/HistoricalTrendView';
import { DataQualityPage } from './pages/quality/DataQualityPage';
import { ApprovalWorkflowPage } from './pages/approvals/ApprovalWorkflowPage';
import { EvidencePage } from './pages/evidence/EvidencePage';
import { KnowledgePage } from './pages/knowledge/KnowledgePage';
import { TasksPage } from './pages/tasks/TasksPage';
import { GlobalSearchPage } from './pages/search/GlobalSearchPage';
import { ObservatoryPage } from './pages/observatory/ObservatoryPage';
import { AIAnalystPage } from './pages/ai/AIAnalystPage';
import { ReportDashboard } from './pages/reports/ReportDashboard';
import { AlertDashboard } from './pages/alerts/AlertDashboard';
import { TerritorialIntelligenceDashboard } from './pages/territorial/TerritorialIntelligenceDashboard';
import { HouseholdsPage } from './pages/households/HouseholdsPage';
import { WASHPage } from './pages/wash/WASHPage';
import { ExportCenterPage } from './pages/export/ExportCenterPage';
import { FieldCollectionDashboard } from './pages/territorial/FieldCollectionDashboard';
import { TerritorialCommandCenter } from './pages/territorial/TerritorialCommandCenter';
import { TerritorialFormBuilderPage } from './pages/territorial/TerritorialFormBuilderPage';
import { TabulationDashboard } from './pages/territorial/TabulationDashboard';
import { TerritorialIndicatorDashboard } from './pages/territorial/TerritorialIndicatorDashboard';
import { TerritorialAlertCenter } from './pages/territorial/TerritorialAlertCenter';
import { AtlasCenter } from './pages/territorial/AtlasCenter';
import { ExecutiveReportingDashboard } from './pages/territorial/ExecutiveReportingDashboard';
import { TerritorialAIDashboard } from './pages/territorial/TerritorialAIDashboard';
import { DocumentationCenter } from './pages/territorial/DocumentationCenter';
import { OfflineManager } from './pages/territorial/OfflineManager';
import { SecurityCenter } from './pages/territorial/SecurityCenter';
import { RecoveryCenter } from './pages/territorial/RecoveryCenter';
import { SecurityAuditCenter } from './pages/territorial/SecurityAuditCenter';
import { LanguageCenterPage } from './pages/language/LanguageCenterPage';
import { ExternalIntegrationCenter } from './pages/territorial/ExternalIntegrationCenter';
import { NODXEcosystemConsole } from './pages/ecosystem/NODXEcosystemConsole';
import { NODXLandingPage } from './pages/landing/NODXLandingPage';
import { OrganizationsPage } from './pages/organizations/OrganizationsPage';

function AuthGuard() {
  const { user, loading, mustChangePassword } = useAuth();
  const { hasOrg, loading: orgLoading } = useOrg();

  if (loading || orgLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-400 text-sm">Loading...</div>
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace />;
  if (mustChangePassword) return <Navigate to="/change-password" replace />;
  if (!hasOrg) return <Navigate to="/setup" replace />;
  return (
    <AppShell>
      <Outlet />
    </AppShell>
  );
}

function PublicGuard() {
  const { user, loading, mustChangePassword } = useAuth();
  const { hasOrg, loading: orgLoading } = useOrg();
  if (loading || orgLoading) return null;
  if (user && mustChangePassword) return <Navigate to="/change-password" replace />;
  if (user && hasOrg) return <Navigate to="/dashboard" replace />;
  if (user && !hasOrg) return <Navigate to="/setup" replace />;
  return <Outlet />;
}

export const router = createBrowserRouter([
  // Public entry point - Operations Center login page
  {
    path: '/',
    element: <NODXLandingPage />,
  },
  // Bootstrap — always accessible (guards inside the page itself)
  {
    path: '/bootstrap',
    element: <BootstrapPage />,
  },
  // Change password — requires authenticated user
  {
    path: '/change-password',
    element: <ChangePasswordPage />,
  },
  {
    element: <PublicGuard />,
    children: [
      { path: '/login', element: <LoginPage /> },
    ],
  },
  {
    path: '/setup',
    element: <SetupPage />,
  },
  {
    element: <AuthGuard />,
    children: [
      { path: '/dashboard',   element: <DashboardPage /> },
      { path: '/organizations', element: <OrganizationsPage /> },
      { path: '/ecosystem',  element: <NODXEcosystemConsole /> },
      { path: '/territories', element: <TerritoryDesignerPage /> },
      { path: '/routes',      element: <RouteBuilderPage /> },
      { path: '/visits',      element: <VisitsPage /> },
      { path: '/forms',       element: <FormsEnginePage /> },
      { path: '/geospatial',  element: <GeospatialPage /> },
      { path: '/workflows',   element: <WorkflowEnginePage /> },
      { path: '/analytics',   element: <AnalyticsEnginePage /> },
      { path: '/ai',          element: <AIEnginePage /> },
      { path: '/inventory',   element: <InventoryPage /> },
      { path: '/sync',        element: <SyncEnginePage /> },
      { path: '/audit',       element: <AuditPage /> },
      { path: '/permissions', element: <PermissionsEnginePage /> },
      { path: '/licensing',   element: <LicensingEnginePage /> },
      { path: '/members',     element: <MembersPage /> },
      { path: '/import',      element: <BulkImportPage /> },
      { path: '/risk',        element: <RiskMappingPage /> },
      { path: '/geography',   element: <GeographyPage /> },
      { path: '/i18n',        element: <I18nPage /> },
      { path: '/governance',  element: <GovernancePage /> },
      { path: '/diagnostics', element: <DiagnosticDashboard /> },
      { path: '/taxonomy',    element: <TaxonomyPage /> },
      { path: '/projects',    element: <ProjectsPage /> },
      { path: '/indicators',           element: <IndicatorsPage /> },
      { path: '/indicator-dashboard',  element: <IndicatorDashboard /> },
      { path: '/score-dashboard',      element: <ScoreDashboard /> },
      { path: '/semaphore',            element: <SemaphoreDashboard /> },
      { path: '/trends',               element: <HistoricalTrendView /> },
      { path: '/quality',     element: <DataQualityPage /> },
      { path: '/approvals',   element: <ApprovalWorkflowPage /> },
      { path: '/evidence',    element: <EvidencePage /> },
      { path: '/knowledge',   element: <KnowledgePage /> },
      { path: '/tasks',       element: <TasksPage /> },
      { path: '/search',      element: <GlobalSearchPage /> },
      { path: '/observatory', element: <ObservatoryPage /> },
      { path: '/ai-analyst',  element: <AIAnalystPage /> },
      { path: '/reports',     element: <ReportDashboard /> },
      { path: '/alerts',      element: <AlertDashboard /> },
      { path: '/territorial-intelligence', element: <TerritorialIntelligenceDashboard /> },
      { path: '/field-collection', element: <FieldCollectionDashboard /> },
      { path: '/command-center', element: <TerritorialCommandCenter /> },
      { path: '/form-builder', element: <TerritorialFormBuilderPage /> },
      { path: '/tabulation', element: <TabulationDashboard /> },
      { path: '/territorial-indicators', element: <TerritorialIndicatorDashboard /> },
      { path: '/territorial-alerts', element: <TerritorialAlertCenter /> },
      { path: '/atlas', element: <AtlasCenter /> },
      { path: '/executive-reports', element: <ExecutiveReportingDashboard /> },
      { path: '/territorial-ai', element: <TerritorialAIDashboard /> },
      { path: '/documentation', element: <DocumentationCenter /> },
      { path: '/offline', element: <OfflineManager /> },
      { path: '/security', element: <SecurityCenter /> },
      { path: '/recovery', element: <RecoveryCenter /> },
      { path: '/security-audit', element: <SecurityAuditCenter /> },
      { path: '/language', element: <LanguageCenterPage /> },
      { path: '/external-integrations', element: <ExternalIntegrationCenter /> },
      { path: '/households', element: <HouseholdsPage /> },
      { path: '/wash', element: <WASHPage /> },
      { path: '/export', element: <ExportCenterPage /> },
    ],
  },
]);

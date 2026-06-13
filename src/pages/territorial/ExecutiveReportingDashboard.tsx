import { useState, useCallback } from 'react';
import {
  FileText, TrendingUp, Shield, Globe, MapPin, Route, Building,
  RefreshCw, Eye, AlertTriangle, CheckCircle, Target,
  Presentation, FileSpreadsheet, Zap, Clock, BarChart2,
  BookOpen, Layers, Users, ChevronDown, ChevronRight, X,
} from 'lucide-react';
import { useOrg } from '../../contexts/OrgContext';
import { useAuth } from '../../contexts/AuthContext';
import { PageHeader } from '../../components/common/PageHeader';
import { EmptyState } from '../../components/common/EmptyState';
import { Modal } from '../../components/common/Modal';
import {
  territorialExecutiveReportingEngine,
  type ExecutiveReport,
  type ExecutiveReportType,
  type ExecutiveSummaryFormat,
  type ExecutiveExportFormat,
  type ExecutiveRecommendation,
  type ExecutiveNarrative,
} from '../../services/TerritorialExecutiveReportingEngine';
import {
  BarChart as RechartsBarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
} from 'recharts';

const REPORT_TYPE_CONFIG: Record<ExecutiveReportType, { icon: React.ComponentType<{ className?: string }>; label: string; description: string; color: string }> = {
  national: {
    icon: Globe,
    label: 'National Report',
    description: 'National-level territorial intelligence executive summary',
    color: '#3b82f6',
  },
  provincial: {
    icon: MapPin,
    label: 'Provincial Report',
    description: 'Provincial-level operational analysis',
    color: '#8b5cf6',
  },
  municipal: {
    icon: Building,
    label: 'Municipal Report',
    description: 'Municipality-level detailed intelligence',
    color: '#10b981',
  },
  corridor: {
    icon: Route,
    label: 'Corridor Report',
    description: 'Corridor performance and analysis',
    color: '#f59e0b',
  },
  commercial: {
    icon: TrendingUp,
    label: 'Commercial Report',
    description: 'Commercial activity and market analysis',
    color: '#ec4899',
  },
  humanitarian: {
    icon: Shield,
    label: 'Humanitarian Report',
    description: 'Humanitarian response and vulnerability assessment',
    color: '#ef4444',
  },
};

const FORMAT_CONFIG: Record<ExecutiveSummaryFormat, { label: string; description: string }> = {
  one_page: { label: 'One-Page', description: 'Concise single-page executive summary' },
  multi_page: { label: 'Multi-Page', description: 'Detailed multi-page report with full analysis' },
  presentation: { label: 'Presentation', description: 'Slide deck format for presentations' },
};

const CHART_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

const PRIORITY_COLORS = {
  high: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200' },
  medium: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
  low: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
};

// Report Type Card
function ReportTypeCard({
  type,
  config,
  onClick,
  disabled,
}: {
  type: ExecutiveReportType;
  config: { icon: React.ComponentType<{ className?: string }>; label: string; description: string; color: string };
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`w-full p-5 bg-white rounded-xl border border-gray-100 hover:border-blue-300 hover:shadow-md transition-all text-left ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
    >
      <div className="flex items-start gap-4">
        <div
          className="w-12 h-12 rounded-xl flex items-center justify-center"
          style={{ backgroundColor: `${config.color}20` }}
        >
          <config.icon className="w-6 h-6" style={{ color: config.color }} />
        </div>
        <div className="flex-1">
          <h3 className="font-bold text-gray-900">{config.label}</h3>
          <p className="text-sm text-gray-500 mt-1">{config.description}</p>
        </div>
      </div>
    </button>
  );
}

// Recommendation Card
function RecommendationCard({ recommendation }: { recommendation: ExecutiveRecommendation }) {
  const [expanded, setExpanded] = useState(false);
  const colors = PRIORITY_COLORS[recommendation.priority];

  const categoryIcons = {
    expansion: TrendingUp,
    commercial: BarChart2,
    humanitarian: Shield,
    route_optimization: Route,
    priority_intervention: Target,
  };

  const Icon = categoryIcons[recommendation.category] ?? Zap;

  return (
    <div className="bg-white rounded-lg border border-gray-100">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${colors.bg}`}>
            <Icon className={`w-5 h-5 ${colors.text}`} />
          </div>
          <div className="text-left">
            <div className="font-medium text-gray-800">{recommendation.title}</div>
            <div className="text-xs text-gray-500 mt-0.5">{recommendation.estimated_timeline}</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className={`px-2 py-1 text-xs font-semibold rounded-full ${colors.bg} ${colors.text} ${colors.border} border`}>
            {recommendation.priority.toUpperCase()}
          </span>
          {expanded ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-400" />}
        </div>
      </button>

      {expanded && (
        <div className="p-4 pt-0 space-y-3 border-t border-gray-100">
          <p className="text-sm text-gray-600">{recommendation.description}</p>

          <div className="grid grid-cols-2 gap-3">
            <div className="p-2 bg-gray-50 rounded">
              <div className="text-xs text-gray-500">Impact Score</div>
              <div className="text-sm font-semibold text-gray-800">{recommendation.impact_score}/100</div>
            </div>
            <div className="p-2 bg-gray-50 rounded">
              <div className="text-xs text-gray-500">Timeline</div>
              <div className="text-sm font-semibold text-gray-800">{recommendation.estimated_timeline}</div>
            </div>
          </div>

          <div>
            <div className="text-xs font-medium text-gray-600 mb-1">Action Items:</div>
            <ul className="space-y-1">
              {recommendation.action_items.map((item, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-gray-600">
                  <span className="text-blue-500 mt-0.5">{i + 1}.</span>
                  {item}
                </li>
              ))}
            </ul>
          </div>

          <div className="p-3 bg-blue-50 rounded-lg">
            <div className="text-xs font-medium text-blue-700 mb-1">Resources Required:</div>
            <p className="text-sm text-blue-800">{recommendation.resource_requirements}</p>
          </div>

          {recommendation.affected_areas.length > 0 && (
            <div>
              <div className="text-xs font-medium text-gray-600 mb-1">Affected Areas:</div>
              <div className="flex flex-wrap gap-1">
                {recommendation.affected_areas.map((area, i) => (
                  <span key={i} className="text-xs px-2 py-0.5 bg-gray-100 rounded-full text-gray-600">
                    {area}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Narrative Section
function NarrativeSection({ title, content }: { title: string; content: string }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="bg-white rounded-lg border border-gray-100">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
      >
        <span className="font-medium text-gray-800">{title}</span>
        {expanded ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-400" />}
      </button>
      {expanded && (
        <div className="p-4 pt-0 border-t border-gray-100">
          <p className="text-sm text-gray-600 leading-relaxed">{content}</p>
        </div>
      )}
    </div>
  );
}

// Generate Report Modal
function GenerateReportModal({
  open,
  onClose,
  onGenerate,
  generating,
}: {
  open: boolean;
  onClose: () => void;
  onGenerate: (type: ExecutiveReportType, format: ExecutiveSummaryFormat, generateAtlas: boolean) => void;
  generating: boolean;
}) {
  const [selectedType, setSelectedType] = useState<ExecutiveReportType | null>(null);
  const [format, setFormat] = useState<ExecutiveSummaryFormat>('multi_page');
  const [generateAtlas, setGenerateAtlas] = useState(false);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Generate Executive Report"
      footer={
        <div className="flex items-center justify-between">
          <button onClick={onClose} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-xl text-sm">
            Cancel
          </button>
          <button
            onClick={() => selectedType && onGenerate(selectedType, format, generateAtlas)}
            disabled={!selectedType || generating}
            className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 disabled:opacity-50"
          >
            {generating ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" /> Generating...
              </>
            ) : (
              <>
                <FileText className="w-4 h-4" /> Generate Report
              </>
            )}
          </button>
        </div>
      }
    >
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Report Type</label>
          <div className="grid grid-cols-2 gap-3">
            {(Object.entries(REPORT_TYPE_CONFIG) as [ExecutiveReportType, typeof REPORT_TYPE_CONFIG[ExecutiveReportType]][]).map(([type, config]) => (
              <button
                key={type}
                onClick={() => setSelectedType(type)}
                className={`p-3 rounded-xl border-2 text-left transition-all ${
                  selectedType === type
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center gap-3">
                  <config.icon className="w-5 h-5" style={{ color: config.color }} />
                  <div>
                    <div className="font-medium text-gray-800">{config.label}</div>
                    <div className="text-xs text-gray-500">{config.description}</div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Summary Format</label>
          <div className="flex gap-3">
            {(Object.entries(FORMAT_CONFIG) as [ExecutiveSummaryFormat, typeof FORMAT_CONFIG[ExecutiveSummaryFormat]][]).map(([fmt, config]) => (
              <button
                key={fmt}
                onClick={() => setFormat(fmt)}
                className={`flex-1 p-3 rounded-xl border-2 text-center ${
                  format === fmt ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                }`}
              >
                <div className="font-medium">{config.label}</div>
                <div className="text-xs text-gray-500">{config.description}</div>
              </button>
            ))}
          </div>
        </div>

        <div className="p-4 bg-gray-50 rounded-xl">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={generateAtlas}
              onChange={(e) => setGenerateAtlas(e.target.checked)}
              className="w-4 h-4 text-blue-600 rounded"
            />
            <div>
              <div className="text-sm font-medium text-gray-700">Generate Atlas Reference</div>
              <div className="text-xs text-gray-500">Include a full Territorial Atlas with this report</div>
            </div>
          </label>
        </div>

        <div className="p-4 bg-gray-50 rounded-xl">
          <div className="text-xs font-semibold text-gray-600 mb-2">REPORT CONTENTS:</div>
          <div className="grid grid-cols-2 gap-2 text-xs text-gray-500">
            <span>Executive Summary</span>
            <span>AI-Generated Narratives</span>
            <span>Automatic Recommendations</span>
            <span>Key Metrics Dashboard</span>
            <span>Alert Summary</span>
            <span>Field Collection Stats</span>
          </div>
        </div>
      </div>
    </Modal>
  );
}

// Report Preview Modal
function ReportPreviewModal({
  report,
  onClose,
  onExport,
  exporting,
}: {
  report: ExecutiveReport;
  onClose: () => void;
  onExport: (format: ExecutiveExportFormat) => void;
  exporting: ExecutiveExportFormat | null;
}) {
  const [activeTab, setActiveTab] = useState<'summary' | 'narratives' | 'recommendations'>('summary');

  const radarData = [
    { metric: 'Coverage', value: report.key_metrics.coverage_score, fullMark: 100 },
    { metric: 'Opportunity', value: report.key_metrics.opportunity_score, fullMark: 100 },
    { metric: 'Entities', value: Math.min(100, report.key_metrics.total_entities / 10), fullMark: 100 },
  ];

  const alertPieData = [
    { name: 'Critical', value: report.alert_summary.critical_count, color: '#ef4444' },
    { name: 'High', value: report.alert_summary.high_count, color: '#f97316' },
    { name: 'Others', value: report.alert_summary.total_active - report.alert_summary.critical_count - report.alert_summary.high_count, color: '#f59e0b' },
  ].filter(d => d.value > 0);

  return (
    <Modal
      open={!!report}
      onClose={onClose}
      title={report.title}
      size="xl"
      footer={
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={() => onExport('pdf')}
              disabled={exporting === 'pdf'}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 disabled:opacity-50"
            >
              {exporting === 'pdf' ? <RefreshCw className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
              PDF
            </button>
            <button
              onClick={() => onExport('word')}
              disabled={exporting === 'word'}
              className="flex items-center gap-2 px-4 py-2 bg-blue-700 text-white text-sm font-medium rounded-lg hover:bg-blue-800 disabled:opacity-50"
            >
              {exporting === 'word' ? <RefreshCw className="w-4 h-4 animate-spin" /> : <FileSpreadsheet className="w-4 h-4" />}
              DOCX
            </button>
            <button
              onClick={() => onExport('powerpoint')}
              disabled={exporting === 'powerpoint'}
              className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white text-sm font-medium rounded-lg hover:bg-orange-700 disabled:opacity-50"
            >
              {exporting === 'powerpoint' ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Presentation className="w-4 h-4" />}
              PPT
            </button>
          </div>
          <button onClick={onClose} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg text-sm">
            Close
          </button>
        </div>
      }
    >
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
          <div>
            <div className="text-sm text-gray-500">{report.subtitle}</div>
            <div className="text-xs text-gray-400 mt-1">
              Generated: {new Date(report.generated_at).toLocaleString()}
            </div>
          </div>
          <div className={`px-3 py-1 rounded-full text-xs font-semibold ${
            report.key_metrics.risk_level === 'critical' ? 'bg-red-100 text-red-700' :
            report.key_metrics.risk_level === 'red' ? 'bg-red-100 text-red-700' :
            report.key_metrics.risk_level === 'orange' ? 'bg-orange-100 text-orange-700' :
            report.key_metrics.risk_level === 'yellow' ? 'bg-amber-100 text-amber-700' :
            'bg-emerald-100 text-emerald-700'
          }`}>
            Risk: {report.key_metrics.risk_level.toUpperCase()}
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-6 gap-3">
          {[
            { label: 'Coverage', value: `${report.key_metrics.coverage_score}%`, icon: Target },
            { label: 'Opportunity', value: `${report.key_metrics.opportunity_score}%`, icon: TrendingUp },
            { label: 'Entities', value: report.key_metrics.total_entities.toLocaleString(), icon: MapPin },
            { label: 'Opportunities', value: report.key_metrics.total_opportunities.toString(), icon: Zap },
            { label: 'Critical', value: report.key_metrics.critical_issues.toString(), icon: AlertTriangle },
            { label: 'Alerts', value: report.alert_summary.total_active.toString(), icon: Bell },
          ].map((stat) => (
            <div key={stat.label} className="p-3 bg-white rounded-lg border border-gray-100 text-center">
              <stat.icon className="w-4 h-4 mx-auto text-gray-400 mb-1" />
              <div className="text-lg font-bold text-gray-900">{stat.value}</div>
              <div className="text-xs text-gray-500">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-2">
          {(['summary', 'narratives', 'recommendations'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                activeTab === tab
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {activeTab === 'summary' && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white rounded-xl border border-gray-100 p-4">
                <h4 className="font-semibold text-gray-800 mb-3">Performance Scores</h4>
                <ResponsiveContainer width="100%" height={200}>
                  <RadarChart data={radarData}>
                    <PolarGrid />
                    <PolarAngleAxis dataKey="metric" tick={{ fontSize: 11 }} />
                    <PolarRadiusAxis angle={90} domain={[0, 100]} tick={false} />
                    <Radar name="Score" dataKey="value" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.3} />
                  </RadarChart>
                </ResponsiveContainer>
              </div>

              <div className="bg-white rounded-xl border border-gray-100 p-4">
                <h4 className="font-semibold text-gray-800 mb-3">Alert Distribution</h4>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      data={alertPieData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={40}
                      outerRadius={70}
                      paddingAngle={2}
                    >
                      {alertPieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-blue-50 rounded-xl border border-blue-200 p-4">
              <div className="flex items-center gap-2 text-blue-700 font-medium mb-2">
                <BookOpen className="w-4 h-4" />
                Atlas Reference
              </div>
              <div className="text-sm text-blue-800">
                {report.atlas_reference.atlas_id
                  ? `Linked Atlas (${report.atlas_reference.atlas_type}) with ${report.atlas_reference.sections_count} sections`
                  : 'No linked atlas'}
              </div>
            </div>

            <div className="bg-amber-50 rounded-xl border border-amber-200 p-4">
              <div className="flex items-center gap-2 text-amber-700 font-medium mb-2">
                <Clock className="w-4 h-4" />
                Field Collection Summary
              </div>
              <div className="grid grid-cols-3 gap-4 text-sm text-amber-800">
                <div>
                  <span className="text-amber-600">Total Visits:</span> {report.field_collection_summary.total_visits.toLocaleString()}
                </div>
                <div>
                  <span className="text-amber-600">Avg/Month:</span> {report.field_collection_summary.avg_per_month.toFixed(1)}
                </div>
                <div>
                  <span className="text-amber-600">Peak:</span> {report.field_collection_summary.peak_month ?? 'N/A'}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'narratives' && (
          <div className="space-y-2">
            {(Object.entries(report.narrative) as [keyof ExecutiveNarrative, string][]).map(([key, content]) => (
              <NarrativeSection
                key={key}
                title={key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
                content={content}
              />
            ))}
          </div>
        )}

        {activeTab === 'recommendations' && (
          <div className="space-y-2">
            {report.recommendations.length === 0 ? (
              <EmptyState
                icon={<CheckCircle className="w-6 h-6" />}
                title="No Recommendations"
                description="All systems operating optimally"
              />
            ) : (
              report.recommendations.map((rec) => (
                <RecommendationCard key={rec.id} recommendation={rec} />
              ))
            )}
          </div>
        )}
      </div>
    </Modal>
  );
}

// Placeholder Bell icon
function Bell({ className }: { className?: string }) {
  return <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
  </svg>;
}

// Main Page
export function ExecutiveReportingDashboard() {
  const { org } = useOrg();
  const { user } = useAuth();

  const [generating, setGenerating] = useState(false);
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [currentReport, setCurrentReport] = useState<ExecutiveReport | null>(null);
  const [savedReports, setSavedReports] = useState<ExecutiveReport[]>([]);
  const [exporting, setExporting] = useState<ExecutiveExportFormat | null>(null);

  const handleGenerate = useCallback(async (
    type: ExecutiveReportType,
    format: ExecutiveSummaryFormat,
    generateAtlas: boolean
  ) => {
    if (!org) return;
    setGenerating(true);
    setShowGenerateModal(false);

    try {
      const report = await territorialExecutiveReportingEngine.generateExecutiveReport(
        org.id,
        type,
        { format, generateAtlas, atlasType: type }
      );
      setCurrentReport(report);

      // Save to database
      await territorialExecutiveReportingEngine.saveReport(report);
    } catch (e) {
      console.error('Failed to generate report:', e);
    } finally {
      setGenerating(false);
    }
  }, [org]);

  const handleExport = useCallback(async (format: ExecutiveExportFormat) => {
    if (!currentReport) return;
    setExporting(format);

    try {
      let blob: Blob;
      let filename: string;

      if (format === 'pdf') {
        blob = await territorialExecutiveReportingEngine.exportToPDF(currentReport);
        filename = `${currentReport.report_type}_executive_report.pdf`;
      } else if (format === 'word') {
        blob = await territorialExecutiveReportingEngine.exportToDocx(currentReport);
        filename = `${currentReport.report_type}_executive_report.docx`;
      } else {
        blob = await territorialExecutiveReportingEngine.exportToPowerPoint(currentReport);
        filename = `${currentReport.report_type}_executive_report.pptx`;
      }

      // Download
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error('Failed to export:', e);
    } finally {
      setExporting(null);
    }
  }, [currentReport]);

  return (
    <div>
      <PageHeader
        title="Executive Reporting"
        subtitle="AI-powered executive intelligence reports and strategic recommendations"
        actions={
          <button
            onClick={() => setShowGenerateModal(true)}
            disabled={generating}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 disabled:opacity-50"
          >
            {generating ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" /> Generating...
              </>
            ) : (
              <>
                <FileText className="w-4 h-4" /> Generate Report
              </>
            )}
          </button>
        }
      />

      <div className="space-y-6">
        {/* Current Report Preview */}
        {currentReport && (
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl border border-blue-200 p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h2 className="text-xl font-bold text-gray-900">{currentReport.title}</h2>
                <p className="text-sm text-gray-600 mt-1">{currentReport.subtitle}</p>
              </div>
              <div className={`px-4 py-2 rounded-xl ${
                currentReport.key_metrics.risk_level === 'critical' || currentReport.key_metrics.risk_level === 'red'
                  ? 'bg-red-100 border-red-200'
                  : currentReport.key_metrics.risk_level === 'orange'
                  ? 'bg-orange-100 border-orange-200'
                  : currentReport.key_metrics.risk_level === 'yellow'
                  ? 'bg-amber-100 border-amber-200'
                  : 'bg-emerald-100 border-emerald-200'
              } border`}>
                <div className="text-xs text-gray-500">Risk Level</div>
                <div className={`text-lg font-bold ${
                  currentReport.key_metrics.risk_level === 'critical' || currentReport.key_metrics.risk_level === 'red'
                    ? 'text-red-700'
                    : currentReport.key_metrics.risk_level === 'orange'
                    ? 'text-orange-700'
                    : currentReport.key_metrics.risk_level === 'yellow'
                    ? 'text-amber-700'
                    : 'text-emerald-700'
                }`}>
                  {currentReport.key_metrics.risk_level.toUpperCase()}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-4">
              {[
                { label: 'Coverage Score', value: `${currentReport.key_metrics.coverage_score}%`, icon: Target },
                { label: 'Opportunity Score', value: `${currentReport.key_metrics.opportunity_score}%`, icon: TrendingUp },
                { label: 'Total Entities', value: currentReport.key_metrics.total_entities.toLocaleString(), icon: MapPin },
                { label: 'Opportunities', value: currentReport.key_metrics.total_opportunities.toString(), icon: Zap },
                { label: 'Critical Issues', value: currentReport.key_metrics.critical_issues.toString(), icon: AlertTriangle },
                { label: 'Recommendations', value: currentReport.recommendations.length.toString(), icon: CheckCircle },
              ].map((stat) => (
                <div key={stat.label} className="bg-white/70 rounded-xl p-3 text-center">
                  <stat.icon className="w-5 h-5 mx-auto text-blue-500 mb-1" />
                  <div className="text-lg font-bold text-gray-900">{stat.value}</div>
                  <div className="text-xs text-gray-500">{stat.label}</div>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Clock className="w-4 h-4" />
                {new Date(currentReport.generated_at).toLocaleString()}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentReport({ ...currentReport })}
                  className="flex items-center gap-2 px-4 py-2 bg-white text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50"
                >
                  <Eye className="w-4 h-4" /> Preview
                </button>
                <button
                  onClick={() => handleExport('pdf')}
                  disabled={exporting === 'pdf'}
                  className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 disabled:opacity-50"
                >
                  {exporting === 'pdf' ? <RefreshCw className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
                  PDF
                </button>
                <button
                  onClick={() => handleExport('word')}
                  disabled={exporting === 'word'}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-700 text-white text-sm font-medium rounded-lg hover:bg-blue-800 disabled:opacity-50"
                >
                  {exporting === 'word' ? <RefreshCw className="w-4 h-4 animate-spin" /> : <FileSpreadsheet className="w-4 h-4" />}
                  DOCX
                </button>
                <button
                  onClick={() => handleExport('powerpoint')}
                  disabled={exporting === 'powerpoint'}
                  className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white text-sm font-medium rounded-lg hover:bg-orange-700 disabled:opacity-50"
                >
                  {exporting === 'powerpoint' ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Presentation className="w-4 h-4" />}
                  PPT
                </button>
              </div>
            </div>

            {/* Recommendations Preview */}
            {currentReport.recommendations.length > 0 && (
              <div className="mt-6 space-y-2">
                <h3 className="font-semibold text-gray-800">Key Recommendations ({currentReport.recommendations.length})</h3>
                {currentReport.recommendations.slice(0, 3).map((rec) => (
                  <RecommendationCard key={rec.id} recommendation={rec} />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Report Types Grid */}
        <div>
          <h3 className="font-bold text-gray-900 mb-4">Generate Executive Report</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {(Object.entries(REPORT_TYPE_CONFIG) as [ExecutiveReportType, typeof REPORT_TYPE_CONFIG[ExecutiveReportType]][]).map(([type, config]) => (
              <ReportTypeCard
                key={type}
                type={type}
                config={config}
                onClick={() => setShowGenerateModal(true)}
                disabled={generating}
              />
            ))}
          </div>
        </div>

        {/* Info Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl border border-gray-100 p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
                <Layers className="w-5 h-5 text-blue-600" />
              </div>
              <h3 className="font-bold text-gray-800">AI Narratives</h3>
            </div>
            <p className="text-sm text-gray-600">
              Auto-generated intelligence narratives for coverage, density, gaps, risks, and opportunities.
            </p>
          </div>

          <div className="bg-white rounded-xl border border-gray-100 p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center">
                <Zap className="w-5 h-5 text-emerald-600" />
              </div>
              <h3 className="font-bold text-gray-800">Recommendations</h3>
            </div>
            <p className="text-sm text-gray-600">
              Automatic strategic recommendations for expansion, commercial, humanitarian, and optimization.
            </p>
          </div>

          <div className="bg-white rounded-xl border border-gray-100 p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-purple-50 rounded-xl flex items-center justify-center">
                <BarChart2 className="w-5 h-5 text-purple-600" />
              </div>
              <h3 className="font-bold text-gray-800">6 Report Types</h3>
            </div>
            <p className="text-sm text-gray-600">
              National, provincial, municipal, corridor, commercial, and humanitarian.
            </p>
          </div>

          <div className="bg-white rounded-xl border border-gray-100 p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-rose-50 rounded-xl flex items-center justify-center">
                <FileText className="w-5 h-5 text-rose-600" />
              </div>
              <h3 className="font-bold text-gray-800">3 Export Formats</h3>
            </div>
            <p className="text-sm text-gray-600">
              Export to PDF, Word, or PowerPoint with optimized layouts.
            </p>
          </div>
        </div>

        {/* Empty State */}
        {!currentReport && (
          <EmptyState
            icon={<FileText className="w-6 h-6" />}
            title="No Executive Report Generated"
            description="Generate your first executive intelligence report for strategic insights."
          />
        )}
      </div>

      {/* Modals */}
      <GenerateReportModal
        open={showGenerateModal}
        onClose={() => setShowGenerateModal(false)}
        onGenerate={handleGenerate}
        generating={generating}
      />

      {currentReport && (
        <ReportPreviewModal
          report={currentReport}
          onClose={() => setCurrentReport(null)}
          onExport={handleExport}
          exporting={exporting}
        />
      )}
    </div>
  );
}

import { useState, useCallback } from 'react';
import {
  BookOpen, Map, MapPin, Building, Route, Users, Shield, FileText,
  RefreshCw, Download, Eye, Globe, Layers, Activity, ChevronDown, ChevronRight,
  CheckCircle, Clock, AlertTriangle, BarChart2, TrendingUp, Target,
  FileOutput, Presentation, FileSpreadsheet, X,
} from 'lucide-react';
import { useOrg } from '../../contexts/OrgContext';
import { useAuth } from '../../contexts/AuthContext';
import { PageHeader } from '../../components/common/PageHeader';
import { EmptyState } from '../../components/common/EmptyState';
import { Modal } from '../../components/common/Modal';
import {
  territorialAtlasEngine,
  type AtlasGeneratedProduct,
  type AtlasType,
  type AtlasFormat,
  type AtlasExportFormat,
  type AtlasSection,
} from '../../services/TerritorialAtlasEngine';
import {
  BarChart as RechartsBarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
} from 'recharts';

const ATLAS_TYPE_CONFIG: Record<AtlasType, { icon: React.ComponentType<{ className?: string }>; label: string; description: string; color: string }> = {
  national: {
    icon: Globe,
    label: 'National Atlas',
    description: 'Complete territorial analysis at the national level',
    color: '#3b82f6',
  },
  provincial: {
    icon: Map,
    label: 'Provincial Atlas',
    description: 'Detailed provincial-level territorial intelligence',
    color: '#8b5cf6',
  },
  municipal: {
    icon: Building,
    label: 'Municipal Atlas',
    description: 'Municipality-level operational analysis',
    color: '#10b981',
  },
  corridor: {
    icon: Route,
    label: 'Corridor Atlas',
    description: 'Territorial corridor performance analysis',
    color: '#f59e0b',
  },
  commercial: {
    icon: TrendingUp,
    label: 'Commercial Atlas',
    description: 'Commercial activity and market analysis',
    color: '#ec4899',
  },
  humanitarian: {
    icon: Shield,
    label: 'Humanitarian Atlas',
    description: 'Humanitarian response and vulnerability assessment',
    color: '#ef4444',
  },
};

const RISK_COLORS = {
  low: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
  medium: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
  high: { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200' },
  critical: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200' },
};

const CHART_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

// Atlas Type Card
function AtlasTypeCard({
  type,
  config,
  onClick,
  disabled,
}: {
  type: AtlasType;
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

// Section Preview Card
function SectionPreview({ section }: { section: AtlasSection }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="bg-white rounded-lg border border-gray-100">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <span className="text-xs font-semibold text-blue-600 bg-blue-50 px-2 py-1 rounded">
            {section.order}
          </span>
          <span className="font-medium text-gray-800">{section.title}</span>
        </div>
        {expanded ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
      </button>

      {expanded && (
        <div className="p-4 pt-0 space-y-4 border-t border-gray-100">
          <p className="text-sm text-gray-600">{section.content.summary}</p>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {Object.entries(section.content.metrics).slice(0, 8).map(([key, value]) => (
              <div key={key} className="p-2 bg-gray-50 rounded">
                <div className="text-xs text-gray-500">{key.replace(/_/g, ' ')}</div>
                <div className="text-sm font-semibold text-gray-800">
                  {typeof value === 'number' ? value.toLocaleString() : value}
                </div>
              </div>
            ))}
          </div>

          {section.charts.length > 0 && (
            <div className="p-3 bg-gray-50 rounded">
              <div className="text-xs text-gray-500 mb-1">Charts: {section.charts.length}</div>
              <div className="flex gap-2">
                {section.charts.map(c => (
                  <span key={c.id} className="text-xs px-2 py-1 bg-white rounded border">
                    {c.type}
                  </span>
                ))}
              </div>
            </div>
          )}

          {section.tables.length > 0 && (
            <div className="p-3 bg-gray-50 rounded">
              <div className="text-xs text-gray-500 mb-1">Tables: {section.tables.length}</div>
              <div className="text-xs text-gray-600">
                {section.tables.map(t => t.title).join(', ')}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ChevronUp({ className }: { className?: string }) {
  return <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
  </svg>;
}

// Atlas Preview Modal
function AtlasPreviewModal({
  atlas,
  onClose,
  onExport,
}: {
  atlas: AtlasGeneratedProduct;
  onClose: () => void;
  onExport: (format: AtlasExportFormat) => void;
}) {
  const [activeSection, setActiveSection] = useState(0);
  const riskColors = RISK_COLORS[atlas.risk_level];

  const radarData = [
    { metric: 'Coverage', value: atlas.coverage_score, fullMark: 100 },
    { metric: 'Opportunity', value: atlas.opportunity_score, fullMark: 100 },
    { metric: 'Entities', value: Math.min(100, atlas.total_entities / 10), fullMark: 100 },
    { metric: 'Visits', value: Math.min(100, atlas.total_visits / 100), fullMark: 100 },
  ];

  return (
    <Modal
      open={!!atlas}
      onClose={onClose}
      title={atlas.title}
      size="xl"
      footer={
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={() => onExport('pdf')}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700"
            >
              <FileText className="w-4 h-4" /> PDF
            </button>
            <button
              onClick={() => onExport('word')}
              className="flex items-center gap-2 px-4 py-2 bg-blue-700 text-white text-sm font-medium rounded-lg hover:bg-blue-800"
            >
              <FileSpreadsheet className="w-4 h-4" /> DOCX
            </button>
            <button
              onClick={() => onExport('powerpoint')}
              className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white text-sm font-medium rounded-lg hover:bg-orange-700"
            >
              <Presentation className="w-4 h-4" /> PowerPoint
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
            <div className="text-sm text-gray-500">{atlas.subtitle}</div>
            <div className="text-xs text-gray-400 mt-1">
              Generated: {new Date(atlas.generated_at).toLocaleString()}
            </div>
          </div>
          <div className={`px-3 py-1 rounded-full text-xs font-semibold ${riskColors.bg} ${riskColors.text} ${riskColors.border} border`}>
            Risk: {atlas.risk_level.toUpperCase()}
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-5 gap-3">
          {[
            { label: 'Entities', value: atlas.total_entities, icon: MapPin },
            { label: 'Establishments', value: atlas.total_establishments, icon: Building },
            { label: 'Routes', value: atlas.total_routes, icon: Route },
            { label: 'Visits', value: atlas.total_visits, icon: Eye },
            { label: 'Sections', value: atlas.sections.length, icon: BookOpen },
          ].map((stat) => (
            <div key={stat.label} className="p-3 bg-white rounded-lg border border-gray-100 text-center">
              <stat.icon className="w-4 h-4 mx-auto text-gray-400 mb-1" />
              <div className="text-lg font-bold text-gray-900">{stat.value.toLocaleString()}</div>
              <div className="text-xs text-gray-500">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Radar Chart */}
        <div className="bg-white rounded-xl border border-gray-100 p-4">
          <h4 className="font-semibold text-gray-800 mb-3">Atlas Scores</h4>
          <ResponsiveContainer width="100%" height={200}>
            <RadarChart data={radarData}>
              <PolarGrid />
              <PolarAngleAxis dataKey="metric" tick={{ fontSize: 11 }} />
              <PolarRadiusAxis angle={90} domain={[0, 100]} tick={false} />
              <Radar name="Score" dataKey="value" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.3} />
            </RadarChart>
          </ResponsiveContainer>
        </div>

        {/* Section Navigation */}
        <div className="flex gap-2 overflow-x-auto pb-2">
          {atlas.sections.map((section, i) => (
            <button
              key={section.id}
              onClick={() => setActiveSection(i)}
              className={`flex-shrink-0 px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                activeSection === i
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {section.order}. {section.title}
            </button>
          ))}
        </div>

        {/* Active Section Content */}
        {atlas.sections[activeSection] && (
          <div className="bg-white rounded-xl border border-gray-100 p-4">
            <h4 className="font-bold text-gray-900 mb-2">{atlas.sections[activeSection].title}</h4>
            <p className="text-sm text-gray-600 mb-4">{atlas.sections[activeSection].content.summary}</p>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
              {Object.entries(atlas.sections[activeSection].content.metrics).map(([key, value]) => (
                <div key={key} className="p-2 bg-gray-50 rounded">
                  <div className="text-xs text-gray-500">{key.replace(/_/g, ' ')}</div>
                  <div className="text-sm font-semibold text-gray-800">
                    {typeof value === 'number' ? value.toLocaleString() : value}
                  </div>
                </div>
              ))}
            </div>

            <div className="text-xs text-gray-500">
              {atlas.sections[activeSection].charts.length} charts, {atlas.sections[activeSection].tables.length} tables
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}

// Generate Atlas Modal
function GenerateAtlasModal({
  open,
  onClose,
  onGenerate,
  generating,
}: {
  open: boolean;
  onClose: () => void;
  onGenerate: (type: AtlasType, format: AtlasFormat) => void;
  generating: boolean;
}) {
  const [selectedType, setSelectedType] = useState<AtlasType | null>(null);
  const [format, setFormat] = useState<AtlasFormat>('letter');

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Generate Territorial Atlas"
      footer={
        <div className="flex items-center justify-between">
          <button onClick={onClose} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-xl text-sm">
            Cancel
          </button>
          <button
            onClick={() => selectedType && onGenerate(selectedType, format)}
            disabled={!selectedType || generating}
            className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 disabled:opacity-50"
          >
            {generating ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" /> Generating...
              </>
            ) : (
              <>
                <BookOpen className="w-4 h-4" /> Generate Atlas
              </>
            )}
          </button>
        </div>
      }
    >
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Atlas Type</label>
          <div className="grid grid-cols-2 gap-3">
            {(Object.entries(ATLAS_TYPE_CONFIG) as [AtlasType, typeof ATLAS_TYPE_CONFIG[AtlasType]][]).map(([type, config]) => (
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
          <label className="block text-sm font-medium text-gray-700 mb-2">Page Format</label>
          <div className="flex gap-3">
            <button
              onClick={() => setFormat('letter')}
              className={`flex-1 p-3 rounded-xl border-2 text-center ${
                format === 'letter' ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
              }`}
            >
              <div className="font-medium">Letter</div>
              <div className="text-xs text-gray-500">8.5 × 11 in</div>
            </button>
            <button
              onClick={() => setFormat('legal')}
              className={`flex-1 p-3 rounded-xl border-2 text-center ${
                format === 'legal' ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
              }`}
            >
              <div className="font-medium">Legal</div>
              <div className="text-xs text-gray-500">8.5 × 14 in</div>
            </button>
          </div>
        </div>

        <div className="p-4 bg-gray-50 rounded-xl">
          <div className="text-xs font-semibold text-gray-600 mb-2">ATLAS SECTIONS (14):</div>
          <div className="grid grid-cols-3 gap-2 text-xs text-gray-500">
            <span>1. Cover Page</span>
            <span>2. Executive Summary</span>
            <span>3. Coverage Analysis</span>
            <span>4. Density Analysis</span>
            <span>5. Opportunities</span>
            <span>6. Coverage Gaps</span>
            <span>7. Risk Areas</span>
            <span>8. Vulnerability</span>
            <span>9. Priority Areas</span>
            <span>10. Route Performance</span>
            <span>11. Corridor Perf.</span>
            <span>12. Field Statistics</span>
            <span>13. Indicators</span>
            <span>14. Maps Section</span>
          </div>
        </div>
      </div>
    </Modal>
  );
}

// Main Page
export function AtlasCenter() {
  const { org } = useOrg();
  const { user } = useAuth();

  const [generating, setGenerating] = useState(false);
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [currentAtlas, setCurrentAtlas] = useState<AtlasGeneratedProduct | null>(null);
  const [savedAtlases, setSavedAtlases] = useState<AtlasGeneratedProduct[]>([]);
  const [exporting, setExporting] = useState<AtlasExportFormat | null>(null);

  const handleGenerate = useCallback(async (type: AtlasType, format: AtlasFormat) => {
    if (!org) return;
    setGenerating(true);
    setShowGenerateModal(false);

    try {
      const atlas = await territorialAtlasEngine.generateAtlas(org.id, type, { format });
      setCurrentAtlas(atlas);

      // Save to database
      await territorialAtlasEngine.saveAtlas(atlas);
    } catch (e) {
      console.error('Failed to generate atlas:', e);
    } finally {
      setGenerating(false);
    }
  }, [org]);

  const handleExport = useCallback(async (format: AtlasExportFormat) => {
    if (!currentAtlas) return;
    setExporting(format);

    try {
      let blob: Blob;
      let filename: string;

      if (format === 'pdf') {
        blob = await territorialAtlasEngine.exportToPDF(currentAtlas);
        filename = `${currentAtlas.atlas_type}_atlas.pdf`;
      } else if (format === 'word') {
        blob = await territorialAtlasEngine.exportToDocx(currentAtlas);
        filename = `${currentAtlas.atlas_type}_atlas.docx`;
      } else {
        blob = await territorialAtlasEngine.exportToPowerPoint(currentAtlas);
        filename = `${currentAtlas.atlas_type}_atlas.pptx`;
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
  }, [currentAtlas]);

  return (
    <div>
      <PageHeader
        title="Territorial Atlas Center"
        subtitle="Generate comprehensive territorial knowledge products"
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
                <BookOpen className="w-4 h-4" /> Generate Atlas
              </>
            )}
          </button>
        }
      />

      <div className="space-y-6">
        {/* Current Atlas Preview */}
        {currentAtlas && (
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl border border-blue-200 p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h2 className="text-xl font-bold text-gray-900">{currentAtlas.title}</h2>
                <p className="text-sm text-gray-600 mt-1">{currentAtlas.subtitle}</p>
              </div>
              <div className={`px-4 py-2 rounded-xl ${RISK_COLORS[currentAtlas.risk_level].bg} ${RISK_COLORS[currentAtlas.risk_level].border} border`}>
                <div className="text-xs text-gray-500">Risk Level</div>
                <div className={`text-lg font-bold ${RISK_COLORS[currentAtlas.risk_level].text}`}>
                  {currentAtlas.risk_level.toUpperCase()}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-4">
              {[
                { label: 'Total Entities', value: currentAtlas.total_entities.toLocaleString(), icon: MapPin },
                { label: 'Establishments', value: currentAtlas.total_establishments.toLocaleString(), icon: Building },
                { label: 'Routes', value: currentAtlas.total_routes.toLocaleString(), icon: Route },
                { label: 'Visits', value: currentAtlas.total_visits.toLocaleString(), icon: Eye },
                { label: 'Sections', value: currentAtlas.sections.length.toString(), icon: BookOpen },
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
                {new Date(currentAtlas.generated_at).toLocaleString()}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentAtlas({ ...currentAtlas })}
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
                  Export PDF
                </button>
                <button
                  onClick={() => handleExport('word')}
                  disabled={exporting === 'word'}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-700 text-white text-sm font-medium rounded-lg hover:bg-blue-800 disabled:opacity-50"
                >
                  {exporting === 'word' ? <RefreshCw className="w-4 h-4 animate-spin" /> : <FileSpreadsheet className="w-4 h-4" />}
                  Export DOCX
                </button>
                <button
                  onClick={() => handleExport('powerpoint')}
                  disabled={exporting === 'powerpoint'}
                  className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white text-sm font-medium rounded-lg hover:bg-orange-700 disabled:opacity-50"
                >
                  {exporting === 'powerpoint' ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Presentation className="w-4 h-4" />}
                  Export PPT
                </button>
              </div>
            </div>

            {/* Sections Preview */}
            <div className="mt-6 space-y-2">
              <h3 className="font-semibold text-gray-800">Atlas Sections</h3>
              {currentAtlas.sections.slice(0, 3).map((section) => (
                <SectionPreview key={section.id} section={section} />
              ))}
              {currentAtlas.sections.length > 3 && (
                <button
                  onClick={() => setCurrentAtlas({ ...currentAtlas })}
                  className="w-full p-2 text-sm text-blue-600 hover:bg-blue-50 rounded"
                >
                  View all {currentAtlas.sections.length} sections
                </button>
              )}
            </div>
          </div>
        )}

        {/* Atlas Types Grid */}
        <div>
          <h3 className="font-bold text-gray-900 mb-4">Generate New Atlas</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {(Object.entries(ATLAS_TYPE_CONFIG) as [AtlasType, typeof ATLAS_TYPE_CONFIG[AtlasType]][]).map(([type, config]) => (
              <AtlasTypeCard
                key={type}
                type={type}
                config={config}
                onClick={() => {
                  setShowGenerateModal(true);
                }}
                disabled={generating}
              />
            ))}
          </div>
        </div>

        {/* Info Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-xl border border-gray-100 p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
                <Layers className="w-5 h-5 text-blue-600" />
              </div>
              <h3 className="font-bold text-gray-800">14 Sections</h3>
            </div>
            <p className="text-sm text-gray-600">
              Every atlas includes comprehensive analysis across 14 standard sections from cover page to maps.
            </p>
          </div>

          <div className="bg-white rounded-xl border border-gray-100 p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center">
                <Map className="w-5 h-5 text-emerald-600" />
              </div>
              <h3 className="font-bold text-gray-800">Multi-Level Maps</h3>
            </div>
            <p className="text-sm text-gray-600">
              Generate map-ready structures for provinces, municipalities, districts, sectors, and corridors.
            </p>
          </div>

          <div className="bg-white rounded-xl border border-gray-100 p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-purple-50 rounded-xl flex items-center justify-center">
                <FileOutput className="w-5 h-5 text-purple-600" />
              </div>
              <h3 className="font-bold text-gray-800">Multiple Exports</h3>
            </div>
            <p className="text-sm text-gray-600">
              Export your atlas to PDF, Word, or PowerPoint formats with optimized layouts.
            </p>
          </div>
        </div>

        {/* Empty State */}
        {!currentAtlas && (
          <EmptyState
            icon={<BookOpen className="w-6 h-6" />}
            title="No Atlas Generated"
            description="Generate your first territorial atlas to access comprehensive knowledge products."
          />
        )}
      </div>

      {/* Modals */}
      <GenerateAtlasModal
        open={showGenerateModal}
        onClose={() => setShowGenerateModal(false)}
        onGenerate={handleGenerate}
        generating={generating}
      />

      {currentAtlas && (
        <AtlasPreviewModal
          atlas={currentAtlas}
          onClose={() => setCurrentAtlas(null)}
          onExport={handleExport}
        />
      )}
    </div>
  );
}

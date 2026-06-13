import { useState, useCallback, useEffect } from 'react';
import { BookOpen, FileText, Users, Settings, Activity, MapPin, RefreshCw, Download, Eye, ChevronDown, ChevronRight, Clock, CheckCircle, FileOutput, FileSpreadsheet, X, AlertCircle, Archive, CreditCard as Edit3, Building, Target, Shield, Globe, BookMarked, FileCheck } from 'lucide-react';
import { useOrg } from '../../contexts/OrgContext';
import { useAuth } from '../../contexts/AuthContext';
import { PageHeader } from '../../components/common/PageHeader';
import { EmptyState } from '../../components/common/EmptyState';
import { Modal } from '../../components/common/Modal';
import {
  territorialDocumentationEngine,
  type GeneratedDocument,
  type DocumentType,
  type DocumentExportFormat,
  type DocumentSection,
} from '../../services/TerritorialDocumentationEngine';

const DOCUMENT_TYPE_CONFIG: Record<DocumentType, {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  description: string;
  color: string;
}> = {
  user_manual: {
    icon: BookOpen,
    label: 'User Manual',
    description: 'Comprehensive guide for field agents and operational staff',
    color: '#3b82f6',
  },
  administrator_manual: {
    icon: Shield,
    label: 'Administrator Manual',
    description: 'System administration and configuration guide',
    color: '#8b5cf6',
  },
  operational_manual: {
    icon: Activity,
    label: 'Operational Manual',
    description: 'Territorial operations and coverage procedures',
    color: '#10b981',
  },
  institutional_manual: {
    icon: Building,
    label: 'Institutional Manual',
    description: 'Governance framework and institutional structure',
    color: '#f59e0b',
  },
  field_collection_guide: {
    icon: FileText,
    label: 'Field Collection Guide',
    description: 'Data collection procedures and best practices',
    color: '#ec4899',
  },
  route_management_guide: {
    icon: MapPin,
    label: 'Route Management Guide',
    description: 'Route planning, execution, and optimization',
    color: '#06b6d4',
  },
};

const STATUS_COLORS = {
  draft: { bg: 'bg-gray-50', text: 'text-gray-700', border: 'border-gray-200' },
  published: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
  archived: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
};

// Document Type Card
function DocumentTypeCard({
  type,
  config,
  onClick,
  disabled,
}: {
  type: DocumentType;
  config: { icon: React.ComponentType<{ className?: string }>; label: string; description: string; color: string };
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`w-full p-5 bg-white rounded-xl border border-gray-100 hover:shadow-md transition-all text-left ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
      style={{ borderColor: disabled ? undefined : `${config.color}30` }}
    >
      <div className="flex items-start gap-4">
        <div
          className="w-12 h-12 rounded-xl flex items-center justify-center"
          style={{ backgroundColor: `${config.color}15` }}
        >
          <config.icon className="w-6 h-6" style={{ color: config.color }} />
        </div>
        <div className="flex-1 text-left">
          <h3 className="font-bold text-gray-900">{config.label}</h3>
          <p className="text-sm text-gray-500 mt-1">{config.description}</p>
        </div>
      </div>
    </button>
  );
}

// ChevronUp component
function ChevronUp({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
    </svg>
  );
}

// Section Preview Card
function SectionPreview({ section, expanded, onToggle }: {
  section: DocumentSection;
  expanded: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="bg-white rounded-lg border border-gray-100">
      <button
        onClick={onToggle}
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
          <p className="text-sm text-gray-600">{section.content}</p>

          {section.highlights.length > 0 && (
            <div className="space-y-2">
              <div className="text-xs font-semibold text-gray-500">KEY POINTS:</div>
              <ul className="text-sm text-gray-600 space-y-1">
                {section.highlights.map((h, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                    {h}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {section.subsections.length > 0 && (
            <div className="space-y-2">
              <div className="text-xs font-semibold text-gray-500">SUBSECTIONS:</div>
              <div className="pl-4 space-y-2">
                {section.subsections.map((sub) => (
                  <div key={sub.id} className="text-sm">
                    <span className="font-medium text-gray-700">{section.order}.{sub.order} {sub.title}</span>
                    <p className="text-gray-500 text-xs mt-0.5">{sub.content.slice(0, 100)}...</p>
                  </div>
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

// Document Preview Modal
function DocumentPreviewModal({
  document,
  onClose,
  onExport,
  onUpdateStatus,
  exporting,
}: {
  document: GeneratedDocument;
  onClose: () => void;
  onExport: (format: DocumentExportFormat) => void;
  onUpdateStatus: (status: 'draft' | 'published' | 'archived') => void;
  exporting: DocumentExportFormat | null;
}) {
  const [activeSection, setActiveSection] = useState(0);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());
  const statusColors = STATUS_COLORS[document.status];

  const toggleSection = (id: string) => {
    setExpandedSections(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <Modal
      open={!!document}
      onClose={onClose}
      title={document.title}
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
              onClick={() => onExport('docx')}
              disabled={exporting === 'docx'}
              className="flex items-center gap-2 px-4 py-2 bg-blue-700 text-white text-sm font-medium rounded-lg hover:bg-blue-800 disabled:opacity-50"
            >
              {exporting === 'docx' ? <RefreshCw className="w-4 h-4 animate-spin" /> : <FileSpreadsheet className="w-4 h-4" />}
              DOCX
            </button>
          </div>
          <div className="flex items-center gap-2">
            {document.status !== 'published' && (
              <button
                onClick={() => onUpdateStatus('published')}
                className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700"
              >
                <FileCheck className="w-4 h-4" /> Publish
              </button>
            )}
            {document.status !== 'archived' && (
              <button
                onClick={() => onUpdateStatus('archived')}
                className="flex items-center gap-2 px-4 py-2 bg-amber-600 text-white text-sm font-medium rounded-lg hover:bg-amber-700"
              >
                <Archive className="w-4 h-4" /> Archive
              </button>
            )}
            <button onClick={onClose} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg text-sm">
              Close
            </button>
          </div>
        </div>
      }
    >
      <div className="space-y-4">
        {/* Header Metadata */}
        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
          <div>
            <div className="text-sm text-gray-500">{document.subtitle}</div>
            <div className="flex items-center gap-4 mt-1 text-xs text-gray-400">
              <span>Version: {document.version}</span>
              <span>Generated: {new Date(document.generated_at).toLocaleString()}</span>
            </div>
          </div>
          <div className={`px-3 py-1 rounded-full text-xs font-semibold ${statusColors.bg} ${statusColors.text} ${statusColors.border} border`}>
            {document.status.toUpperCase()}
          </div>
        </div>

        {/* Author & Organization */}
        <div className="grid grid-cols-2 gap-4">
          <div className="p-3 bg-white rounded-lg border border-gray-100">
            <div className="text-xs text-gray-500 mb-1">Author</div>
            <div className="font-medium text-gray-800">{document.author_name}</div>
            <div className="text-sm text-gray-500">{document.author_role}</div>
          </div>
          <div className="p-3 bg-white rounded-lg border border-gray-100">
            <div className="text-xs text-gray-500 mb-1">Organization</div>
            <div className="font-medium text-gray-800">{document.organization_name}</div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-5 gap-3">
          {[
            { label: 'Sections', value: document.sections.length, icon: BookOpen },
            { label: 'Words', value: document.metadata.word_count.toLocaleString(), icon: FileText },
            { label: 'Pages', value: document.metadata.total_pages, icon: FileOutput },
            { label: 'Routes', value: document.metadata.routes_count ?? '-', icon: MapPin },
            { label: 'Forms', value: document.metadata.forms_count ?? '-', icon: FileText },
          ].map((stat) => (
            <div key={stat.label} className="p-3 bg-white rounded-lg border border-gray-100 text-center">
              <stat.icon className="w-4 h-4 mx-auto text-gray-400 mb-1" />
              <div className="text-lg font-bold text-gray-900">{stat.value}</div>
              <div className="text-xs text-gray-500">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Table of Contents */}
        <div className="bg-white rounded-xl border border-gray-100 p-4">
          <h4 className="font-semibold text-gray-800 mb-3">Table of Contents</h4>
          <div className="grid grid-cols-2 gap-2">
            {document.table_of_contents.map((entry) => (
              <div key={entry.order} className="flex items-center justify-between text-sm p-2 bg-gray-50 rounded">
                <span className="text-gray-700">{entry.order}. {entry.title}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Section Navigation */}
        <div className="flex gap-2 overflow-x-auto pb-2">
          {document.sections.map((section, i) => (
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
        {document.sections[activeSection] && (
          <SectionPreview
            section={document.sections[activeSection]}
            expanded={true}
            onToggle={() => {}}
          />
        )}

        {/* All Sections List */}
        <div className="space-y-2">
          <h4 className="font-semibold text-gray-800">All Sections</h4>
          {document.sections.map((section) => (
            <SectionPreview
              key={section.id}
              section={section}
              expanded={expandedSections.has(section.id)}
              onToggle={() => toggleSection(section.id)}
            />
          ))}
        </div>
      </div>
    </Modal>
  );
}

// Generate Document Modal
function GenerateDocumentModal({
  open,
  onClose,
  onGenerate,
  generating,
}: {
  open: boolean;
  onClose: () => void;
  onGenerate: (type: DocumentType, authorName: string, authorRole: string) => void;
  generating: boolean;
}) {
  const [selectedType, setSelectedType] = useState<DocumentType | null>(null);
  const [authorName, setAuthorName] = useState('');
  const [authorRole, setAuthorRole] = useState('Administrator');

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Generate Documentation"
      footer={
        <div className="flex items-center justify-between">
          <button onClick={onClose} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-xl text-sm">
            Cancel
          </button>
          <button
            onClick={() => selectedType && onGenerate(selectedType, authorName, authorRole)}
            disabled={!selectedType || generating}
            className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 disabled:opacity-50"
          >
            {generating ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" /> Generating...
              </>
            ) : (
              <>
                <BookOpen className="w-4 h-4" /> Generate Document
              </>
            )}
          </button>
        </div>
      }
    >
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Document Type</label>
          <div className="grid grid-cols-2 gap-3">
            {(Object.entries(DOCUMENT_TYPE_CONFIG) as [DocumentType, typeof DOCUMENT_TYPE_CONFIG[DocumentType]][]).map(([type, config]) => (
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
          <label className="block text-sm font-medium text-gray-700 mb-2">Author Name</label>
          <input
            type="text"
            value={authorName}
            onChange={(e) => setAuthorName(e.target.value)}
            placeholder="Enter author name"
            className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Author Role</label>
          <select
            value={authorRole}
            onChange={(e) => setAuthorRole(e.target.value)}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="Administrator">Administrator</option>
            <option value="Manager">Manager</option>
            <option value="Coordinator">Coordinator</option>
            <option value="Analyst">Analyst</option>
            <option value="Field Supervisor">Field Supervisor</option>
          </select>
        </div>

        <div className="p-4 bg-gray-50 rounded-xl">
          <div className="text-xs font-semibold text-gray-600 mb-2">DOCUMENT INCLUDES:</div>
          <ul className="text-xs text-gray-500 space-y-1">
            <li>Table of Contents</li>
            <li>Author & Organization metadata</li>
            <li>Version control tracking</li>
            <li>Data from all territorial engines</li>
            <li>PDF and DOCX export capability</li>
          </ul>
        </div>
      </div>
    </Modal>
  );
}

// Version History Card
function VersionHistoryCard({ document }: { document: GeneratedDocument }) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center">
            <BookMarked className="w-4 h-4 text-blue-600" />
          </div>
          <div>
            <div className="font-medium text-gray-800">{document.title}</div>
            <div className="text-xs text-gray-500">v{document.version}</div>
          </div>
        </div>
        <div className={`px-2 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[document.status].bg} ${STATUS_COLORS[document.status].text}`}>
          {document.status}
        </div>
      </div>
      <div className="text-xs text-gray-400">
        {new Date(document.generated_at).toLocaleDateString()} by {document.author_name}
      </div>
    </div>
  );
}

// Main Page
export function DocumentationCenter() {
  const { org } = useOrg();
  const { user } = useAuth();

  const [generating, setGenerating] = useState(false);
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [currentDocument, setCurrentDocument] = useState<GeneratedDocument | null>(null);
  const [savedDocuments, setSavedDocuments] = useState<GeneratedDocument[]>([]);
  const [exporting, setExporting] = useState<DocumentExportFormat | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (org) {
      loadSavedDocuments();
    }
  }, [org]);

  const loadSavedDocuments = async () => {
    if (!org) return;
    try {
      const docs = await territorialDocumentationEngine.getDocuments(org.id, 20);
      setSavedDocuments(docs);
    } catch (e) {
      console.error('Failed to load saved documents:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerate = useCallback(async (
    type: DocumentType,
    authorName: string,
    authorRole: string
  ) => {
    if (!org) return;
    setGenerating(true);
    setShowGenerateModal(false);

    try {
      const doc = await territorialDocumentationEngine.generateDocument(org.id, type, {
        authorName: authorName || (user?.email?.split('@')[0] ?? 'System'),
        authorRole,
        organizationName: org.name,
      });
      setCurrentDocument(doc);

      await territorialDocumentationEngine.saveDocument(doc);
      await loadSavedDocuments();
    } catch (e) {
      console.error('Failed to generate document:', e);
    } finally {
      setGenerating(false);
    }
  }, [org, user]);

  const handleExport = useCallback(async (format: DocumentExportFormat) => {
    if (!currentDocument) return;
    setExporting(format);

    try {
      let blob: Blob;
      let filename: string;

      if (format === 'pdf') {
        blob = await territorialDocumentationEngine.exportToPDF(currentDocument);
        filename = `${currentDocument.document_type}_${currentDocument.version}.pdf`;
      } else {
        blob = await territorialDocumentationEngine.exportToDocx(currentDocument);
        filename = `${currentDocument.document_type}_${currentDocument.version}.docx`;
      }

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
  }, [currentDocument]);

  const handleUpdateStatus = useCallback(async (status: 'draft' | 'published' | 'archived') => {
    if (!currentDocument) return;
    try {
      await territorialDocumentationEngine.updateDocumentStatus(currentDocument.id, status);
      setCurrentDocument({ ...currentDocument, status });
      await loadSavedDocuments();
    } catch (e) {
      console.error('Failed to update status:', e);
    }
  }, [currentDocument]);

  return (
    <div>
      <PageHeader
        title="Documentation Center"
        subtitle="Generate comprehensive manuals and operational guides"
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
                <BookOpen className="w-4 h-4" /> Generate Document
              </>
            )}
          </button>
        }
      />

      <div className="space-y-6">
        {/* Current Document Preview */}
        {currentDocument && (
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl border border-blue-200 p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h2 className="text-xl font-bold text-gray-900">{currentDocument.title}</h2>
                <p className="text-sm text-gray-600 mt-1">{currentDocument.subtitle}</p>
              </div>
              <div className={`px-4 py-2 rounded-xl ${STATUS_COLORS[currentDocument.status].bg} ${STATUS_COLORS[currentDocument.status].border} border`}>
                <div className="text-xs text-gray-500">Status</div>
                <div className={`text-lg font-bold ${STATUS_COLORS[currentDocument.status].text}`}>
                  {currentDocument.status.toUpperCase()}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-4">
              {[
                { label: 'Sections', value: currentDocument.sections.length.toString(), icon: BookOpen },
                { label: 'Words', value: currentDocument.metadata.word_count.toLocaleString(), icon: FileText },
                { label: 'Pages', value: currentDocument.metadata.total_pages.toString(), icon: FileOutput },
                { label: 'Version', value: currentDocument.version, icon: Edit3 },
                { label: 'Tables', value: currentDocument.sections.reduce((s, sec) => s + sec.tables.length, 0).toString(), icon: FileSpreadsheet },
              ].map((stat) => (
                <div key={stat.label} className="bg-white/70 rounded-xl p-3 text-center">
                  <stat.icon className="w-5 h-5 mx-auto text-blue-500 mb-1" />
                  <div className="text-lg font-bold text-gray-900">{stat.value}</div>
                  <div className="text-xs text-gray-500">{stat.label}</div>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Clock className="w-4 h-4" />
                  {new Date(currentDocument.generated_at).toLocaleString()}
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Users className="w-4 h-4" />
                  {currentDocument.author_name} ({currentDocument.author_role})
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentDocument({ ...currentDocument })}
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
                  onClick={() => handleExport('docx')}
                  disabled={exporting === 'docx'}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-700 text-white text-sm font-medium rounded-lg hover:bg-blue-800 disabled:opacity-50"
                >
                  {exporting === 'docx' ? <RefreshCw className="w-4 h-4 animate-spin" /> : <FileSpreadsheet className="w-4 h-4" />}
                  Export DOCX
                </button>
              </div>
            </div>

            {/* Table of Contents Preview */}
            <div className="mt-6">
              <h3 className="font-semibold text-gray-800 mb-3">Table of Contents</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {currentDocument.table_of_contents.map((entry) => (
                  <div key={entry.order} className="flex items-center gap-2 p-2 bg-white/70 rounded-lg text-sm">
                    <span className="text-xs font-semibold text-blue-600">{entry.order}.</span>
                    <span className="text-gray-700">{entry.title}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Document Types Grid */}
        <div>
          <h3 className="font-bold text-gray-900 mb-4">Generate New Documentation</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {(Object.entries(DOCUMENT_TYPE_CONFIG) as [DocumentType, typeof DOCUMENT_TYPE_CONFIG[DocumentType]][]).map(([type, config]) => (
              <DocumentTypeCard
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

        {/* Version History */}
        {savedDocuments.length > 0 && (
          <div>
            <h3 className="font-bold text-gray-900 mb-4">Version History</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {savedDocuments.slice(0, 6).map((doc) => (
                <button
                  key={doc.id}
                  onClick={() => setCurrentDocument(doc)}
                  className="text-left"
                >
                  <VersionHistoryCard document={doc} />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Info Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-xl border border-gray-100 p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
                <BookOpen className="w-5 h-5 text-blue-600" />
              </div>
              <h3 className="font-bold text-gray-800">6 Document Types</h3>
            </div>
            <p className="text-sm text-gray-600">
              Generate user manuals, admin guides, operational procedures, institutional frameworks, and field guides.
            </p>
          </div>

          <div className="bg-white rounded-xl border border-gray-100 p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center">
                <FileOutput className="w-5 h-5 text-emerald-600" />
              </div>
              <h3 className="font-bold text-gray-800">Multi-Format Export</h3>
            </div>
            <p className="text-sm text-gray-600">
              Export documents to PDF or DOCX format with professional layouts and table of contents.
            </p>
          </div>

          <div className="bg-white rounded-xl border border-gray-100 p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-purple-50 rounded-xl flex items-center justify-center">
                <Edit3 className="w-5 h-5 text-purple-600" />
              </div>
              <h3 className="font-bold text-gray-800">Version Control</h3>
            </div>
            <p className="text-sm text-gray-600">
              Track document versions, author metadata, dates, and publication status.
            </p>
          </div>
        </div>

        {/* Data Sources Info */}
        <div className="bg-white rounded-xl border border-gray-100 p-5">
          <h3 className="font-bold text-gray-800 mb-3">Data Sources</h3>
          <p className="text-sm text-gray-600 mb-4">
            Documentation is automatically generated by consuming data from existing territorial engines without duplicating logic:
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {[
              'TerritorialAtlasEngine',
              'TerritorialExecutiveReportingEngine',
              'TerritorialAIEngine',
              'TerritorialFieldCollectionEngine',
              'TerritorialIntelligenceEngine',
              'TerritorialIndicatorEngine',
              'TerritorialAlertEngine',
            ].map((source) => (
              <div key={source} className="flex items-center gap-2 text-xs text-gray-500 bg-gray-50 px-2 py-1 rounded">
                <CheckCircle className="w-3 h-3 text-emerald-500" />
                {source}
              </div>
            ))}
          </div>
        </div>

        {/* Empty State */}
        {!currentDocument && savedDocuments.length === 0 && !loading && (
          <EmptyState
            icon={<BookOpen className="w-6 h-6" />}
            title="No Documents Generated"
            description="Generate your first document to access comprehensive manuals and guides."
          />
        )}
      </div>

      {/* Modals */}
      <GenerateDocumentModal
        open={showGenerateModal}
        onClose={() => setShowGenerateModal(false)}
        onGenerate={handleGenerate}
        generating={generating}
      />

      {currentDocument && (
        <DocumentPreviewModal
          document={currentDocument}
          onClose={() => setCurrentDocument(null)}
          onExport={handleExport}
          onUpdateStatus={handleUpdateStatus}
          exporting={exporting}
        />
      )}
    </div>
  );
}

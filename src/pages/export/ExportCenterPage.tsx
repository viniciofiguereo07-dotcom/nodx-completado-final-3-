import { useState, useCallback } from 'react';
import {
  Download, FileText, Table, FileSpreadsheet, Presentation,
  Map, Database, BarChart3, Target, Globe, CheckCircle2, Loader2, AlertTriangle,
  Layers, FileOutput,
} from 'lucide-react';
import { useOrg } from '../../contexts/OrgContext';
import { PageHeader } from '../../components/common/PageHeader';
import { territorialExportEngine, type ExportSource, type ExportFormat, type ExportConfig } from '../../services/TerritorialExportEngine';
import { supabase } from '../../lib/supabase';
import type {
  TerritorialEntity, TerritorialOwner, TerritorialLocation, TerritorialClassification,
  TerritorialCoverageMetric, TerritorialDensityMetric, TerritorialOpportunityMetric, TerritorialGapAnalysis,
  TerritorialAssignment, TerritorialPotentialScore,
} from '../../types';

const SOURCES: {
  key: ExportSource;
  label: string;
  description: string;
  icon: React.ElementType;
  color: string;
}[] = [
  { key: 'registry',     label: 'Registry',       description: 'Territorial entities, owners, locations and classifications', icon: Database,     color: 'text-blue-600 bg-blue-50'    },
  { key: 'intelligence', label: 'Intelligence',    description: 'Coverage, density, opportunities and gap analysis',           icon: BarChart3,    color: 'text-emerald-600 bg-emerald-50' },
  { key: 'atlas',        label: 'Atlas',           description: 'Combined territorial atlas with assignments',                  icon: Globe,        color: 'text-indigo-600 bg-indigo-50' },
  { key: 'opportunities',label: 'Opportunities',   description: 'Expansion opportunities and gap analysis',                    icon: Target,       color: 'text-amber-600 bg-amber-50'  },
  { key: 'coverage',     label: 'Coverage Only',   description: 'Coverage metrics per geographic unit',                        icon: Map,          color: 'text-teal-600 bg-teal-50'    },
  { key: 'density',      label: 'Density Only',    description: 'Density metrics per geographic unit',                         icon: Layers,       color: 'text-rose-600 bg-rose-50'    },
  { key: 'gaps',         label: 'Gaps Only',       description: 'Gap analysis per geographic unit',                            icon: AlertTriangle, color: 'text-red-600 bg-red-50'     },
  { key: 'assignments',  label: 'Assignments Only',description: 'Territorial entity assignments',                               icon: FileOutput,   color: 'text-violet-600 bg-violet-50'},
  { key: 'potential',    label: 'Potential Only',  description: 'Potential scores per entity',                                 icon: Target,       color: 'text-cyan-600 bg-cyan-50'   },
];

const FORMATS: {
  key: ExportFormat;
  label: string;
  description: string;
  icon: React.ElementType;
  color: string;
  ext: string;
}[] = [
  { key: 'pdf',  label: 'PDF Report',     description: 'Professional landscape report with tables',     icon: FileText,       color: 'text-red-600 bg-red-50',      ext: 'pdf'  },
  { key: 'xlsx', label: 'Excel Workbook', description: 'Multi-sheet workbook with formatted data',      icon: FileSpreadsheet,color: 'text-emerald-600 bg-emerald-50', ext: 'xlsx' },
  { key: 'csv',  label: 'CSV File',       description: 'Comma-separated values for any spreadsheet',    icon: Table,          color: 'text-blue-600 bg-blue-50',    ext: 'csv'  },
  { key: 'pptx', label: 'PowerPoint',     description: 'Presentation slides with tables',               icon: Presentation,   color: 'text-orange-600 bg-orange-50',ext: 'pptx' },
];

export function ExportCenterPage() {
  const { org } = useOrg();
  const [selectedSource, setSelectedSource] = useState<ExportSource | null>(null);
  const [selectedFormat, setSelectedFormat] = useState<ExportFormat>('pdf');
  const [filename, setFilename] = useState('');
  const [title, setTitle] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [includeTimestamp, setIncludeTimestamp] = useState(true);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sourceMeta = SOURCES.find(s => s.key === selectedSource);
  const formatMeta = FORMATS.find(f => f.key === selectedFormat);

  const autoFilename = useCallback(() => {
    if (filename) return filename;
    const src = selectedSource ?? 'export';
    const date = new Date().toISOString().slice(0, 10);
    return `${org?.slug ?? 'nodx'}_${src}_${date}`;
  }, [filename, selectedSource, org]);

  async function handleExport() {
    if (!org || !selectedSource) return;
    setLoading(true);
    setError(null);
    setDone(false);

    try {
      const data = await fetchData(selectedSource, org.id);
      const config: ExportConfig = {
        source: selectedSource,
        format: selectedFormat,
        filename: autoFilename(),
        title: title || `${sourceMeta?.label ?? 'Territorial'} Export`,
        subtitle: subtitle || undefined,
        includeTimestamp,
      };
      await territorialExportEngine.export(config, data);
      setDone(true);
      setTimeout(() => setDone(false), 3000);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  async function fetchData(source: ExportSource, orgId: string) {
    switch (source) {
      case 'registry': {
        const [e, o, l, c] = await Promise.all([
          supabase.from('territorial_entities').select('*').eq('organization_id', orgId).limit(500),
          supabase.from('territorial_owners').select('*').eq('organization_id', orgId).limit(500),
          supabase.from('territorial_locations').select('*').eq('organization_id', orgId).limit(500),
          supabase.from('territorial_classifications').select('*').eq('organization_id', orgId).limit(500),
        ]);
        return {
          entities: (e.data ?? []) as unknown as TerritorialEntity[],
          owners: (o.data ?? []) as unknown as TerritorialOwner[],
          locations: (l.data ?? []) as unknown as TerritorialLocation[],
          classifications: (c.data ?? []) as unknown as TerritorialClassification[],
        };
      }
      case 'intelligence': {
        const [cov, den, opp, gaps] = await Promise.all([
          supabase.from('territorial_coverage_metrics').select('*').eq('organization_id', orgId).limit(500),
          supabase.from('territorial_density_metrics').select('*').eq('organization_id', orgId).limit(500),
          supabase.from('territorial_opportunity_metrics').select('*').eq('organization_id', orgId).limit(500),
          supabase.from('territorial_gap_analysis').select('*').eq('organization_id', orgId).limit(500),
        ]);
        return {
          coverage: (cov.data ?? []) as unknown as TerritorialCoverageMetric[],
          density: (den.data ?? []) as unknown as TerritorialDensityMetric[],
          opportunities: (opp.data ?? []) as unknown as TerritorialOpportunityMetric[],
          gaps: (gaps.data ?? []) as unknown as TerritorialGapAnalysis[],
        };
      }
      case 'atlas': {
        const [e, l, o, a] = await Promise.all([
          supabase.from('territorial_entities').select('*').eq('organization_id', orgId).limit(500),
          supabase.from('territorial_locations').select('*').eq('organization_id', orgId).limit(500),
          supabase.from('territorial_owners').select('*').eq('organization_id', orgId).limit(500),
          supabase.from('territorial_assignments').select('*').eq('organization_id', orgId).limit(500),
        ]);
        return {
          entities: (e.data ?? []) as unknown as TerritorialEntity[],
          locations: (l.data ?? []) as unknown as TerritorialLocation[],
          owners: (o.data ?? []) as unknown as TerritorialOwner[],
          assignments: (a.data ?? []) as unknown as TerritorialAssignment[],
        };
      }
      case 'opportunities': {
        const [opp, gaps, ps] = await Promise.all([
          supabase.from('territorial_opportunity_metrics').select('*').eq('organization_id', orgId).limit(500),
          supabase.from('territorial_gap_analysis').select('*').eq('organization_id', orgId).limit(500),
          supabase.from('territorial_potential_scores').select('*').eq('organization_id', orgId).limit(500),
        ]);
        return {
          opportunities: (opp.data ?? []) as unknown as TerritorialOpportunityMetric[],
          gaps: (gaps.data ?? []) as unknown as TerritorialGapAnalysis[],
          potentialScores: (ps.data ?? []) as unknown as TerritorialPotentialScore[],
        };
      }
      case 'coverage': {
        const { data } = await supabase.from('territorial_coverage_metrics').select('*').eq('organization_id', orgId).limit(1000);
        return (data ?? []) as unknown as TerritorialCoverageMetric[];
      }
      case 'density': {
        const { data } = await supabase.from('territorial_density_metrics').select('*').eq('organization_id', orgId).limit(1000);
        return (data ?? []) as unknown as TerritorialDensityMetric[];
      }
      case 'gaps': {
        const { data } = await supabase.from('territorial_gap_analysis').select('*').eq('organization_id', orgId).limit(1000);
        return (data ?? []) as unknown as TerritorialGapAnalysis[];
      }
      case 'assignments': {
        const { data } = await supabase.from('territorial_assignments').select('*').eq('organization_id', orgId).limit(1000);
        return (data ?? []) as unknown as TerritorialAssignment[];
      }
      case 'potential': {
        const { data } = await supabase.from('territorial_potential_scores').select('*').eq('organization_id', orgId).limit(1000);
        return (data ?? []) as unknown as TerritorialPotentialScore[];
      }
      default:
        return [];
    }
  }

  const canExport = !!selectedSource && !!org && !loading;

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <PageHeader
        title="Export Center"
        subtitle="Generate professional exports from territorial data"
      />

      {/* Step 1: Source */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <div className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold">1</div>
          <h2 className="text-sm font-semibold text-gray-900">Select Data Source</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {SOURCES.map(src => {
            const Icon = src.icon;
            const active = selectedSource === src.key;
            return (
              <button
                key={src.key}
                onClick={() => setSelectedSource(src.key)}
                className={`flex items-start gap-3 p-4 rounded-2xl border text-left transition-all ${
                  active
                    ? 'border-blue-500 bg-blue-50/50 ring-1 ring-blue-500'
                    : 'border-gray-100 bg-white hover:border-gray-200 hover:shadow-sm'
                }`}
              >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${src.color}`}>
                  <Icon size={18} />
                </div>
                <div>
                  <div className={`text-sm font-semibold ${active ? 'text-blue-700' : 'text-gray-800'}`}>{src.label}</div>
                  <div className="text-xs text-gray-400 mt-0.5 leading-relaxed">{src.description}</div>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* Step 2: Format */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <div className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold">2</div>
          <h2 className="text-sm font-semibold text-gray-900">Select Format</h2>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {FORMATS.map(fmt => {
            const Icon = fmt.icon;
            const active = selectedFormat === fmt.key;
            return (
              <button
                key={fmt.key}
                onClick={() => setSelectedFormat(fmt.key)}
                className={`flex flex-col items-center gap-2 p-4 rounded-2xl border text-center transition-all ${
                  active
                    ? 'border-blue-500 bg-blue-50/50 ring-1 ring-blue-500'
                    : 'border-gray-100 bg-white hover:border-gray-200 hover:shadow-sm'
                }`}
              >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${fmt.color}`}>
                  <Icon size={18} />
                </div>
                <div>
                  <div className={`text-sm font-semibold ${active ? 'text-blue-700' : 'text-gray-800'}`}>{fmt.label}</div>
                  <div className="text-[10px] text-gray-400 mt-0.5">{fmt.description}</div>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* Step 3: Options */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <div className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold">3</div>
          <h2 className="text-sm font-semibold text-gray-900">Export Options</h2>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Title</label>
              <input
                type="text"
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder={`${sourceMeta?.label ?? 'Territorial'} Export`}
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Subtitle</label>
              <input
                type="text"
                value={subtitle}
                onChange={e => setSubtitle(e.target.value)}
                placeholder="Optional description"
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Filename</label>
              <input
                type="text"
                value={filename}
                onChange={e => setFilename(e.target.value)}
                placeholder={autoFilename()}
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex items-center">
              <label className="flex items-center gap-2 cursor-pointer">
                <div
                  onClick={() => setIncludeTimestamp(p => !p)}
                  className={`w-10 h-6 rounded-full transition-colors flex items-center px-0.5 cursor-pointer ${includeTimestamp ? 'bg-blue-600' : 'bg-gray-200'}`}
                >
                  <div className={`w-5 h-5 bg-white rounded-full shadow transition-transform ${includeTimestamp ? 'translate-x-4' : ''}`} />
                </div>
                <span className="text-sm text-gray-700">Include timestamp</span>
              </label>
            </div>
          </div>
        </div>
      </section>

      {/* Export Action */}
      <div className="flex items-center justify-between bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <div className="flex items-center gap-3">
          {sourceMeta && (
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${sourceMeta.color}`}>
              <sourceMeta.icon size={18} />
            </div>
          )}
          <div>
            <div className="text-sm font-semibold text-gray-800">
              {sourceMeta ? sourceMeta.label : 'Select a source'}
              {formatMeta && <span className="text-gray-400 mx-1">·</span>}
              {formatMeta && <span className="text-blue-600">{formatMeta.label}</span>}
            </div>
            <div className="text-xs text-gray-400">
              {canExport
                ? `Will export as .${formatMeta?.ext} with ${includeTimestamp ? 'timestamp' : 'no timestamp'}`
                : 'Choose a data source and format to continue'}
            </div>
          </div>
        </div>
        <button
          onClick={handleExport}
          disabled={!canExport}
          className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? (
            <><Loader2 size={16} className="animate-spin" /> Generating...</>
          ) : done ? (
            <><CheckCircle2 size={16} /> Downloaded</>
          ) : (
            <><Download size={16} /> Export {formatMeta?.ext.toUpperCase()}</>
          )}
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-4 bg-red-50 border border-red-100 rounded-2xl text-red-700 text-sm">
          <AlertTriangle size={16} className="flex-shrink-0" />
          {error}
        </div>
      )}

      {/* Format reference cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {FORMATS.map(fmt => {
          const Icon = fmt.icon;
          return (
            <div key={fmt.key} className="bg-gray-50 rounded-xl p-3 text-center">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center mx-auto mb-2 ${fmt.color}`}>
                <Icon size={16} />
              </div>
              <div className="text-xs font-semibold text-gray-700 mb-1">{fmt.label}</div>
              <div className="text-[10px] text-gray-400">{fmt.description}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

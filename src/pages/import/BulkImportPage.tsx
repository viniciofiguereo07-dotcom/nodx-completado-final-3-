import { useState, useCallback, useRef } from 'react';
import { Upload, FileText, CheckCircle, AlertCircle, X, ChevronRight, Download, RefreshCw, Table } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useOrg } from '../../contexts/OrgContext';
import { useAuth } from '../../contexts/AuthContext';
import { PageHeader } from '../../components/common/PageHeader';
import { StatusBadge } from '../../components/common/StatusBadge';
import { Modal } from '../../components/common/Modal';
import type { ImportJob } from '../../types';

type ImportStep = 'upload' | 'preview' | 'mapping' | 'importing' | 'done';

const SUPPORTED_FORMATS = ['xlsx', 'xls', 'csv', 'geojson', 'json', 'kml'];

const TARGET_TABLES: Array<{ key: string; label: string; fields: string[] }> = [
  { key: 'territories',   label: 'Territories',      fields: ['name', 'level', 'color', 'center_lat', 'center_lng', 'parent_id'] },
  { key: 'visits',        label: 'Visits',            fields: ['address', 'status', 'notes', 'agent_id'] },
  { key: 'inventory_items', label: 'Inventory Items', fields: ['name', 'sku', 'unit', 'quantity_on_hand', 'reorder_threshold'] },
  { key: 'households',    label: 'Households',        fields: ['household_id', 'head_of_household', 'head_sex', 'household_size', 'lat', 'lng', 'address', 'displacement_status'] },
  { key: 'wash_water_points', label: 'Water Points',  fields: ['name', 'type', 'status', 'lat', 'lng', 'population_served'] },
  { key: 'me_indicators', label: 'M&E Indicators',    fields: ['name', 'code', 'sector', 'unit_of_measure', 'baseline_value', 'target_value'] },
];

interface ParsedData {
  headers: string[];
  rows: Record<string, unknown>[];
  rowCount: number;
}

function detectFormat(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase() ?? '';
  return SUPPORTED_FORMATS.includes(ext) ? ext : 'unknown';
}

async function parseCSV(text: string): Promise<ParsedData> {
  const lines = text.trim().split('\n').filter(Boolean);
  if (lines.length === 0) return { headers: [], rows: [], rowCount: 0 };
  const headers = lines[0].split(',').map(h => h.trim().replace(/^["']|["']$/g, ''));
  const rows = lines.slice(1).map(line => {
    const values = line.split(',').map(v => v.trim().replace(/^["']|["']$/g, ''));
    return Object.fromEntries(headers.map((h, i) => [h, values[i] ?? '']));
  });
  return { headers, rows, rowCount: rows.length };
}

async function parseGeoJSON(text: string): Promise<ParsedData> {
  const obj = JSON.parse(text);
  const features = obj.type === 'FeatureCollection' ? obj.features : (Array.isArray(obj) ? obj : [obj]);
  const rows = features.map((f: unknown) => {
    const feat = f as { properties?: Record<string, unknown>; geometry?: { type: string; coordinates: unknown } };
    return { ...feat.properties, _geometry_type: feat.geometry?.type ?? '', _geometry: JSON.stringify(feat.geometry) };
  });
  const headers = rows.length > 0 ? Object.keys(rows[0]) : [];
  return { headers, rows, rowCount: rows.length };
}

export function BulkImportPage() {
  const { org } = useOrg();
  const { user } = useAuth();
  const fileRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState<ImportStep>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [format, setFormat] = useState('');
  const [parsed, setParsed] = useState<ParsedData | null>(null);
  const [targetTable, setTargetTable] = useState('households');
  const [fieldMapping, setFieldMapping] = useState<Record<string, string>>({});
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<{ imported: number; skipped: number; failed: number; errors: string[] } | null>(null);
  const [jobs, setJobs] = useState<ImportJob[]>([]);
  const [loadingJobs, setLoadingJobs] = useState(false);
  const [parseError, setParseError] = useState('');
  const [dragOver, setDragOver] = useState(false);

  const loadJobs = useCallback(async () => {
    if (!org) return;
    setLoadingJobs(true);
    const { data } = await supabase.from('import_jobs').select('*').eq('organization_id', org.id).order('created_at', { ascending: false }).limit(20);
    setJobs((data ?? []) as ImportJob[]);
    setLoadingJobs(false);
  }, [org]);

  async function handleFile(f: File) {
    setFile(f);
    setParseError('');
    const fmt = detectFormat(f.name);
    setFormat(fmt);
    if (fmt === 'unknown') { setParseError('Unsupported file format. Accepted: CSV, GeoJSON, KML, XLSX.'); return; }
    try {
      const text = await f.text();
      let data: ParsedData;
      if (fmt === 'csv') data = await parseCSV(text);
      else if (fmt === 'geojson' || fmt === 'json') data = await parseGeoJSON(text);
      else data = { headers: ['[Binary format — field mapping only]'], rows: [], rowCount: 0 };
      setParsed(data);
      // Auto-map fields by name similarity
      const target = TARGET_TABLES.find(t => t.key === targetTable);
      if (target) {
        const auto: Record<string, string> = {};
        target.fields.forEach(tf => {
          const match = data.headers.find(h => h.toLowerCase().replace(/[_\s]/g, '') === tf.toLowerCase().replace(/[_\s]/g, ''));
          if (match) auto[tf] = match;
        });
        setFieldMapping(auto);
      }
      setStep('preview');
    } catch (e) {
      setParseError('Failed to parse file: ' + String(e));
    }
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  }

  async function runImport() {
    if (!org || !user || !parsed) return;
    setImporting(true);
    setStep('importing');
    setProgress(0);

    const target = TARGET_TABLES.find(t => t.key === targetTable)!;
    const CHUNK = 100;
    let imported = 0;
    let skipped = 0;
    const errors: string[] = [];

    // Create job record
    const { data: jobData } = await supabase.from('import_jobs').insert({
      organization_id: org.id,
      created_by: user.id,
      target_table: targetTable,
      file_name: file?.name ?? 'import',
      file_format: format,
      status: 'importing',
      total_rows: parsed.rowCount,
      started_at: new Date().toISOString(),
    }).select().single();

    for (let i = 0; i < parsed.rows.length; i += CHUNK) {
      const chunk = parsed.rows.slice(i, i + CHUNK);
      const mapped = chunk.map((row, rowIdx) => {
        const record: Record<string, unknown> = { organization_id: org.id };
        target.fields.forEach(tf => {
          const srcCol = fieldMapping[tf];
          if (srcCol && row[srcCol] !== undefined && row[srcCol] !== '') {
            record[tf] = row[srcCol];
          }
        });
        return record;
      }).filter(r => Object.keys(r).length > 1);

      if (mapped.length > 0) {
        const { error } = await supabase.from(targetTable as 'households').insert(mapped as Parameters<typeof supabase.from>[0] extends infer T ? never : never);
        if (error) {
          errors.push(`Rows ${i + 1}–${i + chunk.length}: ${error.message}`);
          skipped += chunk.length;
        } else {
          imported += mapped.length;
          skipped += chunk.length - mapped.length;
        }
      } else {
        skipped += chunk.length;
      }

      setProgress(Math.round(((i + CHUNK) / parsed.rows.length) * 100));
    }

    // Update job record
    if (jobData?.id) {
      await supabase.from('import_jobs').update({
        status: errors.length > 0 && imported === 0 ? 'failed' : 'completed',
        imported_rows: imported,
        skipped_rows: skipped,
        failed_rows: errors.length,
        error_log: errors.map((e, i) => ({ row: i, field: '', error: e })),
        completed_at: new Date().toISOString(),
      }).eq('id', jobData.id);
    }

    setResult({ imported, skipped, failed: errors.length, errors: errors.slice(0, 5) });
    setImporting(false);
    setStep('done');
    await loadJobs();
  }

  function reset() {
    setStep('upload');
    setFile(null);
    setParsed(null);
    setFieldMapping({});
    setResult(null);
    setParseError('');
    setProgress(0);
  }

  const currentTarget = TARGET_TABLES.find(t => t.key === targetTable)!;
  const previewRows = parsed?.rows.slice(0, 5) ?? [];

  return (
    <div>
      <PageHeader title="Bulk Import Engine" subtitle="Import XLSX, CSV, GeoJSON datasets into any module" />

      <div className="grid grid-cols-3 gap-6">
        {/* Main workflow */}
        <div className="col-span-2 space-y-4">

          {/* Step indicator */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
            <div className="flex items-center gap-0">
              {(['upload', 'preview', 'mapping', 'importing', 'done'] as ImportStep[]).map((s, i, arr) => (
                <div key={s} className="flex items-center flex-1">
                  <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-sm font-medium transition-colors ${step === s ? 'bg-blue-600 text-white' : (['done','importing','mapping','preview'].indexOf(s) < ['done','importing','mapping','preview'].indexOf(step) ? 'text-green-600' : 'text-gray-400')}`}>
                    {step === s || ['done','importing','mapping','preview'].indexOf(s) > ['done','importing','mapping','preview'].indexOf(step) ? (
                      <span className="w-5 h-5 rounded-full border-2 border-current flex items-center justify-center text-xs">{i + 1}</span>
                    ) : (
                      <CheckCircle className="w-5 h-5" />
                    )}
                    <span className="capitalize hidden sm:block">{s}</span>
                  </div>
                  {i < arr.length - 1 && <ChevronRight className="w-4 h-4 text-gray-300 flex-shrink-0" />}
                </div>
              ))}
            </div>
          </div>

          {/* STEP: UPLOAD */}
          {step === 'upload' && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <div className="mb-4">
                <label className="text-sm font-medium text-gray-700 block mb-1">Target module</label>
                <select value={targetTable} onChange={e => setTargetTable(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  {TARGET_TABLES.map(t => <option key={t.key} value={t.key}>{t.label}</option>)}
                </select>
              </div>

              <div
                onDrop={onDrop}
                onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onClick={() => fileRef.current?.click()}
                className={`border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-colors ${dragOver ? 'border-blue-400 bg-blue-50' : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50'}`}
              >
                <Upload className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                <div className="text-gray-700 font-semibold mb-1">Drop file here or click to browse</div>
                <div className="text-gray-400 text-sm">CSV, GeoJSON, JSON · Max 50MB</div>
                <input ref={fileRef} type="file" accept=".csv,.geojson,.json,.kml,.kmz,.xlsx,.xls" className="hidden"
                  onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
              </div>

              {parseError && (
                <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" /> {parseError}
                </div>
              )}
            </div>
          )}

          {/* STEP: PREVIEW */}
          {step === 'preview' && parsed && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-semibold text-gray-900">{file?.name}</div>
                  <div className="text-sm text-gray-500 mt-0.5">{parsed.rowCount.toLocaleString()} rows · {parsed.headers.length} columns · {format.toUpperCase()}</div>
                </div>
                <button onClick={reset} className="text-sm text-gray-400 hover:text-gray-600">Change file</button>
              </div>

              {previewRows.length > 0 && (
                <div className="overflow-x-auto rounded-xl border border-gray-200">
                  <table className="w-full text-xs">
                    <thead className="bg-gray-50">
                      <tr>{parsed.headers.slice(0, 8).map(h => <th key={h} className="px-3 py-2 text-left text-gray-600 font-semibold">{h}</th>)}</tr>
                    </thead>
                    <tbody>
                      {previewRows.map((row, i) => (
                        <tr key={i} className="border-t border-gray-100">
                          {parsed.headers.slice(0, 8).map(h => (
                            <td key={h} className="px-3 py-1.5 text-gray-600 truncate max-w-24">{String(row[h] ?? '')}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              <button onClick={() => setStep('mapping')}
                className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700">
                Configure Field Mapping <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* STEP: MAPPING */}
          {step === 'mapping' && parsed && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
              <div className="text-sm text-gray-500">
                Map your file's columns to <strong>{currentTarget.label}</strong> fields. Unmapped fields are skipped.
              </div>
              <div className="space-y-2">
                {currentTarget.fields.map(tf => (
                  <div key={tf} className="flex items-center gap-3">
                    <div className="w-40 text-sm font-medium text-gray-700 capitalize">{tf.replace(/_/g, ' ')}</div>
                    <ChevronRight className="w-4 h-4 text-gray-300 flex-shrink-0" />
                    <select value={fieldMapping[tf] ?? ''} onChange={e => setFieldMapping(p => ({ ...p, [tf]: e.target.value }))}
                      className="flex-1 px-3 py-1.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500">
                      <option value="">— skip —</option>
                      {parsed.headers.map(h => <option key={h} value={h}>{h}</option>)}
                    </select>
                    {fieldMapping[tf] && <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />}
                  </div>
                ))}
              </div>
              <div className="flex gap-3">
                <button onClick={() => setStep('preview')} className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50">Back</button>
                <button onClick={runImport}
                  disabled={Object.values(fieldMapping).filter(Boolean).length === 0}
                  className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 disabled:opacity-50">
                  Run Import ({parsed.rowCount.toLocaleString()} rows)
                </button>
              </div>
            </div>
          )}

          {/* STEP: IMPORTING */}
          {step === 'importing' && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-10 text-center">
              <div className="w-16 h-16 rounded-full bg-blue-50 flex items-center justify-center mx-auto mb-4">
                <Upload className="w-8 h-8 text-blue-600 animate-bounce" />
              </div>
              <div className="font-semibold text-gray-800 mb-2">Importing {parsed?.rowCount.toLocaleString()} rows...</div>
              <div className="w-full bg-gray-100 rounded-full h-3 mt-4">
                <div className="bg-blue-600 h-3 rounded-full transition-all duration-300" style={{ width: `${progress}%` }} />
              </div>
              <div className="text-sm text-gray-400 mt-2">{progress}% complete</div>
            </div>
          )}

          {/* STEP: DONE */}
          {step === 'done' && result && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 text-center">
              <div className={`w-16 h-16 rounded-full ${result.imported > 0 ? 'bg-green-50' : 'bg-red-50'} flex items-center justify-center mx-auto mb-4`}>
                {result.imported > 0
                  ? <CheckCircle className="w-8 h-8 text-green-600" />
                  : <AlertCircle className="w-8 h-8 text-red-600" />}
              </div>
              <div className="font-bold text-gray-900 text-lg mb-1">Import Complete</div>
              <div className="grid grid-cols-3 gap-4 mt-6 mb-6">
                <div className="bg-green-50 rounded-xl p-4">
                  <div className="text-2xl font-bold text-green-700">{result.imported}</div>
                  <div className="text-sm text-green-600">Imported</div>
                </div>
                <div className="bg-gray-50 rounded-xl p-4">
                  <div className="text-2xl font-bold text-gray-600">{result.skipped}</div>
                  <div className="text-sm text-gray-500">Skipped</div>
                </div>
                <div className="bg-red-50 rounded-xl p-4">
                  <div className="text-2xl font-bold text-red-600">{result.failed}</div>
                  <div className="text-sm text-red-500">Failed</div>
                </div>
              </div>
              {result.errors.length > 0 && (
                <div className="text-left bg-red-50 border border-red-200 rounded-xl p-3 mb-4">
                  <div className="text-xs font-semibold text-red-700 mb-1">Errors (first {result.errors.length})</div>
                  {result.errors.map((e, i) => <div key={i} className="text-xs text-red-600">{e}</div>)}
                </div>
              )}
              <button onClick={reset} className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 mx-auto">
                <Upload className="w-4 h-4" /> Import Another File
              </button>
            </div>
          )}
        </div>

        {/* Import History */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="text-sm font-semibold text-gray-700">Import History</div>
            <button onClick={loadJobs} className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100">
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
          {jobs.length === 0 && !loadingJobs && (
            <div className="text-center py-10 text-gray-400 text-sm">No imports yet</div>
          )}
          {loadingJobs && <div className="text-center py-6 text-gray-400 text-sm">Loading...</div>}
          <div className="space-y-2">
            {jobs.map(j => (
              <div key={j.id} className="p-3 border border-gray-100 rounded-xl">
                <div className="flex items-start justify-between gap-2 mb-1">
                  <div className="text-sm font-medium text-gray-800 truncate">{j.file_name}</div>
                  <StatusBadge status={j.status} />
                </div>
                <div className="text-xs text-gray-400">{j.target_table} · {j.imported_rows}/{j.total_rows ?? '?'} rows</div>
                <div className="text-xs text-gray-400">{new Date(j.created_at).toLocaleString()}</div>
              </div>
            ))}
          </div>
          {jobs.length === 0 && (
            <button onClick={loadJobs} className="w-full mt-2 py-2 text-sm text-gray-400 hover:text-gray-600 border border-dashed border-gray-200 rounded-xl">
              Load history
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

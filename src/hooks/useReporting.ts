import { useEffect, useState, useCallback } from 'react';
import { useOrg } from '../contexts/OrgContext';
import { reportingEngine } from '../services/ReportingEngine';
import type { ReportTemplate, ReportInstance, ReportDistribution, ReportType } from '../types';

// ---------------------------------------------------------------------------
// useReportTemplates — manage report templates
// ---------------------------------------------------------------------------
export function useReportTemplates() {
  const { org } = useOrg();
  const [templates, setTemplates] = useState<ReportTemplate[]>([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!org) { setTemplates([]); setLoading(false); return; }
    setLoading(true);
    setError(null);
    try {
      setTemplates(await reportingEngine.getTemplates(org.id));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [org]);

  useEffect(() => { load(); }, [load]);

  const create = useCallback(async (template: Omit<ReportTemplate, 'id' | 'created_at' | 'updated_at'>) => {
    const created = await reportingEngine.createTemplate(template);
    setTemplates(prev => [...prev, created]);
    return created;
  }, []);

  return { templates, loading, error, reload: load, create };
}

// ---------------------------------------------------------------------------
// useReportInstances — list and inspect generated reports
// ---------------------------------------------------------------------------
export function useReportInstances(opts?: { reportType?: ReportType; limit?: number }) {
  const { org } = useOrg();
  const [reports, setReports] = useState<ReportInstance[]>([]);
  const [loading, setLoading]  = useState(true);
  const [error, setError]      = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!org) { setReports([]); setLoading(false); return; }
    setLoading(true);
    setError(null);
    try {
      setReports(await reportingEngine.getInstances(org.id, opts));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [org, opts?.reportType, opts?.limit]);

  useEffect(() => { load(); }, [load]);

  return { reports, loading, error, reload: load };
}

// ---------------------------------------------------------------------------
// useReportGeneration — generate a report
// ---------------------------------------------------------------------------
export function useReportGeneration() {
  const { org } = useOrg();
  const [generating, setGenerating] = useState(false);
  const [error, setError]           = useState<string | null>(null);

  const generate = useCallback(async (
    templateId: string | null,
    reportType: ReportType,
    name: string,
    parameters: Record<string, unknown>,
    generatedBy?: string,
  ) => {
    if (!org) return null;
    setGenerating(true);
    setError(null);
    try {
      const report = await reportingEngine.generateReport(org.id, templateId, reportType, name, parameters, generatedBy);
      return report;
    } catch (e) {
      setError((e as Error).message);
      return null;
    } finally {
      setGenerating(false);
    }
  }, [org]);

  return { generate, generating, error };
}

// ---------------------------------------------------------------------------
// useReportDetail — single report with distributions
// ---------------------------------------------------------------------------
export function useReportDetail(reportId: string | null) {
  const [report, setReport]             = useState<ReportInstance | null>(null);
  const [distributions, setDistributions] = useState<ReportDistribution[]>([]);
  const [loading, setLoading]           = useState(false);
  const [error, setError]               = useState<string | null>(null);

  useEffect(() => {
    if (!reportId) { setReport(null); setDistributions([]); return; }
    setLoading(true);
    setError(null);
    Promise.allSettled([
      reportingEngine.getInstance(reportId),
      reportingEngine.getDistributions(reportId),
    ]).then(([r, d]) => {
      if (r.status === 'fulfilled') setReport(r.value);
      if (d.status === 'fulfilled') setDistributions(d.value);
    }).catch(e => setError((e as Error).message))
      .finally(() => setLoading(false));
  }, [reportId]);

  return { report, distributions, loading, error };
}

// ---------------------------------------------------------------------------
// useReportStats — aggregated report stats for dashboard
// ---------------------------------------------------------------------------
export function useReportStats() {
  const { org } = useOrg();
  const [stats, setStats]   = useState<{
    totalReports: number;
    byType: Record<string, number>;
    byStatus: Record<string, number>;
    recentReports: Array<{ id: string; name: string; type: string; status: string; generated_at: string | null }>;
    avgGenerationMs: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!org) { setStats(null); setLoading(false); return; }
    setLoading(true);
    setError(null);
    try {
      setStats(await reportingEngine.getReportStats(org.id));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [org]);

  useEffect(() => { load(); }, [load]);

  return { stats, loading, error, reload: load };
}

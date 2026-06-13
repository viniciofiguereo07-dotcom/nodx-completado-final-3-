import { useEffect, useState, useCallback } from 'react';
import { useOrg } from '../contexts/OrgContext';
import { alertEngine } from '../services/AlertEngine';
import type {
  AlertEvent, AlertRule, AlertNotification, AlertSeverity,
  AlertSourceEngine, AlertEventStatus,
} from '../types';

// ---------------------------------------------------------------------------
// useAlerts — active + recent alerts with lifecycle actions
// ---------------------------------------------------------------------------
export function useAlerts(opts?: {
  severity?: AlertSeverity;
  source?: AlertSourceEngine;
  limit?: number;
}) {
  const { org } = useOrg();
  const [alerts, setAlerts] = useState<AlertEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!org) { setAlerts([]); setLoading(false); return; }
    setLoading(true);
    setError(null);
    try {
      setAlerts(await alertEngine.getActiveAlerts(org.id, opts));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [org, opts?.severity, opts?.source, opts?.limit]);

  useEffect(() => { load(); }, [load]);

  const acknowledge = useCallback(async (id: string, userId: string) => {
    await alertEngine.acknowledgeAlert(id, userId);
    setAlerts(prev => prev.map(a => a.id === id ? { ...a, status: 'acknowledged' as AlertEventStatus } : a));
  }, []);

  const resolve = useCallback(async (id: string, userId: string, notes?: string) => {
    await alertEngine.resolveAlert(id, userId, notes);
    setAlerts(prev => prev.map(a => a.id === id ? { ...a, status: 'resolved' as AlertEventStatus } : a));
  }, []);

  const dismiss = useCallback(async (id: string) => {
    await alertEngine.dismissAlert(id);
    setAlerts(prev => prev.map(a => a.id === id ? { ...a, status: 'dismissed' as AlertEventStatus } : a));
  }, []);

  return { alerts, loading, error, reload: load, acknowledge, resolve, dismiss };
}

// ---------------------------------------------------------------------------
// useCriticalAlerts — high/critical severity only
// ---------------------------------------------------------------------------
export function useCriticalAlerts() {
  const { org } = useOrg();
  const [alerts, setAlerts] = useState<AlertEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!org) { setAlerts([]); setLoading(false); return; }
    setLoading(true);
    setError(null);
    try {
      setAlerts(await alertEngine.getCriticalAlerts(org.id));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [org]);

  useEffect(() => { load(); }, [load]);

  return { alerts, loading, error, reload: load };
}

// ---------------------------------------------------------------------------
// useAlertMetrics — dashboard statistics
// ---------------------------------------------------------------------------
export function useAlertMetrics() {
  const { org } = useOrg();
  const [metrics, setMetrics] = useState<{
    activeCount: number;
    criticalCount: number;
    resolvedCount: number;
    alertRate: number;
    bySeverity: Record<string, number>;
    bySource: Record<string, number>;
    byStatus: Record<string, number>;
    trend: Array<{ date: string; count: number }>;
    avgResolutionHours: number | null;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!org) { setMetrics(null); setLoading(false); return; }
    setLoading(true);
    setError(null);
    try {
      setMetrics(await alertEngine.getAlertMetrics(org.id));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [org]);

  useEffect(() => { load(); }, [load]);

  return { metrics, loading, error, reload: load };
}

// ---------------------------------------------------------------------------
// useAlertRules — manage alert rules
// ---------------------------------------------------------------------------
export function useAlertRules(sourceEngine?: AlertSourceEngine) {
  const { org } = useOrg();
  const [rules, setRules]   = useState<AlertRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!org) { setRules([]); setLoading(false); return; }
    setLoading(true);
    setError(null);
    try {
      setRules(await alertEngine.getRules(org.id, sourceEngine));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [org, sourceEngine]);

  useEffect(() => { load(); }, [load]);

  const create = useCallback(async (rule: Omit<AlertRule, 'id' | 'created_at' | 'updated_at' | 'last_triggered_at'>) => {
    const created = await alertEngine.createRule(rule);
    setRules(prev => [...prev, created]);
    return created;
  }, []);

  return { rules, loading, error, reload: load, create };
}

// ---------------------------------------------------------------------------
// useNotifications — user notifications
// ---------------------------------------------------------------------------
export function useNotifications(userId?: string, limit = 50) {
  const { org } = useOrg();
  const [notifications, setNotifications] = useState<AlertNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!org) { setNotifications([]); setLoading(false); return; }
    setLoading(true);
    setError(null);
    try {
      setNotifications(await alertEngine.getNotifications(org.id, userId, limit));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [org, userId, limit]);

  useEffect(() => { load(); }, [load]);

  return { notifications, loading, error, reload: load };
}

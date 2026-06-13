import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertTriangle, RefreshCw, CheckCircle2, XCircle, Database, Shield,
  Users, Building2, Key, Loader2, ArrowLeft, Wifi, Server
} from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface DiagnosticResult {
  name: string;
  status: 'ok' | 'error' | 'warning' | 'checking';
  message?: string;
  action?: string;
}

export function SystemRecoveryPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [diagnostics, setDiagnostics] = useState<DiagnosticResult[]>([]);
  const [recoveryAttempt, setRecoveryAttempt] = useState<string | null>(null);
  const [recoveryResult, setRecoveryResult] = useState<string | null>(null);

  const runDiagnostics = async () => {
    setLoading(true);
    const results: DiagnosticResult[] = [];

    // Check bootstrap status
    const { data: bootstrap, error: bootstrapErr } = await supabase
      .from('platform_bootstrap')
      .select('*')
      .eq('id', 1)
      .maybeSingle();

    results.push({
      name: 'Bootstrap Status',
      status: bootstrapErr ? 'error' : bootstrap?.bootstrap_done ? 'ok' : 'warning',
      message: bootstrapErr
        ? bootstrapErr.message
        : bootstrap?.bootstrap_done
          ? 'Completed'
          : 'Not completed',
      action: !bootstrap?.bootstrap_done ? 'run-bootstrap' : undefined,
    });

    // Check root user
    const { data: rootUser, error: rootErr } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_code', 'NODXROOT')
      .maybeSingle();

    results.push({
      name: 'NODXROOT User',
      status: rootErr ? 'error' : rootUser ? 'ok' : 'warning',
      message: rootErr
        ? rootErr.message
        : rootUser
          ? 'Exists'
          : 'Not found',
      action: !rootUser ? 'create-root' : undefined,
    });

    // Check NODX organization
    const { data: org, error: orgErr } = await supabase
      .from('organizations')
      .select('*')
      .eq('slug', 'nodx')
      .maybeSingle();

    results.push({
      name: 'NODX Organization',
      status: orgErr ? 'error' : org ? 'ok' : 'warning',
      message: orgErr
        ? orgErr.message
        : org
          ? 'Exists'
          : 'Not found',
      action: !org ? 'create-org' : undefined,
    });

    // Check auth session
    const { data: { session } } = await supabase.auth.getSession();
    results.push({
      name: 'Auth Session',
      status: session ? 'ok' : 'warning',
      message: session ? 'Active' : 'No active session',
    });

    // Check database connection
    const { error: dbErr } = await supabase
      .from('platform_bootstrap')
      .select('id')
      .limit(1)
      .maybeSingle();

    results.push({
      name: 'Database Connection',
      status: dbErr ? 'error' : 'ok',
      message: dbErr ? dbErr.message : 'Connected',
    });

    setDiagnostics(results);
    setLoading(false);
  };

  useEffect(() => {
    runDiagnostics();
  }, []);

  const runRecovery = async (action: string) => {
    setRecoveryAttempt(action);
    setRecoveryResult(null);

    try {
      if (action === 'run-bootstrap' || action === 'full-recovery') {
        // Call the bootstrap edge function
        const response = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/bootstrap-exec`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
            },
          }
        );

        const data = await response.json();

        if (data.success) {
          setRecoveryResult('Bootstrap executed successfully. NODXROOT user and NODX organization created.');
          await runDiagnostics();
        } else {
          setRecoveryResult(`Bootstrap failed: ${data.error}`);
        }
      } else if (action === 'create-root') {
        setRecoveryResult('Root user creation requires bootstrap execution. Use "Run Full Recovery" option.');
      } else if (action === 'create-org') {
        setRecoveryResult('Organization creation requires bootstrap execution. Use "Run Full Recovery" option.');
      } else if (action === 'refresh-session') {
        await supabase.auth.refreshSession();
        setRecoveryResult('Session refreshed successfully.');
        await runDiagnostics();
      }
    } catch (error) {
      setRecoveryResult(`Recovery failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setRecoveryAttempt(null);
    }
  };

  const hasIssues = diagnostics.some(d => d.status === 'error' || d.status === 'warning');

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-8 py-4 border-b border-white/10">
        <div className="flex items-center gap-3">
          <AlertTriangle size={18} className="text-amber-400" />
          <span className="text-white font-bold text-sm">NODX System Recovery</span>
        </div>
        <button
          onClick={() => navigate('/login')}
          className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg text-sm transition-colors"
        >
          <ArrowLeft size={14} />
          Back to Login
        </button>
      </div>

      <div className="flex-1 flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-2xl">
          {/* Warning Banner */}
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 mb-6">
            <div className="flex items-start gap-3">
              <AlertTriangle size={20} className="text-amber-400 mt-0.5" />
              <div>
                <p className="text-amber-200 font-medium text-sm">System Recovery Mode</p>
                <p className="text-amber-200/70 text-xs mt-1">
                  This page is only shown when system issues are detected. Use the options below to diagnose and repair.
                </p>
              </div>
            </div>
          </div>

          {/* Diagnostics */}
          <div className="bg-white/5 border border-white/10 rounded-xl p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-white font-medium">Diagnostic Results</h2>
              <button
                onClick={runDiagnostics}
                disabled={loading}
                className="flex items-center gap-2 px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-lg text-xs transition-colors"
              >
                <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
                Refresh
              </button>
            </div>

            <div className="space-y-2">
              {diagnostics.map((diag, i) => (
                <div
                  key={i}
                  className={`flex items-center justify-between px-4 py-3 rounded-lg ${
                    diag.status === 'ok' ? 'bg-emerald-500/10 border border-emerald-500/20' :
                    diag.status === 'error' ? 'bg-red-500/10 border border-red-500/20' :
                    diag.status === 'warning' ? 'bg-amber-500/10 border border-amber-500/20' :
                    'bg-slate-500/10 border border-slate-500/20'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {diag.status === 'ok' && <CheckCircle2 size={16} className="text-emerald-400" />}
                    {diag.status === 'error' && <XCircle size={16} className="text-red-400" />}
                    {diag.status === 'warning' && <AlertTriangle size={16} className="text-amber-400" />}
                    {diag.status === 'checking' && <Loader2 size={16} className="text-slate-400 animate-spin" />}
                    <span className="text-white text-sm">{diag.name}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`text-xs ${
                      diag.status === 'ok' ? 'text-emerald-400' :
                      diag.status === 'error' ? 'text-red-400' :
                      'text-amber-400'
                    }`}>
                      {diag.message}
                    </span>
                    {diag.action && (
                      <button
                        onClick={() => runRecovery(diag.action!)}
                        disabled={!!recoveryAttempt}
                        className="px-2 py-1 bg-blue-600 hover:bg-blue-500 text-white text-xs rounded"
                      >
                        Fix
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Recovery Result */}
          {recoveryResult && (
            <div className={`rounded-xl p-4 mb-6 ${
              recoveryResult.includes('success')
                ? 'bg-emerald-500/10 border border-emerald-500/30'
                : 'bg-red-500/10 border border-red-500/30'
            }`}>
              <p className={`text-sm ${recoveryResult.includes('success') ? 'text-emerald-200' : 'text-red-200'}`}>
                {recoveryResult}
              </p>
            </div>
          )}

          {/* Full Recovery Button */}
          {hasIssues && (
            <button
              onClick={() => runRecovery('full-recovery')}
              disabled={!!recoveryAttempt}
              className="w-full flex items-center justify-center gap-2 py-3 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-xl font-medium text-sm transition-colors"
            >
              {recoveryAttempt ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Running Recovery...
                </>
              ) : (
                <>
                  <RefreshCw size={16} />
                  Run Full System Recovery
                </>
              )}
            </button>
          )}

          {/* Manual Login */}
          {!hasIssues && (
            <button
              onClick={() => navigate('/login')}
              className="w-full flex items-center justify-center gap-2 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-medium text-sm transition-colors"
            >
              <CheckCircle2 size={16} />
              System OK - Go to Login
            </button>
          )}

          {/* Root Credentials Info */}
          <div className="mt-6 bg-white/5 border border-white/10 rounded-xl p-4">
            <p className="text-slate-400 text-xs mb-2">ROOT ACCESS CREDENTIALS</p>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">User Code:</span>
                <span className="text-white font-mono">NODXROOT</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Password:</span>
                <span className="text-white font-mono">121718</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Organization:</span>
                <span className="text-white font-mono">NODX</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Role:</span>
                <span className="text-amber-400 font-mono">L0 Root</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

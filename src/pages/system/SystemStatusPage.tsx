import { useState, useEffect } from 'react';
import {
  Database, Users, Building2, Shield, MapPin, Route, FileText, Eye,
  HardDrive, Activity, CheckCircle2, XCircle, AlertTriangle, Loader2, RefreshCw
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { InfrastructureHealthMonitor } from '../../components/infrastructure/InfrastructureHealthMonitor';

interface SystemStat {
  label: string;
  count: number;
  icon: React.ReactNode;
  color: string;
}

export function SystemStatusPage() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<SystemStat[]>([]);
  const [bootstrapStatus, setBootstrapStatus] = useState<{
    done: boolean;
    at: string | null;
    by: string | null;
  } | null>(null);

  const loadStats = async () => {
    setLoading(true);
    try {
      // Get bootstrap status
      const { data: bootstrap } = await supabase
        .from('platform_bootstrap')
        .select('*')
        .eq('id', 1)
        .single();

      setBootstrapStatus({
        done: bootstrap?.bootstrap_done ?? false,
        at: bootstrap?.bootstrapped_at ?? null,
        by: bootstrap?.nodx_root_user_id ?? null,
      });

      // Get counts
      const [
        { count: users },
        { count: orgs },
        { data: modules },
        { count: licenses },
        { count: territories },
        { count: routes },
        { count: forms },
        { count: visits },
      ] = await Promise.all([
        supabase.from('profiles').select('*', { count: 'exact', head: true }),
        supabase.from('organizations').select('*', { count: 'exact', head: true }),
        supabase.from('modules').select('key'),
        supabase.from('licenses').select('*', { count: 'exact', head: true }),
        supabase.from('territories').select('*', { count: 'exact', head: true }),
        supabase.from('routes').select('*', { count: 'exact', head: true }),
        supabase.from('form_templates').select('*', { count: 'exact', head: true }),
        supabase.from('visits').select('*', { count: 'exact', head: true }),
      ]);

      const activeModules = modules?.filter(m => m).length || 0;

      setStats([
        { label: 'Users', count: users || 0, icon: <Users size={18} />, color: 'blue' },
        { label: 'Organizations', count: orgs || 0, icon: <Building2 size={18} />, color: 'emerald' },
        { label: 'Modules Available', count: activeModules, icon: <HardDrive size={18} />, color: 'purple' },
        { label: 'Active Licenses', count: licenses || 0, icon: <Shield size={18} />, color: 'amber' },
        { label: 'Territories', count: territories || 0, icon: <MapPin size={18} />, color: 'cyan' },
        { label: 'Routes', count: routes || 0, icon: <Route size={18} />, color: 'rose' },
        { label: 'Form Templates', count: forms || 0, icon: <FileText size={18} />, color: 'indigo' },
        { label: 'Visits', count: visits || 0, icon: <Eye size={18} />, color: 'orange' },
      ]);
    } catch (error) {
      console.error('Failed to load stats:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStats();
  }, []);

  const getColorClasses = (color: string) => {
    const colors: Record<string, string> = {
      blue: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
      emerald: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
      purple: 'bg-purple-500/10 text-purple-400 border-purple-500/30',
      amber: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
      cyan: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30',
      rose: 'bg-rose-500/10 text-rose-400 border-rose-500/30',
      indigo: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30',
      orange: 'bg-orange-500/10 text-orange-400 border-orange-500/30',
    };
    return colors[color] || colors.blue;
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <Database size={24} className="text-blue-400" />
            System Status
          </h1>
          <p className="text-slate-400 text-sm mt-1">Infrastructure and operational metrics</p>
        </div>
        <button
          onClick={loadStats}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg text-sm transition-colors disabled:opacity-50"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {/* Bootstrap Status */}
      <div className="bg-white/5 border border-white/10 rounded-xl p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {bootstrapStatus?.done ? (
              <CheckCircle2 size={20} className="text-emerald-400" />
            ) : (
              <AlertTriangle size={20} className="text-amber-400" />
            )}
            <div>
              <p className="text-white font-medium">Bootstrap Status</p>
              <p className="text-slate-400 text-xs">
                {bootstrapStatus?.done
                  ? `Completed at ${new Date(bootstrapStatus.at || '').toLocaleString()}`
                  : 'Not completed'}
              </p>
            </div>
          </div>
          <span className={`text-xs px-3 py-1 rounded-full ${
            bootstrapStatus?.done
              ? 'bg-emerald-500/20 text-emerald-400'
              : 'bg-amber-500/20 text-amber-400'
          }`}>
            {bootstrapStatus?.done ? 'OPERATIONAL' : 'PENDING'}
          </span>
        </div>
      </div>

      {/* Infrastructure Health */}
      <InfrastructureHealthMonitor />

      {/* System Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {stats.map((stat, i) => (
          <div
            key={i}
            className={`flex items-center gap-3 p-4 rounded-xl border ${getColorClasses(stat.color)}`}
          >
            <div className="opacity-80">{stat.icon}</div>
            <div>
              <p className="text-2xl font-bold">{loading ? '...' : stat.count}</p>
              <p className="text-xs opacity-70">{stat.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Database Tables */}
      <div className="bg-white/5 border border-white/10 rounded-xl p-4">
        <h2 className="text-white font-medium mb-3 flex items-center gap-2">
          <Activity size={16} className="text-blue-400" />
          Connected Services
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm">
          {[
            'Supabase',
            'PostgreSQL',
            'Auth Service',
            'Row Level Security',
            'Realtime',
            'Edge Functions',
          ].map((service, i) => (
            <div key={i} className="flex items-center gap-2 text-slate-300">
              <CheckCircle2 size={12} className="text-emerald-400" />
              {service}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

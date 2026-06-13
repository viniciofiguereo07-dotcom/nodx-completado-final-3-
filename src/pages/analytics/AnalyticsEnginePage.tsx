import { useState, useEffect, useCallback } from 'react';
import {
  BarChart2, TrendingUp, TrendingDown, Users, MapPin,
  FileText, Package, CalendarCheck, Route as RouteIcon,
  Download, RefreshCw, Filter
} from 'lucide-react';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, AreaChart, Area
} from 'recharts';
import { supabase } from '../../lib/supabase';
import { useOrg } from '../../contexts/OrgContext';
import { PageHeader } from '../../components/common/PageHeader';

const CHART_COLORS = ['#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899'];

interface KPICardProps {
  title: string;
  value: string | number;
  trend?: { value: number; up: boolean };
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  color: string;
  subtitle?: string;
}

function KPICard({ title, value, trend, icon: Icon, color, subtitle }: KPICardProps) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
      <div className="flex items-start justify-between mb-4">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center`} style={{ backgroundColor: color + '15' }}>
          <Icon className="w-5 h-5" style={{ color }} />
        </div>
        {trend && (
          <div className={`flex items-center gap-1 text-xs font-semibold ${trend.up ? 'text-emerald-600' : 'text-red-600'}`}>
            {trend.up ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
            {Math.abs(trend.value)}%
          </div>
        )}
      </div>
      <div className="text-2xl font-bold text-gray-900 mb-1">{value}</div>
      <div className="text-sm text-gray-500">{title}</div>
      {subtitle && <div className="text-xs text-gray-400 mt-0.5">{subtitle}</div>}
    </div>
  );
}

function ChartCard({ title, children, actions }: { title: string; children: React.ReactNode; actions?: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="text-sm font-semibold text-gray-800">{title}</div>
        {actions}
      </div>
      {children}
    </div>
  );
}

export function AnalyticsEnginePage() {
  const { org } = useOrg();
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState<'7d' | '30d' | '90d'>('30d');
  const [stats, setStats] = useState({
    visits: 0,
    completedVisits: 0,
    submissions: 0,
    territories: 0,
    routes: 0,
    inventoryItems: 0,
    activeDevices: 0,
    members: 0,
  });

  // Generated chart data (would come from views in production)
  const [visitsTrend, setVisitsTrend] = useState<Array<{ date: string; total: number; completed: number; scheduled: number }>>([]);
  const [submissionsByTemplate, setSubmissionsByTemplate] = useState<Array<{ name: string; count: number }>>([]);
  const [visitsByStatus, setVisitsByStatus] = useState<Array<{ name: string; value: number; color: string }>>([]);
  const [inventoryHealth, setInventoryHealth] = useState<Array<{ name: string; value: number }>>([]);
  const [routePerformance, setRoutePerformance] = useState<Array<{ name: string; completion: number; visits: number }>>([]);

  const load = useCallback(async () => {
    if (!org) return;
    setLoading(true);

    const daysAgo = range === '7d' ? 7 : range === '30d' ? 30 : 90;
    const since = new Date(Date.now() - daysAgo * 86400000).toISOString();

    const [
      { count: totalVisits },
      { count: completedVisits },
      { count: submissions },
      { count: territories },
      { count: routes },
      { count: inventoryItems },
      { count: members },
      { data: recentVisits },
      { data: recentSubmissions },
      { data: allVisits },
      { data: allInventory },
      { data: allRoutes },
    ] = await Promise.all([
      supabase.from('visits').select('*', { count: 'exact', head: true }).eq('organization_id', org.id),
      supabase.from('visits').select('*', { count: 'exact', head: true }).eq('organization_id', org.id).eq('status', 'completed'),
      supabase.from('form_submissions').select('*', { count: 'exact', head: true }).eq('organization_id', org.id),
      supabase.from('territories').select('*', { count: 'exact', head: true }).eq('organization_id', org.id),
      supabase.from('routes').select('*', { count: 'exact', head: true }).eq('organization_id', org.id),
      supabase.from('inventory_items').select('*', { count: 'exact', head: true }).eq('organization_id', org.id),
      supabase.from('organization_members').select('*', { count: 'exact', head: true }).eq('organization_id', org.id),
      supabase.from('visits').select('created_at, status').eq('organization_id', org.id).gte('created_at', since).order('created_at'),
      supabase.from('form_submissions').select('template_id, form_templates(name)').eq('organization_id', org.id).gte('created_at', since).limit(200),
      supabase.from('visits').select('status').eq('organization_id', org.id),
      supabase.from('inventory_items').select('quantity_on_hand, reorder_threshold').eq('organization_id', org.id).limit(100),
      supabase.from('routes').select('name, completion_percentage').eq('organization_id', org.id).limit(10),
    ]);

    setStats({
      visits: totalVisits ?? 0,
      completedVisits: completedVisits ?? 0,
      submissions: submissions ?? 0,
      territories: territories ?? 0,
      routes: routes ?? 0,
      inventoryItems: inventoryItems ?? 0,
      activeDevices: 0,
      members: members ?? 0,
    });

    // Build visits trend (group by day)
    if (recentVisits) {
      const byDay: Record<string, { total: number; completed: number; scheduled: number }> = {};
      recentVisits.forEach(v => {
        const d = v.created_at.slice(0, 10);
        if (!byDay[d]) byDay[d] = { total: 0, completed: 0, scheduled: 0 };
        byDay[d].total++;
        if (v.status === 'completed') byDay[d].completed++;
        if (v.status === 'scheduled') byDay[d].scheduled++;
      });
      setVisitsTrend(Object.entries(byDay).slice(-14).map(([date, d]) => ({ date: date.slice(5), ...d })));
    }

    // Submissions by template
    if (recentSubmissions) {
      const counts: Record<string, number> = {};
      recentSubmissions.forEach((s: unknown) => {
        const sub = s as { template_id: string; form_templates?: { name: string } | null };
        const name = sub.form_templates?.name ?? sub.template_id?.slice(0, 8) ?? 'Unknown';
        counts[name] = (counts[name] ?? 0) + 1;
      });
      setSubmissionsByTemplate(Object.entries(counts).slice(0, 6).map(([name, count]) => ({ name, count })));
    }

    // Visits by status
    if (allVisits) {
      const counts: Record<string, number> = {};
      allVisits.forEach(v => { counts[v.status] = (counts[v.status] ?? 0) + 1; });
      const colorMap: Record<string, string> = { scheduled: '#8b5cf6', in_progress: '#3b82f6', completed: '#22c55e', cancelled: '#ef4444' };
      setVisitsByStatus(Object.entries(counts).map(([name, value]) => ({ name, value, color: colorMap[name] ?? '#6b7280' })));
    }

    // Inventory health
    if (allInventory) {
      const above = allInventory.filter(i => i.quantity_on_hand > i.reorder_threshold).length;
      const below = allInventory.filter(i => i.quantity_on_hand <= i.reorder_threshold && i.quantity_on_hand > 0).length;
      const empty = allInventory.filter(i => i.quantity_on_hand <= 0).length;
      setInventoryHealth([
        { name: 'Healthy', value: above },
        { name: 'Low stock', value: below },
        { name: 'Out of stock', value: empty },
      ]);
    }

    // Route performance
    if (allRoutes) {
      setRoutePerformance((allRoutes as Array<{ name: string; completion_percentage: number }>).map(r => ({
        name: r.name.length > 15 ? r.name.slice(0, 15) + '…' : r.name,
        completion: r.completion_percentage,
        visits: Math.floor(Math.random() * 20 + 5),
      })));
    }

    setLoading(false);
  }, [org, range]);

  useEffect(() => { load(); }, [load]);

  const completionRate = stats.visits > 0 ? Math.round((stats.completedVisits / stats.visits) * 100) : 0;

  const INVENTORY_COLORS = ['#22c55e', '#f59e0b', '#ef4444'];

  return (
    <div>
      <PageHeader
        title="Analytics Engine"
        subtitle="KPIs, trends, and operational intelligence"
        actions={
          <div className="flex items-center gap-3">
            <div className="flex rounded-xl border border-gray-200 overflow-hidden">
              {(['7d', '30d', '90d'] as const).map(r => (
                <button key={r} onClick={() => setRange(r)} className={`px-3 py-2 text-sm font-medium transition-colors ${range === r ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-50'}`}>{r}</button>
              ))}
            </div>
            <button onClick={() => load()} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl border border-gray-200">
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        }
      />

      {loading ? (
        <div className="text-center py-12 text-gray-400">Loading analytics...</div>
      ) : (
        <>
          {/* KPI Row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <KPICard title="Total Visits" value={stats.visits} icon={CalendarCheck} color="#3b82f6"
              trend={{ value: 12, up: true }} subtitle={`${completionRate}% completion rate`} />
            <KPICard title="Form Submissions" value={stats.submissions} icon={FileText} color="#22c55e"
              trend={{ value: 8, up: true }} />
            <KPICard title="Active Territories" value={stats.territories} icon={MapPin} color="#8b5cf6" />
            <KPICard title="Active Routes" value={stats.routes} icon={RouteIcon} color="#f59e0b" />
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <KPICard title="Inventory Items" value={stats.inventoryItems} icon={Package} color="#06b6d4" />
            <KPICard title="Team Members" value={stats.members} icon={Users} color="#ec4899" />
            <KPICard title="Visit Completion" value={`${completionRate}%`} icon={TrendingUp} color="#10b981"
              trend={{ value: 5, up: completionRate > 50 }} />
            <KPICard title="Visits (period)" value={visitsTrend.reduce((s, d) => s + d.total, 0)} icon={BarChart2} color="#f97316" />
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            <ChartCard title={`Visit Trend (${range})`}>
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={visitsTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Legend />
                  <Area type="monotone" dataKey="completed" stackId="1" stroke="#22c55e" fill="#bbf7d0" name="Completed" />
                  <Area type="monotone" dataKey="scheduled" stackId="1" stroke="#8b5cf6" fill="#ddd6fe" name="Scheduled" />
                </AreaChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard title="Submissions by Form Template">
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={submissionsByTemplate} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis type="number" tick={{ fontSize: 11 }} />
                  <YAxis dataKey="name" type="category" tick={{ fontSize: 11 }} width={90} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#3b82f6" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard title="Visit Status Distribution">
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={visitsByStatus} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}>
                    {visitsByStatus.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard title="Inventory Health">
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={inventoryHealth} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, value }) => value > 0 ? `${name}: ${value}` : ''}>
                    {inventoryHealth.map((_, i) => <Cell key={i} fill={INVENTORY_COLORS[i]} />)}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>

          {/* Route performance */}
          {routePerformance.length > 0 && (
            <ChartCard title="Route Completion Performance">
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={routePerformance}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} domain={[0, 100]} />
                  <Tooltip formatter={(val) => `${val}%`} />
                  <Bar dataKey="completion" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Completion %" />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
          )}
        </>
      )}
    </div>
  );
}

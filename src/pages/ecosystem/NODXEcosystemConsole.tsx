import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, MapPin, BarChart3, FileText, Eye, Brain, Workflow, Plug, ArrowRight, Activity, Users, Layers, Globe as Globe2, TrendingUp, Shield, Target, Cpu, FolderOpen, ChevronRight, Sparkles, Zap, CheckCircle2, AlertCircle, Clock, Database, Server, Settings, Command } from 'lucide-react';
import { useOrg } from '../../contexts/OrgContext';
import { useAuth } from '../../contexts/AuthContext';

const DOMAINS = [
  {
    key: 'CORE',
    name: 'CORE',
    title: 'Territory Core',
    description: 'Foundation layer for territorial operations. Manages organizations, users, geographic hierarchies, and core data structures.',
    icon: Layers,
    color: '#3b82f6',
    status: 'active',
    modules: ['Organizations', 'Users', 'Geography', 'Security'],
    path: '/territories'
  },
  {
    key: 'PULSE',
    name: 'PULSE',
    title: 'Operational Pulse',
    description: 'Real-time operational monitoring and field execution engine. Tracks visits, routes, and field activities.',
    icon: Activity,
    color: '#22c55e',
    status: 'active',
    modules: ['Visits', 'Routes', 'Field Ops', 'Scheduling'],
    path: '/command-center'
  },
  {
    key: 'HUB',
    name: 'HUB',
    title: 'Data Hub',
    description: 'Central data collection and forms engine. Powers dynamic form creation, submission workflows, and data capture.',
    icon: Database,
    color: '#f59e0b',
    status: 'active',
    modules: ['Forms', 'Submissions', 'Validation', 'Import'],
    path: '/forms'
  },
  {
    key: 'ATLAS',
    name: 'ATLAS',
    title: 'Geospatial Atlas',
    description: 'Geographic intelligence and mapping system. Visualizes territories, boundaries, and spatial relationships.',
    icon: Globe2,
    color: '#8b5cf6',
    status: 'active',
    modules: ['Maps', 'Boundaries', 'Layers', 'GIS'],
    path: '/geospatial'
  },
  {
    key: 'INSIGHT',
    name: 'INSIGHT',
    title: 'Analytics Insight',
    description: 'Business intelligence and analytics dashboard. Aggregates metrics, KPIs, and strategic indicators.',
    icon: BarChart3,
    color: '#06b6d4',
    status: 'active',
    modules: ['Dashboards', 'Reports', 'KPIs', 'Trends'],
    path: '/analytics'
  },
  {
    key: 'AI',
    name: 'AI',
    title: 'AI Engine',
    description: 'Artificial intelligence and machine learning capabilities. Powers predictions, recommendations, and automation.',
    icon: Brain,
    color: '#6366f1',
    status: 'active',
    modules: ['Predictions', 'NLP', 'Automation', 'ML Models'],
    path: '/ai'
  },
  {
    key: 'FLOW',
    name: 'FLOW',
    title: 'Workflow Engine',
    description: 'Process automation and workflow orchestration. Manages approval chains, notifications, and business rules.',
    icon: Workflow,
    color: '#ec4899',
    status: 'active',
    modules: ['Workflows', 'Approvals', 'Rules', 'Triggers'],
    path: '/workflows'
  },
  {
    key: 'CONNECT',
    name: 'CONNECT',
    title: 'Integration Hub',
    description: 'External system integrations and API management. Connects NODX with third-party services and data sources.',
    icon: Plug,
    color: '#14b8a6',
    status: 'active',
    modules: ['APIs', 'Webhooks', 'Sync', 'Exports'],
    path: '/external-integrations'
  }
];

const QUICK_ACTIONS = [
  { label: 'Operate Territory', sublabel: 'Manage field operations', icon: MapPin, path: '/territories', color: '#3b82f6' },
  { label: 'Monitor Operations', sublabel: 'Command center', icon: Command, path: '/command-center', color: '#22c55e' },
  { label: 'Consult Indicators', sublabel: 'View analytics & KPIs', icon: TrendingUp, path: '/analytics', color: '#06b6d4' },
  { label: 'Capture Evidence', sublabel: 'Forms & data collection', icon: FileText, path: '/forms', color: '#f59e0b' },
  { label: 'Manage Ecosystem', sublabel: 'Settings & administration', icon: Settings, path: '/members', color: '#64748b' }
];

const EXECUTIVE_METRICS = [
  { label: 'Organizations', value: 1, icon: Building2, color: '#3b82f6' },
  { label: 'Users', value: 12, icon: Users, color: '#8b5cf6' },
  { label: 'Territories', value: 24, icon: MapPin, color: '#22c55e' },
  { label: 'Forms', value: 18, icon: FileText, color: '#f59e0b' },
  { label: 'Projects', value: 7, icon: FolderOpen, color: '#06b6d4' },
  { label: 'Evidence', value: 156, icon: Eye, color: '#ec4899' },
  { label: 'Visits', value: 342, icon: Target, color: '#14b8a6' },
  { label: 'Routes', value: 48, icon: Activity, color: '#6366f1' }
];

function DomainCard({ domain, onNavigate }: { domain: typeof DOMAINS[0]; onNavigate: (path: string) => void }) {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      className="relative group cursor-pointer"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={() => onNavigate(domain.path)}
    >
      <div className={`absolute inset-0 rounded-2xl transition-all duration-300 ${hovered ? 'opacity-100' : 'opacity-0'}`}
        style={{
          background: `linear-gradient(135deg, ${domain.color}15 0%, ${domain.color}05 100%)`,
          boxShadow: `0 0 40px ${domain.color}20`
        }}
      />
      <div className="relative bg-slate-900/80 border border-slate-700/50 rounded-2xl p-5 backdrop-blur-sm transition-all duration-300 group-hover:border-slate-600">
        <div className="flex items-start justify-between mb-4">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center"
            style={{ backgroundColor: domain.color + '20' }}>
            <domain.icon className="w-6 h-6" style={{ color: domain.color }} />
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: domain.color }} />
            <span className="text-xs font-medium" style={{ color: domain.color }}>ACTIVE</span>
          </div>
        </div>
        <div className="mb-3">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-mono text-slate-500">{domain.key}</span>
          </div>
          <h3 className="text-lg font-semibold text-white">{domain.title}</h3>
        </div>
        <p className="text-sm text-slate-400 leading-relaxed mb-4">{domain.description}</p>
        <div className="flex flex-wrap gap-1.5 mb-4">
          {domain.modules.map(mod => (
            <span key={mod} className="text-xs px-2 py-1 bg-slate-800 rounded-lg text-slate-400">
              {mod}
            </span>
          ))}
        </div>
        <div className="flex items-center justify-between pt-3 border-t border-slate-700/50">
          <span className="text-xs text-slate-500">Click to access</span>
          <ChevronRight className={`w-4 h-4 transition-transform duration-200 ${hovered ? 'translate-x-1' : ''}`}
            style={{ color: domain.color }} />
        </div>
      </div>
    </div>
  );
}

function EcosystemFlowMap() {
  return (
    <div className="bg-slate-900/60 border border-slate-700/50 rounded-2xl p-6 backdrop-blur-sm">
      <div className="flex items-center gap-2 mb-6">
        <Activity className="w-5 h-5 text-blue-400" />
        <h3 className="text-lg font-semibold text-white">Operational Architecture</h3>
        <span className="text-xs text-slate-500 ml-auto">Ecosystem Domains</span>
      </div>

      <div className="relative">
        <div className="flex items-center justify-center gap-2 flex-wrap">
          {DOMAINS.map((domain, index) => (
            <div key={domain.key} className="flex items-center">
              <div className="group relative">
                <div className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                  style={{ boxShadow: `0 0 20px ${domain.color}30` }} />
                <div className="relative w-20 h-20 rounded-xl bg-slate-800/80 border border-slate-700/50 flex flex-col items-center justify-center gap-1 transition-all duration-300 group-hover:border-slate-600 cursor-pointer">
                  <domain.icon className="w-5 h-5" style={{ color: domain.color }} />
                  <span className="text-[10px] font-medium text-slate-400 group-hover:text-white transition-colors">{domain.key}</span>
                </div>
                <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none">
                  <div className="bg-slate-800 border border-slate-700 rounded-lg px-2 py-1 text-[10px] text-slate-300 whitespace-nowrap">
                    {domain.title}
                  </div>
                </div>
              </div>
              {index < DOMAINS.length - 1 && (
                <div className="mx-1 flex items-center">
                  <ChevronRight className="w-4 h-4 text-slate-600" />
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="mt-8 grid grid-cols-3 gap-4 text-center">
          <div className="bg-slate-800/50 rounded-xl p-3 border border-slate-700/30">
            <div className="flex items-center justify-center gap-2 mb-1">
              <Database className="w-4 h-4 text-blue-400" />
              <span className="text-sm font-medium text-white">Data Operations</span>
            </div>
            <p className="text-xs text-slate-400">CORE + HUB manage foundational data</p>
          </div>
          <div className="bg-slate-800/50 rounded-xl p-3 border border-slate-700/30">
            <div className="flex items-center justify-center gap-2 mb-1">
              <Activity className="w-4 h-4 text-green-400" />
              <span className="text-sm font-medium text-white">Field Operations</span>
            </div>
            <p className="text-xs text-slate-400">PULSE + FLOW drive operations</p>
          </div>
          <div className="bg-slate-800/50 rounded-xl p-3 border border-slate-700/30">
            <div className="flex items-center justify-center gap-2 mb-1">
              <Brain className="w-4 h-4 text-indigo-400" />
              <span className="text-sm font-medium text-white">Intelligence Layer</span>
            </div>
            <p className="text-xs text-slate-400">INSIGHT + AI + ATLAS analyze & predict</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function EcosystemStatusCard() {
  return (
    <div className="bg-slate-900/60 border border-slate-700/50 rounded-2xl p-5 backdrop-blur-sm">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Server className="w-4 h-4 text-slate-400" />
          <h3 className="text-sm font-semibold text-white">Ecosystem Status</h3>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-emerald-400">
          <CheckCircle2 className="w-3.5 h-3.5" />
          All Systems Operational
        </div>
      </div>

      <div className="grid grid-cols-4 gap-2">
        {DOMAINS.map(domain => (
          <div key={domain.key} className="group relative">
            <div className="flex items-center gap-2 p-2.5 bg-slate-800/50 rounded-xl border border-slate-700/30 hover:border-slate-600 transition-all cursor-pointer">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{ backgroundColor: domain.color + '15' }}>
                <domain.icon className="w-4 h-4" style={{ color: domain.color }} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-medium text-white truncate">{domain.key}</div>
                <div className="flex items-center gap-1 mt-0.5">
                  <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ backgroundColor: domain.color }} />
                  <span className="text-[10px] text-slate-400">Online</span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function QuickAccessCard({ action, onNavigate }: { action: typeof QUICK_ACTIONS[0]; onNavigate: (path: string) => void }) {
  return (
    <div
      className="group relative cursor-pointer"
      onClick={() => onNavigate(action.path)}
    >
      <div className="flex items-center gap-4 p-4 bg-slate-800/60 border border-slate-700/40 rounded-xl hover:border-slate-600 transition-all duration-200">
        <div className="w-11 h-11 rounded-xl flex items-center justify-center"
          style={{ backgroundColor: action.color + '15' }}>
          <action.icon className="w-5 h-5" style={{ color: action.color }} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium text-white group-hover:text-blue-400 transition-colors">{action.label}</div>
          <div className="text-xs text-slate-400">{action.sublabel}</div>
        </div>
        <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-blue-400 group-hover:translate-x-1 transition-all" />
      </div>
    </div>
  );
}

export function NODXEcosystemConsole() {
  const { org } = useOrg();
  const { profile } = useAuth();
  const navigate = useNavigate();

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      <div className="p-6 lg:p-8 max-w-7xl mx-auto">

        {/* Executive KPI Strip */}
        <div className="mb-6 overflow-x-auto">
          <div className="flex gap-3 min-w-max pb-2">
            {EXECUTIVE_METRICS.map((metric, i) => (
              <div key={i} className="flex items-center gap-3 px-4 py-3 bg-slate-800/40 border border-slate-700/30 rounded-xl">
                <div className="w-9 h-9 rounded-lg flex items-center justify-center"
                  style={{ backgroundColor: metric.color + '15' }}>
                  <metric.icon className="w-4 h-4" style={{ color: metric.color }} />
                </div>
                <div>
                  <div className="text-lg font-bold text-white">{metric.value}</div>
                  <div className="text-xs text-slate-400">{metric.label}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Institutional Welcome */}
        <div className="mb-8">
          <div className="bg-gradient-to-r from-blue-600/10 via-slate-800/60 to-slate-800/40 border border-blue-500/20 rounded-2xl p-6">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
                    <Building2 className="w-7 h-7 text-white" />
                  </div>
                  <div>
                    <div className="text-xs text-slate-400 uppercase tracking-wider">NODX - Centro de Operaciones Territorial</div>
                    <h1 className="text-2xl font-bold text-white">{org?.name ?? 'Organization'}</h1>
                  </div>
                </div>
                <div className="flex items-center gap-4 text-sm text-slate-300">
                  <div className="flex items-center gap-2">
                    <Shield className="w-4 h-4 text-blue-400" />
                    <span>Territorial Operations</span>
                  </div>
                  <div className="w-1 h-1 rounded-full bg-slate-600" />
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span>Ecosystem Deployed</span>
                  </div>
                  <div className="w-1 h-1 rounded-full bg-slate-600" />
                  <div className="flex items-center gap-2">
                    <Globe2 className="w-4 h-4 text-slate-400" />
                    <span>Multi-territory</span>
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-lg text-slate-200">{greeting},</div>
                <div className="text-xl font-semibold text-white">{profile?.full_name ?? 'User'}</div>
                <div className="text-sm text-slate-400 mt-1">{new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Operational Quick Access */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <Command className="w-4 h-4 text-blue-400" />
            <h2 className="text-lg font-semibold text-white">Operational Actions</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
            {QUICK_ACTIONS.map(action => (
              <QuickAccessCard key={action.label} action={action} onNavigate={navigate} />
            ))}
          </div>
        </div>

        {/* Ecosystem Status Card */}
        <div className="mb-8">
          <EcosystemStatusCard />
        </div>

        {/* Ecosystem Flow Map */}
        <div className="mb-8">
          <EcosystemFlowMap />
        </div>

        {/* Domain Center */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Cpu className="w-5 h-5 text-blue-400" />
              <h2 className="text-lg font-semibold text-white">Active Domains</h2>
              <span className="text-xs text-slate-500 ml-2">8 Operational Domains</span>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {DOMAINS.map(domain => (
              <DomainCard key={domain.key} domain={domain} onNavigate={navigate} />
            ))}
          </div>
        </div>

        {/* Footer Info */}
        <div className="mt-8 pt-6 border-t border-slate-800">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <div className="flex items-center gap-4">
              <span>NODX - Centro de Operaciones Territorial v2.0</span>
              <span className="w-1 h-1 rounded-full bg-slate-700" />
              <span>Ecosystem Console</span>
              <span className="w-1 h-1 rounded-full bg-slate-700" />
              <span>Operational Status</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="w-3.5 h-3.5" />
              <span>Last synced: {new Date().toLocaleTimeString()}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

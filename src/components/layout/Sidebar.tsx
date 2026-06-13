import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, MapPin, Route, FileText, Globe, GitBranch,
  BarChart2, Brain, RefreshCw, Lock, Key, Package, CalendarCheck,
  List, Shield, ChevronLeft, ChevronRight, Building2,
  AlertTriangle, Activity, Droplets,
  Map, Languages, Database, BookOpen, FolderKanban, TrendingUp,
  Image, Library, CheckCircle2,
  Search, Radar, Sparkles, TrafficCone, LineChart, BarChart, Bell, FileOutput,
  Command, Wifi, FileKey, Plug, Cpu, Users, Layers, Settings, Monitor,
  Heart, GraduationCap, ShieldCheck, ClipboardList, Target, PieChart,
  Zap, Link2, Box, HardDrive, ScrollText, MapPinned, Gauge
} from 'lucide-react';
import { useModules } from '../../hooks/useModules';
import { useOrg } from '../../contexts/OrgContext';
import { useI18n } from '../../hooks/useI18n';

const DOMAINS = [
  {
    key: 'CORE',
    label: 'CORE',
    items: [
      { key: 'dashboard', icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard', alwaysShow: true },
      { key: 'organizations', icon: Building2, label: 'Organizaciones', path: '/organizations', alwaysShow: true },
      { key: 'sync', icon: HardDrive, label: 'Dispositivos', path: '/sync', alwaysShow: true },
      { key: 'licensing', icon: Key, label: 'Licencias', path: '/licensing', alwaysShow: true },
      { key: 'members', icon: Users, label: 'Usuarios', path: '/members', alwaysShow: true },
      { key: 'audit', icon: ScrollText, label: 'Auditoria', path: '/audit', alwaysShow: true },
    ]
  },
  {
    key: 'PLAIGT',
    label: 'PLAIGT',
    items: [
      { key: 'governance', icon: Building2, label: 'Institucional', path: '/governance' },
      { key: 'wash', icon: Droplets, label: 'WASH', path: '/wash' },
      { key: 'wash_health', icon: Heart, label: 'Salud', path: '/wash' },
      { key: 'taxonomy', icon: GraduationCap, label: 'Educacion', path: '/taxonomy' },
      { key: 'risk', icon: ShieldCheck, label: 'Proteccion', path: '/risk' },
      { key: 'indicators', icon: Target, label: 'M&E', path: '/indicators' },
    ]
  },
  {
    key: 'HUB',
    label: 'HUB',
    items: [
      { key: 'territories', icon: MapPin, label: 'Establecimientos', path: '/territories' },
      { key: 'routes', icon: Route, label: 'Rutas', path: '/routes' },
      { key: 'visits', icon: CalendarCheck, label: 'Visitas', path: '/visits' },
      { key: 'projects', icon: ClipboardList, label: 'Ordenes', path: '/projects' },
      { key: 'inventory', icon: Package, label: 'Inventario', path: '/inventory' },
    ]
  },
  {
    key: 'ATLAS',
    label: 'ATLAS',
    items: [
      { key: 'geospatial', icon: MapPinned, label: 'Territorio', path: '/geospatial' },
      { key: 'geography', icon: Map, label: 'Geografia', path: '/geography' },
      { key: 'atlas', icon: Globe, label: 'Mapas', path: '/atlas' },
      { key: 'field_collection', icon: Gauge, label: 'Cobertura', path: '/field-collection' },
    ]
  },
  {
    key: 'AI',
    label: 'AI',
    items: [
      { key: 'analytics', icon: BarChart2, label: 'Analitica', path: '/analytics' },
      { key: 'tabulation', icon: PieChart, label: 'Clasificacion', path: '/tabulation' },
      { key: 'territorial_indicators', icon: TrendingUp, label: 'KPIs', path: '/territorial-indicators' },
      { key: 'ai', icon: Brain, label: 'Predicciones', path: '/ai' },
    ]
  },
  {
    key: 'FLOW',
    label: 'FLOW',
    items: [
      { key: 'workflows', icon: Zap, label: 'Automatizacion', path: '/workflows' },
      { key: 'approvals', icon: GitBranch, label: 'Procesos', path: '/approvals' },
      { key: 'external_integrations', icon: Link2, label: 'Integraciones', path: '/external-integrations' },
    ]
  }
];

const OPERATIONAL_ITEMS = [
  { key: 'ecosystem', icon: Cpu, label: 'Ecosistema', path: '/ecosystem', alwaysShow: true },
  { key: 'command_center', icon: Command, label: 'Centro de Comando', path: '/command-center', alwaysShow: true },
  { key: 'alerts', icon: Bell, label: 'Alertas', path: '/alerts' },
  { key: 'evidence', icon: Image, label: 'Evidencias', path: '/evidence' },
  { key: 'forms', icon: FileText, label: 'Formularios', path: '/forms' },
  { key: 'knowledge', icon: Library, label: 'Conocimiento', path: '/knowledge' },
  { key: 'search', icon: Search, label: 'Busqueda Global', path: '/search' },
  { key: 'reports', icon: FileText, label: 'Reportes', path: '/reports' },
  { key: 'export', icon: FileOutput, label: 'Exportar', path: '/export' },
  { key: 'offline', icon: Wifi, label: 'Offline', path: '/offline' },
  { key: 'security', icon: Shield, label: 'Seguridad', path: '/security' },
];

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

export function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const { isActive } = useModules();
  const { org } = useOrg();
  const { lang } = useI18n();
  const location = useLocation();
  const [expandedDomains, setExpandedDomains] = React.useState<string[]>(['CORE', 'PLAIGT', 'HUB', 'ATLAS', 'AI', 'FLOW']);

  const toggleDomain = (key: string) => {
    setExpandedDomains(prev =>
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    );
  };

  const renderNavItems = (items: typeof OPERATIONAL_ITEMS) => {
    return items.map(item => {
      if (!item.alwaysShow && !isActive(item.key)) return null;
      const active = location.pathname === item.path || location.pathname.startsWith(item.path + '/');
      return (
        <NavLink
          key={item.key}
          to={item.path}
          title={collapsed ? item.label : undefined}
          className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-150 ${
            active
              ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/30'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
          } ${collapsed ? 'justify-center' : ''}`}
        >
          <item.icon className="w-4 h-4 flex-shrink-0" />
          {!collapsed && <span className="truncate">{item.label}</span>}
        </NavLink>
      );
    });
  };

  return (
    <aside
      className={`fixed left-0 top-0 h-full bg-slate-950 flex flex-col transition-all duration-300 z-30 border-r border-slate-800 ${
        collapsed ? 'w-16' : 'w-64'
      }`}
    >
      {/* Logo */}
      <div className={`flex items-center h-14 px-3 border-b border-slate-800 flex-shrink-0 ${collapsed ? 'justify-center' : 'gap-3'}`}>
        <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center flex-shrink-0 shadow-lg shadow-blue-900/20">
          <Building2 className="w-4 h-4 text-white" />
        </div>
        {!collapsed && (
          <div className="overflow-hidden">
            <div className="text-white font-bold text-sm leading-none">NODX</div>
            <div className="text-slate-500 text-[10px] mt-0.5 truncate">Centro de Operaciones</div>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 py-3 overflow-y-auto overflow-x-hidden scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent">
        {/* Quick Operations */}
        <div className="px-2 space-y-0.5">
          {!collapsed && (
            <div className="px-3 py-1.5 text-[10px] font-semibold text-slate-600 uppercase tracking-wider">
              {lang === 'es' ? 'Operaciones' : 'Operations'}
            </div>
          )}
          {renderNavItems(OPERATIONAL_ITEMS)}
        </div>

        {/* Domain Sections */}
        {DOMAINS.map(domain => {
          const hasVisibleItems = domain.items.some(item => item.alwaysShow || isActive(item.key));
          if (!hasVisibleItems) return null;

          const isExpanded = expandedDomains.includes(domain.key);

          return (
            <div key={domain.key} className="mt-2">
              {!collapsed && (
                <button
                  onClick={() => toggleDomain(domain.key)}
                  className="w-full flex items-center justify-between px-3 py-1.5 text-[10px] font-semibold text-slate-500 uppercase tracking-wider hover:text-slate-400 transition-colors"
                >
                  <span>{domain.label}</span>
                  <ChevronRight className={`w-3 h-3 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                </button>
              )}
              {(isExpanded || collapsed) && (
                <div className="px-2 space-y-0.5">
                  {collapsed && (
                    <div className="px-3 py-1 text-[9px] font-bold text-slate-600 text-center">
                      {domain.key}
                    </div>
                  )}
                  {domain.items.map(item => {
                    if (!item.alwaysShow && !isActive(item.key)) return null;
                    const active = location.pathname === item.path || location.pathname.startsWith(item.path + '/');
                    return (
                      <NavLink
                        key={item.key}
                        to={item.path}
                        title={collapsed ? `${domain.key} - ${item.label}` : undefined}
                        className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-150 ${
                          active
                            ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/30'
                            : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                        } ${collapsed ? 'justify-center' : ''}`}
                      >
                        <item.icon className="w-4 h-4 flex-shrink-0" />
                        {!collapsed && <span className="truncate">{item.label}</span>}
                      </NavLink>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      {/* Collapse toggle */}
      <div className="p-2 border-t border-slate-800">
        <button
          onClick={onToggle}
          className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-slate-500 hover:text-white hover:bg-slate-800/50 transition-all text-sm ${
            collapsed ? 'justify-center' : ''
          }`}
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : (
            <>
              <ChevronLeft className="w-4 h-4" />
              <span>Colapsar</span>
            </>
          )}
        </button>
      </div>
    </aside>
  );
}

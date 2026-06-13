import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, Layers, Activity, Database, Globe as Globe2, BarChart3, Brain, Workflow, Plug, ArrowRight, ChevronRight, Zap, Server, Cpu, ArrowDownRight, ArrowDownLeft, ArrowUpRight, ArrowUpLeft, RotateCcw, GitBranch, MessageSquare, CheckCircle2 } from 'lucide-react';

const ECOSYSTEM_DOMAINS = [
  {
    key: 'CORE',
    name: 'Territory Core',
    icon: Layers,
    color: '#3b82f6',
    position: { top: '30%', left: '10%' },
    desc: 'Fundación del ecosistema. Gestiona organizaciones, usuarios, geografía y seguridad.',
    inputs: ['Organizaciones', 'Usuarios', 'Geografía'],
    outputs: ['Permisos', 'Contexto', 'Identidad'],
    flow: 'Proporciona el contexto organizacional y de identidad para todos los demás dominios.'
  },
  {
    key: 'PULSE',
    name: 'Operational Pulse',
    icon: Activity,
    color: '#22c55e',
    position: { top: '55%', left: '25%' },
    desc: 'Motor de ejecución. Gestiona visitas, rutas y actividades de campo en tiempo real.',
    inputs: ['Rutas', 'Schedules', 'Visitas'],
    outputs: ['Ejecución', 'Tracking', 'Alertas'],
    flow: 'Ejecuta las operaciones de campo basándose en datos de CORE y HUB.'
  },
  {
    key: 'HUB',
    name: 'Data Hub',
    icon: Database,
    color: '#f59e0b',
    position: { top: '30%', left: '40%' },
    desc: 'Centro de captura. Recopila formularios, validaciones y datos estructurados.',
    inputs: ['Formularios', 'Validaciones', 'Importaciones'],
    outputs: ['Datos limpios', 'Esquemas', ' quality'],
    flow: 'Transforma datos en bruto en información estructurada para INSIGHT y AI.'
  },
  {
    key: 'ATLAS',
    name: 'Geospatial Atlas',
    icon: Globe2,
    color: '#8b5cf6',
    position: { top: '55%', left: '55%' },
    desc: 'Inteligencia geográfica. Visualiza territorios, límites y relaciones espaciales.',
    inputs: ['Coordenadas', 'Polígonos', 'Capas'],
    outputs: ['Mapas', 'Análisis espacial', 'Geovisualización'],
    flow: 'Proporciona contexto geográfico a CORE, PULSE y INSIGHT.'
  },
  {
    key: 'INSIGHT',
    name: 'Analytics Insight',
    icon: BarChart3,
    color: '#06b6d4',
    position: { top: '30%', left: '70%' },
    desc: 'Inteligencia analítica. Agrega métricas, KPIs e indicadores estratégicos.',
    inputs: ['Métricas', 'KPIs', 'Tendencias'],
    outputs: ['Dashboards', 'Reportes', 'Alertas'],
    flow: 'Consolida información de HUB, PULSE y ATLAS para análisis.'
  },
  {
    key: 'AI',
    name: 'AI Engine',
    icon: Brain,
    color: '#6366f1',
    position: { top: '55%', left: '70%' },
    desc: 'Inteligencia artificial. Predicciones, recomendaciones y automatización.',
    inputs: ['Datos históricos', 'Patrones', 'Objetivos'],
    outputs: ['Predicciones', 'Optimizaciones', 'Insights'],
    flow: 'Procesa información de INSIGHT y HUB para generar valor predictivo.'
  },
  {
    key: 'FLOW',
    name: 'Workflow Engine',
    icon: Workflow,
    color: '#ec4899',
    position: { top: '75%', left: '40%' },
    desc: 'Orquestación de procesos. Gestiona flujos, aprobaciones y reglas de negocio.',
    inputs: ['Triggers', 'Reglas', 'Eventos'],
    outputs: ['Automatizaciones', 'Aprobaciones', 'Notificaciones'],
    flow: 'Coordina procesos entre PULSE, HUB y CONNECT.'
  },
  {
    key: 'CONNECT',
    name: 'Integration Hub',
    icon: Plug,
    color: '#14b8a6',
    position: { top: '30%', left: '90%' },
    desc: 'Hub de integración. Conecta con sistemas externos, APIs y webhooks.',
    inputs: ['APIs', 'Webhooks', 'Sincronizaciones'],
    outputs: ['Exportaciones', 'Integraciones', 'Sincronía'],
    flow: 'Permite que el ecosistema se comunique con el mundo exterior.'
  }
];

const FLOWS = [
  { from: 'CORE', to: 'PULSE', label: 'Contexto organizacional' },
  { from: 'CORE', to: 'HUB', label: 'Esquemas de datos' },
  { from: 'PULSE', to: 'HUB', label: 'Datos de campo' },
  { from: 'HUB', to: 'INSIGHT', label: 'Datos procesados' },
  { from: 'ATLAS', to: 'CORE', label: 'Contexto geográfico' },
  { from: 'ATLAS', to: 'INSIGHT', label: 'Análisis espacial' },
  { from: 'INSIGHT', to: 'AI', label: 'Métricas históricas' },
  { from: 'AI', to: 'FLOW', label: 'Optimizaciones' },
  { from: 'FLOW', to: 'PULSE', label: 'Instrucciones' },
  { from: 'CONNECT', to: 'HUB', label: 'Datos externos' },
  { from: 'INSIGHT', to: 'CONNECT', label: 'Exportaciones' }
];

const LAYERS = [
  {
    name: 'Data Layer',
    color: '#3b82f6',
    domains: ['CORE', 'HUB', 'ATLAS'],
    desc: 'Gestión y almacenamiento de datos fundamentales'
  },
  {
    name: 'Execution Layer',
    color: '#22c55e',
    domains: ['PULSE', 'FLOW'],
    desc: 'Ejecución y orquestación de operaciones'
  },
  {
    name: 'Intelligence Layer',
    color: '#6366f1',
    domains: ['INSIGHT', 'AI'],
    desc: 'Análisis, predicción y generación de insights'
  },
  {
    name: 'Integration Layer',
    color: '#14b8a6',
    domains: ['CONNECT'],
    desc: 'Conexión con sistemas externos'
  }
];

export function EcosystemMapPage() {
  const navigate = useNavigate();
  const [selectedDomain, setSelectedDomain] = useState<string | null>(null);
  const [activeLayer, setActiveLayer] = useState<string | null>(null);

  const selected = ECOSYSTEM_DOMAINS.find(d => d.key === selectedDomain);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      {/* Header */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-slate-950/80 backdrop-blur-xl border-b border-slate-800/50">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <button onClick={() => navigate('/')} className="flex items-center gap-3">
              <div className="w-9 h-9 bg-blue-500 rounded-lg flex items-center justify-center">
                <Building2 size={20} className="text-white" />
              </div>
              <span className="text-white font-bold text-lg">NODX</span>
            </button>
            <div className="flex items-center gap-4">
              <button onClick={() => navigate('/ecosystem')} className="text-slate-400 hover:text-white text-sm">
                Ecosystem Console
              </button>
              <button onClick={() => navigate('/')} className="text-slate-400 hover:text-white text-sm">
                Inicio
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-24 pb-8 px-6">
        <div className="max-w-7xl mx-auto text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Zap size={20} className="text-blue-400" />
            <span className="text-sm text-blue-400 font-semibold uppercase tracking-wider">Arquitectura del Ecosistema</span>
          </div>
          <h1 className="text-4xl lg:text-5xl font-bold text-white mb-4">Cómo Funciona NODX</h1>
          <p className="text-lg text-slate-400 max-w-2xl mx-auto">
            Visualización interactiva del flujo de datos y decisiones a través de los 8 dominios del ecosistema
          </p>
        </div>
      </section>

      {/* Layers Filter */}
      <section className="py-6 px-6 border-y border-slate-800/50">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center gap-4 overflow-x-auto pb-2">
            <span className="text-sm text-slate-500 flex-shrink-0">Capas:</span>
            {LAYERS.map(layer => (
              <button
                key={layer.name}
                onClick={() => setActiveLayer(activeLayer === layer.name ? null : layer.name)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  activeLayer === layer.name
                    ? 'bg-slate-700 text-white border border-slate-600'
                    : 'bg-slate-800/40 text-slate-400 border border-slate-700/30 hover:border-slate-600'
                }`}
              >
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: layer.color }} />
                {layer.name}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Main Map */}
      <section className="relative px-6 py-12">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-3 gap-8">
            {/* Left Panel - Domain List */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4">Dominios</h3>
              {ECOSYSTEM_DOMAINS.map(domain => (
                <button
                  key={domain.key}
                  onClick={() => setSelectedDomain(domain.key)}
                  className={`w-full text-left p-4 rounded-xl transition-all ${
                    selectedDomain === domain.key
                      ? 'bg-slate-800/80 border border-slate-600'
                      : 'bg-slate-800/40 border border-slate-700/30 hover:border-slate-600'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center"
                      style={{ backgroundColor: domain.color + '20' }}>
                      <domain.icon size={20} style={{ color: domain.color }} />
                    </div>
                    <div className="flex-1">
                      <div className="text-xs font-mono" style={{ color: domain.color }}>{domain.key}</div>
                      <div className="text-white font-medium">{domain.name}</div>
                    </div>
                    <ChevronRight size={16} className="text-slate-500" />
                  </div>
                </button>
              ))}
            </div>

            {/* Center - Interactive Map */}
            <div className="lg:col-span-2">
              <div className="relative bg-slate-800/20 border border-slate-700/30 rounded-2xl p-8 min-h-[500px]">
                {/* Domain Nodes */}
                {ECOSYSTEM_DOMAINS
                  .filter(d => !activeLayer || LAYERS.find(l => l.name === activeLayer)?.domains.includes(d.key))
                  .map(domain => (
                  <div
                    key={domain.key}
                    onClick={() => setSelectedDomain(domain.key)}
                    className={`absolute group cursor-pointer transition-all duration-300 ${
                      selectedDomain === domain.key ? 'z-20' : 'z-10'
                    }`}
                    style={{ top: domain.position.top, left: domain.position.left }}
                  >
                    <div className={`relative p-4 rounded-xl transition-all ${
                      selectedDomain === domain.key
                        ? 'bg-slate-800 border-2 shadow-xl'
                        : 'bg-slate-800/60 border border-slate-700/50 hover:border-slate-500'
                    }`}
                    style={selectedDomain === domain.key ? { borderColor: domain.color, boxShadow: `0 0 30px ${domain.color}30` } : {}}
                    >
                      <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-2 mx-auto"
                        style={{ backgroundColor: domain.color + '20' }}>
                        <domain.icon size={24} style={{ color: domain.color }} />
                      </div>
                      <div className="text-center">
                        <div className="text-xs font-mono mb-1" style={{ color: domain.color }}>{domain.key}</div>
                      </div>

                      {/* Pulse indicator */}
                      <div className="absolute -top-1 -right-1 w-3 h-3 rounded-full animate-ping"
                        style={{ backgroundColor: domain.color, opacity: 0.5 }} />
                      <div className="absolute -top-1 -right-1 w-3 h-3 rounded-full"
                        style={{ backgroundColor: domain.color }} />
                    </div>
                  </div>
                ))}

                {/* Connection Lines */}
                <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ opacity: 0.3 }}>
                  {FLOWS.map((flow, i) => {
                    const fromDomain = ECOSYSTEM_DOMAINS.find(d => d.key === flow.from);
                    const toDomain = ECOSYSTEM_DOMAINS.find(d => d.key === flow.to);
                    if (!fromDomain || !toDomain) return null;
                    if (activeLayer) {
                      const fromLayer = LAYERS.find(l => l.domains.includes(flow.from));
                      const toLayer = LAYERS.find(l => l.domains.includes(flow.to));
                      if (activeLayer !== fromLayer?.name && activeLayer !== toLayer?.name) return null;
                    }
                    return (
                      <line
                        key={i}
                        x1={fromDomain.position.left}
                        y1={fromDomain.position.top}
                        x2={toDomain.position.left}
                        y2={toDomain.position.top}
                        stroke="#64748b"
                        strokeWidth="1"
                        strokeDasharray="4 4"
                      />
                    );
                  })}
                </svg>

                {/* Legend */}
                <div className="absolute bottom-4 left-4 bg-slate-900/80 rounded-lg p-3 text-xs text-slate-400">
                  <div className="flex items-center gap-4">
                    <span>Click en dominio para detalles</span>
                    <span className="w-8 h-px border-t border-dashed border-slate-600" />
                    <span>Flujo de datos</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Selected Domain Detail */}
          {selected && (
            <div className="mt-8 p-6 bg-slate-800/40 border border-slate-700/30 rounded-2xl"
              style={{ borderColor: selected.color + '40' }}>
              <div className="grid md:grid-cols-2 gap-8">
                <div>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-14 h-14 rounded-xl flex items-center justify-center"
                      style={{ backgroundColor: selected.color + '20' }}>
                      <selected.icon size={28} style={{ color: selected.color }} />
                    </div>
                    <div>
                      <div className="text-sm font-mono" style={{ color: selected.color }}>{selected.key}</div>
                      <h3 className="text-xl font-bold text-white">{selected.name}</h3>
                    </div>
                  </div>
                  <p className="text-slate-300 mb-4">{selected.desc}</p>
                  <p className="text-sm text-slate-400">{selected.flow}</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-slate-900/50 rounded-xl">
                    <div className="text-xs text-slate-500 uppercase tracking-wider mb-3">Entradas</div>
                    <div className="space-y-2">
                      {selected.inputs.map((input, i) => (
                        <div key={i} className="flex items-center gap-2 text-sm text-slate-300">
                          <ArrowDownRight size={14} style={{ color: selected.color }} />
                          {input}
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="p-4 bg-slate-900/50 rounded-xl">
                    <div className="text-xs text-slate-500 uppercase tracking-wider mb-3">Salidas</div>
                    <div className="space-y-2">
                      {selected.outputs.map((output, i) => (
                        <div key={i} className="flex items-center gap-2 text-sm text-slate-300">
                          <ArrowUpRight size={14} style={{ color: selected.color }} />
                          {output}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Layers Explanation */}
      <section className="py-16 px-6 border-t border-slate-800">
        <div className="max-w-7xl mx-auto">
          <h3 className="text-2xl font-bold text-white mb-8 text-center">Arquitectura en Capas</h3>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {LAYERS.map((layer, i) => (
              <div key={layer.name} className="p-6 bg-slate-800/40 border border-slate-700/30 rounded-xl">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center"
                    style={{ backgroundColor: layer.color + '20' }}>
                    <Server size={20} style={{ color: layer.color }} />
                  </div>
                  <div className="text-white font-semibold">{layer.name}</div>
                </div>
                <p className="text-sm text-slate-400 mb-4">{layer.desc}</p>
                <div className="flex flex-wrap gap-2">
                  {layer.domains.map(d => (
                    <span key={d} className="text-xs px-2 py-1 bg-slate-700/50 rounded text-slate-300">{d}</span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Data Transformation */}
      <section className="py-16 px-6 bg-slate-900/30">
        <div className="max-w-7xl mx-auto text-center">
          <h3 className="text-2xl font-bold text-white mb-4">De Datos a Decisiones</h3>
          <p className="text-lg text-slate-400 mb-12 max-w-2xl mx-auto">
            Cómo la información fluye y se transforma a través del ecosistema NODX
          </p>

          <div className="flex items-center justify-center gap-4 flex-wrap">
            {['Captura', 'Procesamiento', 'Análisis', 'Decisión', 'Acción'].map((step, i) => (
              <div key={step} className="flex items-center gap-4">
                <div className="p-4 bg-slate-800/50 border border-slate-700/30 rounded-xl">
                  <div className="text-xs text-slate-500 mb-1">Paso {i + 1}</div>
                  <div className="text-white font-semibold">{step}</div>
                </div>
                {i < 4 && <ArrowRight size={20} className="text-slate-600" />}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <h3 className="text-3xl font-bold text-white mb-4">Explore el Ecosistema</h3>
          <p className="text-lg text-slate-400 mb-8">
            Acceda a la consola del ecosistema para ver el estado real de cada dominio
          </p>
          <button
            onClick={() => navigate('/ecosystem')}
            className="inline-flex items-center gap-2 px-8 py-4 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl transition-colors"
          >
            Ir a Ecosystem Console <ArrowRight size={18} />
          </button>
        </div>
      </section>
    </div>
  );
}

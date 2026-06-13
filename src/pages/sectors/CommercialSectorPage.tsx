import { useNavigate } from 'react-router-dom';
import { Building2, Briefcase, MapPin, BarChart3, Activity, CheckCircle2, ArrowRight, TrendingUp, Globe as Globe2, Workflow, Database, Shield, Target, PieChart, LineChart, DollarSign } from 'lucide-react';

const MODULES = [
  { key: 'CORE', name: 'Territory Core', desc: 'Gestión de clientes, rutas y zonas comerciales' },
  { key: 'PULSE', name: 'Operational Pulse', desc: 'Seguimiento de visitas, pedidos y cumplimiento de rutas' },
  { key: 'HUB', name: 'Data Hub', desc: 'Captura de encuestas, precios y competencia' },
  { key: 'INSIGHT', name: 'Analytics Insight', desc: 'Indicadores de venta y rentabilidad por zona' }
];

const IMPACT_METRICS = [
  { value: '+25%', label: 'Incremento en visitas efectivas' },
  { value: '+18%', label: 'Aumento en ventas por ruta' },
  { value: '-35%', label: 'Reducción en costos operativos' },
  { value: '88%', label: 'Cumplimiento de cobertura' }
];

const USE_CASES = [
  { title: 'Optimización de Rutas', desc: 'Planificación y seguimiento de visitación comercial' },
  { title: 'Fuerza de Ventas', desc: 'Gestión de promotores y representantes en campo' },
  { title: 'Inteligencia de Mercado', desc: 'Levantamiento de precios y competencia' },
  { title: 'Cumplimiento Comercial', desc: 'KPIs de cobertura, frecuencia y venta' }
];

export function CommercialSectorPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-amber-950">
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
            <button onClick={() => navigate('/')} className="text-slate-400 hover:text-white text-sm">
              Volver al inicio
            </button>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-32 pb-20 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-14 h-14 bg-amber-500/20 rounded-2xl flex items-center justify-center">
              <Briefcase size={28} className="text-amber-400" />
            </div>
            <div>
              <div className="text-xs text-amber-400 font-semibold uppercase tracking-wider">Vertical Estratégica</div>
              <h1 className="text-3xl font-bold text-white">Empresas Comerciales</h1>
            </div>
          </div>

          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-4xl lg:text-5xl font-bold text-white leading-tight mb-6">
                Gestión Comercial con Visibilidad Territorial
              </h2>
              <p className="text-lg text-slate-300 mb-8">
                NODX potencia las operaciones comerciales con seguimiento de rutas, gestión de fuerza de ventas,
                e inteligencia de mercado para optimizar cobertura y rentabilidad territorial.
              </p>
              <div className="flex flex-wrap gap-4">
                <button onClick={() => navigate('/#contact')} className="flex items-center gap-2 px-6 py-3 bg-amber-600 hover:bg-amber-500 text-white font-semibold rounded-xl transition-colors">
                  Contactar con NODX <ArrowRight size={18} />
                </button>
                <button onClick={() => navigate('/login')} className="flex items-center gap-2 px-6 py-3 bg-white/10 hover:bg-white/15 text-white font-semibold rounded-xl border border-white/20 transition-colors">
                  Acceder a Plataforma
                </button>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {MODULES.map(mod => (
                <div key={mod.key} className="p-5 bg-slate-800/40 border border-slate-700/30 rounded-xl">
                  <div className="text-xs text-amber-400 font-mono mb-2">{mod.key}</div>
                  <div className="text-white font-semibold mb-1">{mod.name}</div>
                  <div className="text-sm text-slate-400">{mod.desc}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Problemática */}
      <section className="py-20 bg-slate-900/50">
        <div className="max-w-7xl mx-auto px-6">
          <h3 className="text-2xl font-bold text-white mb-8">Problemática que Resuelve</h3>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              'Falta de visibilidad sobre el equipo de ventas en campo',
              'Dificultad para optimizar rutas de visitación',
              'Información tardía sobre pedidos y cumplimiento',
              'Procesos manuales en levantamiento de competencia',
              'Carencia de indicadores de rendimiento en tiempo real',
              'Ineficiencia en la planificación territorial'
            ].map((problem, i) => (
              <div key={i} className="flex items-start gap-3 p-4 bg-slate-800/30 border border-slate-700/20 rounded-xl">
                <div className="w-6 h-6 rounded-full bg-red-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-xs text-red-400">{i + 1}</span>
                </div>
                <span className="text-slate-300">{problem}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Impact Metrics */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-6">
          <h3 className="text-2xl font-bold text-white mb-8 text-center">Indicadores de Impacto</h3>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
            {IMPACT_METRICS.map((metric, i) => (
              <div key={i} className="text-center p-6 bg-slate-800/40 border border-slate-700/30 rounded-xl">
                <div className="text-4xl font-bold text-amber-400 mb-2">{metric.value}</div>
                <div className="text-slate-400">{metric.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Use Cases */}
      <section className="py-20 bg-slate-900/50">
        <div className="max-w-7xl mx-auto px-6">
          <h3 className="text-2xl font-bold text-white mb-8">Casos de Uso</h3>
          <div className="grid md:grid-cols-2 gap-6">
            {USE_CASES.map((uc, i) => (
              <div key={i} className="p-6 bg-gradient-to-br from-slate-800/60 to-slate-800/30 border border-slate-700/30 rounded-xl">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-amber-500/20 flex items-center justify-center flex-shrink-0">
                    <Target size={24} className="text-amber-400" />
                  </div>
                  <div>
                    <div className="text-white font-semibold text-lg mb-2">{uc.title}</div>
                    <div className="text-slate-400">{uc.desc}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20">
        <div className="max-w-3xl mx-auto px-6 text-center">
          <h3 className="text-3xl font-bold text-white mb-4">Implementación para Empresas</h3>
          <p className="text-lg text-slate-400 mb-8">
            Contacte con NODX para iniciar el proceso de diagnóstico e implementación territorial
          </p>
          <button onClick={() => navigate('/#contact')} className="inline-flex items-center gap-2 px-8 py-4 bg-amber-600 hover:bg-amber-500 text-white font-semibold rounded-xl transition-colors">
            Contactar con NODX <ArrowRight size={18} />
          </button>
        </div>
      </section>
    </div>
  );
}

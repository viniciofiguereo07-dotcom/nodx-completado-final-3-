import { useNavigate } from 'react-router-dom';
import { Building2, Shield, Lock, Cpu, Globe, ArrowRight, CheckCircle2 } from 'lucide-react';
import { useI18n, LANGUAGES, setLanguage } from '../../hooks/useI18n';
import type { SupportedLanguage } from '../../types';
import { useState } from 'react';

const UI: Record<SupportedLanguage, {
  hero: { title: string; subtitle: string };
  systemStatus: { title: string; active: string };
  access: { title: string; subtitle: string; login: string; note: string };
  process: { title: string; steps: string[] };
}> = {
  es: {
    hero: {
      title: 'Centro de Operaciones Territoriales',
      subtitle: 'NODX - Ecosistema Operativo de Inteligencia Territorial'
    },
    systemStatus: {
      title: 'Estado del Sistema',
      active: 'Operativo'
    },
    access: {
      title: 'Acceso al Ecosistema',
      subtitle: 'El acceso es exclusivo para organizaciones con implementacion activa.',
      login: 'Iniciar Sesion',
      note: 'El acceso requiere implementacion institucional previa autorizada por NODX.'
    },
    process: {
      title: 'Ciclo de Implementacion',
      steps: ['Diagnostico institucional', 'Diseno de arquitectura', 'Configuracion del ecosistema', 'Activacion de dominios', 'Asignacion de dispositivos', 'Despliegue territorial', 'Operacion supervisada']
    }
  },
  en: {
    hero: {
      title: 'Territorial Operations Center',
      subtitle: 'NODX - Territorial Intelligence Operational Ecosystem'
    },
    systemStatus: {
      title: 'System Status',
      active: 'Operational'
    },
    access: {
      title: 'Ecosystem Access',
      subtitle: 'Access is exclusive to organizations with active implementation.',
      login: 'Log In',
      note: 'Access requires prior institutional implementation authorized by NODX.'
    },
    process: {
      title: 'Implementation Cycle',
      steps: ['Institutional diagnosis', 'Architecture design', 'Ecosystem configuration', 'Domain activation', 'Device assignment', 'Territorial deployment', 'Supervised operation']
    }
  },
  fr: {
    hero: { title: 'Centre des Operations Territoriales', subtitle: 'NODX - Ecosysteme Operationnel d\'Intelligence Territoriale' },
    systemStatus: { title: 'Etat du Systeme', active: 'Operationnel' },
    access: { title: 'Acces a l\'Ecosysteme', subtitle: 'L\'acces est exclusif aux organisations avec implementation active.', login: 'Connexion', note: 'L\'acces necessite une implementation institutionnelle prealable autorisee par NODX.' },
    process: { title: 'Cycle d\'Implementation', steps: ['Diagnostic institutionnel', 'Conception d\'architecture', 'Configuration de l\'ecosysteme', 'Activation des domaines', 'Attribution des appareils', 'Deploiement territorial', 'Operation supervisee'] }
  },
  de: {
    hero: { title: 'Territoriales Operationszentrum', subtitle: 'NODX - Operationelles Okosystem fur Territoriale Intelligenz' },
    systemStatus: { title: 'Systemstatus', active: 'Operationell' },
    access: { title: 'Okosystem-Zugang', subtitle: 'Der Zugang ist Organisationen mit aktiver Implementierung vorbehalten.', login: 'Anmelden', note: 'Der Zugang erfordert eine vorherige institutionelle Implementierung, die von NODX autorisiert wurde.' },
    process: { title: 'Implementierungszyklus', steps: ['Institutionelle Diagnose', 'Architekturkonzeption', 'Okosystem-Konfiguration', 'Domain-Aktivierung', 'Geratezuweisung', 'Territoriale Bereitstellung', 'Uberwachte Operation'] }
  },
  pt: {
    hero: { title: 'Centro de Operacoes Territoriais', subtitle: 'NODX - Ecossistema Operacional de Inteligencia Territorial' },
    systemStatus: { title: 'Estado do Sistema', active: 'Operacional' },
    access: { title: 'Acesso ao Ecossistema', subtitle: 'O acesso e exclusivo para organizacoes com implementacao ativa.', login: 'Iniciar Sessao', note: 'O acesso requer implementacao institucional previa autorizada pela NODX.' },
    process: { title: 'Ciclo de Implementacao', steps: ['Diagnostico institucional', 'Desenho de arquitetura', 'Configuracao do ecossistema', 'Ativacao de dominios', 'Atribuicao de dispositivos', 'Implantacao territorial', 'Operacao supervisionada'] }
  },
  zh: {
    hero: { title: '领地运营中心', subtitle: 'NODX - 领地智能运营生态系统' },
    systemStatus: { title: '系统状态', active: '运行中' },
    access: { title: '生态系统访问', subtitle: '访问权限仅限于有活跃实施的組织。', login: '登录', note: '访问需要经NODX授权的先前机构实施。' },
    process: { title: '实施周期', steps: ['机构诊断', '架构设计', '生态系统配置', '域激活', '设备分配', '领地部署', '监督运营'] }
  },
  ja: {
    hero: { title: '领地运营中心', subtitle: 'NODX - 领地智能运营生态系统' },
    systemStatus: { title: 'システム状態', active: '運用中' },
    access: { title: 'エコシステムアクセス', subtitle: 'アクセスはアクティブな実装を持つ組織専用です。', login: 'ログイン', note: 'アクセスにはNODXが承認した事前の機関実装が必要です。' },
    process: { title: '実装サイクル', steps: ['機関診断', 'アーキテクチャ設計', 'エコシステム設定', 'ドメイン有効化', 'デバイス割り当て', '領域デプロイ', '監視運用'] }
  }
};

function LanguageSwitcher({ lang, onChange }: { lang: SupportedLanguage; onChange: (l: SupportedLanguage) => void }) {
  const [open, setOpen] = useState(false);
  const current = LANGUAGES.find(l => l.code === lang) ?? LANGUAGES[0];

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-800/50 hover:bg-slate-700/50 text-slate-400 hover:text-white text-sm transition-colors border border-slate-700/50"
      >
        <Globe size={14} />
        <span>{current.code.toUpperCase()}</span>
      </button>
      {open && (
        <div className="absolute right-0 bottom-full mb-2 w-48 bg-slate-800 rounded-xl shadow-2xl z-50 overflow-hidden border border-slate-700">
          {LANGUAGES.map(language => (
            <button
              key={language.code}
              onClick={() => { onChange(language.code as SupportedLanguage); setOpen(false); }}
              className="w-full flex items-center gap-2 px-3 py-2.5 text-sm hover:bg-slate-700 transition-colors text-slate-300 hover:text-white"
            >
              <span className="font-mono text-xs text-slate-500">{language.code.toUpperCase()}</span>
              <span>{language.nativeLabel}</span>
              {lang === language.code && <CheckCircle2 size={14} className="ml-auto text-blue-400" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function NODXLandingPage() {
  const navigate = useNavigate();
  const { lang: currentLang } = useI18n();
  const [lang, setLang] = useState<SupportedLanguage>(currentLang);

  const handleLangChange = (l: SupportedLanguage) => {
    setLang(l);
    setLanguage(l);
  };

  const t = UI[lang];

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col">
      {/* Header */}
      <header className="h-14 border-b border-slate-800 flex items-center justify-between px-6 bg-slate-900/50">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center shadow-lg shadow-blue-900/20">
            <Building2 size={18} className="text-white" />
          </div>
          <span className="text-white font-bold tracking-wide">NODX</span>
          <span className="text-slate-600 text-xs hidden sm:block">| Territorial Operations</span>
        </div>
        <div className="flex items-center gap-4">
          <LanguageSwitcher lang={lang} onChange={handleLangChange} />
          <button
            onClick={() => navigate('/login')}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold rounded-lg transition-colors"
          >
            <Lock size={14} />
            {t.access.login}
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center p-6">
        <div className="max-w-4xl w-full">
          {/* System Status Banner */}
          <div className="mb-8 p-4 bg-slate-900/50 border border-slate-800 rounded-xl flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Cpu size={20} className="text-blue-400" />
              <span className="text-slate-400 text-sm">{t.systemStatus.title}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-emerald-400 text-sm font-medium">{t.systemStatus.active}</span>
            </div>
          </div>

          {/* Hero Section */}
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-500/10 border border-blue-500/20 rounded-full text-blue-400 text-sm font-medium mb-6">
              <Shield size={14} />
              <span>{lang === 'es' ? 'Ecosistema Operado por NODX' : 'Ecosystem Operated by NODX'}</span>
            </div>
            <h1 className="text-4xl sm:text-5xl font-bold text-white leading-tight mb-4">
              {t.hero.title}
            </h1>
            <p className="text-lg text-slate-400">
              {t.hero.subtitle}
            </p>
          </div>

          {/* Access Card */}
          <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-8">
            <div className="flex items-start gap-6">
              <div className="w-16 h-16 rounded-xl bg-blue-500/20 flex items-center justify-center flex-shrink-0">
                <Lock size={28} className="text-blue-400" />
              </div>
              <div className="flex-1">
                <h2 className="text-xl font-bold text-white mb-2">{t.access.title}</h2>
                <p className="text-slate-400 mb-6">{t.access.subtitle}</p>

                <button
                  onClick={() => navigate('/login')}
                  className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl transition-colors"
                >
                  {t.access.login}
                  <ArrowRight size={16} />
                </button>

                <p className="mt-4 text-xs text-slate-500">{t.access.note}</p>
              </div>
            </div>
          </div>

          {/* Implementation Process */}
          <div className="mt-8 bg-slate-900/30 border border-slate-800/50 rounded-xl p-6">
            <h3 className="text-sm font-semibold text-slate-400 mb-4">{t.process.title}</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
              {t.process.steps.map((step, i) => (
                <div key={i} className="flex flex-col items-center text-center">
                  <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-xs text-slate-400 font-bold mb-2">
                    {i + 1}
                  </div>
                  <span className="text-xs text-slate-500">{step}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="h-12 border-t border-slate-800 flex items-center justify-between px-6 text-xs text-slate-600">
        <span>NODX - Centro de Operaciones Territoriales v2.1</span>
        <span>{new Date().getFullYear()}</span>
      </footer>
    </div>
  );
}

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Building2, Users, Landmark, Heart, Briefcase, Building,
  Globe, CheckCircle2, ArrowRight, ArrowLeft, Zap, Cpu,
  Sparkles, Shield, Target
} from 'lucide-react';
import { useI18n, LANGUAGES, setLanguage } from '../../hooks/useI18n';
import type { SupportedLanguage } from '../../types';

const ORG_TYPES = [
  { key: 'cooperative', icon: Users, label: 'Cooperativa', labelEn: 'Cooperative', color: '#22c55e', desc: 'Organización de productores asociados' },
  { key: 'ngo', icon: Heart, label: 'ONG / Organización Social', labelEn: 'NGO / Social Organization', color: '#ec4899', desc: 'Organización sin fines de lucro' },
  { key: 'commercial', icon: Briefcase, label: 'Empresa Comercial', labelEn: 'Commercial Company', color: '#f59e0b', desc: 'Empresa con operaciones de campo' },
  { key: 'government', icon: Landmark, label: 'Gobierno / Institución', labelEn: 'Government / Institution', color: '#3b82f6', desc: 'Entidad del sector público' },
  { key: 'other', icon: Building, label: 'Otro tipo', labelEn: 'Other', color: '#64748b', desc: 'Otro tipo de organización' }
];

const STEPS = [
  { num: 1, label: 'Tipo', labelEn: 'Type' },
  { num: 2, label: 'Organización', labelEn: 'Organization' },
  { num: 3, label: 'Idioma', labelEn: 'Language' },
  { num: 4, label: 'Ecosistema', labelEn: 'Ecosystem' }
];

const UI: Record<SupportedLanguage, {
  title: string; subtitle: string; step1: { title: string; desc: string };
  step2: { title: string; desc: string; orgName: string; orgNamePlaceholder: string; continue: string };
  step3: { title: string; desc: string; select: string; continue: string };
  step4: { title: string; desc: string; welcome: string; enterButton: string; backLogin: string };
  back: string; next: string;
}> = {
  es: {
    title: 'Configuración del Ecosistema',
    subtitle: 'Configure su entorno operativo NODX',
    step1: { title: 'Paso 1: Tipo de Organización', desc: 'Seleccione el tipo de organización para personalizar su entorno operativo' },
    step2: { title: 'Paso 2: Su Organización', desc: 'Ingrese el nombre de su organización', orgName: 'Nombre de la Organización', orgNamePlaceholder: 'Ej: Cooperativa Central', continue: 'Continuar' },
    step3: { title: 'Paso 3: Idioma preferido', desc: 'Seleccione el idioma de la interfaz', select: 'Seleccionar idioma', continue: 'Continuar' },
    step4: { title: 'Paso 4: Ecosistema Listo', desc: 'Su configuración está lista. Acceda al centro de operaciones territoriales.', welcome: 'Ecosistema NODX Activado', enterButton: 'Acceder a Centro de Operaciones', backLogin: 'Volver al inicio de sesión' },
    back: 'Anterior',
    next: 'Siguiente'
  },
  en: {
    title: 'Ecosystem Configuration',
    subtitle: 'Configure your NODX operational environment',
    step1: { title: 'Step 1: Organization Type', desc: 'Select your organization type to personalize your operational environment' },
    step2: { title: 'Step 2: Your Organization', desc: 'Enter your organization name', orgName: 'Organization Name', orgNamePlaceholder: 'E.g: Central Cooperative', continue: 'Continue' },
    step3: { title: 'Step 3: Preferred Language', desc: 'Select your interface language', select: 'Select language', continue: 'Continue' },
    step4: { title: 'Step 4: Ecosystem Ready', desc: 'Your configuration is ready. Access the territorial operations center.', welcome: 'NODX Ecosystem Activated', enterButton: 'Access Operations Center', backLogin: 'Back to login' },
    back: 'Back',
    next: 'Next'
  },
  fr: {
    title: 'Configuration de l\'Écosystème',
    subtitle: 'Configurez votre environnement opérationnel NODX',
    step1: { title: 'Étape 1: Type d\'Organisation', desc: 'Sélectionnez le type d\'organisation' },
    step2: { title: 'Étape 2: Votre Organisation', desc: 'Entrez le nom de votre organisation', orgName: 'Nom de l\'Organisation', orgNamePlaceholder: 'Ex: Coopérative Centrale', continue: 'Continuer' },
    step3: { title: 'Étape 3: Langue Préférée', desc: 'Sélectionnez la langue de l\'interface', select: 'Sélectionner', continue: 'Continuer' },
    step4: { title: 'Étape 4: Écosystème Prêt', desc: 'Votre configuration est prête. Accédez au centre des opérations.', welcome: 'Écosystème NODX Activé', enterButton: 'Accéder au Centre des Opérations', backLogin: 'Retour à la connexion' },
    back: 'Précédent',
    next: 'Suivant'
  },
  de: {
    title: 'Ökosystem-Konfiguration',
    subtitle: 'Konfigurieren Sie Ihre NODX-Betriebsumgebung',
    step1: { title: 'Schritt 1: Organisationstyp', desc: 'Wählen Sie Ihren Organisationstyp' },
    step2: { title: 'Schritt 2: Ihre Organisation', desc: 'Geben Sie den Namen Ihrer Organisation ein', orgName: 'Organisationsname', orgNamePlaceholder: 'Z.B: Zentralgenossenschaft', continue: 'Weiter' },
    step3: { title: 'Schritt 3: Bevorzugte Sprache', desc: 'Wählen Sie Ihre Schnittstellensprache', select: 'Auswählen', continue: 'Weiter' },
    step4: { title: 'Schritt 4: Ökosystem Bereit', desc: 'Ihre Konfiguration ist bereit.', welcome: 'NODX-Ökosystem Aktiviert', enterButton: 'Zum Operationszentrum', backLogin: 'Zurück zum Login' },
    back: 'Zurück',
    next: 'Weiter'
  },
  pt: {
    title: 'Configuração do Ecossistema',
    subtitle: 'Configure seu ambiente operacional NODX',
    step1: { title: 'Etapa 1: Tipo de Organização', desc: 'Selecione o tipo de organização' },
    step2: { title: 'Etapa 2: Sua Organização', desc: 'Insira o nome da sua organização', orgName: 'Nome da Organização', orgNamePlaceholder: 'Ex: Cooperativa Central', continue: 'Continuar' },
    step3: { title: 'Etapa 3: Idioma Preferido', desc: 'Selecione o idioma da interface', select: 'Selecionar', continue: 'Continuar' },
    step4: { title: 'Etapa 4: Ecossistema Pronto', desc: 'Sua configuração está pronta.', welcome: 'Ecossistema NODX Ativado', enterButton: 'Acessar Centro de Operações', backLogin: 'Voltar ao login' },
    back: 'Anterior',
    next: 'Próximo'
  },
  zh: {
    title: '生态系统配置',
    subtitle: '配置您的NODX运营环境',
    step1: { title: '步骤1：组织类型', desc: '选择您的组织类型' },
    step2: { title: '步骤2：您的组织', desc: '输入您的组织名称', orgName: '组织名称', orgNamePlaceholder: '例如：中央合作社', continue: '继续' },
    step3: { title: '步骤3：首选语言', desc: '选择界面语言', select: '选择', continue: '继续' },
    step4: { title: '步骤4：生态系统就绪', desc: '您的配置已准备就绪。', welcome: 'NODX生态系统已激活', enterButton: '访问运营中心', backLogin: '返回登录' },
    back: '上一步',
    next: '下一步'
  },
  ja: {
    title: 'エコシステム設定',
    subtitle: 'NODX運用環境を設定',
    step1: { title: 'ステップ1：組織タイプ', desc: '組織タイプを選択' },
    step2: { title: 'ステップ2：組織', desc: '組織名を入力', orgName: '組織名', orgNamePlaceholder: '例：中央協同組合', continue: '続ける' },
    step3: { title: 'ステップ3：言語', desc: 'インターフェース言語を選択', select: '選択', continue: '続ける' },
    step4: { title: 'ステップ4：エコシステム準備完了', desc: '設定が完了しました。', welcome: 'NODXエコシステム有効化', enterButton: '運用センターへ', backLogin: 'ログインに戻る' },
    back: '戻る',
    next: '次へ'
  }
};

function StepIndicator({ currentStep, lang }: { currentStep: number; lang: SupportedLanguage }) {
  return (
    <div className="flex items-center justify-center gap-3 mb-12">
      {STEPS.map((step, i) => (
        <div key={step.num} className="flex items-center gap-3">
          <div className={`flex items-center gap-2 ${currentStep >= step.num ? 'text-blue-400' : 'text-slate-600'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${
              currentStep > step.num
                ? 'bg-blue-500 text-white'
                : currentStep === step.num
                ? 'bg-blue-500/20 border-2 border-blue-500 text-blue-400'
                : 'bg-slate-800 border border-slate-700 text-slate-600'
            }`}>
              {currentStep > step.num ? <CheckCircle2 size={16} /> : step.num}
            </div>
            <span className="text-sm font-medium hidden sm:block">
              {lang === 'es' ? step.label : step.labelEn}
            </span>
          </div>
          {i < STEPS.length - 1 && (
            <div className={`w-8 h-0.5 ${currentStep > step.num ? 'bg-blue-500' : 'bg-slate-700'}`} />
          )}
        </div>
      ))}
    </div>
  );
}

export function OnboardingPage() {
  const { lang: currentLang } = useI18n();
  const [lang, setLang] = useState<SupportedLanguage>(currentLang);
  const [step, setStep] = useState(1);
  const [orgType, setOrgType] = useState<string | null>(null);
  const [orgName, setOrgName] = useState('');
  const [selectedLanguage, setSelectedLanguage] = useState<SupportedLanguage>(lang);
  const navigate = useNavigate();

  const t = UI[lang];

  const handleLangChange = (l: SupportedLanguage) => {
    setLang(l);
    setLanguage(l);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-blue-950">
      {/* Header */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-slate-950/80 backdrop-blur-xl border-b border-slate-800/50">
        <div className="max-w-4xl mx-auto px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <button onClick={() => navigate('/')} className="flex items-center gap-3">
              <div className="w-9 h-9 bg-blue-500 rounded-lg flex items-center justify-center">
                <Building2 size={20} className="text-white" />
              </div>
              <span className="text-white font-bold text-lg">NODX</span>
            </button>
            <div className="flex items-center gap-3">
              <button onClick={() => handleLangChange(lang === 'es' ? 'en' : 'es')} className="text-slate-400 hover:text-white text-sm">
                {lang === 'es' ? 'EN' : 'ES'}
              </button>
              <button onClick={() => navigate('/login')} className="text-slate-400 hover:text-white text-sm">
                {lang === 'es' ? 'Iniciar Sesión' : 'Login'}
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Content */}
      <div className="pt-24 pb-16 px-6">
        <div className="max-w-3xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="flex items-center justify-center gap-2 mb-4">
              <Zap size={20} className="text-blue-400" />
              <span className="text-sm text-blue-400 font-semibold uppercase tracking-wider">NODX - Plataforma Territorial Inteligente</span>
            </div>
            <h1 className="text-3xl font-bold text-white mb-2">{t.title}</h1>
            <p className="text-slate-400">{t.subtitle}</p>
          </div>

          {/* Step Indicator */}
          <StepIndicator currentStep={step} lang={lang} />

          {/* Step Content */}
          <div className="bg-slate-800/40 border border-slate-700/30 rounded-2xl p-8">
            {/* Step 1: Organization Type */}
            {step === 1 && (
              <div>
                <h2 className="text-xl font-bold text-white mb-2">{t.step1.title}</h2>
                <p className="text-slate-400 mb-6">{t.step1.desc}</p>

                <div className="grid sm:grid-cols-2 gap-4">
                  {ORG_TYPES.map(type => (
                    <button
                      key={type.key}
                      onClick={() => setOrgType(type.key)}
                      className={`p-5 rounded-xl border transition-all text-left ${
                        orgType === type.key
                          ? 'bg-slate-700/50 border-slate-500'
                          : 'bg-slate-800/50 border-slate-700/50 hover:border-slate-600'
                      }`}
                      style={orgType === type.key ? { borderColor: type.color } : {}}
                    >
                      <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 rounded-lg flex items-center justify-center"
                          style={{ backgroundColor: type.color + '20' }}>
                          <type.icon size={20} style={{ color: type.color }} />
                        </div>
                        <div className="text-white font-medium">
                          {lang === 'es' ? type.label : type.labelEn}
                        </div>
                        {orgType === type.key && (
                          <CheckCircle2 size={18} className="ml-auto" style={{ color: type.color }} />
                        )}
                      </div>
                      <p className="text-sm text-slate-400">{type.desc}</p>
                    </button>
                  ))}
                </div>

                <div className="flex justify-end mt-8">
                  <button
                    onClick={() => setStep(2)}
                    disabled={!orgType}
                    className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-colors"
                  >
                    {t.next} <ArrowRight size={18} />
                  </button>
                </div>
              </div>
            )}

            {/* Step 2: Organization Name */}
            {step === 2 && (
              <div>
                <h2 className="text-xl font-bold text-white mb-2">{t.step2.title}</h2>
                <p className="text-slate-400 mb-6">{t.step2.desc}</p>

                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      {t.step2.orgName}
                    </label>
                    <input
                      type="text"
                      value={orgName}
                      onChange={e => setOrgName(e.target.value)}
                      placeholder={t.step2.orgNamePlaceholder}
                      className="w-full px-4 py-3 bg-slate-900/50 border border-slate-700 rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500/60 focus:bg-slate-900/80 transition-all"
                    />
                  </div>

                  <div className="p-4 bg-slate-900/30 border border-slate-700/20 rounded-xl">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg flex items-center justify-center"
                        style={{
                          backgroundColor: (ORG_TYPES.find(t => t.key === orgType)?.color || '#64748b') + '20'
                        }}>
                        {(() => {
                          const Icon = ORG_TYPES.find(t => t.key === orgType)?.icon || Building;
                          return <Icon size={20} style={{ color: ORG_TYPES.find(t => t.key === orgType)?.color || '#64748b' }} />;
                        })()}
                      </div>
                      <div>
                        <div className="text-xs text-slate-500">Tipo seleccionado</div>
                        <div className="text-white font-medium">
                          {lang === 'es'
                            ? ORG_TYPES.find(t => t.key === orgType)?.label
                            : ORG_TYPES.find(t => t.key === orgType)?.labelEn}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex justify-between mt-8">
                  <button
                    onClick={() => setStep(1)}
                    className="flex items-center gap-2 px-6 py-3 bg-slate-700/50 hover:bg-slate-700 text-white font-medium rounded-xl transition-colors"
                  >
                    <ArrowLeft size={18} /> {t.back}
                  </button>
                  <button
                    onClick={() => setStep(3)}
                    disabled={!orgName.trim()}
                    className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-colors"
                  >
                    {t.next} <ArrowRight size={18} />
                  </button>
                </div>
              </div>
            )}

            {/* Step 3: Language */}
            {step === 3 && (
              <div>
                <h2 className="text-xl font-bold text-white mb-2">{t.step3.title}</h2>
                <p className="text-slate-400 mb-6">{t.step3.desc}</p>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {LANGUAGES.map(language => (
                    <button
                      key={language.code}
                      onClick={() => setSelectedLanguage(language.code as SupportedLanguage)}
                      className={`p-4 rounded-xl border transition-all text-center ${
                        selectedLanguage === language.code
                          ? 'bg-slate-700/50 border-blue-500'
                          : 'bg-slate-800/50 border-slate-700/50 hover:border-slate-600'
                      }`}
                    >
                      <div className="text-lg font-bold text-white mb-1">{language.code.toUpperCase()}</div>
                      <div className="text-sm text-slate-400">{language.nativeLabel}</div>
                      {selectedLanguage === language.code && (
                        <CheckCircle2 size={16} className="mx-auto mt-2 text-blue-400" />
                      )}
                    </button>
                  ))}
                </div>

                <div className="flex justify-between mt-8">
                  <button
                    onClick={() => setStep(2)}
                    className="flex items-center gap-2 px-6 py-3 bg-slate-700/50 hover:bg-slate-700 text-white font-medium rounded-xl transition-colors"
                  >
                    <ArrowLeft size={18} /> {t.back}
                  </button>
                  <button
                    onClick={() => { handleLangChange(selectedLanguage); setStep(4); }}
                    className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl transition-colors"
                  >
                    {t.step3.continue} <ArrowRight size={18} />
                  </button>
                </div>
              </div>
            )}

            {/* Step 4: Welcome */}
            {step === 4 && (
              <div className="text-center">
                <div className="w-20 h-20 mx-auto rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center mb-6 shadow-lg shadow-blue-500/20">
                  <Sparkles size={36} className="text-white" />
                </div>

                <h2 className="text-2xl font-bold text-white mb-2">{t.step4.welcome}</h2>
                <p className="text-lg text-slate-400 mb-6">{t.step4.desc}</p>

                <div className="p-6 bg-slate-900/50 border border-slate-700/30 rounded-xl mb-8 text-left">
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                      <div className="text-xs text-slate-500 mb-1">Organización</div>
                      <div className="text-white font-medium">{orgName}</div>
                    </div>
                    <div>
                      <div className="text-xs text-slate-500 mb-1">Tipo</div>
                      <div className="text-white font-medium">
                        {lang === 'es'
                          ? ORG_TYPES.find(t => t.key === orgType)?.label
                          : ORG_TYPES.find(t => t.key === orgType)?.labelEn}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-slate-500 mb-1">Idioma</div>
                      <div className="text-white font-medium">{selectedLanguage.toUpperCase()}</div>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <button
                    onClick={() => navigate('/ecosystem')}
                    className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl transition-colors"
                  >
                    <Cpu size={20} /> {t.step4.enterButton}
                  </button>
                  <button
                    onClick={() => navigate('/login')}
                    className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-slate-700/50 hover:bg-slate-700 text-white font-medium rounded-xl transition-colors"
                  >
                    {t.step4.backLogin}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Footer Info */}
          <div className="mt-8 text-center text-xs text-slate-600">
            {lang === 'es'
              ? 'El acceso al ecosistema NODX se otorga mediante implementación institucional. Contacte con NODX para iniciar el proceso de diagnóstico.'
              : 'Access to the NODX ecosystem is granted through institutional implementation. Contact NODX to initiate the diagnosis process.'}
          </div>
        </div>
      </div>
    </div>
  );
}

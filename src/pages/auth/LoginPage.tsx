import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, Eye, EyeOff, Globe, ChevronDown, Check, Lock, User, AlertCircle, Loader2 } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useOrg } from '../../contexts/OrgContext';
import { LANGUAGES, setLanguage, useI18n } from '../../hooks/useI18n';
import type { SupportedLanguage } from '../../types';

const UI_STRINGS: Record<SupportedLanguage, {
  title: string; subtitle: string; codePlaceholder: string; passwordPlaceholder: string;
  orgPlaceholder: string; submitBtn: string; loading: string;
  errorEmpty: string; selectLang: string; orgOptional: string;
}> = {
  es: {
    title: 'Portal de Acceso NODX',
    subtitle: 'Acceso corporativo controlado',
    codePlaceholder: 'Código de Usuario (ej. CEO001)',
    passwordPlaceholder: 'Contraseña',
    orgPlaceholder: 'Organización (opcional)',
    submitBtn: 'Acceder a la Plataforma',
    loading: 'Verificando credenciales...',
    errorEmpty: 'Por favor ingresa tu código de usuario y contraseña.',
    selectLang: 'Idioma de Interfaz',
    orgOptional: 'Organización (opcional)',
  },
  en: {
    title: 'NODX Access Portal',
    subtitle: 'Controlled corporate access',
    codePlaceholder: 'User Code (e.g. CEO001)',
    passwordPlaceholder: 'Password',
    orgPlaceholder: 'Organization (optional)',
    submitBtn: 'Access Platform',
    loading: 'Verifying credentials...',
    errorEmpty: 'Please enter your user code and password.',
    selectLang: 'Interface Language',
    orgOptional: 'Organization (optional)',
  },
  fr: {
    title: "Portail d'Accès NODX",
    subtitle: 'Accès corporatif contrôlé',
    codePlaceholder: 'Code Utilisateur (ex. CEO001)',
    passwordPlaceholder: 'Mot de passe',
    orgPlaceholder: 'Organisation (facultatif)',
    submitBtn: 'Accéder à la Plateforme',
    loading: 'Vérification des identifiants...',
    errorEmpty: 'Veuillez saisir votre code et mot de passe.',
    selectLang: "Langue d'interface",
    orgOptional: 'Organisation (facultatif)',
  },
  de: {
    title: 'NODX Zugangsportal',
    subtitle: 'Kontrollierter Unternehmenszugang',
    codePlaceholder: 'Benutzercode (z.B. CEO001)',
    passwordPlaceholder: 'Passwort',
    orgPlaceholder: 'Organisation (optional)',
    submitBtn: 'Plattform betreten',
    loading: 'Anmeldedaten werden überprüft...',
    errorEmpty: 'Bitte Benutzercode und Passwort eingeben.',
    selectLang: 'Schnittstellensprache',
    orgOptional: 'Organisation (optional)',
  },
  pt: {
    title: 'Portal de Acesso NODX',
    subtitle: 'Acesso corporativo controlado',
    codePlaceholder: 'Código de Utilizador (ex. CEO001)',
    passwordPlaceholder: 'Senha',
    orgPlaceholder: 'Organização (opcional)',
    submitBtn: 'Acessar Plataforma',
    loading: 'Verificando credenciais...',
    errorEmpty: 'Por favor insira o seu código e senha.',
    selectLang: 'Idioma da Interface',
    orgOptional: 'Organização (opcional)',
  },
  zh: {
    title: 'NODX 访问门户',
    subtitle: '受控企业访问',
    codePlaceholder: '用户代码（例如：CEO001）',
    passwordPlaceholder: '密码',
    orgPlaceholder: '组织（可选）',
    submitBtn: '访问平台',
    loading: '验证凭据...',
    errorEmpty: '请输入您的用户代码和密码。',
    selectLang: '界面语言',
    orgOptional: '组织（可选）',
  },
  ja: {
    title: 'NODXアクセスポータル',
    subtitle: '管理されたコーポレートアクセス',
    codePlaceholder: 'ユーザーコード（例：CEO001）',
    passwordPlaceholder: 'パスワード',
    orgPlaceholder: '組織（任意）',
    submitBtn: 'プラットフォームにアクセス',
    loading: '認証情報を確認中...',
    errorEmpty: 'ユーザーコードとパスワードを入力してください。',
    selectLang: 'インターフェース言語',
    orgOptional: '組織（任意）',
  },
};

function LanguageDropdown({ lang, onChange }: { lang: SupportedLanguage; onChange: (l: SupportedLanguage) => void }) {
  const [open, setOpen] = useState(false);
  const current = LANGUAGES.find(l => l.code === lang) ?? LANGUAGES[0];

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white/80 text-sm transition-colors"
      >
        <Globe size={14} />
        <span>{current.nativeLabel}</span>
        <ChevronDown size={12} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 w-52 bg-white border border-gray-200 rounded-xl shadow-2xl z-50 overflow-hidden">
          <div className="px-3 py-2 border-b border-gray-100">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{UI_STRINGS[lang].selectLang}</p>
          </div>
          <div className="py-1">
            {LANGUAGES.map(language => (
              <button
                key={language.code}
                type="button"
                onClick={() => { onChange(language.code as SupportedLanguage); setOpen(false); }}
                className="w-full flex items-center justify-between px-3 py-2.5 text-sm hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <span className="text-xs font-mono bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded uppercase">{language.code}</span>
                  <div className="text-left">
                    <p className="font-medium text-gray-800">{language.nativeLabel}</p>
                    <p className="text-xs text-gray-400">{language.label}</p>
                  </div>
                </div>
                {lang === language.code && <Check size={14} className="text-blue-600" />}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export function LoginPage() {
  const { signInWithCode, signIn, bootstrapDone } = useAuth();
  const { hasOrg } = useOrg();
  const navigate = useNavigate();

  const { lang: currentLang } = useI18n();
  const [lang, setLang] = useState<SupportedLanguage>(currentLang);
  const [userCode, setUserCode] = useState('');
  const [password, setPassword] = useState('');
  const [org, setOrg] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const s = UI_STRINGS[lang];

  function handleLangChange(l: SupportedLanguage) {
    setLang(l);
    setLanguage(l);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (!userCode.trim() || !password.trim()) {
      setError(s.errorEmpty);
      return;
    }

    setLoading(true);

    const isEmail = userCode.includes('@');
    let result: { error: string | null };

    if (isEmail) {
      result = await signIn(userCode.trim(), password);
    } else {
      result = await signInWithCode(userCode.trim(), org.trim() || null, password);
    }

    if (result.error) {
      setError(result.error);
    }

    setLoading(false);
  }

  const showBootstrapHint = bootstrapDone === false;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 flex flex-col">
      {/* Top bar */}
      <div className="flex items-center justify-between px-8 py-4">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
            <Building2 size={18} className="text-white" />
          </div>
          <span className="text-white font-bold tracking-wide text-sm">NODX</span>
          <span className="text-white/30 text-xs ml-1">Territorial Intelligence</span>
        </div>
        <LanguageDropdown lang={lang} onChange={handleLangChange} />
      </div>

      {/* Center */}
      <div className="flex-1 flex items-center justify-center px-4">
        <div className="w-full max-w-md">
          {/* Header */}
          <div className="text-center mb-10">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-500/20 border border-blue-500/30 rounded-2xl mb-5">
              <Lock size={28} className="text-blue-400" />
            </div>
            <h1 className="text-3xl font-bold text-white tracking-tight">{s.title}</h1>
            <p className="text-slate-400 mt-2 text-sm">{s.subtitle}</p>
          </div>

          {/* Bootstrap hint */}
          {showBootstrapHint && (
            <div className="mb-5 flex items-start gap-3 bg-amber-500/10 border border-amber-500/30 rounded-xl px-4 py-3">
              <AlertCircle size={16} className="text-amber-400 mt-0.5 flex-shrink-0" />
              <p className="text-amber-200 text-xs leading-relaxed">
                Platform not initialized. Go to{' '}
                <button
                  type="button"
                  onClick={() => navigate('/bootstrap')}
                  className="underline text-amber-300 hover:text-amber-100"
                >
                  /bootstrap
                </button>{' '}
                to set up the platform.
              </p>
            </div>
          )}

          {/* Card */}
          <div className="bg-white/5 border border-white/10 backdrop-blur-sm rounded-2xl p-8 shadow-2xl">
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* User Code */}
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  {lang === 'es' ? 'Código de Usuario' : lang === 'fr' ? 'Code Utilisateur' : lang === 'de' ? 'Benutzercode' : lang === 'pt' ? 'Código de Utilizador' : lang === 'zh' ? '用户代码' : lang === 'ja' ? 'ユーザーコード' : 'User Code'}
                </label>
                <div className="relative">
                  <User size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    type="text"
                    value={userCode}
                    onChange={e => setUserCode(e.target.value)}
                    placeholder={s.codePlaceholder}
                    autoComplete="username"
                    autoFocus
                    className="w-full pl-10 pr-4 py-3 bg-white/10 border border-white/10 rounded-xl text-white placeholder:text-slate-500 text-sm focus:outline-none focus:border-blue-500/60 focus:bg-white/15 transition-all"
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  {lang === 'es' ? 'Contraseña' : lang === 'fr' ? 'Mot de passe' : lang === 'de' ? 'Passwort' : lang === 'pt' ? 'Senha' : lang === 'zh' ? '密码' : lang === 'ja' ? 'パスワード' : 'Password'}
                </label>
                <div className="relative">
                  <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder={s.passwordPlaceholder}
                    autoComplete="current-password"
                    className="w-full pl-10 pr-12 py-3 bg-white/10 border border-white/10 rounded-xl text-white placeholder:text-slate-500 text-sm focus:outline-none focus:border-blue-500/60 focus:bg-white/15 transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(s => !s)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {/* Organization (optional) */}
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  {s.orgOptional}
                </label>
                <div className="relative">
                  <Building2 size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    type="text"
                    value={org}
                    onChange={e => setOrg(e.target.value)}
                    placeholder={s.orgPlaceholder}
                    className="w-full pl-10 pr-4 py-3 bg-white/10 border border-white/10 rounded-xl text-white placeholder:text-slate-500 text-sm focus:outline-none focus:border-blue-500/60 focus:bg-white/15 transition-all"
                  />
                </div>
              </div>

              {/* Error */}
              {error && (
                <div className="flex items-center gap-2.5 bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3">
                  <AlertCircle size={15} className="text-red-400 flex-shrink-0" />
                  <p className="text-red-200 text-sm">{error}</p>
                </div>
              )}

              {/* Submit */}
              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2.5 py-3.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl font-semibold text-sm transition-all shadow-lg shadow-blue-900/30 mt-2"
              >
                {loading ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    {s.loading}
                  </>
                ) : (
                  <>
                    <Lock size={16} />
                    {s.submitBtn}
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Footer */}
          <p className="text-center text-xs text-slate-600 mt-6">
            {lang === 'es'
              ? 'El acceso es concedido exclusivamente por administradores NODX. Sin autoregistro.'
              : lang === 'fr'
              ? "L'accès est accordé exclusivement par les administrateurs NODX. Sans auto-inscription."
              : lang === 'de'
              ? 'Zugang wird ausschließlich von NODX-Administratoren gewährt. Keine Selbstregistrierung.'
              : lang === 'pt'
              ? 'O acesso é concedido exclusivamente por administradores NODX. Sem auto-registo.'
              : lang === 'zh'
              ? '访问权限由NODX管理员专门授予。不开放自助注册。'
              : lang === 'ja'
              ? 'アクセスはNODX管理者によってのみ付与されます。セルフ登録はありません。'
              : 'Access is granted exclusively by NODX administrators. No self-registration available.'
            }
          </p>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="flex items-center justify-between px-8 py-4 text-xs text-slate-700">
        <span>NODX - Plataforma Territorial Inteligente</span>
        <span>Acceso Controlado v1</span>
      </div>
    </div>
  );
}

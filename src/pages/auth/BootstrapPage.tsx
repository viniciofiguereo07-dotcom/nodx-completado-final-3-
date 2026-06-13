import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, Lock, User, AlertCircle, CheckCircle2, Loader2, ShieldCheck, Eye, EyeOff, ArrowRight, Server } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

type BootstrapStep = 'check' | 'credentials' | 'org' | 'security' | 'done';

const STEP_LABELS: Record<BootstrapStep, string> = {
  check:       'Verificar Estado',
  credentials: 'Cuenta NODX ROOT',
  org:         'Organización Inicial',
  security:    'Configuración de Seguridad',
  done:        'Activación Completa',
};

export function BootstrapPage() {
  const { signIn, bootstrapDone, refreshProfile } = useAuth();
  const navigate = useNavigate();

  const [step, setStep]         = useState<BootstrapStep>('check');
  const [checking, setChecking] = useState(true);
  const [already, setAlready]   = useState(false);

  // Credentials step
  const [rootEmail, setRootEmail]         = useState('');
  const [rootPassword, setRootPassword]   = useState('');
  const [rootPassword2, setRootPassword2] = useState('');
  const [rootFullName, setRootFullName]   = useState('NODX Root Administrator');
  const [showPw, setShowPw]               = useState(false);

  // Org step
  const [orgName, setOrgName] = useState('');
  const [orgSlug, setOrgSlug] = useState('');

  // Security step
  const [sessionTimeout, setSessionTimeout] = useState('480');
  const [requireMfa, setRequireMfa]         = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');

  useEffect(() => {
    if (bootstrapDone === true) {
      setAlready(true);
      setChecking(false);
      setStep('check');
    } else if (bootstrapDone === false) {
      setChecking(false);
      setStep('credentials');
    }
    // bootstrapDone === null means still loading — keep checking
  }, [bootstrapDone]);

  const steps: BootstrapStep[] = ['credentials', 'org', 'security', 'done'];
  const stepIndex = steps.indexOf(step);

  async function handleCredentials(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (!rootEmail || !rootPassword || !rootPassword2) { setError('Complete all fields.'); return; }
    if (rootPassword !== rootPassword2) { setError('Passwords do not match.'); return; }
    if (rootPassword.length < 8) { setError('Password must be at least 8 characters.'); return; }
    setStep('org');
  }

  async function handleOrg(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (!orgName.trim()) { setError('Organization name is required.'); return; }
    if (!orgSlug.trim()) { setOrgSlug(orgName.toLowerCase().replace(/[^a-z0-9]+/g, '-')); }
    setStep('security');
  }

  async function handleBootstrap(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    // 1. Create the NODX ROOT user via Supabase auth
    const slug = (orgSlug || orgName.toLowerCase().replace(/[^a-z0-9]+/g, '-')) + '-' + Date.now();
    const { data: authData, error: signUpErr } = await supabase.auth.signUp({
      email: rootEmail,
      password: rootPassword,
      options: { data: { full_name: rootFullName } },
    });

    if (signUpErr || !authData.user) {
      setError(signUpErr?.message ?? 'Failed to create NODX ROOT account.');
      setLoading(false);
      return;
    }

    const rootUserId = authData.user.id;

    // 2. Sign in immediately
    const { error: signInErr } = await supabase.auth.signInWithPassword({ email: rootEmail, password: rootPassword });
    if (signInErr) {
      setError(signInErr.message);
      setLoading(false);
      return;
    }

    // 3. Update profile with root access level and user_code
    await supabase.from('profiles').update({
      full_name: rootFullName,
      user_code: 'NODX_ROOT',
      nodx_access_level: 0,
      must_change_password: false,
    }).eq('id', rootUserId);

    // 4. Create initial organization
    const { data: org, error: orgErr } = await supabase
      .from('organizations')
      .insert({ name: orgName, slug })
      .select()
      .single();

    if (orgErr || !org) {
      setError(orgErr?.message ?? 'Failed to create organization.');
      setLoading(false);
      return;
    }

    // 5. Make root user a super_admin member of org
    await supabase.from('organization_members').insert({
      organization_id: org.id,
      user_id: rootUserId,
      role: 'super_admin',
    });

    // 6. Activate all modules for the org
    const { data: allModules } = await supabase.from('modules').select('key');
    if (allModules?.length) {
      await supabase.from('organization_modules').insert(
        allModules.map(m => ({ organization_id: org.id, module_key: m.key, is_active: true }))
      );
    }

    // 7. Assign Enterprise trial license
    const { data: plan } = await supabase.from('plans').select('id').eq('name', 'Enterprise').maybeSingle();
    if (plan) {
      await supabase.from('licenses').insert({ organization_id: org.id, plan_id: plan.id, status: 'trial' });
    }

    // 8. Mark bootstrap as complete
    await supabase.from('platform_bootstrap').update({
      bootstrap_done: true,
      bootstrapped_at: new Date().toISOString(),
      bootstrapped_by: rootUserId,
      nodx_root_user_id: rootUserId,
    }).eq('id', 1);

    // 9. Log access event
    await supabase.from('access_events').insert({
      user_id: rootUserId,
      organization_id: org.id,
      event_type: 'bootstrap_completed',
      metadata: { org_name: orgName, root_email: rootEmail },
    });

    await refreshProfile();
    setLoading(false);
    setStep('done');
  }

  if (checking) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 to-slate-900 flex items-center justify-center">
        <div className="flex items-center gap-3 text-slate-400">
          <Loader2 size={20} className="animate-spin" />
          <span className="text-sm">Checking platform state...</span>
        </div>
      </div>
    );
  }

  if (already) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 to-slate-900 flex items-center justify-center px-4">
        <div className="max-w-md text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-emerald-500/20 border border-emerald-500/30 rounded-2xl mb-5">
            <CheckCircle2 size={28} className="text-emerald-400" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">Platform Already Initialized</h1>
          <p className="text-slate-400 text-sm mb-6">Bootstrap has been completed. Access the platform with your NODX ROOT credentials.</p>
          <button
            onClick={() => navigate('/login')}
            className="flex items-center justify-center gap-2 mx-auto px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-medium text-sm transition-colors"
          >
            <Lock size={16} /> Go to Access Portal
          </button>
        </div>
      </div>
    );
  }

  if (step === 'done') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 to-slate-900 flex items-center justify-center px-4">
        <div className="max-w-md text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-emerald-500/20 border border-emerald-500/30 rounded-2xl mb-5">
            <ShieldCheck size={28} className="text-emerald-400" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">NODX Platform Activated</h1>
          <p className="text-slate-400 text-sm mb-2">Bootstrap completed successfully.</p>
          <div className="bg-white/5 border border-white/10 rounded-xl px-6 py-4 text-left mb-6 space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-400">NODX ROOT Account</span>
              <span className="text-white font-mono text-xs">{rootEmail}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-400">User Code</span>
              <span className="text-emerald-400 font-mono text-xs font-semibold">NODX_ROOT</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-400">Organization</span>
              <span className="text-white text-xs">{orgName}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-400">Bootstrap</span>
              <span className="text-xs bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full">Completed & Locked</span>
            </div>
          </div>
          <button
            onClick={() => navigate('/dashboard')}
            className="flex items-center justify-center gap-2 mx-auto px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-medium text-sm transition-colors"
          >
            <ArrowRight size={16} /> Enter Platform
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 flex flex-col">
      {/* Top bar */}
      <div className="flex items-center gap-2.5 px-8 py-4">
        <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
          <Building2 size={18} className="text-white" />
        </div>
        <span className="text-white font-bold tracking-wide text-sm">NODX</span>
        <span className="text-white/30 text-xs ml-1">ENTERPRISE — BOOTSTRAP MODE</span>
      </div>

      <div className="flex-1 flex items-center justify-center px-4 py-10">
        <div className="w-full max-w-xl">
          {/* Title */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-14 h-14 bg-blue-500/20 border border-blue-500/30 rounded-2xl mb-4">
              <Server size={24} className="text-blue-400" />
            </div>
            <h1 className="text-2xl font-bold text-white">Inicialización de Plataforma</h1>
            <p className="text-slate-400 text-sm mt-1">Configurar NODX ROOT y organización inicial</p>
          </div>

          {/* Step indicator */}
          <div className="flex items-center justify-center gap-2 mb-8">
            {steps.filter(s => s !== 'done').map((s, i) => {
              const isActive   = s === step;
              const isComplete = steps.indexOf(s) < stepIndex;
              return (
                <div key={s} className="flex items-center gap-2">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border transition-all ${
                    isComplete ? 'bg-emerald-500 border-emerald-500 text-white'
                    : isActive  ? 'bg-blue-600 border-blue-600 text-white'
                    : 'bg-white/5 border-white/10 text-slate-500'
                  }`}>
                    {isComplete ? <CheckCircle2 size={14} /> : i + 1}
                  </div>
                  {i < 2 && <div className={`w-8 h-px ${isComplete ? 'bg-emerald-500' : 'bg-white/10'}`} />}
                </div>
              );
            })}
          </div>

          {/* Card */}
          <div className="bg-white/5 border border-white/10 backdrop-blur-sm rounded-2xl p-8 shadow-2xl">
            <h2 className="text-white font-semibold mb-1">{STEP_LABELS[step]}</h2>

            {error && (
              <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 mt-3 mb-5">
                <AlertCircle size={14} className="text-red-400 flex-shrink-0" />
                <p className="text-red-200 text-sm">{error}</p>
              </div>
            )}

            {step === 'credentials' && (
              <form onSubmit={handleCredentials} className="space-y-4 mt-4">
                <p className="text-slate-400 text-xs">Crear la cuenta NODX ROOT. Esta cuenta tiene control total sobre la plataforma y no puede ser eliminada.</p>

                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5">Nombre Completo</label>
                  <input type="text" value={rootFullName} onChange={e => setRootFullName(e.target.value)}
                    className="w-full px-4 py-2.5 bg-white/10 border border-white/10 rounded-xl text-white text-sm placeholder:text-slate-500 focus:outline-none focus:border-blue-500/60"
                    placeholder="NODX Root Administrator" />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5">Email (acceso interno)</label>
                  <div className="relative">
                    <User size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                    <input type="email" value={rootEmail} onChange={e => setRootEmail(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 bg-white/10 border border-white/10 rounded-xl text-white text-sm placeholder:text-slate-500 focus:outline-none focus:border-blue-500/60"
                      placeholder="root@nodx.internal" required />
                  </div>
                  <p className="text-xs text-slate-500 mt-1">El email es solo para autenticación interna. El código de usuario será NODX_ROOT.</p>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5">Contraseña</label>
                  <div className="relative">
                    <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                    <input type={showPw ? 'text' : 'password'} value={rootPassword} onChange={e => setRootPassword(e.target.value)}
                      className="w-full pl-10 pr-10 py-2.5 bg-white/10 border border-white/10 rounded-xl text-white text-sm placeholder:text-slate-500 focus:outline-none focus:border-blue-500/60"
                      placeholder="Mínimo 8 caracteres" required />
                    <button type="button" tabIndex={-1} onClick={() => setShowPw(p => !p)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300">
                      {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5">Confirmar Contraseña</label>
                  <div className="relative">
                    <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                    <input type={showPw ? 'text' : 'password'} value={rootPassword2} onChange={e => setRootPassword2(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 bg-white/10 border border-white/10 rounded-xl text-white text-sm placeholder:text-slate-500 focus:outline-none focus:border-blue-500/60"
                      placeholder="Repetir contraseña" required />
                  </div>
                </div>

                <button type="submit" className="w-full flex items-center justify-center gap-2 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-medium text-sm transition-colors mt-2">
                  Continuar <ArrowRight size={15} />
                </button>
              </form>
            )}

            {step === 'org' && (
              <form onSubmit={handleOrg} className="space-y-4 mt-4">
                <p className="text-slate-400 text-xs">Crear la organización principal. Podrás agregar más organizaciones desde el panel de administración.</p>

                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5">Nombre de la Organización</label>
                  <input type="text" value={orgName}
                    onChange={e => { setOrgName(e.target.value); setOrgSlug(e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, '-')); }}
                    className="w-full px-4 py-2.5 bg-white/10 border border-white/10 rounded-xl text-white text-sm placeholder:text-slate-500 focus:outline-none focus:border-blue-500/60"
                    placeholder="Mi Organización" required />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5">Slug (identificador URL)</label>
                  <input type="text" value={orgSlug} onChange={e => setOrgSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                    className="w-full px-4 py-2.5 bg-white/10 border border-white/10 rounded-xl text-white font-mono text-sm placeholder:text-slate-500 focus:outline-none focus:border-blue-500/60"
                    placeholder="mi-organizacion" />
                </div>

                <div className="flex gap-3">
                  <button type="button" onClick={() => setStep('credentials')}
                    className="flex-1 py-3 bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 rounded-xl font-medium text-sm transition-colors">
                    Atrás
                  </button>
                  <button type="submit" className="flex-1 flex items-center justify-center gap-2 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-medium text-sm transition-colors">
                    Continuar <ArrowRight size={15} />
                  </button>
                </div>
              </form>
            )}

            {step === 'security' && (
              <form onSubmit={handleBootstrap} className="space-y-4 mt-4">
                <p className="text-slate-400 text-xs">Configurar parámetros de seguridad de la plataforma.</p>

                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5">Tiempo de Sesión (minutos)</label>
                  <input type="number" value={sessionTimeout} onChange={e => setSessionTimeout(e.target.value)}
                    className="w-full px-4 py-2.5 bg-white/10 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-blue-500/60"
                    min="15" max="1440" />
                </div>

                <label className="flex items-center gap-3 cursor-pointer">
                  <div
                    onClick={() => setRequireMfa(m => !m)}
                    className={`w-10 h-6 rounded-full transition-colors flex items-center px-0.5 ${requireMfa ? 'bg-blue-600' : 'bg-white/10'}`}
                  >
                    <div className={`w-5 h-5 bg-white rounded-full shadow transition-transform ${requireMfa ? 'translate-x-4' : ''}`} />
                  </div>
                  <div>
                    <p className="text-sm text-white">Requerir Segundo Factor (MFA)</p>
                    <p className="text-xs text-slate-500">Los usuarios deberán configurar MFA al iniciar sesión</p>
                  </div>
                </label>

                {/* Review summary */}
                <div className="bg-white/5 border border-white/10 rounded-xl p-4 space-y-2 text-xs">
                  <p className="text-slate-400 font-semibold uppercase tracking-wider mb-2">Resumen de Configuración</p>
                  <div className="flex justify-between"><span className="text-slate-400">NODX ROOT Email</span><span className="text-white font-mono">{rootEmail}</span></div>
                  <div className="flex justify-between"><span className="text-slate-400">Código de Usuario</span><span className="text-emerald-400 font-mono font-bold">NODX_ROOT</span></div>
                  <div className="flex justify-between"><span className="text-slate-400">Organización</span><span className="text-white">{orgName}</span></div>
                  <div className="flex justify-between"><span className="text-slate-400">Módulos</span><span className="text-white">Todos (Enterprise Trial)</span></div>
                </div>

                <div className="flex gap-3">
                  <button type="button" onClick={() => setStep('org')}
                    className="flex-1 py-3 bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 rounded-xl font-medium text-sm transition-colors">
                    Atrás
                  </button>
                  <button type="submit" disabled={loading}
                    className="flex-1 flex items-center justify-center gap-2 py-3 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-xl font-semibold text-sm transition-colors">
                    {loading ? <><Loader2 size={15} className="animate-spin" /> Activando...</> : <><ShieldCheck size={15} /> Activar Plataforma</>}
                  </button>
                </div>
              </form>
            )}
          </div>

          <p className="text-center text-xs text-slate-700 mt-6">
            NODX Bootstrap Mode — Este modo se desactiva automáticamente después de la inicialización.
          </p>
        </div>
      </div>
    </div>
  );
}

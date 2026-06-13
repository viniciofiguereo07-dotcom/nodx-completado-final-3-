import { useState } from 'react';
import { Lock, Eye, EyeOff, CheckCircle2, AlertCircle, Loader2, Building2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

export function ChangePasswordPage() {
  const { user, refreshProfile, logAccessEvent } = useAuth();
  const [current, setCurrent]     = useState('');
  const [newPw, setNewPw]         = useState('');
  const [newPw2, setNewPw2]       = useState('');
  const [showPw, setShowPw]       = useState(false);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState('');
  const [done, setDone]           = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (!newPw || !newPw2) { setError('Complete all fields.'); return; }
    if (newPw !== newPw2) { setError('New passwords do not match.'); return; }
    if (newPw.length < 8) { setError('Password must be at least 8 characters.'); return; }

    setLoading(true);

    const { error: updateErr } = await supabase.auth.updateUser({ password: newPw });
    if (updateErr) { setError(updateErr.message); setLoading(false); return; }

    // Clear the must_change_password flag
    if (user) {
      await supabase.from('profiles').update({ must_change_password: false }).eq('id', user.id);
      await logAccessEvent('password_changed');
    }

    await refreshProfile();
    setLoading(false);
    setDone(true);

    // Brief delay then reload to let OrgContext re-evaluate
    setTimeout(() => window.location.replace('/dashboard'), 1500);
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 flex flex-col">
      <div className="flex items-center gap-2.5 px-8 py-4">
        <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
          <Building2 size={18} className="text-white" />
        </div>
        <span className="text-white font-bold tracking-wide text-sm">NODX</span>
      </div>

      <div className="flex-1 flex items-center justify-center px-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-14 h-14 bg-amber-500/20 border border-amber-500/30 rounded-2xl mb-4">
              <Lock size={24} className="text-amber-400" />
            </div>
            <h1 className="text-2xl font-bold text-white">Cambio de Contraseña Requerido</h1>
            <p className="text-slate-400 text-sm mt-1">Debes cambiar tu contraseña antes de acceder a la plataforma.</p>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-2xl p-8 shadow-2xl">
            {done ? (
              <div className="text-center py-4">
                <CheckCircle2 size={40} className="text-emerald-400 mx-auto mb-3" />
                <p className="text-white font-medium">Contraseña actualizada</p>
                <p className="text-slate-400 text-sm mt-1">Redirigiendo...</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5">Nueva Contraseña</label>
                  <div className="relative">
                    <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                    <input type={showPw ? 'text' : 'password'} value={newPw} onChange={e => setNewPw(e.target.value)}
                      className="w-full pl-10 pr-10 py-2.5 bg-white/10 border border-white/10 rounded-xl text-white text-sm placeholder:text-slate-500 focus:outline-none focus:border-blue-500/60"
                      placeholder="Mínimo 8 caracteres" required autoFocus />
                    <button type="button" tabIndex={-1} onClick={() => setShowPw(p => !p)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300">
                      {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5">Confirmar Nueva Contraseña</label>
                  <div className="relative">
                    <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                    <input type={showPw ? 'text' : 'password'} value={newPw2} onChange={e => setNewPw2(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 bg-white/10 border border-white/10 rounded-xl text-white text-sm placeholder:text-slate-500 focus:outline-none focus:border-blue-500/60"
                      placeholder="Repetir contraseña" required />
                  </div>
                </div>

                {error && (
                  <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3">
                    <AlertCircle size={14} className="text-red-400 flex-shrink-0" />
                    <p className="text-red-200 text-sm">{error}</p>
                  </div>
                )}

                <button type="submit" disabled={loading}
                  className="w-full flex items-center justify-center gap-2 py-3 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-xl font-semibold text-sm transition-colors mt-2">
                  {loading ? <><Loader2 size={15} className="animate-spin" /> Actualizando...</> : <><CheckCircle2 size={15} /> Actualizar Contraseña</>}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

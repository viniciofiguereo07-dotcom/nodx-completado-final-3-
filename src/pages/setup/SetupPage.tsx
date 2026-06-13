import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, ArrowRight, CheckCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useOrg } from '../../contexts/OrgContext';

export function SetupPage() {
  const { user } = useAuth();
  const { refresh } = useOrg();
  const navigate = useNavigate();
  const [orgName, setOrgName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setLoading(true);
    setError('');

    const slug = orgName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

    const { data: org, error: orgErr } = await supabase
      .from('organizations')
      .insert({ name: orgName, slug: `${slug}-${Date.now()}` })
      .select()
      .single();

    if (orgErr || !org) {
      setError(orgErr?.message ?? 'Failed to create organization');
      setLoading(false);
      return;
    }

    const { error: memberErr } = await supabase
      .from('organization_members')
      .insert({ organization_id: org.id, user_id: user.id, role: 'super_admin' });

    if (memberErr) {
      setError(memberErr.message);
      setLoading(false);
      return;
    }

    // Get Enterprise plan
    const { data: plan } = await supabase.from('plans').select('id').eq('name', 'Enterprise').maybeSingle();
    if (plan) {
      await supabase.from('licenses').insert({ organization_id: org.id, plan_id: plan.id, status: 'trial' });
    }

    // Activate all modules
    const { data: allModules } = await supabase.from('modules').select('key');
    if (allModules?.length) {
      await supabase.from('organization_modules').insert(
        allModules.map(m => ({ organization_id: org.id, module_key: m.key, is_active: true }))
      );
    }

    await refresh();
    navigate('/dashboard');
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-blue-950 flex items-center justify-center p-8">
      <div className="bg-white rounded-2xl shadow-2xl p-10 w-full max-w-md">
        <div className="flex items-center justify-center w-14 h-14 bg-blue-50 rounded-2xl mb-6 mx-auto">
          <Building2 className="w-7 h-7 text-blue-600" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900 text-center mb-2">Set up your organization</h1>
        <p className="text-gray-500 text-sm text-center mb-8">
          Create your workspace and get access to all 10 operational engines.
        </p>

        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Organization name</label>
            <input
              type="text"
              value={orgName}
              onChange={e => setOrgName(e.target.value)}
              required
              placeholder="Acme Corp"
              className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">{error}</div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold rounded-xl transition-colors"
          >
            {loading ? 'Setting up...' : 'Create workspace'}
            {!loading && <ArrowRight className="w-4 h-4" />}
          </button>
        </form>

        <div className="mt-6 space-y-2">
          {['All 10 engines activated', 'Enterprise plan (trial)', 'You become Super Admin'].map(f => (
            <div key={f} className="flex items-center gap-2 text-sm text-gray-500">
              <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0" />
              {f}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

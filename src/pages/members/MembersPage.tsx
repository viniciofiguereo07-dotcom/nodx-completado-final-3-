import { useState, useEffect, useCallback } from 'react';
import { Users, Plus, Shield, Trash2, CreditCard as Edit2, Crown, Star, Award, User, Eye, Mail, Building2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useOrg } from '../../contexts/OrgContext';
import { useAuth } from '../../contexts/AuthContext';
import { PageHeader } from '../../components/common/PageHeader';
import { StatusBadge } from '../../components/common/StatusBadge';
import { EmptyState } from '../../components/common/EmptyState';
import { Modal } from '../../components/common/Modal';
import { useI18n } from '../../hooks/useI18n';
import type { SupportedLanguage, UserRole } from '../../types';

type OrgMember = {
  id: string;
  user_id: string;
  organization_id: string;
  role: UserRole;
  is_active: boolean;
  joined_at: string | null;
  created_at: string;
  profiles?: { full_name: string | null; email: string | null; avatar_url?: string | null };
};

const USER_LEVELS = [
  { level: 0, key: 'root', label: 'NODX Root Administrator', labelEs: 'Administrador Root NODX', icon: Crown, color: '#dc2626' },
  { level: 1, key: 'owner', label: 'Organization Owner', labelEs: 'Propietario de Organizacion', icon: Star, color: '#7c3aed' },
  { level: 2, key: 'admin', label: 'Organization Manager', labelEs: 'Gerente de Organizacion', icon: Award, color: '#2563eb' },
  { level: 3, key: 'supervisor', label: 'Supervisor', labelEs: 'Supervisor', icon: Shield, color: '#0891b2' },
  { level: 4, key: 'agent', label: 'Operator', labelEs: 'Operador', icon: User, color: '#64748b' },
  { level: 5, key: 'viewer', label: 'Field Agent', labelEs: 'Agente de Campo', icon: Eye, color: '#78716c' },
];

const UI: Record<SupportedLanguage, {
  title: string;
  subtitle: string;
  addUser: string;
  user: string;
  role: string;
  status: string;
  joined: string;
  email: string;
  level: string;
  organization: string;
  actions: string;
  save: string;
  cancel: string;
  hierarchy: string;
}> = {
  es: {
    title: 'Usuarios',
    subtitle: 'Gestion de usuarios y jerarquia organizacional',
    addUser: 'Nuevo Usuario',
    user: 'Usuario',
    role: 'Rol',
    status: 'Estado',
    joined: 'Ingreso',
    email: 'Email',
    level: 'Nivel',
    organization: 'Organizacion',
    actions: 'Acciones',
    save: 'Guardar',
    cancel: 'Cancelar',
    hierarchy: 'Jerarquia',
  },
  en: {
    title: 'Users',
    subtitle: 'User management and organizational hierarchy',
    addUser: 'New User',
    user: 'User',
    role: 'Role',
    status: 'Status',
    joined: 'Joined',
    email: 'Email',
    level: 'Level',
    organization: 'Organization',
    actions: 'Actions',
    save: 'Save',
    cancel: 'Cancel',
    hierarchy: 'Hierarchy',
  },
  fr: {
    title: 'Utilisateurs',
    subtitle: 'Gestion des utilisateurs et hierarchie organisationnelle',
    addUser: 'Nouvel Utilisateur',
    user: 'Utilisateur',
    role: 'Role',
    status: 'Statut',
    joined: 'Rejoint',
    email: 'Email',
    level: 'Niveau',
    organization: 'Organisation',
    actions: 'Actions',
    save: 'Enregistrer',
    cancel: 'Annuler',
    hierarchy: 'Hierarchie',
  },
  de: {
    title: 'Benutzer',
    subtitle: 'Benutzerverwaltung und organisationelle Hierarchie',
    addUser: 'Neuer Benutzer',
    user: 'Benutzer',
    role: 'Rolle',
    status: 'Status',
    joined: 'Beigetreten',
    email: 'Email',
    level: 'Ebene',
    organization: 'Organisation',
    actions: 'Aktionen',
    save: 'Speichern',
    cancel: 'Abbrechen',
    hierarchy: 'Hierarchie',
  },
  pt: {
    title: 'Usuarios',
    subtitle: 'Gestao de usuarios e hierarquia organizacional',
    addUser: 'Novo Usuario',
    user: 'Usuario',
    role: 'Funcao',
    status: 'Estado',
    joined: 'Entrou',
    email: 'Email',
    level: 'Nivel',
    organization: 'Organizacao',
    actions: 'Acoes',
    save: 'Salvar',
    cancel: 'Cancelar',
    hierarchy: 'Hierarquia',
  },
  zh: {
    title: '用户',
    subtitle: '用户管理和组织层级',
    addUser: '新用户',
    user: '用户',
    role: '角色',
    status: '状态',
    joined: '加入',
    email: '邮箱',
    level: '级别',
    organization: '组织',
    actions: '操作',
    save: '保存',
    cancel: '取消',
    hierarchy: '层级',
  },
  ja: {
    title: 'ユーザー',
    subtitle: 'ユーザー管理と組織階層',
    addUser: '新規ユーザー',
    user: 'ユーザー',
    role: '役割',
    status: 'ステータス',
    joined: '参加日',
    email: 'メール',
    level: 'レベル',
    organization: '組織',
    actions: '操作',
    save: '保存',
    cancel: 'キャンセル',
    hierarchy: '階層',
  },
};

export function MembersPage() {
  const { org } = useOrg();
  const { user } = useAuth();
  const { lang } = useI18n();
  const t = UI[lang];

  const [members, setMembers] = useState<OrgMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInvite, setShowInvite] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<UserRole>('viewer');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    if (!org) return;
    const { data } = await supabase.from('organization_members').select('*, profiles(full_name, email, avatar_url)').eq('organization_id', org.id).order('created_at');
    setMembers((data ?? []) as OrgMember[]);
    setLoading(false);
  }, [org]);

  useEffect(() => { load(); }, [load]);

  async function handleInvite() {
    if (!org) return;
    setSaving(true);
    setError('');
    const { data: existing } = await supabase.from('profiles').select('id').eq('email', inviteEmail).maybeSingle();
    if (!existing) { setError(lang === 'es' ? 'Usuario no encontrado. Debe crear una cuenta primero.' : 'User not found. They must create an account first.'); setSaving(false); return; }
    const { error: err } = await supabase.from('organization_members').insert({ organization_id: org.id, user_id: existing.id, role: inviteRole });
    if (err) { setError(err.message); setSaving(false); return; }
    setSaving(false);
    setShowInvite(false);
    setInviteEmail('');
    await load();
  }

  const getLevelInfo = (role: UserRole) => {
    const levelMap: Record<string, number> = { root: 0, owner: 1, admin: 2, supervisor: 3, agent: 4, viewer: 5 };
    const level = levelMap[role] ?? 5;
    return USER_LEVELS.find(l => l.level === level) ?? USER_LEVELS[5];
  };

  return (
    <div>
      <PageHeader
        title={t.title}
        subtitle={t.subtitle}
        actions={
          <button onClick={() => setShowInvite(true)} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700">
            <Plus className="w-4 h-4" />
            {t.addUser}
          </button>
        }
      />

      {/* Hierarchy Legend */}
      <div className="mb-6 p-4 bg-slate-50 rounded-xl border border-slate-200">
        <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">{t.hierarchy}</div>
        <div className="flex flex-wrap gap-4">
          {USER_LEVELS.map(level => (
            <div key={level.level} className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ backgroundColor: level.color + '20' }}>
                <level.icon className="w-3 h-3" style={{ color: level.color }} />
              </div>
              <span className="text-xs text-slate-600">
                {level.level}: {lang === 'es' ? level.labelEs : level.label}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-400">{lang === 'es' ? 'Cargando...' : 'Loading...'}</div>
        ) : members.length === 0 ? (
          <EmptyState icon={<Users className="w-6 h-6" />} title={lang === 'es' ? 'No hay usuarios' : 'No users'} />
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase">{t.user}</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase">{t.level}</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase">{t.role}</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase">{t.status}</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase">{t.joined}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {members.map(m => {
                const profile = m.profiles;
                const levelInfo = getLevelInfo(m.role);
                return (
                  <tr key={m.id} className="hover:bg-gray-50">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white text-sm font-bold shadow-sm">
                          {(profile?.full_name ?? profile?.email ?? '?')[0].toUpperCase()}
                        </div>
                        <div>
                          <div className="text-sm font-medium text-gray-900">{profile?.full_name ?? lang === 'es' ? 'Sin nombre' : 'Unknown'}</div>
                          <div className="text-xs text-gray-400 flex items-center gap-1">
                            <Mail className="w-3 h-3" />
                            {profile?.email ?? ''}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ backgroundColor: levelInfo.color + '20' }}>
                          <levelInfo.icon className="w-3 h-3" style={{ color: levelInfo.color }} />
                        </div>
                        <span className="text-sm font-bold text-gray-600">L{levelInfo.level}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium" style={{ backgroundColor: levelInfo.color + '15', color: levelInfo.color }}>
                        {lang === 'es' ? levelInfo.labelEs : levelInfo.label}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <StatusBadge status={m.is_active ? 'active' : 'inactive'} />
                    </td>
                    <td className="px-5 py-3 text-xs text-gray-400">
                      {new Date(m.joined_at ?? m.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      <Modal
        open={showInvite}
        onClose={() => setShowInvite(false)}
        title={t.addUser}
        footer={
          <div className="flex justify-end gap-3">
            <button onClick={() => setShowInvite(false)} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-xl">{t.cancel}</button>
            <button onClick={handleInvite} disabled={saving || !inviteEmail} className="px-4 py-2 text-sm bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 disabled:opacity-50">
              {saving ? (lang === 'es' ? 'Guardando...' : 'Saving...') : t.save}
            </button>
          </div>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t.email}</label>
            <input
              type="email"
              value={inviteEmail}
              onChange={e => setInviteEmail(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="user@example.com"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t.role}</label>
            <select
              value={inviteRole}
              onChange={e => setInviteRole(e.target.value as UserRole)}
              className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {USER_LEVELS.map(level => (
                <option key={level.key} value={level.key}>
                  L{level.level}: {lang === 'es' ? level.labelEs : level.label}
                </option>
              ))}
            </select>
          </div>
          {error && <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">{error}</div>}
        </div>
      </Modal>
    </div>
  );
}

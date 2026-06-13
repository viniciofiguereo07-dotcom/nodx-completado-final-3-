import { useState, useEffect, useCallback } from 'react';
import { Building2, Plus, MapPin, Phone, Mail, Globe, Users, HardDrive, Key, Calendar, Shield, CreditCard as Edit2, Trash2, Eye, Settings } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { PageHeader } from '../../components/common/PageHeader';
import { StatusBadge } from '../../components/common/StatusBadge';
import { EmptyState } from '../../components/common/EmptyState';
import { Modal } from '../../components/common/Modal';
import { useI18n } from '../../hooks/useI18n';
import type { SupportedLanguage } from '../../types';

interface Organization {
  id: string;
  name: string;
  slug: string | null;
  type: string;
  country: string | null;
  province: string | null;
  municipality: string | null;
  contact_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  status: string;
  created_at: string;
  updated_at: string;
}

const ORG_TYPES = [
  { key: 'government', label: 'Government', labelEs: 'Gobierno' },
  { key: 'ngo', label: 'NGO', labelEs: 'ONG' },
  { key: 'cooperative', label: 'Cooperative', labelEs: 'Cooperativa' },
  { key: 'commercial', label: 'Commercial', labelEs: 'Comercial' },
  { key: 'education', label: 'Education', labelEs: 'Educacion' },
  { key: 'health', label: 'Health', labelEs: 'Salud' },
  { key: 'other', label: 'Other', labelEs: 'Otro' },
];

const ORG_STATUSES = [
  { key: 'active', label: 'Active', labelEs: 'Activa', color: '#22c55e' },
  { key: 'suspended', label: 'Suspended', labelEs: 'Suspendida', color: '#ef4444' },
  { key: 'pilot', label: 'Pilot', labelEs: 'Piloto', color: '#f59e0b' },
  { key: 'implementation', label: 'Implementation', labelEs: 'Implementacion', color: '#3b82f6' },
];

const UI: Record<SupportedLanguage, {
  title: string;
  subtitle: string;
  addOrg: string;
  type: string;
  name: string;
  country: string;
  province: string;
  municipality: string;
  contact: string;
  email: string;
  phone: string;
  status: string;
  users: string;
  devices: string;
  territories: string;
  licenses: string;
  modules: string;
  actions: string;
  save: string;
  cancel: string;
  deleteConfirm: string;
}> = {
  es: {
    title: 'Organizaciones',
    subtitle: 'Gestion del ecosistema organizacional NODX',
    addOrg: 'Nueva Organizacion',
    type: 'Tipo',
    name: 'Nombre',
    country: 'Pais',
    province: 'Provincia',
    municipality: 'Municipio',
    contact: 'Contacto Principal',
    email: 'Email Institucional',
    phone: 'Telefono',
    status: 'Estado',
    users: 'Usuarios',
    devices: 'Dispositivos',
    territories: 'Territorios',
    licenses: 'Licencias',
    modules: 'Modulos',
    actions: 'Acciones',
    save: 'Guardar',
    cancel: 'Cancelar',
    deleteConfirm: 'Esta seguro de eliminar esta organizacion?',
  },
  en: {
    title: 'Organizations',
    subtitle: 'NODX organizational ecosystem management',
    addOrg: 'New Organization',
    type: 'Type',
    name: 'Name',
    country: 'Country',
    province: 'Province',
    municipality: 'Municipality',
    contact: 'Primary Contact',
    email: 'Institutional Email',
    phone: 'Phone',
    status: 'Status',
    users: 'Users',
    devices: 'Devices',
    territories: 'Territories',
    licenses: 'Licenses',
    modules: 'Modules',
    actions: 'Actions',
    save: 'Save',
    cancel: 'Cancel',
    deleteConfirm: 'Are you sure you want to delete this organization?',
  },
  fr: {
    title: 'Organisations',
    subtitle: 'Gestion de l\'ecosysteme organisationnel NODX',
    addOrg: 'Nouvelle Organisation',
    type: 'Type',
    name: 'Nom',
    country: 'Pays',
    province: 'Province',
    municipality: 'Municipalite',
    contact: 'Contact Principal',
    email: 'Email Institutionnel',
    phone: 'Telephone',
    status: 'Statut',
    users: 'Utilisateurs',
    devices: 'Appareils',
    territories: 'Territoires',
    licenses: 'Licences',
    modules: 'Modules',
    actions: 'Actions',
    save: 'Enregistrer',
    cancel: 'Annuler',
    deleteConfirm: 'Etes-vous sur de vouloir supprimer cette organisation?',
  },
  de: {
    title: 'Organisationen',
    subtitle: 'NODX organisatorisches Okosystem-Management',
    addOrg: 'Neue Organisation',
    type: 'Typ',
    name: 'Name',
    country: 'Land',
    province: 'Provinz',
    municipality: 'Gemeinde',
    contact: 'Hauptkontakt',
    email: 'Institutionelle E-Mail',
    phone: 'Telefon',
    status: 'Status',
    users: 'Benutzer',
    devices: 'Gerate',
    territories: 'Territorien',
    licenses: 'Lizenzen',
    modules: 'Module',
    actions: 'Aktionen',
    save: 'Speichern',
    cancel: 'Abbrechen',
    deleteConfirm: 'Sind Sie sicher, dass Sie diese Organisation loschen mochten?',
  },
  pt: {
    title: 'Organizacoes',
    subtitle: 'Gestao do ecossistema organizacional NODX',
    addOrg: 'Nova Organizacao',
    type: 'Tipo',
    name: 'Nome',
    country: 'Pais',
    province: 'Provincia',
    municipality: 'Municipio',
    contact: 'Contato Principal',
    email: 'Email Institucional',
    phone: 'Telefone',
    status: 'Estado',
    users: 'Usuarios',
    devices: 'Dispositivos',
    territories: 'Territorios',
    licenses: 'Licencas',
    modules: 'Modulos',
    actions: 'Acoes',
    save: 'Salvar',
    cancel: 'Cancelar',
    deleteConfirm: 'Tem certeza de que deseja excluir esta organizacao?',
  },
  zh: {
    title: '组织',
    subtitle: 'NODX组织生态系统管理',
    addOrg: '新组织',
    type: '类型',
    name: '名称',
    country: '国家',
    province: '省',
    municipality: '市',
    contact: '主要联系人',
    email: '机构邮箱',
    phone: '电话',
    status: '状态',
    users: '用户',
    devices: '设备',
    territories: '领地',
    licenses: '许可证',
    modules: '模块',
    actions: '操作',
    save: '保存',
    cancel: '取消',
    deleteConfirm: '您确定要删除此组织吗？',
  },
  ja: {
    title: '組織',
    subtitle: 'NODX組織エコシステム管理',
    addOrg: '新規組織',
    type: 'タイプ',
    name: '名前',
    country: '国',
    province: '州',
    municipality: '市',
    contact: '主要連絡先',
    email: '機関メール',
    phone: '電話',
    status: 'ステータス',
    users: 'ユーザー',
    devices: 'デバイス',
    territories: '領域',
    licenses: 'ライセンス',
    modules: 'モジュール',
    actions: '操作',
    save: '保存',
    cancel: 'キャンセル',
    deleteConfirm: 'この組織を削除してもよろしいですか？',
  },
};

export function OrganizationsPage() {
  const { profile } = useAuth();
  const { lang } = useI18n();
  const t = UI[lang];

  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editTarget, setEditTarget] = useState<Organization | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Organization | null>(null);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    type: 'other',
    country: '',
    province: '',
    municipality: '',
    contact_name: '',
    contact_email: '',
    contact_phone: '',
    status: 'implementation',
  });

  const load = useCallback(async () => {
    const { data } = await supabase
      .from('organizations')
      .select('*')
      .order('created_at', { ascending: false });
    setOrganizations((data ?? []) as Organization[]);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  function openCreate() {
    setEditTarget(null);
    setFormData({
      name: '',
      type: 'other',
      country: '',
      province: '',
      municipality: '',
      contact_name: '',
      contact_email: '',
      contact_phone: '',
      status: 'implementation',
    });
    setShowForm(true);
  }

  function openEdit(org: Organization) {
    setEditTarget(org);
    setFormData({
      name: org.name,
      type: org.type || 'other',
      country: org.country || '',
      province: org.province || '',
      municipality: org.municipality || '',
      contact_name: org.contact_name || '',
      contact_email: org.contact_email || '',
      contact_phone: org.contact_phone || '',
      status: org.status || 'implementation',
    });
    setShowForm(true);
  }

  async function handleSave() {
    setSaving(true);
    if (editTarget) {
      await supabase.from('organizations').update({
        name: formData.name,
        type: formData.type,
        country: formData.country || null,
        province: formData.province || null,
        municipality: formData.municipality || null,
        contact_name: formData.contact_name || null,
        contact_email: formData.contact_email || null,
        contact_phone: formData.contact_phone || null,
        status: formData.status,
      }).eq('id', editTarget.id);
    } else {
      await supabase.from('organizations').insert({
        name: formData.name,
        type: formData.type,
        country: formData.country || null,
        province: formData.province || null,
        municipality: formData.municipality || null,
        contact_name: formData.contact_name || null,
        contact_email: formData.contact_email || null,
        contact_phone: formData.contact_phone || null,
        status: formData.status,
      });
    }
    setSaving(false);
    setShowForm(false);
    await load();
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    await supabase.from('organizations').delete().eq('id', deleteTarget.id);
    setDeleteTarget(null);
    await load();
  }

  const getStatusLabel = (status: string) => {
    const s = ORG_STATUSES.find(st => st.key === status);
    return lang === 'es' ? s?.labelEs : s?.label;
  };

  const getTypeLabel = (type: string) => {
    const t = ORG_TYPES.find(ty => ty.key === type);
    return lang === 'es' ? t?.labelEs : t?.label;
  };

  return (
    <div>
      <PageHeader
        title={t.title}
        subtitle={t.subtitle}
        actions={
          <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700">
            <Plus className="w-4 h-4" />
            {t.addOrg}
          </button>
        }
      />

      {loading ? (
        <div className="text-center py-12 text-gray-400">Loading...</div>
      ) : organizations.length === 0 ? (
        <EmptyState icon={<Building2 className="w-6 h-6" />} title={lang === 'es' ? 'No hay organizaciones' : 'No organizations'} />
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase">{t.name}</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase">{t.type}</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase">{t.country}</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase">{t.contact}</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase">{t.status}</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase">{t.actions}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {organizations.map(org => (
                <tr key={org.id} className="hover:bg-gray-50">
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center text-white text-sm font-bold shadow-sm">
                        {org.name[0].toUpperCase()}
                      </div>
                      <div>
                        <div className="text-sm font-medium text-gray-900">{org.name}</div>
                        <div className="text-xs text-gray-400">{org.slug || '--'}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3">
                    <span className="px-2.5 py-1 bg-gray-100 text-gray-700 text-xs font-medium rounded-lg">
                      {getTypeLabel(org.type || 'other')}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-sm text-gray-600">
                    {org.country || '--'}
                    {org.province && <span className="text-gray-400"> / {org.province}</span>}
                  </td>
                  <td className="px-5 py-3">
                    <div className="text-sm text-gray-900">{org.contact_name || '--'}</div>
                    <div className="text-xs text-gray-400">{org.contact_email || '--'}</div>
                  </td>
                  <td className="px-5 py-3">
                    <StatusBadge status={org.status || 'implementation'} />
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-1">
                      <button onClick={() => openEdit(org)} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg">
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button onClick={() => setDeleteTarget(org)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Form Modal */}
      <Modal
        open={showForm}
        onClose={() => setShowForm(false)}
        title={editTarget ? (lang === 'es' ? 'Editar Organizacion' : 'Edit Organization') : t.addOrg}
        size="lg"
        footer={
          <div className="flex justify-end gap-3">
            <button onClick={() => setShowForm(false)} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-xl">
              {t.cancel}
            </button>
            <button onClick={handleSave} disabled={saving || !formData.name} className="px-4 py-2 text-sm bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 disabled:opacity-50">
              {saving ? (lang === 'es' ? 'Guardando...' : 'Saving...') : t.save}
            </button>
          </div>
        }
      >
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">{t.name} *</label>
            <input
              type="text"
              value={formData.name}
              onChange={e => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t.type}</label>
            <select
              value={formData.type}
              onChange={e => setFormData({ ...formData, type: e.target.value })}
              className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {ORG_TYPES.map(t => (
                <option key={t.key} value={t.key}>{lang === 'es' ? t.labelEs : t.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t.status}</label>
            <select
              value={formData.status}
              onChange={e => setFormData({ ...formData, status: e.target.value })}
              className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {ORG_STATUSES.map(s => (
                <option key={s.key} value={s.key}>{lang === 'es' ? s.labelEs : s.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t.country}</label>
            <input
              type="text"
              value={formData.country}
              onChange={e => setFormData({ ...formData, country: e.target.value })}
              className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t.province}</label>
            <input
              type="text"
              value={formData.province}
              onChange={e => setFormData({ ...formData, province: e.target.value })}
              className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t.municipality}</label>
            <input
              type="text"
              value={formData.municipality}
              onChange={e => setFormData({ ...formData, municipality: e.target.value })}
              className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t.contact}</label>
            <input
              type="text"
              value={formData.contact_name}
              onChange={e => setFormData({ ...formData, contact_name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t.email}</label>
            <input
              type="email"
              value={formData.contact_email}
              onChange={e => setFormData({ ...formData, contact_email: e.target.value })}
              className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t.phone}</label>
            <input
              type="tel"
              value={formData.contact_phone}
              onChange={e => setFormData({ ...formData, contact_phone: e.target.value })}
              className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      </Modal>

      {/* Delete Confirmation */}
      <Modal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title={lang === 'es' ? 'Eliminar Organizacion' : 'Delete Organization'}
        footer={
          <div className="flex justify-end gap-3">
            <button onClick={() => setDeleteTarget(null)} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-xl">
              {t.cancel}
            </button>
            <button onClick={handleDelete} className="px-4 py-2 text-sm bg-red-600 text-white font-semibold rounded-xl hover:bg-red-700">
              {lang === 'es' ? 'Eliminar' : 'Delete'}
            </button>
          </div>
        }
      >
        <p className="text-sm text-gray-600">{t.deleteConfirm}</p>
      </Modal>
    </div>
  );
}

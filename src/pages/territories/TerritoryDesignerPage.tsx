import { useState, useEffect, useCallback } from 'react';
import { MapPin, Plus, ChevronRight, ChevronDown, CreditCard as Edit2, Trash2, AlertCircle, Search, Globe, Building2, Map, Flag } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useOrg } from '../../contexts/OrgContext';
import { PageHeader } from '../../components/common/PageHeader';
import { Modal } from '../../components/common/Modal';
import { StatusBadge } from '../../components/common/StatusBadge';
import { EmptyState } from '../../components/common/EmptyState';
import { useI18n } from '../../hooks/useI18n';
import type { SupportedLanguage, Territory, TerritoryLevel } from '../../types';
import { TERRITORY_LEVELS } from '../../types';

const LEVEL_COLORS: Record<TerritoryLevel, string> = {
  country: '#dc2626',
  region: '#ea580c',
  province: '#d97706',
  municipality: '#ca8a04',
  district: '#65a30d',
  sector: '#16a34a',
  zone: '#0891b2',
  microzone: '#2563eb',
};

const LEVEL_ICONS: Record<TerritoryLevel, React.ComponentType<{ className?: string }>> = {
  country: Flag,
  region: Globe,
  province: Map,
  municipality: Building2,
  district: MapPin,
  sector: MapPin,
  zone: MapPin,
  microzone: MapPin,
};

const UI: Record<SupportedLanguage, {
  title: string;
  subtitle: string;
  newTerritory: string;
  searchPlaceholder: string;
  noTerritories: string;
  startByAdding: string;
  totalTerritories: string;
  hierarchy: string;
  level: string;
  parent: string;
  children: string;
  color: string;
  description: string;
  name: string;
  save: string;
  cancel: string;
  editTerritory: string;
  newChildTerritory: string;
  deleteTerritory: string;
  deleteWarning: string;
  selectTerritory: string;
  clickToView: string;
  addingChildTo: string;
  territoryName: string;
  country: string;
  region: string;
  province: string;
  municipality: string;
  district: string;
  sector: string;
  zone: string;
  microzone: string;
}> = {
  es: {
    title: 'Territorios',
    subtitle: 'Gestion de jerarquia geografica y territorial',
    newTerritory: 'Nuevo Territorio',
    searchPlaceholder: 'Buscar territorios...',
    noTerritories: 'Sin territorios',
    startByAdding: 'Comience agregando un pais o territorio de nivel superior',
    totalTerritories: 'Total Territorios',
    hierarchy: 'Jerarquia',
    level: 'Nivel',
    parent: 'Padre',
    children: 'Sub-territorios',
    color: 'Color',
    description: 'Descripcion',
    name: 'Nombre',
    save: 'Guardar',
    cancel: 'Cancelar',
    editTerritory: 'Editar Territorio',
    newChildTerritory: 'Nuevo Sub-territorio',
    deleteTerritory: 'Eliminar Territorio',
    deleteWarning: 'Esto eliminara todos los territorios hijos y no se puede deshacer.',
    selectTerritory: 'Seleccione un territorio',
    clickToView: 'Haga clic en un territorio para ver detalles',
    addingChildTo: 'Agregando hijo a:',
    territoryName: 'Nombre del territorio',
    country: 'Pais',
    region: 'Region',
    province: 'Provincia',
    municipality: 'Municipio',
    district: 'Distrito',
    sector: 'Sector',
    zone: 'Zona',
    microzone: 'Microzona',
  },
  en: {
    title: 'Territories',
    subtitle: 'Geographic and territorial hierarchy management',
    newTerritory: 'New Territory',
    searchPlaceholder: 'Search territories...',
    noTerritories: 'No territories',
    startByAdding: 'Start by adding a country or top-level territory',
    totalTerritories: 'Total Territories',
    hierarchy: 'Hierarchy',
    level: 'Level',
    parent: 'Parent',
    children: 'Sub-territories',
    color: 'Color',
    description: 'Description',
    name: 'Name',
    save: 'Save',
    cancel: 'Cancel',
    editTerritory: 'Edit Territory',
    newChildTerritory: 'New Sub-territory',
    deleteTerritory: 'Delete Territory',
    deleteWarning: 'This will also remove all child territories and cannot be undone.',
    selectTerritory: 'Select a territory',
    clickToView: 'Click any territory to view details',
    addingChildTo: 'Adding child to:',
    territoryName: 'Territory name',
    country: 'Country',
    region: 'Region',
    province: 'Province',
    municipality: 'Municipality',
    district: 'District',
    sector: 'Sector',
    zone: 'Zone',
    microzone: 'Microzone',
  },
  fr: {
    title: 'Territoires',
    subtitle: 'Gestion de la hierarchie geographique et territoriale',
    newTerritory: 'Nouveau Territoire',
    searchPlaceholder: 'Rechercher des territoires...',
    noTerritories: 'Pas de territoires',
    startByAdding: 'Commencez par ajouter un pays ou un territoire de niveau superieur',
    totalTerritories: 'Total Territoires',
    hierarchy: 'Hierarchie',
    level: 'Niveau',
    parent: 'Parent',
    children: 'Sous-territoires',
    color: 'Couleur',
    description: 'Description',
    name: 'Nom',
    save: 'Enregistrer',
    cancel: 'Annuler',
    editTerritory: 'Modifier Territoire',
    newChildTerritory: 'Nouveau Sous-territoire',
    deleteTerritory: 'Supprimer Territoire',
    deleteWarning: 'Cela supprimera egalement tous les sous-territoires et ne peut pas etre annule.',
    selectTerritory: 'Selectionnez un territoire',
    clickToView: 'Cliquez sur un territoire pour voir les details',
    addingChildTo: 'Ajout enfant a:',
    territoryName: 'Nom du territoire',
    country: 'Pays',
    region: 'Region',
    province: 'Province',
    municipality: 'Municipalite',
    district: 'District',
    sector: 'Secteur',
    zone: 'Zone',
    microzone: 'Microzone',
  },
  de: {
    title: 'Gebiete',
    subtitle: 'Geografische und territoriale Hierarchieverwaltung',
    newTerritory: 'Neues Gebiet',
    searchPlaceholder: 'Gebiete suchen...',
    noTerritories: 'Keine Gebiete',
    startByAdding: 'Beginnen Sie mit dem Hinzufugen eines Landes oder Gebiets der obersten Ebene',
    totalTerritories: 'Gesamtgebiete',
    hierarchy: 'Hierarchie',
    level: 'Ebene',
    parent: 'Ubergeordnet',
    children: 'Untergebiete',
    color: 'Farbe',
    description: 'Beschreibung',
    name: 'Name',
    save: 'Speichern',
    cancel: 'Abbrechen',
    editTerritory: 'Gebiet bearbeiten',
    newChildTerritory: 'Neues Untergebiet',
    deleteTerritory: 'Gebiet loschen',
    deleteWarning: 'Dadurch werden auch alle Untergebiete geloscht und kann nicht ruckgangig gemacht werden.',
    selectTerritory: 'Wahlen Sie ein Gebiet',
    clickToView: 'Klicken Sie auf ein Gebiet, um Details anzuzeigen',
    addingChildTo: 'Kind hinzufugen zu:',
    territoryName: 'Gebietsname',
    country: 'Land',
    region: 'Region',
    province: 'Provinz',
    municipality: 'Gemeinde',
    district: 'Bezirk',
    sector: 'Sektor',
    zone: 'Zone',
    microzone: 'Mikrozone',
  },
  pt: {
    title: 'Territorios',
    subtitle: 'Gestao de hierarquia geografica e territorial',
    newTerritory: 'Novo Territorio',
    searchPlaceholder: 'Pesquisar territorios...',
    noTerritories: 'Sem territorios',
    startByAdding: 'Comece adicionando um pais ou territorio de nivel superior',
    totalTerritories: 'Total Territorios',
    hierarchy: 'Hierarquia',
    level: 'Nivel',
    parent: 'Pai',
    children: 'Sub-territorios',
    color: 'Cor',
    description: 'Descricao',
    name: 'Nome',
    save: 'Salvar',
    cancel: 'Cancelar',
    editTerritory: 'Editar Territorio',
    newChildTerritory: 'Novo Sub-territorio',
    deleteTerritory: 'Excluir Territorio',
    deleteWarning: 'Isso tambem removera todos os sub-territorios e nao pode ser desfeito.',
    selectTerritory: 'Selecione um territorio',
    clickToView: 'Clique em qualquer territorio para ver detalhes',
    addingChildTo: 'Adicionando filho a:',
    territoryName: 'Nome do territorio',
    country: 'Pais',
    region: 'Regiao',
    province: 'Provincia',
    municipality: 'Municipio',
    district: 'Distrito',
    sector: 'Setor',
    zone: 'Zona',
    microzone: 'Microzona',
  },
  zh: {
    title: '区域',
    subtitle: '地理和区域层级管理',
    newTerritory: '新建区域',
    searchPlaceholder: '搜索区域...',
    noTerritories: '无区域',
    startByAdding: '首先添加国家或顶级区域',
    totalTerritories: '总计区域',
    hierarchy: '层级',
    level: '级别',
    parent: '父级',
    children: '子区域',
    color: '颜色',
    description: '描述',
    name: '名称',
    save: '保存',
    cancel: '取消',
    editTerritory: '编辑区域',
    newChildTerritory: '新建子区域',
    deleteTerritory: '删除区域',
    deleteWarning: '这将删除所有子区域且无法撤销。',
    selectTerritory: '选择区域',
    clickToView: '点击任意区域查看详情',
    addingChildTo: '添加子项到：',
    territoryName: '区域名称',
    country: '国家',
    region: '地区',
    province: '省份',
    municipality: '市',
    district: '区',
    sector: '部门',
    zone: '区域',
    microzone: '微区',
  },
  ja: {
    title: '領域',
    subtitle: '地理的および領域的階層管理',
    newTerritory: '新規領域',
    searchPlaceholder: '領域を検索...',
    noTerritories: '領域なし',
    startByAdding: '国または最上位の領域を追加して開始します',
    totalTerritories: '合計領域',
    hierarchy: '階層',
    level: 'レベル',
    parent: '親',
    children: '子領域',
    color: '色',
    description: '説明',
    name: '名前',
    save: '保存',
    cancel: 'キャンセル',
    editTerritory: '領域を編集',
    newChildTerritory: '新規子領域',
    deleteTerritory: '領域を削除',
    deleteWarning: 'すべての子領域も削除され、元に戻せません。',
    selectTerritory: '領域を選択',
    clickToView: '領域をクリックして詳細を表示',
    addingChildTo: '子を追加：',
    territoryName: '領域名',
    country: '国',
    region: '地域',
    province: '州',
    municipality: '市',
    district: '区',
    sector: 'セクター',
    zone: 'ゾーン',
    microzone: 'マイクロゾーン',
  },
};

const LEVEL_LABELS_BY_LANG: Record<SupportedLanguage, Record<TerritoryLevel, string>> = {
  es: { country: 'Pais', region: 'Region', province: 'Provincia', municipality: 'Municipio', district: 'Distrito', sector: 'Sector', zone: 'Zona', microzone: 'Microzona' },
  en: { country: 'Country', region: 'Region', province: 'Province', municipality: 'Municipality', district: 'District', sector: 'Sector', zone: 'Zone', microzone: 'Microzone' },
  fr: { country: 'Pays', region: 'Region', province: 'Province', municipality: 'Municipalite', district: 'District', sector: 'Secteur', zone: 'Zone', microzone: 'Microzone' },
  de: { country: 'Land', region: 'Region', province: 'Provinz', municipality: 'Gemeinde', district: 'Bezirk', sector: 'Sektor', zone: 'Zone', microzone: 'Mikrozone' },
  pt: { country: 'Pais', region: 'Regiao', province: 'Provincia', municipality: 'Municipio', district: 'Distrito', sector: 'Setor', zone: 'Zona', microzone: 'Microzona' },
  zh: { country: '国家', region: '地区', province: '省份', municipality: '市', district: '区', sector: '部门', zone: '区域', microzone: '微区' },
  ja: { country: '国', region: '地域', province: '州', municipality: '市', district: '区', sector: 'セクター', zone: 'ゾーン', microzone: 'マイクロゾーン' },
};

function buildTree(territories: Territory[]): Territory[] {
  const map = new Map<string, Territory>(territories.map(t => [t.id, { ...t, children: [] }]));
  const roots: Territory[] = [];
  map.forEach(t => {
    if (t.parent_id && map.has(t.parent_id)) {
      map.get(t.parent_id)!.children!.push(t);
    } else {
      roots.push(t);
    }
  });
  return roots;
}

interface TerritoryNodeProps {
  territory: Territory;
  depth: number;
  selected: string | null;
  expanded: Set<string>;
  onSelect: (t: Territory) => void;
  onToggle: (id: string) => void;
  onEdit: (t: Territory) => void;
  onDelete: (t: Territory) => void;
  onAddChild: (parent: Territory) => void;
  lang: SupportedLanguage;
}

function TerritoryNode({ territory, depth, selected, expanded, onSelect, onToggle, onEdit, onDelete, onAddChild, lang }: TerritoryNodeProps) {
  const hasChildren = (territory.children?.length ?? 0) > 0;
  const isExpanded = expanded.has(territory.id);
  const isSelected = selected === territory.id;
  const levelLabel = LEVEL_LABELS_BY_LANG[lang][territory.level as TerritoryLevel] ?? territory.level;
  const Icon = LEVEL_ICONS[territory.level as TerritoryLevel] ?? MapPin;

  return (
    <div>
      <div
        className={`group flex items-center gap-2 px-3 py-2 rounded-xl cursor-pointer transition-all text-sm select-none ${
          isSelected ? 'bg-blue-50 border border-blue-200' : 'hover:bg-gray-50'
        }`}
        style={{ paddingLeft: `${12 + depth * 20}px` }}
        onClick={() => onSelect(territory)}
      >
        <button
          onClick={e => { e.stopPropagation(); onToggle(territory.id); }}
          className={`w-4 h-4 flex-shrink-0 text-gray-400 ${!hasChildren ? 'invisible' : ''}`}
        >
          {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        </button>
        <div
          className="w-2 h-2 rounded-full flex-shrink-0"
          style={{ backgroundColor: territory.color || LEVEL_COLORS[territory.level as TerritoryLevel] }}
        />
        <Icon className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
        <span className={`flex-1 truncate font-medium ${isSelected ? 'text-blue-700' : 'text-gray-800'}`}>
          {territory.name}
        </span>
        <span className="text-xs text-gray-400 hidden group-hover:inline">{levelLabel}</span>
        <div className="hidden group-hover:flex items-center gap-1">
          <button
            onClick={e => { e.stopPropagation(); onAddChild(territory); }}
            className="p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg"
            title="Add child"
          >
            <Plus className="w-3 h-3" />
          </button>
          <button
            onClick={e => { e.stopPropagation(); onEdit(territory); }}
            className="p-1 text-gray-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg"
          >
            <Edit2 className="w-3 h-3" />
          </button>
          <button
            onClick={e => { e.stopPropagation(); onDelete(territory); }}
            className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        </div>
      </div>
      {isExpanded && hasChildren && territory.children?.map(child => (
        <TerritoryNode
          key={child.id}
          territory={child}
          depth={depth + 1}
          selected={selected}
          expanded={expanded}
          onSelect={onSelect}
          onToggle={onToggle}
          onEdit={onEdit}
          onDelete={onDelete}
          onAddChild={onAddChild}
          lang={lang}
        />
      ))}
    </div>
  );
}

export function TerritoryDesignerPage() {
  const { org } = useOrg();
  const { lang } = useI18n();
  const t = UI[lang];

  const [territories, setTerritories] = useState<Territory[]>([]);
  const [tree, setTree] = useState<Territory[]>([]);
  const [selected, setSelected] = useState<Territory | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editTarget, setEditTarget] = useState<Territory | null>(null);
  const [parentForNew, setParentForNew] = useState<Territory | null>(null);
  const [formData, setFormData] = useState({ name: '', level: 'country' as TerritoryLevel, description: '', color: '#dc2626', country: '', province: '', municipality: '', sector: '' });
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Territory | null>(null);

  const load = useCallback(async () => {
    if (!org) return;
    const { data } = await supabase
      .from('territories')
      .select('*')
      .eq('organization_id', org.id)
      .order('level_order')
      .order('name');
    const all = (data ?? []) as Territory[];
    setTerritories(all);
    setTree(buildTree(all));
    setLoading(false);
  }, [org]);

  useEffect(() => { load(); }, [load]);

  function toggleExpanded(id: string) {
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function openCreate(parent?: Territory) {
    setEditTarget(null);
    setParentForNew(parent ?? null);
    const level = parent
      ? TERRITORY_LEVELS[Math.min(TERRITORY_LEVELS.indexOf(parent.level as TerritoryLevel) + 1, TERRITORY_LEVELS.length - 1)]
      : 'country';
    setFormData({
      name: '',
      level: level as TerritoryLevel,
      description: '',
      color: LEVEL_COLORS[level as TerritoryLevel] ?? '#3B82F6',
      country: '',
      province: '',
      municipality: '',
      sector: '',
    });
    setShowForm(true);
  }

  function openEdit(t: Territory) {
    setEditTarget(t);
    setParentForNew(null);
    setFormData({
      name: t.name,
      level: t.level as TerritoryLevel,
      description: t.description ?? '',
      color: t.color,
      country: (t.metadata?.country as string) ?? '',
      province: (t.metadata?.province as string) ?? '',
      municipality: (t.metadata?.municipality as string) ?? '',
      sector: (t.metadata?.sector as string) ?? '',
    });
    setShowForm(true);
  }

  async function handleSave() {
    if (!org) return;
    setSaving(true);
    const payload = {
      organization_id: org.id,
      name: formData.name,
      level: formData.level,
      level_order: TERRITORY_LEVELS.indexOf(formData.level),
      description: formData.description || null,
      color: formData.color,
      parent_id: editTarget ? editTarget.parent_id : (parentForNew?.id ?? null),
      metadata: {
        country: formData.country || null,
        province: formData.province || null,
        municipality: formData.municipality || null,
        sector: formData.sector || null,
      },
    };
    if (editTarget) {
      await supabase.from('territories').update(payload).eq('id', editTarget.id);
    } else {
      await supabase.from('territories').insert(payload);
    }
    setSaving(false);
    setShowForm(false);
    await load();
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    await supabase.from('territories').delete().eq('id', deleteTarget.id);
    if (selected?.id === deleteTarget.id) setSelected(null);
    setDeleteTarget(null);
    await load();
  }

  const filtered = search
    ? territories.filter(t => t.name.toLowerCase().includes(search.toLowerCase()))
    : null;

  const stats = {
    total: territories.length,
    byLevel: TERRITORY_LEVELS.reduce((acc, l) => {
      acc[l] = territories.filter(t => t.level === l).length;
      return acc;
    }, {} as Record<string, number>),
  };

  const levelLabel = LEVEL_LABELS_BY_LANG[lang];

  return (
    <div className="h-[calc(100vh-7rem)]">
      <PageHeader
        title={t.title}
        subtitle={t.subtitle}
        actions={
          <button
            onClick={() => openCreate()}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4" /> {t.newTerritory}
          </button>
        }
      />

      <div className="flex gap-6 h-[calc(100%-4rem)]">
        {/* Tree Panel */}
        <div className="w-80 flex-shrink-0 bg-white rounded-2xl border border-gray-100 shadow-sm flex flex-col overflow-hidden">
          <div className="p-4 border-b border-gray-100">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder={t.searchPlaceholder}
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-sm bg-gray-50 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-2">
            {loading ? (
              <div className="p-4 text-center text-gray-400 text-sm">{lang === 'es' ? 'Cargando...' : 'Loading...'}</div>
            ) : search && filtered ? (
              filtered.length === 0 ? (
                <div className="p-4 text-center text-gray-400 text-sm">{lang === 'es' ? 'Sin resultados' : 'No results'}</div>
              ) : (
                filtered.map(t => (
                  <div
                    key={t.id}
                    onClick={() => setSelected(t)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-xl cursor-pointer text-sm ${selected?.id === t.id ? 'bg-blue-50' : 'hover:bg-gray-50'}`}
                  >
                    <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: t.color }} />
                    <span className="truncate">{t.name}</span>
                    <span className="text-xs text-gray-400">{levelLabel[t.level as TerritoryLevel]}</span>
                  </div>
                ))
              )
            ) : tree.length === 0 ? (
              <EmptyState
                icon={<MapPin className="w-6 h-6" />}
                title={t.noTerritories}
                description={t.startByAdding}
              />
            ) : (
              tree.map(t => (
                <TerritoryNode
                  key={t.id}
                  territory={t}
                  depth={0}
                  selected={selected?.id ?? null}
                  expanded={expanded}
                  onSelect={setSelected}
                  onToggle={toggleExpanded}
                  onEdit={openEdit}
                  onDelete={setDeleteTarget}
                  onAddChild={openCreate}
                  lang={lang}
                />
              ))
            )}
          </div>
        </div>

        {/* Detail + Stats Panel */}
        <div className="flex-1 flex flex-col gap-4 overflow-y-auto">
          {/* Stats row */}
          <div className="grid grid-cols-4 gap-3">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
              <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
              <div className="text-xs text-gray-500 mt-1">{t.totalTerritories}</div>
            </div>
            {(['country', 'province', 'municipality'] as TerritoryLevel[]).map(l => (
              <div key={l} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
                <div className="text-2xl font-bold text-gray-900">{stats.byLevel[l] ?? 0}</div>
                <div className="text-xs text-gray-500 mt-1">{levelLabel[l]}</div>
              </div>
            ))}
          </div>

          {/* Territory detail */}
          {selected ? (
            <div className="flex-1 bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <div className="flex items-start justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center"
                    style={{ backgroundColor: selected.color + '20' }}
                  >
                    <MapPin className="w-5 h-5" style={{ color: selected.color }} />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">{selected.name}</h2>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-sm text-gray-500">{levelLabel[selected.level as TerritoryLevel]}</span>
                      <StatusBadge status={selected.is_active ? 'active' : 'inactive'} />
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => openEdit(selected)}
                    className="flex items-center gap-1.5 px-3 py-2 text-sm border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
                  >
                    <Edit2 className="w-4 h-4" /> {t.cancel}
                  </button>
                  <button
                    onClick={() => openCreate(selected)}
                    className="flex items-center gap-1.5 px-3 py-2 text-sm bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors"
                  >
                    <Plus className="w-4 h-4" /> {t.newChildTerritory}
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="p-4 bg-gray-50 rounded-xl">
                  <div className="text-xs text-gray-500 mb-1">{t.level}</div>
                  <div className="font-semibold text-gray-900">{levelLabel[selected.level as TerritoryLevel]}</div>
                </div>
                <div className="p-4 bg-gray-50 rounded-xl">
                  <div className="text-xs text-gray-500 mb-1">{t.parent}</div>
                  <div className="font-semibold text-gray-900">
                    {selected.parent_id
                      ? (territories.find(t => t.id === selected.parent_id)?.name ?? '—')
                      : 'Root'}
                  </div>
                </div>
                <div className="p-4 bg-gray-50 rounded-xl">
                  <div className="text-xs text-gray-500 mb-1">{t.children}</div>
                  <div className="font-semibold text-gray-900">
                    {territories.filter(t => t.parent_id === selected.id).length}
                  </div>
                </div>
                <div className="p-4 bg-gray-50 rounded-xl">
                  <div className="text-xs text-gray-500 mb-1">{t.color}</div>
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 rounded-md border border-gray-200" style={{ backgroundColor: selected.color }} />
                    <span className="font-mono text-sm font-semibold">{selected.color}</span>
                  </div>
                </div>
              </div>

              {/* Geographic metadata */}
              {selected.metadata && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
                  {(selected.metadata as Record<string, unknown>).country && (
                    <div className="p-3 bg-gray-50 rounded-xl">
                      <div className="text-xs text-gray-500 mb-1">{t.country}</div>
                      <div className="text-sm font-semibold text-gray-900">{(selected.metadata as Record<string, unknown>).country as string}</div>
                    </div>
                  )}
                  {(selected.metadata as Record<string, unknown>).province && (
                    <div className="p-3 bg-gray-50 rounded-xl">
                      <div className="text-xs text-gray-500 mb-1">{t.province}</div>
                      <div className="text-sm font-semibold text-gray-900">{(selected.metadata as Record<string, unknown>).province as string}</div>
                    </div>
                  )}
                  {(selected.metadata as Record<string, unknown>).municipality && (
                    <div className="p-3 bg-gray-50 rounded-xl">
                      <div className="text-xs text-gray-500 mb-1">{t.municipality}</div>
                      <div className="text-sm font-semibold text-gray-900">{(selected.metadata as Record<string, unknown>).municipality as string}</div>
                    </div>
                  )}
                  {(selected.metadata as Record<string, unknown>).sector && (
                    <div className="p-3 bg-gray-50 rounded-xl">
                      <div className="text-xs text-gray-500 mb-1">{t.sector}</div>
                      <div className="text-sm font-semibold text-gray-900">{(selected.metadata as Record<string, unknown>).sector as string}</div>
                    </div>
                  )}
                </div>
              )}

              {selected.description && (
                <div className="p-4 bg-gray-50 rounded-xl mb-6">
                  <div className="text-xs text-gray-500 mb-1">{t.description}</div>
                  <div className="text-sm text-gray-700">{selected.description}</div>
                </div>
              )}

              {/* Children list */}
              {territories.filter(t => t.parent_id === selected.id).length > 0 && (
                <div>
                  <div className="text-sm font-semibold text-gray-700 mb-2">{t.children}</div>
                  <div className="space-y-1">
                    {territories.filter(t => t.parent_id === selected.id).map(child => (
                      <div
                        key={child.id}
                        className="flex items-center gap-2 p-3 bg-gray-50 rounded-xl cursor-pointer hover:bg-blue-50 transition-colors text-sm"
                        onClick={() => setSelected(child)}
                      >
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: child.color }} />
                        <span className="font-medium">{child.name}</span>
                        <span className="text-gray-400 text-xs ml-auto">{levelLabel[child.level as TerritoryLevel]}</span>
                        <ChevronRight className="w-4 h-4 text-gray-300" />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex-1 bg-white rounded-2xl border border-gray-100 shadow-sm flex items-center justify-center">
              <EmptyState
                icon={<MapPin className="w-6 h-6" />}
                title={t.selectTerritory}
                description={t.clickToView}
              />
            </div>
          )}

          {/* Level summary */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
            <div className="text-sm font-semibold text-gray-700 mb-3">{t.hierarchy}</div>
            <div className="flex flex-wrap gap-2">
              {TERRITORY_LEVELS.map(l => {
                const count = stats.byLevel[l] ?? 0;
                if (count === 0) return null;
                return (
                  <div key={l} className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 rounded-lg text-xs">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: LEVEL_COLORS[l] }} />
                    <span className="font-medium">{levelLabel[l]}</span>
                    <span className="text-gray-400 font-bold">{count}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Create / Edit Modal */}
      <Modal
        open={showForm}
        onClose={() => setShowForm(false)}
        title={editTarget ? t.editTerritory : parentForNew ? t.newChildTerritory : t.newTerritory}
        footer={
          <div className="flex justify-end gap-3">
            <button onClick={() => setShowForm(false)} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-xl transition-colors">{t.cancel}</button>
            <button
              onClick={handleSave}
              disabled={saving || !formData.name}
              className="px-4 py-2 text-sm bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {saving ? (lang === 'es' ? 'Guardando...' : 'Saving...') : t.save}
            </button>
          </div>
        }
      >
        <div className="space-y-4">
          {parentForNew && (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-sm text-blue-700">
              {t.addingChildTo} <strong>{parentForNew.name}</strong>
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t.name} *</label>
            <input
              type="text"
              value={formData.name}
              onChange={e => setFormData(p => ({ ...p, name: e.target.value }))}
              placeholder={t.territoryName}
              className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t.level}</label>
            <select
              value={formData.level}
              onChange={e => {
                const l = e.target.value as TerritoryLevel;
                setFormData(p => ({ ...p, level: l, color: LEVEL_COLORS[l] ?? p.color }));
              }}
              className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {TERRITORY_LEVELS.map(l => (
                <option key={l} value={l}>{levelLabel[l]}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t.color}</label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={formData.color}
                onChange={e => setFormData(p => ({ ...p, color: e.target.value }))}
                className="w-10 h-10 border border-gray-200 rounded-xl cursor-pointer"
              />
              <span className="text-sm font-mono text-gray-600">{formData.color}</span>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t.country}</label>
              <input
                type="text"
                value={formData.country}
                onChange={e => setFormData(p => ({ ...p, country: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t.province}</label>
              <input
                type="text"
                value={formData.province}
                onChange={e => setFormData(p => ({ ...p, province: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t.municipality}</label>
              <input
                type="text"
                value={formData.municipality}
                onChange={e => setFormData(p => ({ ...p, municipality: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t.sector}</label>
              <input
                type="text"
                value={formData.sector}
                onChange={e => setFormData(p => ({ ...p, sector: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t.description}</label>
            <textarea
              value={formData.description}
              onChange={e => setFormData(p => ({ ...p, description: e.target.value }))}
              rows={3}
              placeholder={t.description}
              className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      </Modal>

      {/* Delete Confirm */}
      <Modal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title={t.deleteTerritory}
        footer={
          <div className="flex justify-end gap-3">
            <button onClick={() => setDeleteTarget(null)} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-xl">{t.cancel}</button>
            <button onClick={handleDelete} className="px-4 py-2 text-sm bg-red-600 text-white font-semibold rounded-xl hover:bg-red-700">{lang === 'es' ? 'Eliminar' : 'Delete'}</button>
          </div>
        }
      >
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-gray-600">
            {lang === 'es' ? 'Eliminar' : 'Delete'} <strong>{deleteTarget?.name}</strong>? {t.deleteWarning}
          </div>
        </div>
      </Modal>
    </div>
  );
}

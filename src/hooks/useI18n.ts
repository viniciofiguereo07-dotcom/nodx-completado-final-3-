import { useState, useEffect, useCallback, createContext, useContext } from 'react';
import type { SupportedLanguage, LanguageConfig } from '../types';

export const LANGUAGES: LanguageConfig[] = [
  { code: 'es', label: 'Spanish',    nativeLabel: 'Español' },
  { code: 'en', label: 'English',    nativeLabel: 'English' },
  { code: 'fr', label: 'French',     nativeLabel: 'Français' },
  { code: 'de', label: 'German',     nativeLabel: 'Deutsch' },
  { code: 'pt', label: 'Portuguese', nativeLabel: 'Português' },
  { code: 'zh', label: 'Chinese',    nativeLabel: '中文' },
  { code: 'ja', label: 'Japanese',   nativeLabel: '日本語' },
];

type TranslationMap = Record<string, Record<SupportedLanguage, string>>;

const STORAGE_KEY = 'nodx_lang';

const BUILTIN: TranslationMap = {
  'nav.dashboard':     { es: 'Tablero',        en: 'Dashboard',       fr: 'Tableau de bord', de: 'Dashboard',    pt: 'Painel',       zh: '仪表板',   ja: 'ダッシュボード' },
  'nav.territories':   { es: 'Territorios',    en: 'Territories',     fr: 'Territoires',     de: 'Gebiete',      pt: 'Territórios',  zh: '区域',     ja: '地域' },
  'nav.routes':        { es: 'Rutas',          en: 'Routes',          fr: 'Itinéraires',     de: 'Routen',       pt: 'Rotas',        zh: '路线',     ja: 'ルート' },
  'nav.visits':        { es: 'Visitas',        en: 'Visits',          fr: 'Visites',         de: 'Besuche',      pt: 'Visitas',      zh: '访问',     ja: '訪問' },
  'nav.forms':         { es: 'Formularios',    en: 'Forms',           fr: 'Formulaires',     de: 'Formulare',    pt: 'Formulários',  zh: '表单',     ja: 'フォーム' },
  'nav.analytics':     { es: 'Analítica',      en: 'Analytics',       fr: 'Analytique',      de: 'Analytik',     pt: 'Análise',      zh: '分析',     ja: '分析' },
  'nav.members':       { es: 'Miembros',       en: 'Members',         fr: 'Membres',         de: 'Mitglieder',   pt: 'Membros',      zh: '成员',     ja: 'メンバー' },
  'nav.inventory':     { es: 'Inventario',     en: 'Inventory',       fr: 'Inventaire',      de: 'Inventar',     pt: 'Inventário',   zh: '库存',     ja: '在庫' },
  'nav.import':        { es: 'Importación',    en: 'Import',          fr: 'Importation',     de: 'Import',       pt: 'Importação',   zh: '导入',     ja: 'インポート' },
  'nav.geography':     { es: 'Geografía',      en: 'Geography',       fr: 'Géographie',      de: 'Geographie',   pt: 'Geografia',    zh: '地理',     ja: '地理' },
  'nav.governance':    { es: 'Gobernanza',     en: 'Governance',      fr: 'Gouvernance',     de: 'Governance',   pt: 'Governança',   zh: '治理',     ja: 'ガバナンス' },
  'nav.diagnostics':   { es: 'Diagnóstico',    en: 'Diagnostics',     fr: 'Diagnostics',     de: 'Diagnose',     pt: 'Diagnóstico',  zh: '诊断',     ja: '診断' },
  'nav.taxonomy':      { es: 'Taxonomía',      en: 'Taxonomy',        fr: 'Taxonomie',       de: 'Taxonomie',    pt: 'Taxonomia',    zh: '分类',     ja: '分類' },
  'nav.documents':     { es: 'Documentos',     en: 'Documents',       fr: 'Documents',       de: 'Dokumente',    pt: 'Documentos',   zh: '文件',     ja: 'ドキュメント' },
  'common.save':       { es: 'Guardar',        en: 'Save',            fr: 'Enregistrer',     de: 'Speichern',    pt: 'Salvar',       zh: '保存',     ja: '保存' },
  'common.cancel':     { es: 'Cancelar',       en: 'Cancel',          fr: 'Annuler',         de: 'Abbrechen',    pt: 'Cancelar',     zh: '取消',     ja: 'キャンセル' },
  'common.delete':     { es: 'Eliminar',       en: 'Delete',          fr: 'Supprimer',       de: 'Löschen',      pt: 'Excluir',      zh: '删除',     ja: '削除' },
  'common.edit':       { es: 'Editar',         en: 'Edit',            fr: 'Modifier',        de: 'Bearbeiten',   pt: 'Editar',       zh: '编辑',     ja: '編集' },
  'common.loading':    { es: 'Cargando...',    en: 'Loading...',      fr: 'Chargement...',   de: 'Laden...',     pt: 'Carregando...', zh: '加载中...', ja: '読み込み中...' },
  'common.search':     { es: 'Buscar',         en: 'Search',          fr: 'Rechercher',      de: 'Suchen',       pt: 'Pesquisar',    zh: '搜索',     ja: '検索' },
  'common.active':     { es: 'Activo',         en: 'Active',          fr: 'Actif',           de: 'Aktiv',        pt: 'Ativo',        zh: '活跃',     ja: 'アクティブ' },
  'common.inactive':   { es: 'Inactivo',       en: 'Inactive',        fr: 'Inactif',         de: 'Inaktiv',      pt: 'Inativo',      zh: '不活跃',   ja: '非アクティブ' },
};

let globalTranslations: TranslationMap = { ...BUILTIN };
let currentLanguage: SupportedLanguage = (localStorage.getItem(STORAGE_KEY) as SupportedLanguage) ?? 'es';
const listeners = new Set<() => void>();

function notify() {
  listeners.forEach(fn => fn());
}

export function loadTranslations(map: TranslationMap) {
  globalTranslations = { ...BUILTIN, ...map };
  notify();
}

export function setLanguage(lang: SupportedLanguage) {
  currentLanguage = lang;
  localStorage.setItem(STORAGE_KEY, lang);
  notify();
}

export function t(key: string, fallback?: string): string {
  const entry = globalTranslations[key];
  if (!entry) return fallback ?? key;
  return entry[currentLanguage] ?? entry['en'] ?? entry['es'] ?? fallback ?? key;
}

export function useI18n() {
  const [lang, setLang] = useState<SupportedLanguage>(currentLanguage);

  useEffect(() => {
    const handler = () => setLang(currentLanguage);
    listeners.add(handler);
    return () => { listeners.delete(handler); };
  }, []);

  const changeLanguage = useCallback((next: SupportedLanguage) => {
    setLanguage(next);
    setLang(next);
  }, []);

  const translate = useCallback((key: string, fallback?: string): string => {
    return t(key, fallback);
  }, [lang]); // eslint-disable-line react-hooks/exhaustive-deps

  return { lang, changeLanguage, t: translate, languages: LANGUAGES };
}

export type I18nContextValue = ReturnType<typeof useI18n>;
export const I18nContext = createContext<I18nContextValue | null>(null);

export function useI18nContext(): I18nContextValue {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18nContext must be used within I18nProvider');
  return ctx;
}

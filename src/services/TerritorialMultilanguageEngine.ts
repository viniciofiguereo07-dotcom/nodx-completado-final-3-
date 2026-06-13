import { supabase } from '../lib/supabase';
import { setLanguage, t, loadTranslations, LANGUAGES } from '../hooks/useI18n';
import type { SupportedLanguage, LanguageConfig, TranslationKey, TranslationValue } from '../types';

// ---------------------------------------------------------------------------
// TerritorialMultilanguageEngine – Phase 24
// ---------------------------------------------------------------------------

type TranslationMap = Record<string, Record<SupportedLanguage, string>>;

export interface UserLanguagePreference {
  user_id: string;
  language_code: SupportedLanguage;
  auto_detected: boolean;
  updated_at: string;
}

export interface OrgLanguagePreference {
  organization_id: string;
  language_code: SupportedLanguage;
  is_default: boolean;
  is_active: boolean;
  updated_at: string;
}

export interface LanguageDetectionResult {
  detected: SupportedLanguage;
  source: 'browser' | 'stored' | 'org' | 'fallback';
  confidence: number;
}

export interface TranslationCoverageReport {
  language_code: SupportedLanguage;
  total_keys: number;
  translated_keys: number;
  coverage_pct: number;
  missing_keys: string[];
}

export interface MultilanguageExportConfig {
  language: SupportedLanguage;
  includeUntranslated?: boolean;
  format: 'json' | 'csv';
}

// Expanded translation dictionary covering all application modules
const MODULE_TRANSLATIONS: TranslationMap = {
  // Sidebar / Navigation
  'nav.dashboard':              { es: 'Tablero',          en: 'Dashboard',         fr: 'Tableau de bord',   de: 'Dashboard',      pt: 'Painel',            zh: '仪表板',     ja: 'ダッシュボード' },
  'nav.command_center':         { es: 'Centro de Mando',  en: 'Command Center',    fr: 'Centre de commande',de: 'Kommandozentrale',pt: 'Centro de Comando', zh: '指挥中心',   ja: 'コマンドセンター' },
  'nav.territories':            { es: 'Territorios',      en: 'Territories',       fr: 'Territoires',       de: 'Gebiete',        pt: 'Territórios',       zh: '区域',       ja: '地域' },
  'nav.routes':                 { es: 'Rutas',            en: 'Routes',            fr: 'Itinéraires',       de: 'Routen',         pt: 'Rotas',             zh: '路线',       ja: 'ルート' },
  'nav.visits':                 { es: 'Visitas',          en: 'Visits',            fr: 'Visites',           de: 'Besuche',        pt: 'Visitas',           zh: '访问',       ja: '訪問' },
  'nav.forms':                  { es: 'Formularios',      en: 'Forms',             fr: 'Formulaires',       de: 'Formulare',      pt: 'Formulários',       zh: '表单',       ja: 'フォーム' },
  'nav.geospatial':             { es: 'Geoespacial',      en: 'Geospatial',        fr: 'Géospatial',        de: 'Geospatial',     pt: 'Geoespacial',       zh: '地理空间',   ja: '地理空間' },
  'nav.workflows':              { es: 'Flujos de Trabajo',en: 'Workflows',         fr: 'Flux de travail',   de: 'Workflows',      pt: 'Fluxos',            zh: '工作流',     ja: 'ワークフロー' },
  'nav.analytics':              { es: 'Analítica',        en: 'Analytics',         fr: 'Analytique',        de: 'Analytik',       pt: 'Análise',           zh: '分析',       ja: '分析' },
  'nav.ai':                     { es: 'Motor IA',         en: 'AI Engine',         fr: 'Moteur IA',         de: 'KI-Motor',       pt: 'Motor IA',          zh: 'AI引擎',    ja: 'AIエンジン' },
  'nav.inventory':              { es: 'Inventario',       en: 'Inventory',         fr: 'Inventaire',        de: 'Inventar',       pt: 'Inventário',        zh: '库存',       ja: '在庫' },
  'nav.households':             { es: 'Hogares',          en: 'Households',        fr: 'Ménages',           de: 'Haushalte',      pt: 'Domicílios',        zh: '家庭',       ja: '世帯' },
  'nav.wash':                   { es: 'WASH',             en: 'WASH',              fr: 'WASH',              de: 'WASH',           pt: 'WASH',              zh: 'WASH',       ja: 'WASH' },
  'nav.indicators':             { es: 'Indicadores M&E',  en: 'M&E Indicators',   fr: 'Indicateurs S&E',   de: 'M&E-Indikatoren',pt: 'Indicadores M&E',   zh: 'M&E指标',   ja: 'M&E指標' },
  'nav.indicator_dashboard':    { es: 'Tablero de Indicadores',en: 'Indicator Dashboard',fr: 'Tableau des indicateurs',de: 'Indikator-Dashboard',pt: 'Painel de Indicadores',zh: '指标仪表板',ja: '指標ダッシュボード' },
  'nav.bulk_import':            { es: 'Importación Masiva',en: 'Bulk Import',      fr: 'Importation en masse',de: 'Massenimport',   pt: 'Importação em Lote', zh: '批量导入',   ja: '一括インポート' },
  'nav.geography':              { es: 'Geografía',        en: 'Geography',         fr: 'Géographie',        de: 'Geographie',     pt: 'Geografia',         zh: '地理',       ja: '地理' },
  'nav.i18n':                   { es: 'Multilingüe',      en: 'Multilingual',      fr: 'Multilingue',       de: 'Mehrsprachig',   pt: 'Multilíngue',      zh: '多语言',     ja: '多言語' },
  'nav.language':               { es: 'Centro de Idiomas',en: 'Language Center',   fr: 'Centre linguistique',de: 'Sprachzentrum', pt: 'Centro de Idiomas', zh: '语言中心',   ja: '言語センター' },
  'nav.governance':             { es: 'Gobernanza',       en: 'Governance',        fr: 'Gouvernance',       de: 'Governance',     pt: 'Governança',       zh: '治理',       ja: 'ガバナンス' },
  'nav.diagnostics':            { es: 'Diagnóstico',      en: 'Diagnostics',       fr: 'Diagnostics',       de: 'Diagnose',       pt: 'Diagnóstico',      zh: '诊断',       ja: '診断' },
  'nav.taxonomy':               { es: 'Taxonomía',        en: 'Taxonomy',          fr: 'Taxonomie',         de: 'Taxonomie',      pt: 'Taxonomia',        zh: '分类',       ja: '分類' },
  'nav.projects':               { es: 'Proyectos',        en: 'Projects',          fr: 'Projets',           de: 'Projekte',       pt: 'Projetos',         zh: '项目',       ja: 'プロジェクト' },
  'nav.data_quality':           { es: 'Calidad de Datos', en: 'Data Quality',      fr: 'Qualité des données',de: 'Datenqualität',pt: 'Qualidade de Dados', zh: '数据质量',   ja: 'データ品質' },
  'nav.approvals':              { es: 'Aprobaciones',     en: 'Approvals',         fr: 'Approbations',      de: 'Genehmigungen',  pt: 'Aprovações',       zh: '审批',       ja: '承認' },
  'nav.evidence':               { es: 'Evidencia',        en: 'Evidence',          fr: 'Preuves',           de: 'Nachweise',      pt: 'Evidência',        zh: '证据',       ja: 'エビデンス' },
  'nav.knowledge':              { es: 'Conocimiento',     en: 'Knowledge',         fr: 'Connaissances',     de: 'Wissen',         pt: 'Conhecimento',     zh: '知识',       ja: 'ナレッジ' },
  'nav.tasks':                  { es: 'Tareas',           en: 'Tasks',             fr: 'Tâches',            de: 'Aufgaben',       pt: 'Tarefas',          zh: '任务',       ja: 'タスク' },
  'nav.search':                 { es: 'Búsqueda Global',  en: 'Global Search',     fr: 'Recherche globale', de: 'Globale Suche',  pt: 'Busca Global',     zh: '全局搜索',   ja: 'グローバル検索' },
  'nav.observatory':            { es: 'Observatorio',     en: 'Observatory',       fr: 'Observatoire',      de: 'Observatorium',  pt: 'Observatório',     zh: '观测台',     ja: 'オブザーバトリー' },
  'nav.ai_analyst':             { es: 'Analista IA',      en: 'AI Analyst',        fr: 'Analyste IA',       de: 'KI-Analyst',     pt: 'Analista IA',      zh: 'AI分析师',  ja: 'AIアナリスト' },
  'nav.field_collection':       { es: 'Recolección de Campo',en: 'Field Collection',fr: 'Collecte de terrain',de: 'Feldsammlung',  pt: 'Coleta de Campo',  zh: '现场采集',   ja: 'フィールド収集' },
  'nav.tabulation':             { es: 'Tabulación',       en: 'Tabulation',        fr: 'Tabulation',        de: 'Tabellierung',   pt: 'Tabulação',        zh: '制表',       ja: '集計' },
  'nav.territorial_indicators': { es: 'KPIs Territoriales',en: 'Territorial KPIs', fr: 'KPI territoriaux',  de: 'Territoriale KPIs',pt: 'KPIs Territoriais',zh: '区域KPI',  ja: '領域KPI' },
  'nav.territorial_alerts':     { es: 'Alertas Territoriales',en: 'Territorial Alerts',fr: 'Alertes territoriales',de: 'Territoriale Alarme',pt: 'Alertas Territoriais',zh: '区域警报',ja: '領域アラート' },
  'nav.atlas':                  { es: 'Centro de Atlas',  en: 'Atlas Center',      fr: 'Centre Atlas',      de: 'Atlas-Zentrum',  pt: 'Centro de Atlas',   zh: '图集中心',   ja: 'アトラスセンター' },
  'nav.executive_reports':      { es: 'Informes Ejecutivos',en: 'Executive Reports',fr: 'Rapports exécutifs',de: 'Exekutivberichte',pt: 'Relatórios Executivos',zh: '执行报告',ja: 'エグゼクティブレポート' },
  'nav.territorial_ai':         { es: 'IA Territorial',   en: 'AI Engine',         fr: 'IA territoriale',    de: 'Territoriale KI',pt: 'IA Territorial',    zh: '区域AI',    ja: '領域AI' },
  'nav.documentation':          { es: 'Documentación',    en: 'Documentation',     fr: 'Documentation',     de: 'Dokumentation',  pt: 'Documentação',      zh: '文档',       ja: 'ドキュメント' },
  'nav.offline':                { es: 'Modo Sin Conexión', en: 'Offline Manager',   fr: 'Gestionnaire hors ligne',de: 'Offline-Manager',pt: 'Gerenciador Offline',zh: '离线管理器',ja: 'オフラインマネージャー' },
  'nav.security':               { es: 'Centro de Seguridad',en: 'Security Center',  fr: 'Centre de sécurité',de: 'Sicherheitszentrum',pt: 'Centro de Segurança',zh: '安全中心',ja: 'セキュリティセンター' },
  'nav.recovery':               { es: 'Centro de Recuperación',en: 'Recovery Center',fr: 'Centre de récupération',de: 'Wiederherstellungszentrum',pt: 'Centro de Recuperação',zh: '恢复中心',ja: 'リカバリーセンター' },
  'nav.security_audit':         { es: 'Auditoría de Seguridad',en: 'Security Audit',fr: 'Audit de sécurité',de: 'Sicherheitsaudit',pt: 'Auditoria de Segurança',zh: '安全审计',ja: 'セキュリティ監査' },
  'nav.reporting':              { es: 'Informes',          en: 'Reports',           fr: 'Rapports',          de: 'Berichte',       pt: 'Relatórios',        zh: '报告',       ja: 'レポート' },
  'nav.alerts':                 { es: 'Alertas',           en: 'Alerts',            fr: 'Alertes',           de: 'Alarme',         pt: 'Alertas',           zh: '警报',       ja: 'アラート' },
  'nav.export':                 { es: 'Centro de Exportación',en: 'Export Center',   fr: "Centre d'exportation",de: 'Exportzentrum',pt: 'Centro de Exportação',zh: '导出中心',  ja: 'エクスポートセンター' },
  'nav.sync':                   { es: 'Sincronización',   en: 'Sync',              fr: 'Synchronisation',   de: 'Synchronisation',pt: 'Sincronização',     zh: '同步',       ja: '同期' },
  'nav.audit':                  { es: 'Auditoría',        en: 'Audit',             fr: 'Audit',             de: 'Audit',          pt: 'Auditoria',        zh: '审计',       ja: '監査' },
  'nav.permissions':            { es: 'Permisos',         en: 'Permissions',       fr: 'Permissions',       de: 'Berechtigungen', pt: 'Permissões',       zh: '权限',       ja: '権限' },
  'nav.licensing':              { es: 'Licenciamiento',   en: 'Licensing',         fr: 'Licences',          de: 'Lizenzierung',   pt: 'Licenciamento',    zh: '许可',       ja: 'ライセンス' },
  'nav.members':                { es: 'Miembros',         en: 'Members',           fr: 'Membres',           de: 'Mitglieder',     pt: 'Membros',          zh: '成员',       ja: 'メンバー' },

  // Common actions
  'common.save':                { es: 'Guardar',          en: 'Save',              fr: 'Enregistrer',       de: 'Speichern',      pt: 'Salvar',            zh: '保存',       ja: '保存' },
  'common.cancel':              { es: 'Cancelar',         en: 'Cancel',            fr: 'Annuler',           de: 'Abbrechen',      pt: 'Cancelar',         zh: '取消',       ja: 'キャンセル' },
  'common.delete':              { es: 'Eliminar',         en: 'Delete',            fr: 'Supprimer',        de: 'Löschen',        pt: 'Excluir',          zh: '删除',       ja: '削除' },
  'common.edit':                { es: 'Editar',           en: 'Edit',              fr: 'Modifier',         de: 'Bearbeiten',     pt: 'Editar',           zh: '编辑',       ja: '編集' },
  'common.create':              { es: 'Crear',            en: 'Create',            fr: 'Créer',            de: 'Erstellen',      pt: 'Criar',            zh: '创建',       ja: '作成' },
  'common.search':              { es: 'Buscar',           en: 'Search',            fr: 'Rechercher',       de: 'Suchen',         pt: 'Pesquisar',        zh: '搜索',       ja: '検索' },
  'common.filter':              { es: 'Filtrar',          en: 'Filter',            fr: 'Filtrer',          de: 'Filtern',        pt: 'Filtrar',          zh: '筛选',       ja: 'フィルター' },
  'common.export':              { es: 'Exportar',         en: 'Export',            fr: 'Exporter',         de: 'Exportieren',    pt: 'Exportar',         zh: '导出',       ja: 'エクスポート' },
  'common.import':              { es: 'Importar',         en: 'Import',            fr: 'Importer',         de: 'Importieren',    pt: 'Importar',         zh: '导入',       ja: 'インポート' },
  'common.refresh':             { es: 'Actualizar',       en: 'Refresh',           fr: 'Actualiser',       de: 'Aktualisieren',  pt: 'Atualizar',        zh: '刷新',       ja: '更新' },
  'common.close':               { es: 'Cerrar',           en: 'Close',             fr: 'Fermer',           de: 'Schließen',      pt: 'Fechar',           zh: '关闭',       ja: '閉じる' },
  'common.confirm':             { es: 'Confirmar',        en: 'Confirm',           fr: 'Confirmer',        de: 'Bestätigen',     pt: 'Confirmar',        zh: '确认',       ja: '確認' },
  'common.back':                { es: 'Volver',           en: 'Back',              fr: 'Retour',           de: 'Zurück',         pt: 'Voltar',           zh: '返回',       ja: '戻る' },
  'common.next':                { es: 'Siguiente',        en: 'Next',              fr: 'Suivant',          de: 'Weiter',         pt: 'Próximo',          zh: '下一步',     ja: '次へ' },
  'common.submit':              { es: 'Enviar',           en: 'Submit',            fr: 'Soumettre',        de: 'Absenden',       pt: 'Enviar',           zh: '提交',       ja: '送信' },
  'common.loading':             { es: 'Cargando...',      en: 'Loading...',        fr: 'Chargement...',    de: 'Laden...',       pt: 'Carregando...',    zh: '加载中...',   ja: '読み込み中...' },
  'common.no_data':             { es: 'Sin datos',        en: 'No data',           fr: 'Aucune donnée',    de: 'Keine Daten',    pt: 'Sem dados',        zh: '无数据',     ja: 'データなし' },
  'common.active':              { es: 'Activo',           en: 'Active',            fr: 'Actif',            de: 'Aktiv',          pt: 'Ativo',            zh: '活跃',       ja: 'アクティブ' },
  'common.inactive':            { es: 'Inactivo',        en: 'Inactive',          fr: 'Inactif',          de: 'Inaktiv',        pt: 'Inativo',          zh: '不活跃',     ja: '非アクティブ' },
  'common.enabled':             { es: 'Habilitado',       en: 'Enabled',           fr: 'Activé',           de: 'Aktiviert',      pt: 'Habilitado',       zh: '已启用',     ja: '有効' },
  'common.disabled':            { es: 'Deshabilitado',    en: 'Disabled',          fr: 'Désactivé',        de: 'Deaktiviert',    pt: 'Desabilitado',     zh: '已禁用',     ja: '無効' },
  'common.yes':                 { es: 'Sí',               en: 'Yes',               fr: 'Oui',              de: 'Ja',             pt: 'Sim',              zh: '是',         ja: 'はい' },
  'common.no':                  { es: 'No',               en: 'No',                fr: 'Non',              de: 'Nein',           pt: 'Não',              zh: '否',         ja: 'いいえ' },
  'common.all':                 { es: 'Todos',            en: 'All',               fr: 'Tous',             de: 'Alle',           pt: 'Todos',            zh: '全部',       ja: 'すべて' },
  'common.none':                { es: 'Ninguno',          en: 'None',              fr: 'Aucun',            de: 'Keine',          pt: 'Nenhum',           zh: '无',         ja: 'なし' },
  'common.status':              { es: 'Estado',           en: 'Status',            fr: 'Statut',           de: 'Status',         pt: 'Status',           zh: '状态',       ja: 'ステータス' },
  'common.name':                { es: 'Nombre',           en: 'Name',              fr: 'Nom',              de: 'Name',           pt: 'Nome',             zh: '名称',       ja: '名前' },
  'common.description':         { es: 'Descripción',      en: 'Description',       fr: 'Description',      de: 'Beschreibung',   pt: 'Descrição',        zh: '描述',       ja: '説明' },
  'common.date':                { es: 'Fecha',            en: 'Date',              fr: 'Date',             de: 'Datum',          pt: 'Data',             zh: '日期',       ja: '日付' },
  'common.type':                { es: 'Tipo',             en: 'Type',              fr: 'Type',             de: 'Typ',            pt: 'Tipo',             zh: '类型',       ja: 'タイプ' },
  'common.actions':             { es: 'Acciones',         en: 'Actions',           fr: 'Actions',          de: 'Aktionen',       pt: 'Ações',            zh: '操作',       ja: 'アクション' },
  'common.details':             { es: 'Detalles',         en: 'Details',           fr: 'Détails',          de: 'Details',        pt: 'Detalhes',         zh: '详情',       ja: '詳細' },
  'common.settings':            { es: 'Configuración',    en: 'Settings',          fr: 'Paramètres',       de: 'Einstellungen',  pt: 'Configurações',    zh: '设置',       ja: '設定' },

  // Language Center
  'language.title':             { es: 'Centro de Idiomas',en: 'Language Center',   fr: 'Centre linguistique',de: 'Sprachzentrum',  pt: 'Centro de Idiomas', zh: '语言中心',   ja: '言語センター' },
  'language.subtitle':          { es: 'Gestiona los idiomas de la plataforma',en: 'Manage platform languages',fr: 'Gérer les langues de la plateforme',de: 'Sprachen der Plattform verwalten',pt: 'Gerencie os idiomas da plataforma',zh: '管理平台语言',ja: 'プラットフォームの言語を管理' },
  'language.current':           { es: 'Idioma Actual',    en: 'Current Language',  fr: 'Langue actuelle',   de: 'Aktuelle Sprache',pt: 'Idioma Atual',     zh: '当前语言',   ja: '現在の言語' },
  'language.switch':            { es: 'Cambiar Idioma',   en: 'Switch Language',   fr: 'Changer de langue', de: 'Sprache wechseln',pt: 'Trocar Idioma',    zh: '切换语言',   ja: '言語切替' },
  'language.browser_detect':    { es: 'Detección del Navegador',en: 'Browser Detection',fr: 'Détection du navigateur',de: 'Browser-Erkennung',pt: 'Detecção do Navegador',zh: '浏览器检测',ja: 'ブラウザ検出' },
  'language.user_preference':   { es: 'Preferencia de Usuario',en: 'User Preference',fr: 'Préférence utilisateur',de: 'Benutzereinstellung',pt: 'Preferência do Usuário',zh: '用户偏好',ja: 'ユーザー設定' },
  'language.org_preference':    { es: 'Preferencia de Organización',en: 'Organization Preference',fr: "Préférence de l'organisation",de: 'Organisationseinstellung',pt: 'Preferência da Organização',zh: '组织偏好',ja: '組織設定' },
  'language.coverage':          { es: 'Cobertura de Traducción',en: 'Translation Coverage',fr: 'Couverture de traduction',de: 'Übersetzungsabdeckung',pt: 'Cobertura de Tradução',zh: '翻译覆盖率',ja: '翻訳カバレッジ' },
  'language.export_translations':{ es: 'Exportar Traducciones',en: 'Export Translations',fr: 'Exporter les traductions',de: 'Übersetzungen exportieren',pt: 'Exportar Traduções',zh: '导出翻译',ja: '翻訳エクスポート' },
  'language.import_translations':{ es: 'Importar Traducciones',en: 'Import Translations',fr: 'Importer les traductions',de: 'Übersetzungen importieren',pt: 'Importar Traduções',zh: '导入翻译',ja: '翻訳インポート' },
  'language.persistence':       { es: 'Persistencia',     en: 'Persistence',       fr: 'Persistance',       de: 'Persistenz',     pt: 'Persistência',      zh: '持久化',     ja: '永続化' },
  'language.autodetect':        { es: 'Auto-detección',   en: 'Auto-detect',       fr: 'Détection auto.',   de: 'Auto-Erkennung', pt: 'Auto-detecção',     zh: '自动检测',   ja: '自動検出' },
  'language.per_user':          { es: 'Por Usuario',      en: 'Per User',          fr: 'Par utilisateur',   de: 'Pro Benutzer',   pt: 'Por Usuário',       zh: '每用户',     ja: 'ユーザーごと' },
  'language.per_org':           { es: 'Por Organización', en: 'Per Organization',  fr: 'Par organisation',  de: 'Pro Organisation',pt: 'Por Organização',  zh: '每组织',     ja: '組織ごと' },
  'language.detected':          { es: 'Detectado',        en: 'Detected',          fr: 'Détecté',           de: 'Erkannt',        pt: 'Detectado',        zh: '已检测',     ja: '検出済み' },
  'language.default_org':       { es: 'Predeterminado de Organización',en: 'Organization Default',fr: "Valeur par défaut de l'organisation",de: 'Organisationsstandard',pt: 'Padrão da Organização',zh: '组织默认',ja: '組織デフォルト' },

  // Security Center
  'security.title':             { es: 'Centro de Seguridad',en: 'Security Center',  fr: 'Centre de sécurité',de: 'Sicherheitszentrum',pt: 'Centro de Segurança',zh: '安全中心',  ja: 'セキュリティセンター' },
  'security.roles':             { es: 'Roles',            en: 'Roles',             fr: 'Rôles',             de: 'Rollen',         pt: 'Funções',           zh: '角色',       ja: 'ロール' },
  'security.permissions':       { es: 'Permisos',         en: 'Permissions',       fr: 'Permissions',       de: 'Berechtigungen', pt: 'Permissões',       zh: '权限',       ja: '権限' },
  'security.break_glass':       { es: 'Modo Break Glass', en: 'Break Glass Mode',  fr: 'Mode Break Glass',  de: 'Break-Glass-Modus',pt: 'Modo Break Glass', zh: '应急模式',  ja: 'ブレイクグラスモード' },
  'security.emergency_token':   { es: 'Token de Emergencia',en: 'Emergency Token', fr: "Jeton d'urgence",    de: 'Notfall-Token',  pt: 'Token de Emergência',zh: '紧急令牌',  ja: '緊急トークン' },
  'security.recovery_keys':     { es: 'Claves de Recuperación',en: 'Recovery Keys',  fr: 'Clés de récupération',de: 'Wiederherstellungsschlüssel',pt: 'Chaves de Recuperação',zh: '恢复密钥',ja: 'リカバリーキー' },

  // Recovery Center
  'recovery.title':             { es: 'Centro de Recuperación',en: 'Recovery Center',fr: 'Centre de récupération',de: 'Wiederherstellungszentrum',pt: 'Centro de Recuperação',zh: '恢复中心',ja: 'リカバリーセンター' },
  'recovery.key_type_a':        { es: 'Clave Tipo A',     en: 'Key Type A',        fr: 'Clé type A',        de: 'Schlüssel Typ A',pt: 'Chave Tipo A',      zh: 'A型密钥',   ja: 'キータイプA' },
  'recovery.key_type_b':        { es: 'Clave Tipo B',     en: 'Key Type B',        fr: 'Clé type B',        de: 'Schlüssel Typ B',pt: 'Chave Tipo B',      zh: 'B型密钥',   ja: 'キータイプB' },
  'recovery.key_type_c':        { es: 'Clave Tipo C',     en: 'Key Type C',        fr: 'Clé type C',        de: 'Schlüssel Typ C',pt: 'Chave Tipo C',      zh: 'C型密钥',   ja: 'キータイプC' },

  // Security Audit
  'security_audit.title':       { es: 'Auditoría de Seguridad',en: 'Security Audit',fr: 'Audit de sécurité',de: 'Sicherheitsaudit',pt: 'Auditoria de Segurança',zh: '安全审计',ja: 'セキュリティ監査' },
  'security_audit.log':         { es: 'Registro de Auditoría',en: 'Audit Log',     fr: "Journal d'audit",   de: 'Audit-Log',      pt: 'Registro de Auditoria',zh: '审计日志',  ja: '監査ログ' },

  // Atlas Center
  'atlas.title':                { es: 'Centro de Atlas',  en: 'Atlas Center',      fr: 'Centre Atlas',      de: 'Atlas-Zentrum',  pt: 'Centro de Atlas',   zh: '图集中心',   ja: 'アトラスセンター' },

  // Executive Reports
  'executive.title':            { es: 'Informes Ejecutivos',en: 'Executive Reports',fr: 'Rapports exécutifs',de: 'Exekutivberichte',pt: 'Relatórios Executivos',zh: '执行报告',  ja: 'エグゼクティブレポート' },

  // Offline Manager
  'offline.title':              { es: 'Gestión Sin Conexión',en: 'Offline Manager', fr: 'Gestionnaire hors ligne',de: 'Offline-Manager',pt: 'Gerenciador Offline',zh: '离线管理',  ja: 'オフライン管理' },

  // Documentation Center
  'documentation.title':        { es: 'Centro de Documentación',en: 'Documentation Center',fr: 'Centre de documentation',de: 'Dokumentationszentrum',pt: 'Centro de Documentação',zh: '文档中心',  ja: 'ドキュメントセンター' },

  // Export formats
  'export.pdf':                 { es: 'Documento PDF',    en: 'PDF Document',      fr: 'Document PDF',      de: 'PDF-Dokument',   pt: 'Documento PDF',     zh: 'PDF文档',    ja: 'PDF文書' },
  'export.docx':                { es: 'Documento DOCX',   en: 'DOCX Document',     fr: 'Document DOCX',     de: 'DOCX-Dokument',  pt: 'Documento DOCX',   zh: 'DOCX文档',   ja: 'DOCX文書' },
  'export.pptx':                { es: 'Presentación PPTX',en: 'PPTX Presentation', fr: 'Présentation PPTX', de: 'PPTX-Präsentation',pt: 'Apresentação PPTX',zh: 'PPTX演示',  ja: 'PPTXプレゼン' },
  'export.csv':                 { es: 'Archivo CSV',      en: 'CSV File',          fr: 'Fichier CSV',       de: 'CSV-Datei',      pt: 'Arquivo CSV',       zh: 'CSV文件',    ja: 'CSVファイル' },
  'export.json':                { es: 'Archivo JSON',     en: 'JSON File',         fr: 'Fichier JSON',      de: 'JSON-Datei',     pt: 'Arquivo JSON',      zh: 'JSON文件',   ja: 'JSONファイル' },
};

const PRIORITY_LANGS: SupportedLanguage[] = ['es', 'en', 'fr', 'pt'];

class TerritorialMultilanguageEngine {
  private userPreference: UserLanguagePreference | null = null;
  private orgPreferences: OrgLanguagePreference[] = [];

  // -----------------------------------------------------------------------
  // Language detection
  // -----------------------------------------------------------------------

  detectBrowserLanguage(): LanguageDetectionResult {
    const browserLangs = navigator.languages ?? [navigator.language];
    for (const bl of browserLangs) {
      const code = bl.split('-')[0].toLowerCase() as SupportedLanguage;
      if (LANGUAGES.some(l => l.code === code)) {
        return { detected: code, source: 'browser', confidence: 0.9 };
      }
    }
    return { detected: 'es', source: 'fallback', confidence: 0 };
  }

  async resolveLanguage(userId?: string, orgId?: string): Promise<LanguageDetectionResult> {
    // 1. Check user preference in DB
    if (userId) {
      const { data } = await supabase
        .from('user_language_preferences')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();
      if (data) {
        this.userPreference = data as UserLanguagePreference;
        return { detected: data.language_code as SupportedLanguage, source: 'stored', confidence: 1.0 };
      }
    }

    // 2. Check org default
    if (orgId) {
      const { data } = await supabase
        .from('organization_languages')
        .select('*')
        .eq('organization_id', orgId)
        .eq('is_default', true)
        .maybeSingle();
      if (data) {
        return { detected: data.language_code as SupportedLanguage, source: 'org', confidence: 0.8 };
      }
    }

    // 3. Check localStorage (existing useI18n storage)
    const stored = localStorage.getItem('nodx_lang') as SupportedLanguage | null;
    if (stored && LANGUAGES.some(l => l.code === stored)) {
      return { detected: stored, source: 'stored', confidence: 0.9 };
    }

    // 4. Browser detection
    return this.detectBrowserLanguage();
  }

  // -----------------------------------------------------------------------
  // Persistence
  // -----------------------------------------------------------------------

  async saveUserPreference(userId: string, lang: SupportedLanguage): Promise<boolean> {
    const { error } = await supabase
      .from('user_language_preferences')
      .upsert({
        user_id: userId,
        language_code: lang,
        auto_detected: false,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' });
    if (!error) {
      this.userPreference = { user_id: userId, language_code: lang, auto_detected: false, updated_at: new Date().toISOString() };
    }
    return !error;
  }

  async loadOrgPreferences(orgId: string): Promise<OrgLanguagePreference[]> {
    const { data } = await supabase
      .from('organization_languages')
      .select('*')
      .eq('organization_id', orgId)
      .eq('is_active', true)
      .order('sort_order');
    this.orgPreferences = (data ?? []) as OrgLanguagePreference[];
    return this.orgPreferences;
  }

  async setOrgDefaultLanguage(orgId: string, lang: SupportedLanguage): Promise<boolean> {
    // Unset current default
    await supabase
      .from('organization_languages')
      .update({ is_default: false })
      .eq('organization_id', orgId)
      .eq('is_default', true);
    // Set new default
    const { error } = await supabase
      .from('organization_languages')
      .update({ is_default: true })
      .eq('organization_id', orgId)
      .eq('language_code', lang);
    return !error;
  }

  // -----------------------------------------------------------------------
  // Translation management
  // -----------------------------------------------------------------------

  activateModuleTranslations(): void {
    loadTranslations(MODULE_TRANSLATIONS);
  }

  getModuleTranslations(): TranslationMap {
    return { ...MODULE_TRANSLATIONS };
  }

  getPriorityLanguages(): SupportedLanguage[] {
    return [...PRIORITY_LANGS];
  }

  t(key: string, fallback?: string): string {
    return t(key, fallback);
  }

  // -----------------------------------------------------------------------
  // Coverage reporting
  // -----------------------------------------------------------------------

  computeCoverage(keys: TranslationKey[], values: TranslationValue[]): TranslationCoverageReport[] {
    return LANGUAGES.map(lang => {
      const translated = keys.filter(k =>
        values.some(v => v.key_id === k.id && v.language_code === lang.code)
      );
      const missing = keys
        .filter(k => !values.some(v => v.key_id === k.id && v.language_code === lang.code))
        .map(k => k.key);
      return {
        language_code: lang.code,
        total_keys: keys.length,
        translated_keys: translated.length,
        coverage_pct: keys.length > 0 ? Math.round((translated.length / keys.length) * 100) : 0,
        missing_keys: missing,
      };
    });
  }

  // -----------------------------------------------------------------------
  // Export helpers (multilingual document headers/labels)
  // -----------------------------------------------------------------------

  getExportLabels(lang: SupportedLanguage): Record<string, string> {
    const labels: Record<string, string> = {};
    for (const key of Object.keys(MODULE_TRANSLATIONS)) {
      const entry = MODULE_TRANSLATIONS[key];
      labels[key] = entry[lang] ?? entry['en'] ?? entry['es'] ?? key;
    }
    return labels;
  }

  getLanguageName(code: SupportedLanguage): string {
    return LANGUAGES.find(l => l.code === code)?.nativeLabel ?? code;
  }

  getLanguageInfo(): LanguageConfig[] {
    return [...LANGUAGES];
  }
}

export const territorialMultilanguageEngine = new TerritorialMultilanguageEngine();
export default TerritorialMultilanguageEngine;

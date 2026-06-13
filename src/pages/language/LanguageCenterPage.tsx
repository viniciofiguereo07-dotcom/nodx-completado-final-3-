import { useState, useEffect, useCallback } from 'react';
import {
  Globe, Check, RefreshCw, Download, Upload, Monitor,
  User, Building2, BarChart3, ChevronRight, AlertTriangle,
  Sparkles, Eye, Languages,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useOrg } from '../../contexts/OrgContext';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../hooks/useLanguage';
import { territorialMultilanguageEngine } from '../../services/TerritorialMultilanguageEngine';
import { PageHeader } from '../../components/common/PageHeader';
import type { SupportedLanguage, TranslationKey, TranslationValue } from '../../types';
import type { TranslationCoverageReport, LanguageDetectionResult } from '../../services/TerritorialMultilanguageEngine';

type TabKey = 'overview' | 'languages' | 'coverage' | 'settings';

function coverageColor(pct: number): string {
  if (pct >= 90) return 'bg-emerald-100 text-emerald-700';
  if (pct >= 70) return 'bg-lime-100 text-lime-700';
  if (pct >= 50) return 'bg-yellow-100 text-yellow-700';
  if (pct >= 25) return 'bg-amber-100 text-amber-700';
  return 'bg-red-100 text-red-700';
}

function coverageBarColor(pct: number): string {
  if (pct >= 90) return 'bg-emerald-500';
  if (pct >= 70) return 'bg-lime-500';
  if (pct >= 50) return 'bg-yellow-500';
  if (pct >= 25) return 'bg-amber-500';
  return 'bg-red-500';
}

function sourceIcon(source: LanguageDetectionResult['source']) {
  switch (source) {
    case 'browser': return <Monitor className="w-4 h-4 text-blue-500" />;
    case 'stored': return <User className="w-4 h-4 text-emerald-500" />;
    case 'org': return <Building2 className="w-4 h-4 text-violet-500" />;
    case 'fallback': return <AlertTriangle className="w-4 h-4 text-amber-500" />;
  }
}

function sourceLabel(source: LanguageDetectionResult['source']): string {
  switch (source) {
    case 'browser': return 'Browser';
    case 'stored': return 'User Preference';
    case 'org': return 'Organization';
    case 'fallback': return 'Fallback';
  }
}

export function LanguageCenterPage() {
  const { org } = useOrg();
  const { user } = useAuth();
  const { lang, changeLanguage, detection, isLoading, languages, languageName, isAutoDetected } = useLanguage();
  const [tab, setTab] = useState<TabKey>('overview');
  const [coverage, setCoverage] = useState<TranslationCoverageReport[]>([]);
  const [keys, setKeys] = useState<TranslationKey[]>([]);
  const [values, setValues] = useState<TranslationValue[]>([]);
  const [loadingCoverage, setLoadingCoverage] = useState(false);
  const [orgLangs, setOrgLangs] = useState<{ language_code: SupportedLanguage; is_default: boolean; is_active: boolean }[]>([]);

  useEffect(() => {
    loadCoverageData();
    loadOrgLanguages();
  }, [org?.id]);

  async function loadCoverageData() {
    setLoadingCoverage(true);
    const [keysRes, valsRes] = await Promise.all([
      supabase.from('translation_keys').select('*').order('key').limit(500),
      supabase.from('translation_values').select('*').limit(2000),
    ]);
    const k = keysRes.data ?? [];
    const v = valsRes.data ?? [];
    setKeys(k);
    setValues(v);
    setCoverage(territorialMultilanguageEngine.computeCoverage(k, v));
    setLoadingCoverage(false);
  }

  async function loadOrgLanguages() {
    if (!org?.id) return;
    const prefs = await territorialMultilanguageEngine.loadOrgPreferences(org.id);
    setOrgLangs(prefs.map(p => ({
      language_code: p.language_code,
      is_default: p.is_default,
      is_active: p.is_active,
    })));
  }

  async function handleSetOrgDefault(code: SupportedLanguage) {
    if (!org?.id) return;
    await territorialMultilanguageEngine.setOrgDefaultLanguage(org.id, code);
    await loadOrgLanguages();
  }

  const handleExportTranslations = useCallback(() => {
    const translations = territorialMultilanguageEngine.getModuleTranslations();
    const blob = new Blob([JSON.stringify(translations, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `nodx-translations-${lang}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [lang]);

  const tabs: { key: TabKey; label: string; icon: React.ElementType }[] = [
    { key: 'overview', label: 'Overview', icon: Eye },
    { key: 'languages', label: 'Languages', icon: Globe },
    { key: 'coverage', label: 'Coverage', icon: BarChart3 },
    { key: 'settings', label: 'Settings', icon: Building2 },
  ];

  return (
    <div className="p-6 max-w-screen-xl mx-auto space-y-6">
      <PageHeader
        title="Language Center"
        subtitle="Manage platform languages, translation coverage, and language preferences"
        actions={
          <div className="flex items-center gap-2">
            <button onClick={loadCoverageData} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
              <RefreshCw size={16} />
            </button>
            <button onClick={handleExportTranslations} className="flex items-center gap-2 px-3 py-2 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50 transition-colors">
              <Download size={14} /> Export
            </button>
            <button className="flex items-center gap-2 px-3 py-2 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50 transition-colors">
              <Upload size={14} /> Import
            </button>
          </div>
        }
        breadcrumb={[{ label: 'Platform' }, { label: 'Language Center' }]}
      />

      {/* Tabs */}
      <div className="flex border-b border-gray-200">
        {tabs.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px ${
              tab === key
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <Icon size={15} />
            {label}
          </button>
        ))}
      </div>

      {/* Overview Tab */}
      {tab === 'overview' && (
        <div className="space-y-6">
          {/* Current language + detection */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white border border-gray-200 rounded-xl p-6">
              <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <Languages size={18} className="text-blue-500" />
                Current Language
              </h3>
              <div className="flex items-center gap-4 mb-4">
                <div className="w-16 h-16 bg-blue-50 rounded-xl flex items-center justify-center border-2 border-blue-200">
                  <span className="text-2xl font-bold text-blue-600">{lang.toUpperCase()}</span>
                </div>
                <div>
                  <p className="text-lg font-semibold text-gray-900">{languageName(lang)}</p>
                  <p className="text-sm text-gray-500">Active interface language</p>
                </div>
              </div>
              {detection && (
                <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-lg">
                  {sourceIcon(detection.source)}
                  <span className="text-sm text-gray-600">
                    Source: <span className="font-medium">{sourceLabel(detection.source)}</span>
                  </span>
                  <span className="text-xs text-gray-400 ml-auto">
                    Confidence: {Math.round(detection.confidence * 100)}%
                  </span>
                </div>
              )}
              {isAutoDetected && (
                <p className="text-xs text-amber-600 mt-2 flex items-center gap-1">
                  <Sparkles size={12} /> Auto-detected from browser
                </p>
              )}
            </div>

            <div className="bg-white border border-gray-200 rounded-xl p-6">
              <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <BarChart3 size={18} className="text-emerald-500" />
                Translation Summary
              </h3>
              <div className="space-y-3">
                {coverage.length === 0 && !loadingCoverage && (
                  <p className="text-sm text-gray-400">No coverage data available</p>
                )}
                {territorialMultilanguageEngine.getPriorityLanguages().map(code => {
                  const report = coverage.find(c => c.language_code === code);
                  if (!report) return null;
                  return (
                    <div key={code} className="flex items-center gap-3">
                      <span className="text-xs font-mono bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded uppercase min-w-[2.5rem] text-center">
                        {code}
                      </span>
                      <div className="flex-1 bg-gray-100 rounded-full h-2">
                        <div className={`h-full rounded-full transition-all ${coverageBarColor(report.coverage_pct)}`} style={{ width: `${report.coverage_pct}%` }} />
                      </div>
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full min-w-[3.5rem] text-center ${coverageColor(report.coverage_pct)}`}>
                        {report.coverage_pct}%
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Quick switch */}
          <div className="bg-white border border-gray-200 rounded-xl p-6">
            <h3 className="font-semibold text-gray-800 mb-4">Quick Language Switch</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {languages.map(language => (
                <button
                  key={language.code}
                  onClick={() => changeLanguage(language.code as SupportedLanguage)}
                  className={`flex items-center gap-3 p-4 rounded-xl border-2 transition-all ${
                    lang === language.code
                      ? 'border-blue-500 bg-blue-50 shadow-sm'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <span className="text-xs font-mono bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded uppercase">
                    {language.code}
                  </span>
                  <div className="flex-1 text-left">
                    <p className="font-medium text-gray-800 text-sm">{language.nativeLabel}</p>
                    <p className="text-xs text-gray-400">{language.label}</p>
                  </div>
                  {lang === language.code && <Check size={16} className="text-blue-600" />}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Languages Tab */}
      {tab === 'languages' && (
        <div className="space-y-6">
          <div className="bg-white border border-gray-200 rounded-xl p-6">
            <h3 className="font-semibold text-gray-800 mb-4">Supported Languages</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {languages.map(language => {
                const isActive = lang === language.code;
                const isPriority = territorialMultilanguageEngine.getPriorityLanguages().includes(language.code as SupportedLanguage);
                const orgDefault = orgLangs.find(o => o.language_code === language.code && o.is_default);
                return (
                  <div
                    key={language.code}
                    className={`p-5 rounded-xl border-2 transition-all ${
                      isActive ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <p className="font-semibold text-gray-900">{language.nativeLabel}</p>
                        <p className="text-sm text-gray-500">{language.label}</p>
                      </div>
                      <span className="text-xs font-mono bg-gray-100 text-gray-600 px-2 py-0.5 rounded uppercase">
                        {language.code}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-1.5 mb-3">
                      {isPriority && (
                        <span className="text-[10px] font-medium bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">Priority</span>
                      )}
                      {isActive && (
                        <span className="text-[10px] font-medium bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">Active</span>
                      )}
                      {orgDefault && (
                        <span className="text-[10px] font-medium bg-violet-100 text-violet-700 px-2 py-0.5 rounded-full">Org Default</span>
                      )}
                    </div>
                    <button
                      onClick={() => changeLanguage(language.code as SupportedLanguage)}
                      className={`w-full flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-colors ${
                        isActive
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {isActive ? <Check size={14} /> : <ChevronRight size={14} />}
                      {isActive ? 'Active' : 'Switch'}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Coverage Tab */}
      {tab === 'coverage' && (
        <div className="space-y-6">
          <div className="bg-white border border-gray-200 rounded-xl p-6">
            <h3 className="font-semibold text-gray-800 mb-4">Translation Coverage</h3>
            {loadingCoverage ? (
              <div className="text-center py-12 text-gray-400">Loading coverage data...</div>
            ) : coverage.length === 0 ? (
              <div className="text-center py-12">
                <Globe size={40} className="text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500 font-medium">No translation keys</p>
                <p className="text-sm text-gray-400 mt-1">Add keys to start tracking coverage</p>
              </div>
            ) : (
              <div className="space-y-4">
                {coverage.map(report => {
                  const langConfig = languages.find(l => l.code === report.language_code);
                  return (
                    <div key={report.language_code} className="space-y-1">
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-mono bg-gray-100 text-gray-600 px-2 py-0.5 rounded uppercase min-w-[2.5rem] text-center">
                          {report.language_code}
                        </span>
                        <span className="text-sm font-medium text-gray-700 min-w-[8rem]">
                          {langConfig?.nativeLabel ?? report.language_code}
                        </span>
                        <div className="flex-1 bg-gray-100 rounded-full h-3">
                          <div className={`h-full rounded-full transition-all ${coverageBarColor(report.coverage_pct)}`} style={{ width: `${report.coverage_pct}%` }} />
                        </div>
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full min-w-[3.5rem] text-center ${coverageColor(report.coverage_pct)}`}>
                          {report.coverage_pct}%
                        </span>
                        <span className="text-xs text-gray-400 min-w-[6rem] text-right">
                          {report.translated_keys}/{report.total_keys} keys
                        </span>
                      </div>
                      {report.missing_keys.length > 0 && report.missing_keys.length <= 5 && (
                        <div className="ml-[12rem] flex flex-wrap gap-1">
                          {report.missing_keys.map(k => (
                            <span key={k} className="text-[10px] bg-red-50 text-red-600 px-1.5 py-0.5 rounded">{k}</span>
                          ))}
                        </div>
                      )}
                      {report.missing_keys.length > 5 && (
                        <p className="ml-[12rem] text-xs text-gray-400">
                          {report.missing_keys.length} missing keys
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Settings Tab */}
      {tab === 'settings' && (
        <div className="space-y-6">
          {/* User preference */}
          <div className="bg-white border border-gray-200 rounded-xl p-6">
            <h3 className="font-semibold text-gray-800 mb-1 flex items-center gap-2">
              <User size={18} className="text-emerald-500" />
              User Preference
            </h3>
            <p className="text-sm text-gray-500 mb-4">Your personal language setting is saved per-account</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {languages.map(language => (
                <button
                  key={language.code}
                  onClick={() => changeLanguage(language.code as SupportedLanguage)}
                  className={`flex items-center gap-2 p-3 rounded-xl border-2 transition-all ${
                    lang === language.code
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <span className="text-xs font-mono bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded uppercase">{language.code}</span>
                  <span className="text-sm font-medium text-gray-700">{language.nativeLabel}</span>
                  {lang === language.code && <Check size={14} className="text-blue-600 ml-auto" />}
                </button>
              ))}
            </div>
          </div>

          {/* Organization default */}
          <div className="bg-white border border-gray-200 rounded-xl p-6">
            <h3 className="font-semibold text-gray-800 mb-1 flex items-center gap-2">
              <Building2 size={18} className="text-violet-500" />
              Organization Default
            </h3>
            <p className="text-sm text-gray-500 mb-4">Default language for new users in this organization</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {territorialMultilanguageEngine.getPriorityLanguages().map(code => {
                const langConfig = languages.find(l => l.code === code);
                const isDefault = orgLangs.some(o => o.language_code === code && o.is_default);
                return (
                  <button
                    key={code}
                    onClick={() => handleSetOrgDefault(code)}
                    className={`flex items-center gap-2 p-3 rounded-xl border-2 transition-all ${
                      isDefault
                        ? 'border-violet-500 bg-violet-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <span className="text-xs font-mono bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded uppercase">{code}</span>
                    <span className="text-sm font-medium text-gray-700">{langConfig?.nativeLabel ?? code}</span>
                    {isDefault && <Check size={14} className="text-violet-600 ml-auto" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Browser detection */}
          <div className="bg-white border border-gray-200 rounded-xl p-6">
            <h3 className="font-semibold text-gray-800 mb-1 flex items-center gap-2">
              <Monitor size={18} className="text-blue-500" />
              Browser Auto-Detection
            </h3>
            <p className="text-sm text-gray-500 mb-3">When no preference is stored, language is detected from your browser</p>
            <div className="flex items-center gap-3 px-4 py-3 bg-gray-50 rounded-lg">
              {detection?.source === 'browser' ? (
                <>
                  <Monitor size={16} className="text-blue-500" />
                  <span className="text-sm text-gray-700">Detected: <strong>{detection.detected.toUpperCase()}</strong> ({languageName(detection.detected)})</span>
                </>
              ) : (
                <>
                  <Check size={16} className="text-emerald-500" />
                  <span className="text-sm text-gray-700">A stored preference overrides browser detection</span>
                </>
              )}
            </div>
          </div>

          {/* Export */}
          <div className="bg-white border border-gray-200 rounded-xl p-6">
            <h3 className="font-semibold text-gray-800 mb-1 flex items-center gap-2">
              <Download size={18} className="text-amber-500" />
              Export Translations
            </h3>
            <p className="text-sm text-gray-500 mb-3">Download translation files in the selected language for PDF, DOCX, or PPTX export integration</p>
            <div className="flex items-center gap-3">
              <button
                onClick={handleExportTranslations}
                className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-xl text-sm font-medium hover:bg-gray-800 transition-colors"
              >
                <Download size={14} /> Export JSON
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

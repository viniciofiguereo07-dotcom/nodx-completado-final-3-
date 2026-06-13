import { useState, useEffect } from 'react';
import { Languages, Plus, Check, Search, RefreshCw, Download, Upload, Globe } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useOrg } from '../../contexts/OrgContext';
import { useI18n, LANGUAGES, setLanguage } from '../../hooks/useI18n';
import type { SupportedLanguage, TranslationKey, TranslationValue } from '../../types';

const COVERAGE_COLORS: Record<number, string> = {
  0: 'bg-red-100 text-red-700',
  1: 'bg-orange-100 text-orange-700',
  2: 'bg-amber-100 text-amber-700',
  3: 'bg-yellow-100 text-yellow-700',
  4: 'bg-lime-100 text-lime-700',
  5: 'bg-emerald-100 text-emerald-700',
};

function coverageColor(pct: number): string {
  if (pct >= 90) return 'bg-emerald-100 text-emerald-700';
  if (pct >= 70) return 'bg-lime-100 text-lime-700';
  if (pct >= 50) return 'bg-yellow-100 text-yellow-700';
  if (pct >= 25) return 'bg-amber-100 text-amber-700';
  return 'bg-red-100 text-red-700';
}

export function I18nPage() {
  const { org } = useOrg();
  const orgId = org?.id;
  const { lang, changeLanguage } = useI18n();
  const [keys, setKeys] = useState<TranslationKey[]>([]);
  const [values, setValues] = useState<TranslationValue[]>([]);
  const [search, setSearch] = useState('');
  const [activeNs, setActiveNs] = useState<string | 'all'>('all');
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'keys' | 'settings' | 'coverage'>('keys');

  useEffect(() => { loadData(); }, [orgId]);

  async function loadData() {
    setLoading(true);
    const [keysRes, valsRes] = await Promise.all([
      supabase.from('translation_keys').select('*').order('key').limit(500),
      supabase.from('translation_values').select('*').limit(2000),
    ]);
    setKeys(keysRes.data ?? []);
    setValues(valsRes.data ?? []);
    setLoading(false);
  }

  const namespaces = [...new Set(keys.map(k => k.namespace_id))];

  const filteredKeys = keys.filter(k => {
    const matchSearch = search === '' || k.key.toLowerCase().includes(search.toLowerCase()) || (k.default_value ?? '').toLowerCase().includes(search.toLowerCase());
    return matchSearch;
  });

  function getTranslation(keyId: string, lang: SupportedLanguage): TranslationValue | undefined {
    return values.find(v => v.key_id === keyId && v.language_code === lang);
  }

  function coverageForLang(code: SupportedLanguage): number {
    if (keys.length === 0) return 0;
    const translated = keys.filter(k => values.some(v => v.key_id === k.id && v.language_code === code));
    return Math.round((translated.length / keys.length) * 100);
  }

  return (
    <div className="p-6 max-w-screen-xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Multilingual</h1>
          <p className="text-sm text-gray-500 mt-0.5">Manage translations and interface languages</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={loadData} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
            <RefreshCw size={16} />
          </button>
          <button className="flex items-center gap-2 px-3 py-2 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50 transition-colors">
            <Upload size={14} /> Import
          </button>
          <button className="flex items-center gap-2 px-3 py-2 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50 transition-colors">
            <Download size={14} /> Export
          </button>
          <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors">
            <Plus size={14} /> Add Key
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200">
        {(['keys', 'coverage', 'settings'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2.5 text-sm font-medium capitalize transition-colors border-b-2 -mb-px ${tab === t ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === 'settings' && (
        <div className="space-y-6">
          <div className="bg-white border border-gray-200 rounded-xl p-6">
            <h2 className="font-semibold text-gray-800 mb-4">Active Interface Language</h2>
            <div className="grid grid-cols-3 gap-3">
              {LANGUAGES.map(language => (
                <button
                  key={language.code}
                  onClick={() => changeLanguage(language.code as SupportedLanguage)}
                  className={`flex items-center gap-3 p-4 rounded-xl border-2 transition-all ${
                    lang === language.code
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex-1 text-left">
                    <p className="font-medium text-gray-800">{language.nativeLabel}</p>
                    <p className="text-xs text-gray-400">{language.label}</p>
                  </div>
                  <span className="text-xs font-mono bg-gray-100 text-gray-600 px-2 py-0.5 rounded uppercase">{language.code}</span>
                  {lang === language.code && <Check size={16} className="text-blue-600" />}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {tab === 'coverage' && (
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <h2 className="font-semibold text-gray-800 mb-4">Translation Coverage</h2>
          <div className="space-y-3">
            {LANGUAGES.map(language => {
              const pct = coverageForLang(language.code as SupportedLanguage);
              return (
                <div key={language.code} className="flex items-center gap-4">
                  <div className="w-28 flex items-center gap-2">
                    <span className="text-xs font-mono bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded uppercase">{language.code}</span>
                    <span className="text-sm font-medium text-gray-700">{language.nativeLabel}</span>
                  </div>
                  <div className="flex-1 bg-gray-100 rounded-full h-2.5">
                    <div className="h-full rounded-full bg-blue-500 transition-all" style={{ width: `${pct}%` }} />
                  </div>
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full min-w-[3.5rem] text-center ${coverageColor(pct)}`}>{pct}%</span>
                </div>
              );
            })}
          </div>
          {keys.length === 0 && (
            <p className="text-center text-sm text-gray-400 mt-6">No translation keys found. Add keys to track coverage.</p>
          )}
        </div>
      )}

      {tab === 'keys' && (
        <>
          <div className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search keys or default values..."
              className="w-full pl-9 pr-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-blue-400"
            />
          </div>

          {loading ? (
            <div className="text-center py-16 text-gray-400">Loading translations...</div>
          ) : filteredKeys.length === 0 ? (
            <div className="text-center py-16">
              <Globe size={40} className="text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 font-medium">No translation keys</p>
              <p className="text-sm text-gray-400 mt-1">Add keys to start localizing your platform</p>
            </div>
          ) : (
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Key</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Default (EN)</th>
                      {LANGUAGES.slice(0, 4).map(l => (
                        <th key={l.code} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">{l.code.toUpperCase()}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredKeys.map(key => (
                      <tr key={key.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3 font-mono text-xs text-gray-600">{key.key}</td>
                        <td className="px-4 py-3 text-gray-700">{key.default_value}</td>
                        {LANGUAGES.slice(0, 4).map(l => {
                          const val = getTranslation(key.id, l.code as SupportedLanguage);
                          return (
                            <td key={l.code} className="px-4 py-3">
                              {val ? (
                                <span className="text-gray-700">{val.value.length > 30 ? val.value.slice(0, 30) + '…' : val.value}</span>
                              ) : (
                                <span className="text-gray-300 italic">—</span>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

import { Globe, ChevronDown, Check } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { useI18n, LANGUAGES } from '../../hooks/useI18n';
import type { SupportedLanguage } from '../../types';

export function LanguageSwitcher() {
  const { lang, changeLanguage } = useI18n();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const current = LANGUAGES.find(l => l.code === lang) ?? LANGUAGES[0];

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-sm text-gray-600 hover:bg-gray-100 transition-colors"
        title="Change language"
      >
        <Globe size={15} className="text-gray-400" />
        <span className="font-medium">{current.code.toUpperCase()}</span>
        <ChevronDown size={13} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 w-52 bg-white border border-gray-200 rounded-xl shadow-lg z-50 overflow-hidden">
          <div className="px-3 py-2 border-b border-gray-100">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Interface Language</p>
          </div>
          <div className="py-1">
            {LANGUAGES.map(language => (
              <button
                key={language.code}
                onClick={() => { changeLanguage(language.code as SupportedLanguage); setOpen(false); }}
                className="w-full flex items-center justify-between px-3 py-2 text-sm hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <span className="text-xs font-mono bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">
                    {language.code.toUpperCase()}
                  </span>
                  <div className="text-left">
                    <p className="font-medium text-gray-800">{language.nativeLabel}</p>
                    <p className="text-xs text-gray-400">{language.label}</p>
                  </div>
                </div>
                {lang === language.code && (
                  <Check size={14} className="text-blue-600" />
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

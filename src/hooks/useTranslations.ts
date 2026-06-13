import { useCallback } from 'react';
import { useI18n } from './useI18n';
import { territorialMultilanguageEngine } from '../services/TerritorialMultilanguageEngine';
import type { SupportedLanguage } from '../types';

export interface UseTranslationsReturn {
  t: (key: string, fallback?: string) => string;
  lang: SupportedLanguage;
  translateModule: (module: string, key: string, fallback?: string) => string;
}

export function useTranslations(namespace?: string): UseTranslationsReturn {
  const { lang, t: baseT } = useI18n();

  const t = useCallback((key: string, fallback?: string) => {
    return territorialMultilanguageEngine.t(key, fallback);
  }, [lang]);

  const translateModule = useCallback((module: string, key: string, fallback?: string) => {
    const fullKey = namespace ? `${namespace}.${key}` : `${module}.${key}`;
    return territorialMultilanguageEngine.t(fullKey, fallback ?? key);
  }, [lang, namespace]);

  return { t, lang, translateModule };
}

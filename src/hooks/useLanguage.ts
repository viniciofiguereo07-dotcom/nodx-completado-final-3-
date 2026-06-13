import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useOrg } from '../contexts/OrgContext';
import { useI18n, setLanguage, LANGUAGES } from './useI18n';
import { territorialMultilanguageEngine } from '../services/TerritorialMultilanguageEngine';
import type { SupportedLanguage, LanguageConfig } from '../types';
import type { LanguageDetectionResult } from '../services/TerritorialMultilanguageEngine';

export interface UseLanguageReturn {
  lang: SupportedLanguage;
  changeLanguage: (lang: SupportedLanguage) => void;
  detection: LanguageDetectionResult | null;
  isLoading: boolean;
  languages: LanguageConfig[];
  languageName: (code: SupportedLanguage) => string;
  isAutoDetected: boolean;
}

export function useLanguage(): UseLanguageReturn {
  const { lang, changeLanguage: baseChange } = useI18n();
  const { user } = useAuth();
  const { org } = useOrg();
  const [detection, setDetection] = useState<LanguageDetectionResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAutoDetected, setIsAutoDetected] = useState(false);

  useEffect(() => {
    territorialMultilanguageEngine.activateModuleTranslations();
  }, []);

  useEffect(() => {
    let mounted = true;
    async function resolve() {
      setIsLoading(true);
      const result = await territorialMultilanguageEngine.resolveLanguage(
        user?.id,
        org?.id,
      );
      if (mounted) {
        setDetection(result);
        setIsAutoDetected(result.source === 'browser');
        if (result.source === 'browser' || result.source === 'org') {
          setLanguage(result.detected);
        }
        setIsLoading(false);
      }
    }
    resolve();
    return () => { mounted = false; };
  }, [user?.id, org?.id]);

  const changeLanguage = useCallback((next: SupportedLanguage) => {
    baseChange(next);
    if (user?.id) {
      territorialMultilanguageEngine.saveUserPreference(user.id, next);
    }
    setIsAutoDetected(false);
    setDetection(prev => prev ? { ...prev, detected: next, source: 'stored' } : null);
  }, [baseChange, user?.id]);

  const languageName = useCallback((code: SupportedLanguage) => {
    return territorialMultilanguageEngine.getLanguageName(code);
  }, []);

  return {
    lang,
    changeLanguage,
    detection,
    isLoading,
    languages: LANGUAGES,
    languageName,
    isAutoDetected,
  };
}

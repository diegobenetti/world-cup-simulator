'use client';

import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { translations, type Language } from './translations';

type LanguageContextValue = {
  lang: Language;
  t: typeof translations['pt'];
  toggle: () => void;
};

const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLang] = useState<Language>('pt');

  useEffect(() => {
    const stored = localStorage.getItem('wcs-lang');
    if (stored === 'en' || stored === 'pt') setLang(stored);
  }, []);

  useEffect(() => {
    document.documentElement.lang = lang === 'pt' ? 'pt-BR' : 'en';
    localStorage.setItem('wcs-lang', lang);
  }, [lang]);

  const toggle = useCallback(() => {
    setLang((prev) => (prev === 'pt' ? 'en' : 'pt'));
  }, []);

  return (
    <LanguageContext.Provider value={{ lang, t: translations[lang], toggle }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useTranslation() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useTranslation must be used within LanguageProvider');
  return ctx;
}

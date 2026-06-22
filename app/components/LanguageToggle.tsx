'use client';

import { useTranslation } from '../lib/LanguageContext';

export function LanguageToggle() {
  const { lang, toggle } = useTranslation();

  return (
    <button
      onClick={toggle}
      aria-label={lang === 'pt' ? 'Switch to English' : 'Mudar para Português'}
      className="flex items-center gap-1 h-9 px-3 rounded-full border border-gray-600 text-gray-300 text-sm transition-all hover:border-white hover:text-white cursor-pointer select-none"
    >
      <span className={`text-xl ${lang === 'pt' ? 'opacity-100' : 'opacity-40'}`} aria-hidden="true">🇧🇷</span>
      <span className="text-gray-600 text-xs">/</span>
      <span className={`text-xl ${lang === 'en' ? 'opacity-100' : 'opacity-40'}`} aria-hidden="true">🇺🇸</span>
    </button>
  );
}

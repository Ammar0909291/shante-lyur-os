'use client';

import * as React from 'react';
import { type Lang, type TranslationKey, translate } from './i18n';

interface LangContextValue {
  lang: Lang;
  setLang: (l: Lang) => void;
}

const LangContext = React.createContext<LangContextValue>({
  lang: 'ru',
  setLang: () => {},
});

export function LangProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = React.useState<Lang>('ru');

  React.useEffect(() => {
    const stored = localStorage.getItem('lang') as Lang | null;
    if (stored === 'en' || stored === 'ru') {
      setLangState(stored);
    }
  }, []);

  const handleSetLang = React.useCallback((l: Lang) => {
    setLangState(l);
    localStorage.setItem('lang', l);
  }, []);

  return (
    <LangContext.Provider value={{ lang, setLang: handleSetLang }}>
      {children}
    </LangContext.Provider>
  );
}

export function useLang() {
  return React.useContext(LangContext);
}

export function useT() {
  const { lang } = useLang();
  return React.useCallback(
    (key: TranslationKey): string => translate(lang, key),
    [lang],
  );
}

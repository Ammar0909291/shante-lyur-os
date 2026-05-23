'use client';

import * as React from 'react';
import { getTranslation, type Locale, type TranslationKey } from '@/lib/i18n';

interface LocaleContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: TranslationKey) => string;
}

const LocaleContext = React.createContext<LocaleContextValue>({
  locale: 'ru',
  setLocale: () => {},
  t: (key) => key,
});

export function LocaleProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = React.useState<Locale>('ru');

  React.useEffect(() => {
    try {
      const stored = localStorage.getItem('sl-locale') as Locale | null;
      if (stored === 'ru' || stored === 'en') setLocaleState(stored);
    } catch {}
  }, []);

  const setLocale = React.useCallback((l: Locale) => {
    setLocaleState(l);
    try { localStorage.setItem('sl-locale', l); } catch {}
  }, []);

  const t = React.useCallback(
    (key: TranslationKey) => getTranslation(locale, key),
    [locale],
  );

  return (
    <LocaleContext.Provider value={{ locale, setLocale, t }}>
      {children}
    </LocaleContext.Provider>
  );
}

export function useLocale(): LocaleContextValue {
  return React.useContext(LocaleContext);
}

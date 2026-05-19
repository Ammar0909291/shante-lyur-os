'use client';

import * as React from 'react';

export type Lang = 'ru' | 'en';

const RU = {
  nav: {
    dashboard:   'Дашборд',
    bookings:    'Записи',
    clients:     'Клиенты',
    specialists: 'Специалисты',
    services:    'Услуги',
    analytics:   'Аналитика',
    settings:    'Настройки',
  },
  header: {
    notifications: 'Уведомления',
    profile:       'Профиль',
    logout:        'Выйти',
    darkMode:      'Тёмная тема',
    lightMode:     'Светлая тема',
    langToggle:    'EN',
  },
  common: {
    loading:  'Загрузка...',
    error:    'Ошибка',
    retry:    'Повторить',
    save:     'Сохранить',
    cancel:   'Отмена',
    create:   'Создать',
    edit:     'Редактировать',
    delete:   'Удалить',
    search:   'Поиск...',
    noData:   'Нет данных',
    actions:  'Действия',
  },
} as const;

const EN = {
  nav: {
    dashboard:   'Dashboard',
    bookings:    'Bookings',
    clients:     'Clients',
    specialists: 'Specialists',
    services:    'Services',
    analytics:   'Analytics',
    settings:    'Settings',
  },
  header: {
    notifications: 'Notifications',
    profile:       'Profile',
    logout:        'Sign out',
    darkMode:      'Dark mode',
    lightMode:     'Light mode',
    langToggle:    'RU',
  },
  common: {
    loading:  'Loading...',
    error:    'Error',
    retry:    'Retry',
    save:     'Save',
    cancel:   'Cancel',
    create:   'Create',
    edit:     'Edit',
    delete:   'Delete',
    search:   'Search...',
    noData:   'No data',
    actions:  'Actions',
  },
} as const;

// Use a structural type to allow both RU and EN shapes
export type Translations = {
  nav: Record<string, string>;
  header: Record<string, string>;
  common: Record<string, string>;
};

const TRANSLATIONS: Record<Lang, Translations> = { ru: RU, en: EN };

interface LangContextValue {
  lang: Lang;
  t: Translations;
  setLang: (l: Lang) => void;
  toggleLang: () => void;
}

const LangContext = React.createContext<LangContextValue>({
  lang: 'ru',
  t: RU,
  setLang: () => {},
  toggleLang: () => {},
});

export function useLang(): LangContextValue {
  return React.useContext(LangContext);
}

export function LangProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = React.useState<Lang>('ru');

  React.useEffect(() => {
    try {
      const stored = localStorage.getItem('sl-lang') as Lang | null;
      if (stored === 'ru' || stored === 'en') setLangState(stored);
    } catch {}
  }, []);

  const setLang = React.useCallback((l: Lang) => {
    setLangState(l);
    try { localStorage.setItem('sl-lang', l); } catch {}
  }, []);

  const toggleLang = React.useCallback(() => {
    setLang(lang === 'ru' ? 'en' : 'ru');
  }, [lang, setLang]);

  return (
    <LangContext.Provider value={{ lang, t: TRANSLATIONS[lang], setLang, toggleLang }}>
      {children}
    </LangContext.Provider>
  );
}

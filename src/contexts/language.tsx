'use client';

import * as React from 'react';

export type Lang = 'ru' | 'en';

interface LanguageCtx {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (key: string) => string;
}

const RU: Record<string, string> = {
  'nav.dashboard': 'Дашборд',
  'nav.bookings': 'Записи',
  'nav.clients': 'Клиенты',
  'nav.specialists': 'Специалисты',
  'nav.services': 'Услуги',
  'nav.analytics': 'Аналитика',
  'nav.chat': 'Чат',
  'nav.settings': 'Настройки',
  'page.dashboard': 'Дашборд',
  'page.bookings': 'Записи',
  'page.clients': 'Клиенты',
  'page.specialists': 'Специалисты',
  'page.services': 'Услуги',
  'page.analytics': 'Аналитика',
  'page.settings': 'Настройки',
  'header.admin': 'Администратор',
  'header.role': 'admin',
  'header.theme.light': 'Светлая тема',
  'header.theme.dark': 'Тёмная тема',
  'header.notifications': 'Уведомления',
  'header.notifications.empty': 'Нет новых уведомлений',
  'header.notifications.pending': 'записей ожидают подтверждения',
  'header.profile': 'Меню пользователя',
  'header.myProfile': 'Профиль',
  'header.logout': 'Выйти',
};

const EN: Record<string, string> = {
  'nav.dashboard': 'Dashboard',
  'nav.bookings': 'Bookings',
  'nav.clients': 'Clients',
  'nav.specialists': 'Specialists',
  'nav.services': 'Services',
  'nav.analytics': 'Analytics',
  'nav.chat': 'Chat',
  'nav.settings': 'Settings',
  'page.dashboard': 'Dashboard',
  'page.bookings': 'Bookings',
  'page.clients': 'Clients',
  'page.specialists': 'Specialists',
  'page.services': 'Services',
  'page.analytics': 'Analytics',
  'page.settings': 'Settings',
  'header.admin': 'Administrator',
  'header.role': 'admin',
  'header.theme.light': 'Light theme',
  'header.theme.dark': 'Dark theme',
  'header.notifications': 'Notifications',
  'header.notifications.empty': 'No new notifications',
  'header.notifications.pending': 'bookings awaiting confirmation',
  'header.profile': 'User menu',
  'header.myProfile': 'Profile',
  'header.logout': 'Sign out',
};

const TRANSLATIONS: Record<Lang, Record<string, string>> = { ru: RU, en: EN };

const LanguageContext = React.createContext<LanguageCtx>({
  lang: 'ru',
  setLang: () => {},
  t: (k) => k,
});

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = React.useState<Lang>('ru');

  React.useEffect(() => {
    try {
      const stored = localStorage.getItem('lang') as Lang;
      if (stored === 'en' || stored === 'ru') setLangState(stored);
    } catch {}
  }, []);

  const setLang = (l: Lang) => {
    setLangState(l);
    try { localStorage.setItem('lang', l); } catch {}
  };

  const t = (key: string): string => TRANSLATIONS[lang][key] ?? key;

  return (
    <LanguageContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return React.useContext(LanguageContext);
}

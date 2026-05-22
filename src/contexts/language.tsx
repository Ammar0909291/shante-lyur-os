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
  'nav.sales': 'Продажи',
  'nav.inventory': 'Склад',
  'nav.chat': 'Чат',
  'nav.settings': 'Настройки',
  'page.dashboard': 'Дашборд',
  'page.bookings': 'Записи',
  'page.clients': 'Клиенты',
  'page.specialists': 'Специалисты',
  'page.services': 'Услуги',
  'page.analytics': 'Аналитика',
  'page.sales': 'Продажи',
  'page.chat': 'Чат',
  'page.profile': 'Профиль',
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
  'dashboard.bookings.total': 'Записи сегодня',
  'dashboard.bookings.cosmetology': 'Косметология',
  'dashboard.bookings.massage': 'Массаж',
  'dashboard.bookings.completed': 'завершено',
  'dashboard.bookings.upcoming': 'предстоит',
  'dashboard.bookings.cancelled': 'отменено',
  'dashboard.trend.vsYesterday': 'vs вчера',
  'dashboard.trend.vsLastWeek': 'vs пр. неделя',
  'dashboard.revenue.today': 'Выручка сегодня',
  'dashboard.revenue.week': 'За неделю',
  'dashboard.revenue.breakdown': 'разбивка по типу',
  'dashboard.specialists.working': 'Работают сегодня',
  'dashboard.specialists.ofTotal': 'из {n} активных',
  'dashboard.workload.title': 'Нагрузка массажистов',
  'dashboard.workload.below': '{n} специалистов ниже нормы',
  'dashboard.workload.met': '✓ Норма выполнена',
  'dashboard.workload.subtitle': 'Минимум {n} сеансов в день',
  'dashboard.workload.viewAll': 'Смотреть специалистов →',
  'dashboard.schedule': 'Расписание',
  'dashboard.newBooking': 'Запись',
  'dashboard.clients': 'Клиенты',
  'dashboard.viewAll': 'Все записи →',
  'dashboard.noAppointments': 'На сегодня записей нет',
  'dashboard.createBooking': 'Создать запись',
  'dashboard.error.stale': 'Данные могут быть устаревшими',
  'dashboard.error.retry': 'Обновить',
  'dashboard.subtitle': 'Вот что происходит в вашей студии сегодня',
};

const EN: Record<string, string> = {
  'nav.dashboard': 'Dashboard',
  'nav.bookings': 'Bookings',
  'nav.clients': 'Clients',
  'nav.specialists': 'Specialists',
  'nav.services': 'Services',
  'nav.analytics': 'Analytics',
  'nav.sales': 'Sales',
  'nav.inventory': 'Inventory',
  'nav.chat': 'Chat',
  'nav.settings': 'Settings',
  'page.dashboard': 'Dashboard',
  'page.bookings': 'Bookings',
  'page.clients': 'Clients',
  'page.specialists': 'Specialists',
  'page.services': 'Services',
  'page.analytics': 'Analytics',
  'page.sales': 'Sales',
  'page.chat': 'Chat',
  'page.profile': 'Profile',
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
  'dashboard.bookings.total': "Today's Bookings",
  'dashboard.bookings.cosmetology': 'Cosmetology',
  'dashboard.bookings.massage': 'Massage',
  'dashboard.bookings.completed': 'completed',
  'dashboard.bookings.upcoming': 'upcoming',
  'dashboard.bookings.cancelled': 'cancelled',
  'dashboard.trend.vsYesterday': 'vs yesterday',
  'dashboard.trend.vsLastWeek': 'vs last week',
  'dashboard.revenue.today': "Today's Revenue",
  'dashboard.revenue.week': 'This Week',
  'dashboard.revenue.breakdown': 'by type',
  'dashboard.specialists.working': 'Working Today',
  'dashboard.specialists.ofTotal': 'of {n} active',
  'dashboard.workload.title': 'Massage Workload',
  'dashboard.workload.below': '{n} specialists below target',
  'dashboard.workload.met': '✓ Target met',
  'dashboard.workload.subtitle': 'Minimum {n} sessions per day',
  'dashboard.workload.viewAll': 'View specialists →',
  'dashboard.schedule': 'Schedule',
  'dashboard.newBooking': 'Booking',
  'dashboard.clients': 'Clients',
  'dashboard.viewAll': 'All bookings →',
  'dashboard.noAppointments': 'No bookings for today',
  'dashboard.createBooking': 'Create booking',
  'dashboard.error.stale': 'Data may be outdated',
  'dashboard.error.retry': 'Retry',
  'dashboard.subtitle': "Here's what's happening in your studio today",
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

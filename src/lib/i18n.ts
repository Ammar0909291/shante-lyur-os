export type Lang = 'ru' | 'en';

const translations = {
  ru: {
    // Sidebar nav
    'nav.dashboard': 'Дашборд',
    'nav.bookings': 'Записи',
    'nav.clients': 'Клиенты',
    'nav.specialists': 'Специалисты',
    'nav.services': 'Услуги',
    'nav.analytics': 'Аналитика',
    'nav.sales': 'Продажи',
    'nav.reports':        'Отчёты',
    'nav.notifications':  'Уведомления',
    'nav.communication':  'Рассылка',
    'nav.waitlist':       'Лист ожидания',
    'nav.loyalty':        'Лояльность',
    'nav.settings':       'Настройки',
    // Page headings
    'page.dashboard': 'Дашборд',
    'page.bookings': 'Записи',
    'page.clients': 'Клиенты',
    'page.specialists': 'Специалисты',
    'page.services': 'Услуги',
    'page.analytics': 'Аналитика',
    'page.settings': 'Настройки',
    // Common buttons
    'btn.save': 'Сохранить',
    'btn.add': 'Добавить',
    'btn.cancel': 'Отмена',
    'btn.addClient': 'Добавить клиента',
    'btn.addSpecialist': 'Добавить специалиста',
    'btn.addService': 'Добавить услугу',
    'btn.newBooking': 'Новая запись',
    'btn.filters': 'Фильтры',
    'btn.export': 'Экспорт',
    // Bookings filter labels
    'filter.all': 'Все',
    'filter.pending': 'Ожидание',
    'filter.confirmed': 'Подтверждено',
    'filter.completed': 'Завершено',
    'filter.cancelled': 'Отменено',
  },
  en: {
    // Sidebar nav
    'nav.dashboard': 'Dashboard',
    'nav.bookings': 'Bookings',
    'nav.clients': 'Clients',
    'nav.specialists': 'Specialists',
    'nav.services': 'Services',
    'nav.analytics': 'Analytics',
    'nav.sales': 'Sales',
    'nav.reports':        'Reports',
    'nav.notifications':  'Notifications',
    'nav.communication':  'Broadcast',
    'nav.waitlist':       'Waitlist',
    'nav.loyalty':        'Loyalty',
    'nav.settings':       'Settings',
    // Page headings
    'page.dashboard': 'Dashboard',
    'page.bookings': 'Bookings',
    'page.clients': 'Clients',
    'page.specialists': 'Specialists',
    'page.services': 'Services',
    'page.analytics': 'Analytics',
    'page.settings': 'Settings',
    // Common buttons
    'btn.save': 'Save',
    'btn.add': 'Add',
    'btn.cancel': 'Cancel',
    'btn.addClient': 'Add Client',
    'btn.addSpecialist': 'Add Specialist',
    'btn.addService': 'Add Service',
    'btn.newBooking': 'New Booking',
    'btn.filters': 'Filters',
    'btn.export': 'Export',
    // Bookings filter labels
    'filter.all': 'All',
    'filter.pending': 'Pending',
    'filter.confirmed': 'Confirmed',
    'filter.completed': 'Completed',
    'filter.cancelled': 'Cancelled',
  },
} as const;

export type TranslationKey = keyof typeof translations.ru;

export function translate(lang: Lang, key: TranslationKey): string {
  return translations[lang][key] ?? translations.ru[key] ?? key;
}

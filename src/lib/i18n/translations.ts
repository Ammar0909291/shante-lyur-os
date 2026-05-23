export type Locale = 'ru' | 'en';

export const translations = {
  ru: {
    // Navigation
    'nav.dashboard': 'Дашборд',
    'nav.operations': 'Операционный центр',
    'nav.bookings': 'Записи',
    'nav.clients': 'Клиенты',
    'nav.specialists': 'Специалисты',
    'nav.services': 'Услуги',
    'nav.sales': 'Продажи',
    'nav.inventory': 'Склад',
    'nav.finance': 'Финансы',
    'nav.analytics': 'Аналитика',
    'nav.chat': 'Чат',
    'nav.settings': 'Настройки',
    // Nav groups
    'nav.group.management': 'Управление',
    'nav.group.sales': 'Продажи и финансы',
    'nav.group.analytics': 'Аналитика',
    // Header
    'header.notifications': 'Уведомления',
    'header.user_menu': 'Меню пользователя',
    'header.profile': 'Профиль',
    'header.logout': 'Выйти',
    'header.admin': 'Администратор',
    // Theme
    'theme.toggle_dark': 'Тёмная тема',
    'theme.toggle_light': 'Светлая тема',
    // Sidebar
    'sidebar.collapse': 'Свернуть',
    'sidebar.expand': 'Развернуть',
    'sidebar.close': 'Закрыть меню',
    // Dashboard
    'dashboard.greeting_morning': 'Доброе утро',
    'dashboard.greeting_afternoon': 'Добрый день',
    'dashboard.greeting_evening': 'Добрый вечер',
    'dashboard.greeting_night': 'Доброй ночи',
    'dashboard.subtitle': 'Вот что происходит в вашей студии сегодня',
    'dashboard.stat.bookings_today': 'Записи сегодня',
    'dashboard.stat.revenue_mtd': 'Выручка за месяц',
    'dashboard.stat.active_clients': 'Активные клиенты',
    'dashboard.stat.avg_rating': 'Средний рейтинг',
    'dashboard.appointments_today': 'Записи на сегодня',
    'dashboard.view_all': 'Все записи →',
    'dashboard.action.block_time': 'Заблокировать время',
    'dashboard.action.add_client': 'Клиент',
    'dashboard.action.new_booking': 'Запись',
    // Table headers
    'table.client': 'Клиент',
    'table.service': 'Услуга',
    'table.specialist': 'Специалист',
    'table.time': 'Время',
    'table.status': 'Статус',
    'table.amount': 'Сумма',
    // Statuses
    'status.confirmed': 'Подтверждено',
    'status.pending': 'Ожидание',
    'status.completed': 'Завершено',
    'status.cancelled': 'Отменено',
    'status.no_show': 'Неявка',
    // Pages (stub)
    'page.under_construction': 'Раздел в разработке',
    // Common
    'common.brand': 'Shante Lyur',
    'common.tagline': 'Wellness Studio',
  },
  en: {
    // Navigation
    'nav.dashboard': 'Dashboard',
    'nav.operations': 'Operations Center',
    'nav.bookings': 'Bookings',
    'nav.clients': 'Clients',
    'nav.specialists': 'Specialists',
    'nav.services': 'Services',
    'nav.sales': 'Sales',
    'nav.inventory': 'Inventory',
    'nav.finance': 'Finance',
    'nav.analytics': 'Analytics',
    'nav.chat': 'Chat',
    'nav.settings': 'Settings',
    // Nav groups
    'nav.group.management': 'Management',
    'nav.group.sales': 'Sales & Finance',
    'nav.group.analytics': 'Analytics',
    // Header
    'header.notifications': 'Notifications',
    'header.user_menu': 'User menu',
    'header.profile': 'Profile',
    'header.logout': 'Log out',
    'header.admin': 'Administrator',
    // Theme
    'theme.toggle_dark': 'Dark mode',
    'theme.toggle_light': 'Light mode',
    // Sidebar
    'sidebar.collapse': 'Collapse',
    'sidebar.expand': 'Expand',
    'sidebar.close': 'Close menu',
    // Dashboard
    'dashboard.greeting_morning': 'Good morning',
    'dashboard.greeting_afternoon': 'Good afternoon',
    'dashboard.greeting_evening': 'Good evening',
    'dashboard.greeting_night': 'Good night',
    'dashboard.subtitle': 'Here is what is happening in your studio today',
    'dashboard.stat.bookings_today': 'Bookings today',
    'dashboard.stat.revenue_mtd': 'Revenue MTD',
    'dashboard.stat.active_clients': 'Active clients',
    'dashboard.stat.avg_rating': 'Average rating',
    'dashboard.appointments_today': 'Today\'s appointments',
    'dashboard.view_all': 'All bookings →',
    'dashboard.action.block_time': 'Block time',
    'dashboard.action.add_client': 'Client',
    'dashboard.action.new_booking': 'Booking',
    // Table headers
    'table.client': 'Client',
    'table.service': 'Service',
    'table.specialist': 'Specialist',
    'table.time': 'Time',
    'table.status': 'Status',
    'table.amount': 'Amount',
    // Statuses
    'status.confirmed': 'Confirmed',
    'status.pending': 'Pending',
    'status.completed': 'Completed',
    'status.cancelled': 'Cancelled',
    'status.no_show': 'No-show',
    // Pages (stub)
    'page.under_construction': 'Section under development',
    // Common
    'common.brand': 'Shante Lyur',
    'common.tagline': 'Wellness Studio',
  },
} as const;

export type TranslationKey = keyof typeof translations.ru;

export function getTranslation(locale: Locale, key: TranslationKey): string {
  return (translations[locale] as Record<string, string>)[key] ?? key;
}

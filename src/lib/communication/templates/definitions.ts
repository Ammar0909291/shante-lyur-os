import type { TemplateVariables } from '../types';

export interface Template {
  key: string;
  nameRu: string;
  bodyRu: (vars: TemplateVariables) => string;
  bodyEn?: (vars: TemplateVariables) => string;
  whatsappTemplateName?: string;
}

const salon = (v: TemplateVariables) => v.salonName ?? 'Shante Lyur';

export const TEMPLATES: Record<string, Template> = {
  booking_confirmation: {
    key: 'booking_confirmation',
    nameRu: 'Подтверждение записи',
    whatsappTemplateName: 'booking_confirmation',
    bodyRu: (v) =>
      `✅ <b>Запись подтверждена</b>\n\n` +
      `Здравствуйте, ${v.clientName ?? 'Клиент'}!\n\n` +
      `Ваша запись в <b>${salon(v)}</b> подтверждена:\n` +
      `📋 Услуга: ${v.serviceName ?? '—'}\n` +
      `👤 Специалист: ${v.specialistName ?? '—'}\n` +
      `📅 Дата: ${v.date ?? '—'}\n` +
      `🕐 Время: ${v.time ?? '—'}\n\n` +
      `До встречи! 💎`,
    bodyEn: (v) =>
      `✅ <b>Booking Confirmed</b>\n\n` +
      `Hello, ${v.clientName ?? 'Client'}!\n\n` +
      `Your appointment at <b>${salon(v)}</b>:\n` +
      `📋 Service: ${v.serviceName ?? '—'}\n` +
      `👤 Specialist: ${v.specialistName ?? '—'}\n` +
      `📅 Date: ${v.date ?? '—'}\n` +
      `🕐 Time: ${v.time ?? '—'}\n\n` +
      `See you soon! 💎`,
  },

  booking_reminder_24h: {
    key: 'booking_reminder_24h',
    nameRu: 'Напоминание (24 часа)',
    bodyRu: (v) =>
      `⏰ <b>Напоминание о записи</b>\n\n` +
      `Здравствуйте, ${v.clientName ?? 'Клиент'}!\n\n` +
      `Напоминаем, что <b>завтра</b> вас ждём в <b>${salon(v)}</b>:\n` +
      `📋 Услуга: ${v.serviceName ?? '—'}\n` +
      `👤 Специалист: ${v.specialistName ?? '—'}\n` +
      `🕐 Время: ${v.time ?? '—'}\n\n` +
      `Если планы изменились — пожалуйста, сообщите заранее. 🙏`,
    bodyEn: (v) =>
      `⏰ <b>Appointment Reminder</b>\n\n` +
      `Hi ${v.clientName ?? 'Client'}!\n\n` +
      `Just a reminder — <b>tomorrow</b> at <b>${salon(v)}</b>:\n` +
      `📋 Service: ${v.serviceName ?? '—'}\n` +
      `👤 Specialist: ${v.specialistName ?? '—'}\n` +
      `🕐 Time: ${v.time ?? '—'}\n\n` +
      `Please let us know if your plans change. 🙏`,
  },

  booking_reminder_2h: {
    key: 'booking_reminder_2h',
    nameRu: 'Напоминание (2 часа)',
    bodyRu: (v) =>
      `⏰ <b>Скоро ваш визит!</b>\n\n` +
      `Ждём вас <b>через 2 часа</b> в ${salon(v)}:\n` +
      `📋 ${v.serviceName ?? '—'} в ${v.time ?? '—'}\n\n` +
      `Будем рады видеть вас! 💎`,
    bodyEn: (v) =>
      `⏰ <b>Your appointment is soon!</b>\n\n` +
      `We'll see you in <b>2 hours</b> at ${salon(v)}:\n` +
      `📋 ${v.serviceName ?? '—'} at ${v.time ?? '—'}\n\n` +
      `Looking forward to seeing you! 💎`,
  },

  booking_cancellation: {
    key: 'booking_cancellation',
    nameRu: 'Отмена записи',
    bodyRu: (v) =>
      `❌ <b>Запись отменена</b>\n\n` +
      `Здравствуйте, ${v.clientName ?? 'Клиент'}!\n\n` +
      `Ваша запись на <b>${v.serviceName ?? '—'}</b> ${v.date ? `(${v.date} ${v.time ?? ''})` : ''} отменена.\n\n` +
      `Хотите перенести? Мы всегда рады помочь! 📞`,
    bodyEn: (v) =>
      `❌ <b>Booking Cancelled</b>\n\n` +
      `Hello, ${v.clientName ?? 'Client'}!\n\n` +
      `Your appointment for <b>${v.serviceName ?? '—'}</b> ${v.date ? `(${v.date} ${v.time ?? ''})` : ''} has been cancelled.\n\n` +
      `Would you like to reschedule? We'd love to help! 📞`,
  },

  booking_rescheduled: {
    key: 'booking_rescheduled',
    nameRu: 'Перенос записи',
    bodyRu: (v) =>
      `🔄 <b>Запись перенесена</b>\n\n` +
      `Здравствуйте, ${v.clientName ?? 'Клиент'}!\n\n` +
      `Ваша запись перенесена на:\n` +
      `📅 ${v.date ?? '—'} в ${v.time ?? '—'}\n` +
      `👤 Специалист: ${v.specialistName ?? '—'}\n\n` +
      `До встречи! 💎`,
    bodyEn: (v) =>
      `🔄 <b>Appointment Rescheduled</b>\n\n` +
      `Hello, ${v.clientName ?? 'Client'}!\n\n` +
      `Your appointment has been moved to:\n` +
      `📅 ${v.date ?? '—'} at ${v.time ?? '—'}\n` +
      `👤 Specialist: ${v.specialistName ?? '—'}\n\n` +
      `See you then! 💎`,
  },

  payment_received: {
    key: 'payment_received',
    nameRu: 'Подтверждение оплаты',
    bodyRu: (v) =>
      `💳 <b>Оплата получена</b>\n\n` +
      `Спасибо, ${v.clientName ?? 'Клиент'}!\n\n` +
      `Оплата <b>${v.amount ?? '—'} ${v.currency ?? 'руб.'}</b> за услугу "${v.serviceName ?? '—'}" успешно получена.\n\n` +
      `${salon(v)} · ${v.date ?? ''}`,
    bodyEn: (v) =>
      `💳 <b>Payment Received</b>\n\n` +
      `Thank you, ${v.clientName ?? 'Client'}!\n\n` +
      `Payment of <b>${v.amount ?? '—'} ${v.currency ?? 'RUB'}</b> for "${v.serviceName ?? '—'}" received.\n\n` +
      `${salon(v)} · ${v.date ?? ''}`,
  },

  welcome: {
    key: 'welcome',
    nameRu: 'Добро пожаловать',
    bodyRu: (v) =>
      `💎 <b>Добро пожаловать в ${salon(v)}!</b>\n\n` +
      `Здравствуйте, ${v.clientName ?? ''}!\n\n` +
      `Мы рады приветствовать вас. Вы можете записаться к специалисту или задать любой вопрос.\n\n` +
      `С уважением, команда ${salon(v)} ✨`,
    bodyEn: (v) =>
      `💎 <b>Welcome to ${salon(v)}!</b>\n\n` +
      `Hello, ${v.clientName ?? ''}!\n\n` +
      `We're delighted to have you. Book an appointment or ask us anything.\n\n` +
      `Best regards, ${salon(v)} team ✨`,
  },

  staff_new_booking: {
    key: 'staff_new_booking',
    nameRu: 'Новая запись (персонал)',
    bodyRu: (v) =>
      `📅 <b>Новая запись</b>\n\n` +
      `Специалист: ${v.specialistName ?? '—'}\n` +
      `Клиент: ${v.clientName ?? '—'}\n` +
      `Услуга: ${v.serviceName ?? '—'}\n` +
      `📅 ${v.date ?? '—'} ${v.time ?? ''}`,
    bodyEn: (v) =>
      `📅 <b>New Booking</b>\n\n` +
      `Specialist: ${v.specialistName ?? '—'}\n` +
      `Client: ${v.clientName ?? '—'}\n` +
      `Service: ${v.serviceName ?? '—'}\n` +
      `📅 ${v.date ?? '—'} ${v.time ?? ''}`,
  },

  staff_cancellation: {
    key: 'staff_cancellation',
    nameRu: 'Отмена записи (персонал)',
    bodyRu: (v) =>
      `❌ <b>Запись отменена</b>\n\n` +
      `Клиент ${v.clientName ?? '—'} отменил запись на ${v.serviceName ?? '—'} (${v.date ?? '—'} ${v.time ?? ''}).`,
    bodyEn: (v) =>
      `❌ <b>Booking Cancelled</b>\n\n` +
      `Client ${v.clientName ?? '—'} cancelled ${v.serviceName ?? '—'} (${v.date ?? '—'} ${v.time ?? ''}).`,
  },

  operational_low_stock: {
    key: 'operational_low_stock',
    nameRu: 'Низкий запас',
    bodyRu: (v) =>
      `⚠️ <b>Низкий запас материалов</b>\n\n` +
      `${v.serviceName ?? 'Позиция'}: остаток ниже минимума.\n` +
      `Требуется пополнение запасов.`,
    bodyEn: (v) =>
      `⚠️ <b>Low Inventory Alert</b>\n\n` +
      `${v.serviceName ?? 'Item'}: stock below minimum level.\n` +
      `Replenishment required.`,
  },

  operational_vip_inactive: {
    key: 'operational_vip_inactive',
    nameRu: 'VIP клиент неактивен',
    bodyRu: (v) =>
      `⭐ <b>VIP клиент давно не приходил</b>\n\n` +
      `Клиент ${v.clientName ?? '—'} не посещал салон более 30 дней.\n` +
      `Рекомендуется связаться для удержания.`,
    bodyEn: (v) =>
      `⭐ <b>VIP Client Inactive</b>\n\n` +
      `Client ${v.clientName ?? '—'} hasn't visited in 30+ days.\n` +
      `Consider reaching out for retention.`,
  },
};

export function getTemplate(key: string): Template | undefined {
  return TEMPLATES[key];
}

export function renderTemplate(
  key: string,
  vars: TemplateVariables,
  lang: 'ru' | 'en' = 'ru',
): string | null {
  const tpl = TEMPLATES[key];
  if (!tpl) return null;
  if (lang === 'en' && tpl.bodyEn) return tpl.bodyEn(vars);
  return tpl.bodyRu(vars);
}

-- Migration: notification_system
-- Adds TELEGRAM channel, new notification types, NotificationPreference, NotificationTemplate

-- Add TELEGRAM to NotificationChannel enum
ALTER TYPE "NotificationChannel" ADD VALUE IF NOT EXISTS 'TELEGRAM';

-- Add new NotificationType values
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'FOLLOW_UP';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'REACTIVATION';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'LOYALTY_REMINDER';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'MEMBERSHIP_RENEWAL';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'RECURRING_TREATMENT';

-- NotificationPreference table
CREATE TABLE "notification_preferences" (
    "id"                    UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id"               UUID NOT NULL,
    "email_enabled"         BOOLEAN NOT NULL DEFAULT true,
    "sms_enabled"           BOOLEAN NOT NULL DEFAULT false,
    "push_enabled"          BOOLEAN NOT NULL DEFAULT true,
    "telegram_enabled"      BOOLEAN NOT NULL DEFAULT false,
    "telegram_chat_id"      VARCHAR(50),
    "appointment_reminders" BOOLEAN NOT NULL DEFAULT true,
    "follow_up_messages"    BOOLEAN NOT NULL DEFAULT true,
    "loyalty_updates"       BOOLEAN NOT NULL DEFAULT true,
    "membership_reminders"  BOOLEAN NOT NULL DEFAULT true,
    "marketing_messages"    BOOLEAN NOT NULL DEFAULT false,
    "reminder_lead_hours"   INTEGER NOT NULL DEFAULT 24,
    "created_at"            TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at"            TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notification_preferences_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "notification_preferences_user_id_key" UNIQUE ("user_id"),
    CONSTRAINT "notification_preferences_user_id_fkey"
        FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE
);

-- NotificationTemplate table
CREATE TABLE "notification_templates" (
    "id"            UUID NOT NULL DEFAULT gen_random_uuid(),
    "type"          "NotificationType" NOT NULL,
    "channel"       "NotificationChannel" NOT NULL,
    "name"          VARCHAR(100) NOT NULL,
    "subject"       VARCHAR(255),
    "body_template" TEXT NOT NULL,
    "variables"     JSONB,
    "is_active"     BOOLEAN NOT NULL DEFAULT true,
    "created_by"    UUID,
    "created_at"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notification_templates_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "notification_templates_type_channel_key" UNIQUE ("type", "channel")
);

CREATE INDEX "notification_templates_type_is_active_idx" ON "notification_templates"("type", "is_active");

-- Seed default templates
INSERT INTO "notification_templates" ("type", "channel", "name", "subject", "body_template", "variables") VALUES
  ('APPOINTMENT_CONFIRMED', 'EMAIL', 'Подтверждение записи', 'Ваша запись подтверждена — Shante Lyur',
   'Здравствуйте, {{name}}! Ваша запись на {{service}} к специалисту {{specialist}} подтверждена на {{date}} в {{time}}.',
   '["name","service","specialist","date","time"]'),
  ('APPOINTMENT_REMINDER', 'EMAIL', 'Напоминание о записи', 'Напоминание: запись завтра — Shante Lyur',
   'Здравствуйте, {{name}}! Напоминаем о вашей записи на {{service}} завтра в {{time}}.',
   '["name","service","time"]'),
  ('APPOINTMENT_CANCELLED', 'EMAIL', 'Отмена записи', 'Ваша запись отменена — Shante Lyur',
   'Здравствуйте, {{name}}! Ваша запись на {{service}} ({{date}} в {{time}}) была отменена.',
   '["name","service","date","time"]'),
  ('FOLLOW_UP', 'EMAIL', 'Обратная связь после визита', 'Как прошла процедура? — Shante Lyur',
   'Здравствуйте, {{name}}! Прошло {{days}} дней после процедуры «{{service}}». Надеемся, вы довольны результатом!',
   '["name","service","days","specialist"]'),
  ('REACTIVATION', 'EMAIL', 'Реактивация клиента', 'Мы скучаем по вам! — Shante Lyur',
   'Здравствуйте, {{name}}! Вы не посещали нас уже {{days}} дней. Приходите — мы ждём вас! {{promoCode}}',
   '["name","days","promoCode"]'),
  ('MEMBERSHIP_RENEWAL', 'EMAIL', 'Продление абонемента', 'Ваш абонемент истекает — Shante Lyur',
   'Здравствуйте, {{name}}! Ваш абонемент «{{plan}}» истекает {{expiresAt}} (через {{daysLeft}} дн.). Продлите сейчас.',
   '["name","plan","expiresAt","daysLeft"]'),
  ('RECURRING_TREATMENT', 'EMAIL', 'Рекомендация по процедуре', 'Пора на процедуру — Shante Lyur',
   'Здравствуйте, {{name}}! Рекомендуем записаться на «{{service}}». Рекомендуемая дата: {{date}}.',
   '["name","service","date"]')
ON CONFLICT ("type", "channel") DO NOTHING;

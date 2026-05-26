-- CreateEnum: conversation_type
DO $$ BEGIN
  CREATE TYPE "conversation_type" AS ENUM ('DIRECT', 'GROUP');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- CreateEnum: message_type
DO $$ BEGIN
  CREATE TYPE "message_type" AS ENUM ('TEXT', 'SYSTEM');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- CreateTable: conversations
CREATE TABLE IF NOT EXISTS "conversations" (
  "id"                   TEXT          NOT NULL,
  "type"                 "conversation_type" NOT NULL,
  "name"                 VARCHAR(200),
  "created_by_id"        UUID          NOT NULL,
  "last_message_at"      TIMESTAMP(3),
  "last_message_preview" VARCHAR(300),
  "created_at"           TIMESTAMP(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"           TIMESTAMP(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "conversations_pkey" PRIMARY KEY ("id")
);

-- CreateTable: conversation_members
CREATE TABLE IF NOT EXISTS "conversation_members" (
  "id"              TEXT         NOT NULL,
  "conversation_id" TEXT         NOT NULL,
  "user_id"         UUID         NOT NULL,
  "muted"           BOOLEAN      NOT NULL DEFAULT false,
  "joined_at"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "left_at"         TIMESTAMP(3),
  CONSTRAINT "conversation_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable: messages
CREATE TABLE IF NOT EXISTS "messages" (
  "id"              TEXT         NOT NULL,
  "conversation_id" TEXT         NOT NULL,
  "sender_id"       UUID         NOT NULL,
  "type"            "message_type" NOT NULL DEFAULT 'TEXT',
  "content"         TEXT         NOT NULL,
  "edited_at"       TIMESTAMP(3),
  "deleted_at"      TIMESTAMP(3),
  "created_at"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable: chat_notifications
CREATE TABLE IF NOT EXISTS "chat_notifications" (
  "id"              TEXT         NOT NULL,
  "recipient_id"    UUID         NOT NULL,
  "sender_id"       UUID         NOT NULL,
  "conversation_id" TEXT         NOT NULL,
  "message_id"      TEXT         NOT NULL,
  "preview"         VARCHAR(200) NOT NULL,
  "is_read"         BOOLEAN      NOT NULL DEFAULT false,
  "read_at"         TIMESTAMP(3),
  "created_at"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "chat_notifications_pkey" PRIMARY KEY ("id")
);

-- Indexes
CREATE INDEX IF NOT EXISTS "conversations_last_message_at_idx"  ON "conversations"("last_message_at");
CREATE INDEX IF NOT EXISTS "conversations_created_by_id_idx"    ON "conversations"("created_by_id");

CREATE UNIQUE INDEX IF NOT EXISTS "conversation_members_conversation_id_user_id_key"
  ON "conversation_members"("conversation_id", "user_id");
CREATE INDEX IF NOT EXISTS "conversation_members_user_id_idx"          ON "conversation_members"("user_id");
CREATE INDEX IF NOT EXISTS "conversation_members_conversation_id_idx"  ON "conversation_members"("conversation_id");

CREATE INDEX IF NOT EXISTS "messages_conversation_id_created_at_idx" ON "messages"("conversation_id", "created_at");
CREATE INDEX IF NOT EXISTS "messages_sender_id_idx"                  ON "messages"("sender_id");

CREATE INDEX IF NOT EXISTS "chat_notifications_recipient_id_is_read_idx"
  ON "chat_notifications"("recipient_id", "is_read");
CREATE INDEX IF NOT EXISTS "chat_notifications_recipient_id_conversation_id_idx"
  ON "chat_notifications"("recipient_id", "conversation_id");

-- Foreign keys
ALTER TABLE "conversations"
  DROP CONSTRAINT IF EXISTS "conversations_created_by_id_fkey",
  ADD CONSTRAINT "conversations_created_by_id_fkey"
    FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "conversation_members"
  DROP CONSTRAINT IF EXISTS "conversation_members_conversation_id_fkey",
  ADD CONSTRAINT "conversation_members_conversation_id_fkey"
    FOREIGN KEY ("conversation_id") REFERENCES "conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "conversation_members"
  DROP CONSTRAINT IF EXISTS "conversation_members_user_id_fkey",
  ADD CONSTRAINT "conversation_members_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "messages"
  DROP CONSTRAINT IF EXISTS "messages_conversation_id_fkey",
  ADD CONSTRAINT "messages_conversation_id_fkey"
    FOREIGN KEY ("conversation_id") REFERENCES "conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "messages"
  DROP CONSTRAINT IF EXISTS "messages_sender_id_fkey",
  ADD CONSTRAINT "messages_sender_id_fkey"
    FOREIGN KEY ("sender_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "chat_notifications"
  DROP CONSTRAINT IF EXISTS "chat_notifications_recipient_id_fkey",
  ADD CONSTRAINT "chat_notifications_recipient_id_fkey"
    FOREIGN KEY ("recipient_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "chat_notifications"
  DROP CONSTRAINT IF EXISTS "chat_notifications_sender_id_fkey",
  ADD CONSTRAINT "chat_notifications_sender_id_fkey"
    FOREIGN KEY ("sender_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "chat_notifications"
  DROP CONSTRAINT IF EXISTS "chat_notifications_conversation_id_fkey",
  ADD CONSTRAINT "chat_notifications_conversation_id_fkey"
    FOREIGN KEY ("conversation_id") REFERENCES "conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "chat_notifications"
  DROP CONSTRAINT IF EXISTS "chat_notifications_message_id_fkey",
  ADD CONSTRAINT "chat_notifications_message_id_fkey"
    FOREIGN KEY ("message_id") REFERENCES "messages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

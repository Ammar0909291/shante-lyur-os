-- CreateEnum
CREATE TYPE "MessageVisibility" AS ENUM ('BROADCAST', 'DIRECT');

-- CreateTable
CREATE TABLE "internal_messages" (
    "id" UUID NOT NULL,
    "sender_id" UUID NOT NULL,
    "recipient_id" UUID,
    "content" TEXT NOT NULL,
    "appointment_id" UUID,
    "profile_id" UUID,
    "visibility" "MessageVisibility" NOT NULL DEFAULT 'BROADCAST',
    "is_read" BOOLEAN NOT NULL DEFAULT false,
    "read_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "internal_messages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "internal_messages_sender_id_created_at_idx" ON "internal_messages"("sender_id", "created_at");

-- CreateIndex
CREATE INDEX "internal_messages_recipient_id_created_at_idx" ON "internal_messages"("recipient_id", "created_at");

-- CreateIndex
CREATE INDEX "internal_messages_appointment_id_idx" ON "internal_messages"("appointment_id");

-- CreateIndex
CREATE INDEX "internal_messages_profile_id_idx" ON "internal_messages"("profile_id");

-- CreateIndex
CREATE INDEX "internal_messages_visibility_created_at_idx" ON "internal_messages"("visibility", "created_at");

-- AddForeignKey
ALTER TABLE "internal_messages" ADD CONSTRAINT "internal_messages_sender_id_fkey" FOREIGN KEY ("sender_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "internal_messages" ADD CONSTRAINT "internal_messages_recipient_id_fkey" FOREIGN KEY ("recipient_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "internal_messages" ADD CONSTRAINT "internal_messages_appointment_id_fkey" FOREIGN KEY ("appointment_id") REFERENCES "appointments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "internal_messages" ADD CONSTRAINT "internal_messages_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "customer_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

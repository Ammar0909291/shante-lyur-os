-- AlterTable
ALTER TABLE "appointments" ADD COLUMN     "room_id" UUID;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "notify_email" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "notify_push" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "notify_sms" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "rooms" (
    "id" UUID NOT NULL,
    "location_id" UUID NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rooms_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "rooms_location_id_is_active_idx" ON "rooms"("location_id", "is_active");

-- CreateIndex
CREATE INDEX "appointments_room_id_start_at_idx" ON "appointments"("room_id", "start_at");

-- AddForeignKey
ALTER TABLE "rooms" ADD CONSTRAINT "rooms_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "locations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_room_id_fkey" FOREIGN KEY ("room_id") REFERENCES "rooms"("id") ON DELETE SET NULL ON UPDATE CASCADE;

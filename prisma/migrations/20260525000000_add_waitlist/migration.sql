-- CreateEnum
CREATE TYPE "WaitlistStatus" AS ENUM ('WAITING', 'NOTIFIED', 'BOOKED', 'EXPIRED', 'CANCELLED');

-- CreateTable
CREATE TABLE "waitlist_entries" (
    "id"              UUID NOT NULL DEFAULT gen_random_uuid(),
    "client_id"       UUID NOT NULL,
    "service_id"      UUID NOT NULL,
    "specialist_id"   UUID,
    "location_id"     UUID,
    "preferred_date"  DATE,
    "preferred_from"  TIME,
    "preferred_to"    TIME,
    "notes"           TEXT,
    "status"          "WaitlistStatus" NOT NULL DEFAULT 'WAITING',
    "notified_at"     TIMESTAMP(3),
    "expires_at"      TIMESTAMP(3),
    "created_at"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at"      TIMESTAMP(3) NOT NULL,

    CONSTRAINT "waitlist_entries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "waitlist_entries_status_created_at_idx" ON "waitlist_entries"("status", "created_at");
CREATE INDEX "waitlist_entries_client_id_idx"           ON "waitlist_entries"("client_id");
CREATE INDEX "waitlist_entries_service_id_status_idx"   ON "waitlist_entries"("service_id", "status");
CREATE INDEX "waitlist_entries_specialist_id_status_idx" ON "waitlist_entries"("specialist_id", "status");

-- AddForeignKey
ALTER TABLE "waitlist_entries" ADD CONSTRAINT "waitlist_entries_client_id_fkey"
    FOREIGN KEY ("client_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "waitlist_entries" ADD CONSTRAINT "waitlist_entries_service_id_fkey"
    FOREIGN KEY ("service_id") REFERENCES "services"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "waitlist_entries" ADD CONSTRAINT "waitlist_entries_specialist_id_fkey"
    FOREIGN KEY ("specialist_id") REFERENCES "specialists"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "waitlist_entries" ADD CONSTRAINT "waitlist_entries_location_id_fkey"
    FOREIGN KEY ("location_id") REFERENCES "locations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

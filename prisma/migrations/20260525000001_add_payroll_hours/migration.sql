CREATE TABLE "payroll_hours_entries" (
  "id"           UUID         NOT NULL DEFAULT gen_random_uuid(),
  "specialist_id" UUID        NOT NULL,
  "period_from"  DATE         NOT NULL,
  "period_to"    DATE         NOT NULL,
  "hours_worked" DECIMAL(6,2) NOT NULL DEFAULT 0,
  "created_at"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "payroll_hours_entries_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "payroll_hours_entries_specialist_id_fkey"
    FOREIGN KEY ("specialist_id") REFERENCES "specialists"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "payroll_hours_entries_specialist_id_period_from_period_to_key"
  ON "payroll_hours_entries"("specialist_id", "period_from", "period_to");

CREATE INDEX "payroll_hours_entries_specialist_id_idx"
  ON "payroll_hours_entries"("specialist_id");

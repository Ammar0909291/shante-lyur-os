-- Payroll System v2 migration

-- SalaryType enum
CREATE TYPE "SalaryType" AS ENUM ('FIXED', 'HOURLY', 'SHIFT', 'HYBRID');

-- PayrollEntryType enum
CREATE TYPE "PayrollEntryType" AS ENUM ('BASE_SALARY', 'COMMISSION', 'BONUS', 'DEDUCTION', 'ADJUSTMENT');

-- PayrollPeriodStatus enum
CREATE TYPE "PayrollPeriodStatus" AS ENUM ('PENDING', 'APPROVED', 'PAID');

-- Add commission fields to payments
ALTER TABLE "payments"
  ADD COLUMN IF NOT EXISTS "commission_rate"       DECIMAL(5,4),
  ADD COLUMN IF NOT EXISTS "commission_overridden"  BOOLEAN NOT NULL DEFAULT FALSE;

-- SpecialistSalaryConfig
CREATE TABLE "specialist_salary_configs" (
  "id"                       UUID         NOT NULL DEFAULT gen_random_uuid(),
  "specialist_id"            UUID         NOT NULL,
  "salary_type"              "SalaryType" NOT NULL DEFAULT 'FIXED',
  "fixed_amount"             DECIMAL(12,2) NOT NULL DEFAULT 0,
  "hourly_rate"              DECIMAL(10,2) NOT NULL DEFAULT 0,
  "shift_rate"               DECIMAL(10,2) NOT NULL DEFAULT 0,
  "commission_rate"          DECIMAL(5,4)  NOT NULL DEFAULT 0,
  "bonus_threshold_sessions" INTEGER,
  "effective_from"           TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "notes"                    VARCHAR(500),
  "created_at"               TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"               TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "specialist_salary_configs_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "specialist_salary_configs_specialist_id_fkey"
    FOREIGN KEY ("specialist_id") REFERENCES "specialists"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "specialist_salary_configs_specialist_id_key" ON "specialist_salary_configs"("specialist_id");
CREATE INDEX "specialist_salary_configs_specialist_id_idx" ON "specialist_salary_configs"("specialist_id");

-- PayrollEntry
CREATE TABLE "payroll_entries" (
  "id"             UUID                NOT NULL DEFAULT gen_random_uuid(),
  "specialist_id"  UUID                NOT NULL,
  "payment_id"     UUID,
  "appointment_id" UUID,
  "type"           "PayrollEntryType"  NOT NULL,
  "amount"         DECIMAL(12,2)       NOT NULL,
  "rate"           DECIMAL(5,4),
  "period_month"   VARCHAR(7)          NOT NULL,
  "description"    VARCHAR(500),
  "is_locked"      BOOLEAN             NOT NULL DEFAULT FALSE,
  "created_by"     UUID,
  "created_at"     TIMESTAMP(3)        NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "payroll_entries_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "payroll_entries_specialist_id_fkey"
    FOREIGN KEY ("specialist_id") REFERENCES "specialists"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "payroll_entries_payment_id_fkey"
    FOREIGN KEY ("payment_id") REFERENCES "payments"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "payroll_entries_appointment_id_fkey"
    FOREIGN KEY ("appointment_id") REFERENCES "appointments"("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE INDEX "payroll_entries_specialist_id_period_month_idx" ON "payroll_entries"("specialist_id", "period_month");
CREATE INDEX "payroll_entries_payment_id_idx" ON "payroll_entries"("payment_id");
CREATE INDEX "payroll_entries_type_period_month_idx" ON "payroll_entries"("type", "period_month");

-- PayrollPeriod
CREATE TABLE "payroll_periods" (
  "id"               UUID                   NOT NULL DEFAULT gen_random_uuid(),
  "specialist_id"    UUID                   NOT NULL,
  "period_start"     DATE                   NOT NULL,
  "period_end"       DATE                   NOT NULL,
  "base_salary"      DECIMAL(12,2)          NOT NULL DEFAULT 0,
  "total_commission" DECIMAL(12,2)          NOT NULL DEFAULT 0,
  "total_bonus"      DECIMAL(12,2)          NOT NULL DEFAULT 0,
  "total_deduction"  DECIMAL(12,2)          NOT NULL DEFAULT 0,
  "total_adjustment" DECIMAL(12,2)          NOT NULL DEFAULT 0,
  "total_payable"    DECIMAL(12,2)          NOT NULL DEFAULT 0,
  "status"           "PayrollPeriodStatus"  NOT NULL DEFAULT 'PENDING',
  "approved_at"      TIMESTAMP(3),
  "approved_by"      UUID,
  "paid_at"          TIMESTAMP(3),
  "created_at"       TIMESTAMP(3)           NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"       TIMESTAMP(3)           NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "payroll_periods_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "payroll_periods_specialist_id_fkey"
    FOREIGN KEY ("specialist_id") REFERENCES "specialists"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "payroll_periods_specialist_id_period_start_period_end_key"
  ON "payroll_periods"("specialist_id", "period_start", "period_end");
CREATE INDEX "payroll_periods_specialist_id_status_idx" ON "payroll_periods"("specialist_id", "status");
CREATE INDEX "payroll_periods_period_start_period_end_idx" ON "payroll_periods"("period_start", "period_end");

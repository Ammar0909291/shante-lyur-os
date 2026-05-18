-- CreateTable: commission_rules
CREATE TABLE "commission_rules" (
    "id"               UUID         NOT NULL DEFAULT gen_random_uuid(),
    "specialist_id"    UUID,
    "service_id"       UUID,
    "commission_type"  VARCHAR(20)  NOT NULL,
    "commission_value" DECIMAL(10,4) NOT NULL,
    "is_active"        BOOLEAN      NOT NULL DEFAULT true,
    "notes"            VARCHAR(500),
    "created_by"       UUID,
    "created_at"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at"       TIMESTAMP(3) NOT NULL,

    CONSTRAINT "commission_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable: payroll_periods
CREATE TABLE "payroll_periods" (
    "id"          UUID         NOT NULL DEFAULT gen_random_uuid(),
    "name"        VARCHAR(255) NOT NULL,
    "start_date"  DATE         NOT NULL,
    "end_date"    DATE         NOT NULL,
    "status"      VARCHAR(20)  NOT NULL DEFAULT 'OPEN',
    "approved_by" UUID,
    "approved_at" TIMESTAMP(3),
    "notes"       TEXT,
    "created_by"  UUID,
    "created_at"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at"  TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payroll_periods_pkey" PRIMARY KEY ("id")
);

-- CreateTable: payroll_entries
CREATE TABLE "payroll_entries" (
    "id"               UUID          NOT NULL DEFAULT gen_random_uuid(),
    "period_id"        UUID          NOT NULL,
    "specialist_id"    UUID          NOT NULL,
    "appointment_id"   UUID,
    "payment_id"       UUID,
    "entry_type"       VARCHAR(30)   NOT NULL,
    "gross_amount"     DECIMAL(10,2) NOT NULL,
    "commission_rate"  DECIMAL(5,4)  NOT NULL,
    "gross_commission" DECIMAL(10,2) NOT NULL,
    "refund_deduction" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "net_commission"   DECIMAL(10,2) NOT NULL,
    "notes"            VARCHAR(500),
    "created_at"       TIMESTAMP(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payroll_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable: payroll_adjustments
CREATE TABLE "payroll_adjustments" (
    "id"            UUID          NOT NULL DEFAULT gen_random_uuid(),
    "period_id"     UUID          NOT NULL,
    "specialist_id" UUID          NOT NULL,
    "type"          VARCHAR(20)   NOT NULL,
    "amount"        DECIMAL(10,2) NOT NULL,
    "reason"        VARCHAR(500)  NOT NULL,
    "applied_by"    UUID,
    "created_at"    TIMESTAMP(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payroll_adjustments_pkey" PRIMARY KEY ("id")
);

-- CreateTable: payouts
CREATE TABLE "payouts" (
    "id"                UUID          NOT NULL DEFAULT gen_random_uuid(),
    "period_id"         UUID          NOT NULL,
    "specialist_id"     UUID          NOT NULL,
    "total_gross"       DECIMAL(10,2) NOT NULL,
    "total_deductions"  DECIMAL(10,2) NOT NULL DEFAULT 0,
    "total_adjustments" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "total_net"         DECIMAL(10,2) NOT NULL,
    "status"            VARCHAR(20)   NOT NULL DEFAULT 'PENDING',
    "paid_at"           TIMESTAMP(3),
    "payment_method"    VARCHAR(50),
    "notes"             TEXT,
    "processed_by"      UUID,
    "created_at"        TIMESTAMP(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at"        TIMESTAMP(3)  NOT NULL,

    CONSTRAINT "payouts_pkey" PRIMARY KEY ("id")
);

-- Indexes
CREATE INDEX "commission_rules_specialist_id_is_active_idx" ON "commission_rules"("specialist_id", "is_active");
CREATE INDEX "commission_rules_service_id_is_active_idx" ON "commission_rules"("service_id", "is_active");

CREATE INDEX "payroll_periods_status_start_date_idx" ON "payroll_periods"("status", "start_date");

CREATE INDEX "payroll_entries_period_id_specialist_id_idx" ON "payroll_entries"("period_id", "specialist_id");
CREATE INDEX "payroll_entries_specialist_id_created_at_idx" ON "payroll_entries"("specialist_id", "created_at");
CREATE INDEX "payroll_entries_payment_id_idx" ON "payroll_entries"("payment_id");

CREATE INDEX "payroll_adjustments_period_id_specialist_id_idx" ON "payroll_adjustments"("period_id", "specialist_id");
CREATE INDEX "payroll_adjustments_specialist_id_created_at_idx" ON "payroll_adjustments"("specialist_id", "created_at");

CREATE UNIQUE INDEX "payouts_period_id_specialist_id_key" ON "payouts"("period_id", "specialist_id");
CREATE INDEX "payouts_specialist_id_status_idx" ON "payouts"("specialist_id", "status");
CREATE INDEX "payouts_status_created_at_idx" ON "payouts"("status", "created_at");

-- Foreign keys
ALTER TABLE "payroll_entries" ADD CONSTRAINT "payroll_entries_period_id_fkey"
    FOREIGN KEY ("period_id") REFERENCES "payroll_periods"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "payroll_adjustments" ADD CONSTRAINT "payroll_adjustments_period_id_fkey"
    FOREIGN KEY ("period_id") REFERENCES "payroll_periods"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "payouts" ADD CONSTRAINT "payouts_period_id_fkey"
    FOREIGN KEY ("period_id") REFERENCES "payroll_periods"("id") ON DELETE CASCADE ON UPDATE CASCADE;

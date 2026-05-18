-- Migration: Loyalty System
-- Generated: 2026-05-18
-- Adds: loyalty_transactions, membership_plans, client_memberships, client_packages

-- Loyalty Transactions (point audit trail)
CREATE TABLE "loyalty_transactions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "profile_id" UUID NOT NULL,
    "appointment_id" UUID,
    "type" VARCHAR(30) NOT NULL,
    "points" INTEGER NOT NULL,
    "balance_before" INTEGER NOT NULL,
    "balance_after" INTEGER NOT NULL,
    "description" VARCHAR(500),
    "created_by" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "loyalty_transactions_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "loyalty_transactions_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "customer_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "loyalty_transactions_profile_id_created_at_idx" ON "loyalty_transactions"("profile_id", "created_at");
CREATE INDEX "loyalty_transactions_type_created_at_idx" ON "loyalty_transactions"("type", "created_at");

-- Membership Plans
CREATE TABLE "membership_plans" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "billing_period" VARCHAR(20) NOT NULL,
    "billing_price" DECIMAL(10,2) NOT NULL,
    "included_sessions" INTEGER,
    "discount_percent" INTEGER NOT NULL DEFAULT 0,
    "bonus_points_per_period" INTEGER NOT NULL DEFAULT 0,
    "applicable_service_ids" JSONB NOT NULL DEFAULT '[]',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "membership_plans_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "membership_plans_is_active_sort_order_idx" ON "membership_plans"("is_active", "sort_order");

-- Client Memberships
CREATE TABLE "client_memberships" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "profile_id" UUID NOT NULL,
    "plan_id" UUID NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    "started_at" TIMESTAMP(3) NOT NULL,
    "renews_at" TIMESTAMP(3),
    "cancelled_at" TIMESTAMP(3),
    "cancel_reason" VARCHAR(500),
    "sessions_used" INTEGER NOT NULL DEFAULT 0,
    "auto_renew" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "client_memberships_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "client_memberships_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "customer_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "client_memberships_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "membership_plans"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX "client_memberships_profile_id_status_idx" ON "client_memberships"("profile_id", "status");
CREATE INDEX "client_memberships_renews_at_status_idx" ON "client_memberships"("renews_at", "status");

-- Client Packages (prepaid session bundles)
CREATE TABLE "client_packages" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "profile_id" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "service_id" UUID,
    "total_sessions" INTEGER NOT NULL,
    "used_sessions" INTEGER NOT NULL DEFAULT 0,
    "price_total" DECIMAL(10,2) NOT NULL,
    "purchased_at" TIMESTAMP(3) NOT NULL,
    "expires_at" TIMESTAMP(3),
    "status" VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "client_packages_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "client_packages_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "customer_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "client_packages_profile_id_status_idx" ON "client_packages"("profile_id", "status");
CREATE INDEX "client_packages_expires_at_status_idx" ON "client_packages"("expires_at", "status");

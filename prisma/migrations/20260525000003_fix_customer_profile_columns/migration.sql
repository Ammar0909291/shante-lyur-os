-- Fix customer_profiles table: add columns that exist in the Prisma schema
-- but were missing from the initial migration.
-- Safe to run multiple times (uses IF NOT EXISTS / handles duplicates).

-- Add client_type (required for client search — NULL causes Prisma P2023)
DO $$ BEGIN
  ALTER TABLE "customer_profiles" ADD COLUMN "client_type" TEXT NOT NULL DEFAULT 'RETURNING';
EXCEPTION
  WHEN duplicate_column THEN NULL;
END $$;

-- Repair any NULL values left by a previous partial migration
UPDATE "customer_profiles" SET "client_type" = 'RETURNING' WHERE "client_type" IS NULL;

-- Add source_channel (nullable, no repair needed)
DO $$ BEGIN
  ALTER TABLE "customer_profiles" ADD COLUMN "source_channel" TEXT;
EXCEPTION
  WHEN duplicate_column THEN NULL;
END $$;

-- Add prepaid_balance (required with default 0)
DO $$ BEGIN
  ALTER TABLE "customer_profiles" ADD COLUMN "prepaid_balance" DECIMAL(12,2) NOT NULL DEFAULT 0;
EXCEPTION
  WHEN duplicate_column THEN NULL;
END $$;

UPDATE "customer_profiles" SET "prepaid_balance" = 0 WHERE "prepaid_balance" IS NULL;

-- Add referred_by (nullable)
DO $$ BEGIN
  ALTER TABLE "customer_profiles" ADD COLUMN "referred_by" TEXT;
EXCEPTION
  WHEN duplicate_column THEN NULL;
END $$;

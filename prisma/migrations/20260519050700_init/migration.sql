-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('SUPER_ADMIN', 'ADMIN', 'OPERATOR', 'SPECIALIST', 'CLIENT');

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'SUSPENDED', 'PENDING_VERIFICATION');

-- CreateEnum
CREATE TYPE "SpecialistStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'ON_VACATION', 'TERMINATED');

-- CreateEnum
CREATE TYPE "ServiceCategory" AS ENUM ('COSMETOLOGY', 'MASSAGE', 'INJECTION', 'LASER', 'BODY_CONTOURING', 'HAIR_REMOVAL', 'FACIAL', 'OTHER');

-- CreateEnum
CREATE TYPE "AppointmentStatus" AS ENUM ('PENDING', 'CONFIRMED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'NO_SHOW', 'RESCHEDULED');

-- CreateEnum
CREATE TYPE "CancellationReason" AS ENUM ('CLIENT_REQUEST', 'SPECIALIST_UNAVAILABLE', 'WEATHER', 'EMERGENCY', 'NO_SHOW', 'OTHER');

-- CreateEnum
CREATE TYPE "DayOfWeek" AS ENUM ('MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY');

-- CreateEnum
CREATE TYPE "NotePrivacy" AS ENUM ('PRIVATE', 'SHARED', 'ADMIN_ONLY', 'CLIENT_VISIBLE');

-- CreateEnum
CREATE TYPE "PaymentProvider" AS ENUM ('YOOKASSA', 'ROBOKASSA', 'CASH', 'CARD_TERMINAL', 'TRANSFER', 'INTERNAL');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'PROCESSING', 'AUTHORIZED', 'CAPTURED', 'PARTIALLY_REFUNDED', 'FULLY_REFUNDED', 'FAILED', 'CANCELLED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "RefundStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "DiscountType" AS ENUM ('PERCENTAGE', 'FIXED_AMOUNT', 'FREE_SERVICE');

-- CreateEnum
CREATE TYPE "RevenueType" AS ENUM ('SERVICE_PAYMENT', 'PRODUCT_SALE', 'GIFT_CARD', 'SUBSCRIPTION', 'PENALTY', 'REFUND', 'COMMISSION', 'OTHER');

-- CreateEnum
CREATE TYPE "NotificationChannel" AS ENUM ('EMAIL', 'SMS', 'PUSH', 'IN_APP');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('APPOINTMENT_CONFIRMED', 'APPOINTMENT_REMINDER', 'APPOINTMENT_CANCELLED', 'APPOINTMENT_RESCHEDULED', 'PAYMENT_RECEIVED', 'PAYMENT_FAILED', 'PROMO_CODE', 'WELCOME', 'PASSWORD_RESET', 'SYSTEM');

-- CreateEnum
CREATE TYPE "NotificationStatus" AS ENUM ('PENDING', 'SENT', 'DELIVERED', 'FAILED', 'READ');

-- CreateEnum
CREATE TYPE "AuditAction" AS ENUM ('CREATE', 'UPDATE', 'DELETE', 'LOGIN', 'LOGOUT', 'LOGIN_FAILED', 'PASSWORD_CHANGED', 'ROLE_CHANGED', 'STATUS_CHANGED', 'PAYMENT_PROCESSED', 'REFUND_ISSUED', 'EXPORT', 'IMPORT', 'SETTINGS_CHANGED');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "first_name" VARCHAR(100) NOT NULL,
    "last_name" VARCHAR(100) NOT NULL,
    "phone" VARCHAR(30),
    "avatar_url" TEXT,
    "role" "UserRole" NOT NULL DEFAULT 'CLIENT',
    "status" "UserStatus" NOT NULL DEFAULT 'PENDING_VERIFICATION',
    "email_verified" BOOLEAN NOT NULL DEFAULT false,
    "phone_verified" BOOLEAN NOT NULL DEFAULT false,
    "last_login_at" TIMESTAMP(3),
    "failed_logins" INTEGER NOT NULL DEFAULT 0,
    "locked_until" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sessions" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "token" VARCHAR(512) NOT NULL,
    "ip_address" VARCHAR(45),
    "user_agent" TEXT,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refresh_tokens" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "token_hash" VARCHAR(255) NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "revoked_at" TIMESTAMP(3),
    "replaced_by" UUID,
    "ip_address" VARCHAR(45),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "specialists" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "bio" TEXT,
    "specialization" VARCHAR(255),
    "experience_years" INTEGER,
    "rating" DECIMAL(2,1),
    "review_count" INTEGER NOT NULL DEFAULT 0,
    "commission_rate" DECIMAL(5,4) NOT NULL DEFAULT 0.30,
    "status" "SpecialistStatus" NOT NULL DEFAULT 'ACTIVE',
    "color" VARCHAR(7),
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "specialists_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "specialist_services" (
    "id" UUID NOT NULL,
    "specialist_id" UUID NOT NULL,
    "service_id" UUID NOT NULL,
    "price_override" DECIMAL(10,2),
    "duration_override" INTEGER,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "specialist_services_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "services" (
    "id" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "category" "ServiceCategory" NOT NULL DEFAULT 'OTHER',
    "base_price" DECIMAL(10,2) NOT NULL,
    "base_duration" INTEGER NOT NULL,
    "image_url" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "requires_consultation" BOOLEAN NOT NULL DEFAULT false,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "services_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "locations" (
    "id" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "address" TEXT NOT NULL,
    "city" VARCHAR(100) NOT NULL,
    "phone" VARCHAR(30),
    "email" VARCHAR(255),
    "timezone" VARCHAR(50) NOT NULL DEFAULT 'Europe/Moscow',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "locations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "service_location_prices" (
    "id" UUID NOT NULL,
    "service_id" UUID NOT NULL,
    "location_id" UUID NOT NULL,
    "price" DECIMAL(10,2) NOT NULL,
    "duration" INTEGER NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "service_location_prices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "appointments" (
    "id" UUID NOT NULL,
    "client_id" UUID NOT NULL,
    "specialist_id" UUID NOT NULL,
    "location_id" UUID NOT NULL,
    "start_at" TIMESTAMP(3) NOT NULL,
    "end_at" TIMESTAMP(3) NOT NULL,
    "status" "AppointmentStatus" NOT NULL DEFAULT 'PENDING',
    "total_price" DECIMAL(10,2) NOT NULL,
    "total_duration" INTEGER NOT NULL,
    "notes" TEXT,
    "cancellation_reason" "CancellationReason",
    "cancelled_at" TIMESTAMP(3),
    "cancelled_by" UUID,
    "no_show_at" TIMESTAMP(3),
    "checked_in_at" TIMESTAMP(3),
    "checked_out_at" TIMESTAMP(3),
    "source" VARCHAR(50),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "appointments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "appointment_services" (
    "id" UUID NOT NULL,
    "appointment_id" UUID NOT NULL,
    "service_id" UUID NOT NULL,
    "price" DECIMAL(10,2) NOT NULL,
    "duration" INTEGER NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "appointment_services_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "working_schedules" (
    "id" UUID NOT NULL,
    "specialist_id" UUID NOT NULL,
    "location_id" UUID NOT NULL,
    "day_of_week" "DayOfWeek" NOT NULL,
    "start_time" VARCHAR(5) NOT NULL,
    "end_time" VARCHAR(5) NOT NULL,
    "break_start" VARCHAR(5),
    "break_end" VARCHAR(5),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "valid_from" TIMESTAMP(3) NOT NULL,
    "valid_until" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "working_schedules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "blocked_times" (
    "id" UUID NOT NULL,
    "specialist_id" UUID NOT NULL,
    "location_id" UUID,
    "start_at" TIMESTAMP(3) NOT NULL,
    "end_at" TIMESTAMP(3) NOT NULL,
    "reason" VARCHAR(255),
    "is_recurring" BOOLEAN NOT NULL DEFAULT false,
    "recurrence_rule" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "blocked_times_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vacations" (
    "id" UUID NOT NULL,
    "specialist_id" UUID NOT NULL,
    "start_date" DATE NOT NULL,
    "end_date" DATE NOT NULL,
    "reason" VARCHAR(255),
    "is_approved" BOOLEAN NOT NULL DEFAULT false,
    "approved_by" UUID,
    "approved_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "vacations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customer_profiles" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "date_of_birth" DATE,
    "gender" VARCHAR(20),
    "skin_type" VARCHAR(50),
    "hair_type" VARCHAR(50),
    "body_type" VARCHAR(50),
    "preferred_location_id" UUID,
    "preferred_specialist_id" UUID,
    "referral_source" VARCHAR(100),
    "first_visit_at" TIMESTAMP(3),
    "last_visit_at" TIMESTAMP(3),
    "total_visits" INTEGER NOT NULL DEFAULT 0,
    "total_spent" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "loyalty_points" INTEGER NOT NULL DEFAULT 0,
    "loyalty_tier" VARCHAR(20) NOT NULL DEFAULT 'BRONZE',
    "churn_risk_score" DECIMAL(3,2),
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "customer_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customer_allergies" (
    "id" UUID NOT NULL,
    "profile_id" UUID NOT NULL,
    "allergen" VARCHAR(255) NOT NULL,
    "severity" VARCHAR(20) NOT NULL,
    "reaction" TEXT,
    "diagnosed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "customer_allergies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customer_restrictions" (
    "id" UUID NOT NULL,
    "profile_id" UUID NOT NULL,
    "type" VARCHAR(50) NOT NULL,
    "description" TEXT NOT NULL,
    "valid_from" TIMESTAMP(3),
    "valid_until" TIMESTAMP(3),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "customer_restrictions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "specialist_notes" (
    "id" UUID NOT NULL,
    "specialist_id" UUID NOT NULL,
    "profile_id" UUID NOT NULL,
    "appointment_id" UUID,
    "note_type" VARCHAR(50) NOT NULL,
    "content" TEXT NOT NULL,
    "privacy" "NotePrivacy" NOT NULL DEFAULT 'PRIVATE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "specialist_notes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "procedure_history" (
    "id" UUID NOT NULL,
    "profile_id" UUID NOT NULL,
    "appointment_id" UUID NOT NULL,
    "service_id" UUID NOT NULL,
    "specialist_id" UUID NOT NULL,
    "performed_at" TIMESTAMP(3) NOT NULL,
    "results" TEXT,
    "side_effects" TEXT,
    "client_feedback" TEXT,
    "follow_up_required" BOOLEAN NOT NULL DEFAULT false,
    "follow_up_date" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "procedure_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "before_after_photos" (
    "id" UUID NOT NULL,
    "profile_id" UUID NOT NULL,
    "service_id" UUID,
    "photo_type" VARCHAR(20) NOT NULL,
    "image_url" TEXT NOT NULL,
    "thumbnail_url" TEXT,
    "taken_at" TIMESTAMP(3) NOT NULL,
    "notes" TEXT,
    "is_private" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "before_after_photos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customer_tags" (
    "id" UUID NOT NULL,
    "profile_id" UUID NOT NULL,
    "tag" VARCHAR(50) NOT NULL,
    "color" VARCHAR(7),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "customer_tags_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "referrals" (
    "id" UUID NOT NULL,
    "referrer_id" UUID NOT NULL,
    "referred_id" UUID NOT NULL,
    "code" VARCHAR(50) NOT NULL,
    "reward_type" VARCHAR(50),
    "reward_value" DECIMAL(10,2),
    "reward_claimed" BOOLEAN NOT NULL DEFAULT false,
    "claimed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "referrals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payments" (
    "id" UUID NOT NULL,
    "appointment_id" UUID NOT NULL,
    "provider" "PaymentProvider" NOT NULL,
    "provider_payment_id" VARCHAR(255),
    "amount" DECIMAL(10,2) NOT NULL,
    "currency" VARCHAR(3) NOT NULL DEFAULT 'RUB',
    "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "description" VARCHAR(255),
    "metadata" JSONB,
    "paid_at" TIMESTAMP(3),
    "failed_at" TIMESTAMP(3),
    "failure_reason" TEXT,
    "idempotency_key" VARCHAR(255),
    "commission_amount" DECIMAL(10,2),
    "specialist_commission" DECIMAL(10,2),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refunds" (
    "id" UUID NOT NULL,
    "payment_id" UUID NOT NULL,
    "provider_refund_id" VARCHAR(255),
    "amount" DECIMAL(10,2) NOT NULL,
    "reason" TEXT,
    "status" "RefundStatus" NOT NULL DEFAULT 'PENDING',
    "processed_at" TIMESTAMP(3),
    "processed_by" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "refunds_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "promo_codes" (
    "id" UUID NOT NULL,
    "code" VARCHAR(50) NOT NULL,
    "description" TEXT,
    "discount_type" "DiscountType" NOT NULL,
    "discount_value" DECIMAL(10,2) NOT NULL,
    "max_uses" INTEGER,
    "current_uses" INTEGER NOT NULL DEFAULT 0,
    "max_uses_per_user" INTEGER NOT NULL DEFAULT 1,
    "min_order_amount" DECIMAL(10,2),
    "valid_from" TIMESTAMP(3) NOT NULL,
    "valid_until" TIMESTAMP(3) NOT NULL,
    "applicable_services" JSONB,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_by" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "promo_codes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "promo_code_usages" (
    "id" UUID NOT NULL,
    "promo_code_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "appointment_id" UUID NOT NULL,
    "discount_amount" DECIMAL(10,2) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "promo_code_usages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "revenue_records" (
    "id" UUID NOT NULL,
    "date" DATE NOT NULL,
    "type" "RevenueType" NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "specialist_id" UUID,
    "service_id" UUID,
    "payment_id" UUID,
    "appointment_id" UUID,
    "location_id" UUID,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "revenue_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "appointment_id" UUID,
    "type" "NotificationType" NOT NULL,
    "channel" "NotificationChannel" NOT NULL,
    "status" "NotificationStatus" NOT NULL DEFAULT 'PENDING',
    "title" VARCHAR(255) NOT NULL,
    "body" TEXT NOT NULL,
    "data" JSONB,
    "sent_at" TIMESTAMP(3),
    "delivered_at" TIMESTAMP(3),
    "read_at" TIMESTAMP(3),
    "error" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" UUID NOT NULL,
    "user_id" UUID,
    "appointment_id" UUID,
    "action" "AuditAction" NOT NULL,
    "entity_type" VARCHAR(50) NOT NULL,
    "entity_id" UUID,
    "old_values" JSONB,
    "new_values" JSONB,
    "ip_address" VARCHAR(45),
    "user_agent" TEXT,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_predictions" (
    "id" UUID NOT NULL,
    "model_type" VARCHAR(50) NOT NULL,
    "entity_type" VARCHAR(50) NOT NULL,
    "entity_id" UUID,
    "prediction" JSONB NOT NULL,
    "confidence" DECIMAL(4,3),
    "actual_outcome" JSONB,
    "accuracy_delta" DECIMAL(4,3),
    "trained_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_predictions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "daily_metrics" (
    "id" UUID NOT NULL,
    "date" DATE NOT NULL,
    "total_appointments" INTEGER NOT NULL DEFAULT 0,
    "completed_appointments" INTEGER NOT NULL DEFAULT 0,
    "cancelled_appointments" INTEGER NOT NULL DEFAULT 0,
    "no_show_appointments" INTEGER NOT NULL DEFAULT 0,
    "total_revenue" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "total_refunds" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "new_customers" INTEGER NOT NULL DEFAULT 0,
    "returning_customers" INTEGER NOT NULL DEFAULT 0,
    "avg_appointment_value" DECIMAL(10,2),
    "avg_booking_lead_time" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "daily_metrics_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_email_idx" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_role_status_idx" ON "users"("role", "status");

-- CreateIndex
CREATE INDEX "users_phone_idx" ON "users"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "sessions_token_key" ON "sessions"("token");

-- CreateIndex
CREATE INDEX "sessions_user_id_idx" ON "sessions"("user_id");

-- CreateIndex
CREATE INDEX "sessions_token_idx" ON "sessions"("token");

-- CreateIndex
CREATE INDEX "sessions_expires_at_idx" ON "sessions"("expires_at");

-- CreateIndex
CREATE INDEX "refresh_tokens_user_id_idx" ON "refresh_tokens"("user_id");

-- CreateIndex
CREATE INDEX "refresh_tokens_token_hash_idx" ON "refresh_tokens"("token_hash");

-- CreateIndex
CREATE UNIQUE INDEX "specialists_user_id_key" ON "specialists"("user_id");

-- CreateIndex
CREATE INDEX "specialists_user_id_idx" ON "specialists"("user_id");

-- CreateIndex
CREATE INDEX "specialists_status_idx" ON "specialists"("status");

-- CreateIndex
CREATE INDEX "specialists_rating_idx" ON "specialists"("rating");

-- CreateIndex
CREATE INDEX "specialist_services_specialist_id_idx" ON "specialist_services"("specialist_id");

-- CreateIndex
CREATE INDEX "specialist_services_service_id_idx" ON "specialist_services"("service_id");

-- CreateIndex
CREATE UNIQUE INDEX "specialist_services_specialist_id_service_id_key" ON "specialist_services"("specialist_id", "service_id");

-- CreateIndex
CREATE INDEX "services_category_is_active_idx" ON "services"("category", "is_active");

-- CreateIndex
CREATE INDEX "services_name_idx" ON "services"("name");

-- CreateIndex
CREATE INDEX "locations_is_active_idx" ON "locations"("is_active");

-- CreateIndex
CREATE INDEX "service_location_prices_service_id_idx" ON "service_location_prices"("service_id");

-- CreateIndex
CREATE INDEX "service_location_prices_location_id_idx" ON "service_location_prices"("location_id");

-- CreateIndex
CREATE UNIQUE INDEX "service_location_prices_service_id_location_id_key" ON "service_location_prices"("service_id", "location_id");

-- CreateIndex
CREATE INDEX "appointments_client_id_start_at_idx" ON "appointments"("client_id", "start_at");

-- CreateIndex
CREATE INDEX "appointments_specialist_id_start_at_idx" ON "appointments"("specialist_id", "start_at");

-- CreateIndex
CREATE INDEX "appointments_location_id_start_at_idx" ON "appointments"("location_id", "start_at");

-- CreateIndex
CREATE INDEX "appointments_status_start_at_idx" ON "appointments"("status", "start_at");

-- CreateIndex
CREATE INDEX "appointments_start_at_end_at_idx" ON "appointments"("start_at", "end_at");

-- CreateIndex
CREATE INDEX "appointment_services_appointment_id_idx" ON "appointment_services"("appointment_id");

-- CreateIndex
CREATE INDEX "appointment_services_service_id_idx" ON "appointment_services"("service_id");

-- CreateIndex
CREATE INDEX "working_schedules_specialist_id_day_of_week_idx" ON "working_schedules"("specialist_id", "day_of_week");

-- CreateIndex
CREATE INDEX "working_schedules_location_id_day_of_week_idx" ON "working_schedules"("location_id", "day_of_week");

-- CreateIndex
CREATE INDEX "blocked_times_specialist_id_start_at_end_at_idx" ON "blocked_times"("specialist_id", "start_at", "end_at");

-- CreateIndex
CREATE INDEX "blocked_times_location_id_start_at_end_at_idx" ON "blocked_times"("location_id", "start_at", "end_at");

-- CreateIndex
CREATE INDEX "vacations_specialist_id_start_date_end_date_idx" ON "vacations"("specialist_id", "start_date", "end_date");

-- CreateIndex
CREATE UNIQUE INDEX "customer_profiles_user_id_key" ON "customer_profiles"("user_id");

-- CreateIndex
CREATE INDEX "customer_profiles_user_id_idx" ON "customer_profiles"("user_id");

-- CreateIndex
CREATE INDEX "customer_profiles_loyalty_tier_idx" ON "customer_profiles"("loyalty_tier");

-- CreateIndex
CREATE INDEX "customer_profiles_churn_risk_score_idx" ON "customer_profiles"("churn_risk_score");

-- CreateIndex
CREATE INDEX "customer_allergies_profile_id_idx" ON "customer_allergies"("profile_id");

-- CreateIndex
CREATE INDEX "customer_restrictions_profile_id_is_active_idx" ON "customer_restrictions"("profile_id", "is_active");

-- CreateIndex
CREATE INDEX "specialist_notes_profile_id_note_type_idx" ON "specialist_notes"("profile_id", "note_type");

-- CreateIndex
CREATE INDEX "specialist_notes_specialist_id_created_at_idx" ON "specialist_notes"("specialist_id", "created_at");

-- CreateIndex
CREATE INDEX "procedure_history_profile_id_performed_at_idx" ON "procedure_history"("profile_id", "performed_at");

-- CreateIndex
CREATE INDEX "procedure_history_specialist_id_performed_at_idx" ON "procedure_history"("specialist_id", "performed_at");

-- CreateIndex
CREATE INDEX "before_after_photos_profile_id_photo_type_idx" ON "before_after_photos"("profile_id", "photo_type");

-- CreateIndex
CREATE INDEX "customer_tags_profile_id_idx" ON "customer_tags"("profile_id");

-- CreateIndex
CREATE UNIQUE INDEX "customer_tags_profile_id_tag_key" ON "customer_tags"("profile_id", "tag");

-- CreateIndex
CREATE INDEX "referrals_code_idx" ON "referrals"("code");

-- CreateIndex
CREATE UNIQUE INDEX "referrals_referrer_id_referred_id_key" ON "referrals"("referrer_id", "referred_id");

-- CreateIndex
CREATE UNIQUE INDEX "payments_idempotency_key_key" ON "payments"("idempotency_key");

-- CreateIndex
CREATE INDEX "payments_appointment_id_idx" ON "payments"("appointment_id");

-- CreateIndex
CREATE INDEX "payments_provider_payment_id_idx" ON "payments"("provider_payment_id");

-- CreateIndex
CREATE INDEX "payments_status_created_at_idx" ON "payments"("status", "created_at");

-- CreateIndex
CREATE INDEX "payments_idempotency_key_idx" ON "payments"("idempotency_key");

-- CreateIndex
CREATE INDEX "refunds_payment_id_idx" ON "refunds"("payment_id");

-- CreateIndex
CREATE INDEX "refunds_status_idx" ON "refunds"("status");

-- CreateIndex
CREATE UNIQUE INDEX "promo_codes_code_key" ON "promo_codes"("code");

-- CreateIndex
CREATE INDEX "promo_codes_code_idx" ON "promo_codes"("code");

-- CreateIndex
CREATE INDEX "promo_codes_is_active_valid_from_valid_until_idx" ON "promo_codes"("is_active", "valid_from", "valid_until");

-- CreateIndex
CREATE INDEX "promo_code_usages_promo_code_id_idx" ON "promo_code_usages"("promo_code_id");

-- CreateIndex
CREATE INDEX "promo_code_usages_user_id_idx" ON "promo_code_usages"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "promo_code_usages_promo_code_id_user_id_appointment_id_key" ON "promo_code_usages"("promo_code_id", "user_id", "appointment_id");

-- CreateIndex
CREATE INDEX "revenue_records_date_type_idx" ON "revenue_records"("date", "type");

-- CreateIndex
CREATE INDEX "revenue_records_specialist_id_date_idx" ON "revenue_records"("specialist_id", "date");

-- CreateIndex
CREATE INDEX "revenue_records_location_id_date_idx" ON "revenue_records"("location_id", "date");

-- CreateIndex
CREATE INDEX "notifications_user_id_status_idx" ON "notifications"("user_id", "status");

-- CreateIndex
CREATE INDEX "notifications_appointment_id_idx" ON "notifications"("appointment_id");

-- CreateIndex
CREATE INDEX "notifications_type_status_idx" ON "notifications"("type", "status");

-- CreateIndex
CREATE INDEX "notifications_created_at_idx" ON "notifications"("created_at");

-- CreateIndex
CREATE INDEX "audit_logs_user_id_created_at_idx" ON "audit_logs"("user_id", "created_at");

-- CreateIndex
CREATE INDEX "audit_logs_action_created_at_idx" ON "audit_logs"("action", "created_at");

-- CreateIndex
CREATE INDEX "audit_logs_entity_type_entity_id_idx" ON "audit_logs"("entity_type", "entity_id");

-- CreateIndex
CREATE INDEX "audit_logs_created_at_idx" ON "audit_logs"("created_at");

-- CreateIndex
CREATE INDEX "ai_predictions_model_type_entity_type_idx" ON "ai_predictions"("model_type", "entity_type");

-- CreateIndex
CREATE INDEX "ai_predictions_entity_id_idx" ON "ai_predictions"("entity_id");

-- CreateIndex
CREATE INDEX "ai_predictions_created_at_idx" ON "ai_predictions"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "daily_metrics_date_key" ON "daily_metrics"("date");

-- CreateIndex
CREATE INDEX "daily_metrics_date_idx" ON "daily_metrics"("date");

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "specialists" ADD CONSTRAINT "specialists_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "specialist_services" ADD CONSTRAINT "specialist_services_specialist_id_fkey" FOREIGN KEY ("specialist_id") REFERENCES "specialists"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "specialist_services" ADD CONSTRAINT "specialist_services_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "services"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_location_prices" ADD CONSTRAINT "service_location_prices_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "services"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_location_prices" ADD CONSTRAINT "service_location_prices_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "locations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_cancelled_by_fkey" FOREIGN KEY ("cancelled_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_specialist_id_fkey" FOREIGN KEY ("specialist_id") REFERENCES "specialists"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "locations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointment_services" ADD CONSTRAINT "appointment_services_appointment_id_fkey" FOREIGN KEY ("appointment_id") REFERENCES "appointments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointment_services" ADD CONSTRAINT "appointment_services_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "services"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "working_schedules" ADD CONSTRAINT "working_schedules_specialist_id_fkey" FOREIGN KEY ("specialist_id") REFERENCES "specialists"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "working_schedules" ADD CONSTRAINT "working_schedules_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "locations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "blocked_times" ADD CONSTRAINT "blocked_times_specialist_id_fkey" FOREIGN KEY ("specialist_id") REFERENCES "specialists"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "blocked_times" ADD CONSTRAINT "blocked_times_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "locations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vacations" ADD CONSTRAINT "vacations_specialist_id_fkey" FOREIGN KEY ("specialist_id") REFERENCES "specialists"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vacations" ADD CONSTRAINT "vacations_approved_by_fkey" FOREIGN KEY ("approved_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_profiles" ADD CONSTRAINT "customer_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_profiles" ADD CONSTRAINT "customer_profiles_preferred_location_id_fkey" FOREIGN KEY ("preferred_location_id") REFERENCES "locations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_profiles" ADD CONSTRAINT "customer_profiles_preferred_specialist_id_fkey" FOREIGN KEY ("preferred_specialist_id") REFERENCES "specialists"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_allergies" ADD CONSTRAINT "customer_allergies_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "customer_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_restrictions" ADD CONSTRAINT "customer_restrictions_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "customer_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "specialist_notes" ADD CONSTRAINT "specialist_notes_specialist_id_fkey" FOREIGN KEY ("specialist_id") REFERENCES "specialists"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "specialist_notes" ADD CONSTRAINT "specialist_notes_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "customer_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "specialist_notes" ADD CONSTRAINT "specialist_notes_appointment_id_fkey" FOREIGN KEY ("appointment_id") REFERENCES "appointments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "procedure_history" ADD CONSTRAINT "procedure_history_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "customer_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "procedure_history" ADD CONSTRAINT "procedure_history_appointment_id_fkey" FOREIGN KEY ("appointment_id") REFERENCES "appointments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "procedure_history" ADD CONSTRAINT "procedure_history_specialist_id_fkey" FOREIGN KEY ("specialist_id") REFERENCES "specialists"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "procedure_history" ADD CONSTRAINT "procedure_history_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "services"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "before_after_photos" ADD CONSTRAINT "before_after_photos_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "customer_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "before_after_photos" ADD CONSTRAINT "before_after_photos_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "services"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_tags" ADD CONSTRAINT "customer_tags_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "customer_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "referrals" ADD CONSTRAINT "referrals_referrer_id_fkey" FOREIGN KEY ("referrer_id") REFERENCES "customer_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "referrals" ADD CONSTRAINT "referrals_referred_id_fkey" FOREIGN KEY ("referred_id") REFERENCES "customer_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_appointment_id_fkey" FOREIGN KEY ("appointment_id") REFERENCES "appointments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refunds" ADD CONSTRAINT "refunds_payment_id_fkey" FOREIGN KEY ("payment_id") REFERENCES "payments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refunds" ADD CONSTRAINT "refunds_processed_by_fkey" FOREIGN KEY ("processed_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "promo_codes" ADD CONSTRAINT "promo_codes_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "promo_code_usages" ADD CONSTRAINT "promo_code_usages_promo_code_id_fkey" FOREIGN KEY ("promo_code_id") REFERENCES "promo_codes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "promo_code_usages" ADD CONSTRAINT "promo_code_usages_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "promo_code_usages" ADD CONSTRAINT "promo_code_usages_appointment_id_fkey" FOREIGN KEY ("appointment_id") REFERENCES "appointments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "revenue_records" ADD CONSTRAINT "revenue_records_specialist_id_fkey" FOREIGN KEY ("specialist_id") REFERENCES "specialists"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "revenue_records" ADD CONSTRAINT "revenue_records_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "services"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "revenue_records" ADD CONSTRAINT "revenue_records_payment_id_fkey" FOREIGN KEY ("payment_id") REFERENCES "payments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "revenue_records" ADD CONSTRAINT "revenue_records_appointment_id_fkey" FOREIGN KEY ("appointment_id") REFERENCES "appointments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "revenue_records" ADD CONSTRAINT "revenue_records_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "locations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_appointment_id_fkey" FOREIGN KEY ("appointment_id") REFERENCES "appointments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_appointment_id_fkey" FOREIGN KEY ("appointment_id") REFERENCES "appointments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Initial Migration for Shante Lyur OS Pro v3
-- Generated: 2026-05-17

CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Users
CREATE TABLE "users" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "first_name" VARCHAR(100) NOT NULL,
    "last_name" VARCHAR(100) NOT NULL,
    "phone" VARCHAR(30),
    "avatar_url" TEXT,
    "role" TEXT NOT NULL DEFAULT 'CLIENT',
    "status" TEXT NOT NULL DEFAULT 'PENDING_VERIFICATION',
    "email_verified" BOOLEAN NOT NULL DEFAULT false,
    "phone_verified" BOOLEAN NOT NULL DEFAULT false,
    "last_login_at" TIMESTAMP(3),
    "failed_logins" INTEGER NOT NULL DEFAULT 0,
    "locked_until" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "users_email_key" ON "users"("email");
CREATE INDEX "users_email_idx" ON "users"("email");
CREATE INDEX "users_role_status_idx" ON "users"("role", "status");
CREATE INDEX "users_phone_idx" ON "users"("phone");

-- 2. Sessions
CREATE TABLE "sessions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "token" VARCHAR(512) NOT NULL,
    "ip_address" VARCHAR(45),
    "user_agent" TEXT,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "sessions_token_key" ON "sessions"("token");
CREATE INDEX "sessions_user_id_idx" ON "sessions"("user_id");
CREATE INDEX "sessions_token_idx" ON "sessions"("token");
CREATE INDEX "sessions_expires_at_idx" ON "sessions"("expires_at");

-- 3. Refresh Tokens
CREATE TABLE "refresh_tokens" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "token_hash" VARCHAR(255) NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "revoked_at" TIMESTAMP(3),
    "replaced_by" UUID,
    "ip_address" VARCHAR(45),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "refresh_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "refresh_tokens_user_id_idx" ON "refresh_tokens"("user_id");
CREATE INDEX "refresh_tokens_token_hash_idx" ON "refresh_tokens"("token_hash");

-- 4. Specialists
CREATE TABLE "specialists" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "bio" TEXT,
    "specialization" VARCHAR(255),
    "experience_years" INTEGER,
    "rating" DECIMAL(2,1),
    "review_count" INTEGER NOT NULL DEFAULT 0,
    "commission_rate" DECIMAL(5,4) NOT NULL DEFAULT 0.30,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "color" VARCHAR(7),
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "specialists_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "specialists_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "specialists_user_id_key" ON "specialists"("user_id");
CREATE INDEX "specialists_user_id_idx" ON "specialists"("user_id");
CREATE INDEX "specialists_status_idx" ON "specialists"("status");
CREATE INDEX "specialists_rating_idx" ON "specialists"("rating");

-- 5. Services
CREATE TABLE "services" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "category" TEXT NOT NULL DEFAULT 'OTHER',
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

CREATE INDEX "services_category_is_active_idx" ON "services"("category", "is_active");
CREATE INDEX "services_name_idx" ON "services"("name");

-- 6. Locations
CREATE TABLE "locations" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
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

CREATE INDEX "locations_is_active_idx" ON "locations"("is_active");

-- 7. Service Location Prices
CREATE TABLE "service_location_prices" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "service_id" UUID NOT NULL,
    "location_id" UUID NOT NULL,
    "price" DECIMAL(10,2) NOT NULL,
    "duration" INTEGER NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "service_location_prices_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "service_location_prices_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "services"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "service_location_prices_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "locations"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "service_location_prices_service_id_location_id_key" ON "service_location_prices"("service_id", "location_id");
CREATE INDEX "service_location_prices_service_id_idx" ON "service_location_prices"("service_id");
CREATE INDEX "service_location_prices_location_id_idx" ON "service_location_prices"("location_id");

-- 8. Specialist Services
CREATE TABLE "specialist_services" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "specialist_id" UUID NOT NULL,
    "service_id" UUID NOT NULL,
    "price_override" DECIMAL(10,2),
    "duration_override" INTEGER,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "specialist_services_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "specialist_services_specialist_id_fkey" FOREIGN KEY ("specialist_id") REFERENCES "specialists"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "specialist_services_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "services"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "specialist_services_specialist_id_service_id_key" ON "specialist_services"("specialist_id", "service_id");
CREATE INDEX "specialist_services_specialist_id_idx" ON "specialist_services"("specialist_id");
CREATE INDEX "specialist_services_service_id_idx" ON "specialist_services"("service_id");

-- 9. Appointments
CREATE TABLE "appointments" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "client_id" UUID NOT NULL,
    "specialist_id" UUID NOT NULL,
    "location_id" UUID NOT NULL,
    "start_at" TIMESTAMP(3) NOT NULL,
    "end_at" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "total_price" DECIMAL(10,2) NOT NULL,
    "total_duration" INTEGER NOT NULL,
    "notes" TEXT,
    "cancellation_reason" TEXT,
    "cancelled_at" TIMESTAMP(3),
    "cancelled_by" UUID,
    "no_show_at" TIMESTAMP(3),
    "checked_in_at" TIMESTAMP(3),
    "checked_out_at" TIMESTAMP(3),
    "source" VARCHAR(50),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "appointments_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "appointments_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "appointments_specialist_id_fkey" FOREIGN KEY ("specialist_id") REFERENCES "specialists"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "appointments_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "locations"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX "appointments_client_id_start_at_idx" ON "appointments"("client_id", "start_at");
CREATE INDEX "appointments_specialist_id_start_at_idx" ON "appointments"("specialist_id", "start_at");
CREATE INDEX "appointments_location_id_start_at_idx" ON "appointments"("location_id", "start_at");
CREATE INDEX "appointments_status_start_at_idx" ON "appointments"("status", "start_at");
CREATE INDEX "appointments_start_at_end_at_idx" ON "appointments"("start_at", "end_at");

-- 10. Appointment Services
CREATE TABLE "appointment_services" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "appointment_id" UUID NOT NULL,
    "service_id" UUID NOT NULL,
    "price" DECIMAL(10,2) NOT NULL,
    "duration" INTEGER NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "appointment_services_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "appointment_services_appointment_id_fkey" FOREIGN KEY ("appointment_id") REFERENCES "appointments"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "appointment_services_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "services"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX "appointment_services_appointment_id_idx" ON "appointment_services"("appointment_id");
CREATE INDEX "appointment_services_service_id_idx" ON "appointment_services"("service_id");

-- 11. Working Schedules
CREATE TABLE "working_schedules" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "specialist_id" UUID NOT NULL,
    "location_id" UUID NOT NULL,
    "day_of_week" TEXT NOT NULL,
    "start_time" VARCHAR(5) NOT NULL,
    "end_time" VARCHAR(5) NOT NULL,
    "break_start" VARCHAR(5),
    "break_end" VARCHAR(5),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "valid_from" TIMESTAMP(3) NOT NULL,
    "valid_until" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "working_schedules_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "working_schedules_specialist_id_fkey" FOREIGN KEY ("specialist_id") REFERENCES "specialists"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "working_schedules_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "locations"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "working_schedules_specialist_id_day_of_week_idx" ON "working_schedules"("specialist_id", "day_of_week");
CREATE INDEX "working_schedules_location_id_day_of_week_idx" ON "working_schedules"("location_id", "day_of_week");

-- 12. Blocked Times
CREATE TABLE "blocked_times" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "specialist_id" UUID NOT NULL,
    "location_id" UUID,
    "start_at" TIMESTAMP(3) NOT NULL,
    "end_at" TIMESTAMP(3) NOT NULL,
    "reason" VARCHAR(255),
    "is_recurring" BOOLEAN NOT NULL DEFAULT false,
    "recurrence_rule" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "blocked_times_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "blocked_times_specialist_id_fkey" FOREIGN KEY ("specialist_id") REFERENCES "specialists"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "blocked_times_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "locations"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX "blocked_times_specialist_id_start_at_end_at_idx" ON "blocked_times"("specialist_id", "start_at", "end_at");
CREATE INDEX "blocked_times_location_id_start_at_end_at_idx" ON "blocked_times"("location_id", "start_at", "end_at");

-- 13. Vacations
CREATE TABLE "vacations" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "specialist_id" UUID NOT NULL,
    "start_date" DATE NOT NULL,
    "end_date" DATE NOT NULL,
    "reason" VARCHAR(255),
    "is_approved" BOOLEAN NOT NULL DEFAULT false,
    "approved_by" UUID,
    "approved_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "vacations_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "vacations_specialist_id_fkey" FOREIGN KEY ("specialist_id") REFERENCES "specialists"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "vacations_specialist_id_start_date_end_date_idx" ON "vacations"("specialist_id", "start_date", "end_date");

-- 14. Customer Profiles
CREATE TABLE "customer_profiles" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
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

    CONSTRAINT "customer_profiles_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "customer_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "customer_profiles_user_id_key" ON "customer_profiles"("user_id");
CREATE INDEX "customer_profiles_user_id_idx" ON "customer_profiles"("user_id");
CREATE INDEX "customer_profiles_loyalty_tier_idx" ON "customer_profiles"("loyalty_tier");
CREATE INDEX "customer_profiles_churn_risk_score_idx" ON "customer_profiles"("churn_risk_score");

-- 15. Customer Allergies
CREATE TABLE "customer_allergies" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "profile_id" UUID NOT NULL,
    "allergen" VARCHAR(255) NOT NULL,
    "severity" VARCHAR(20) NOT NULL,
    "reaction" TEXT,
    "diagnosed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "customer_allergies_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "customer_allergies_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "customer_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "customer_allergies_profile_id_idx" ON "customer_allergies"("profile_id");

-- 16. Customer Restrictions
CREATE TABLE "customer_restrictions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "profile_id" UUID NOT NULL,
    "type" VARCHAR(50) NOT NULL,
    "description" TEXT NOT NULL,
    "valid_from" TIMESTAMP(3),
    "valid_until" TIMESTAMP(3),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "customer_restrictions_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "customer_restrictions_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "customer_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "customer_restrictions_profile_id_is_active_idx" ON "customer_restrictions"("profile_id", "is_active");

-- 17. Specialist Notes
CREATE TABLE "specialist_notes" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "specialist_id" UUID NOT NULL,
    "profile_id" UUID NOT NULL,
    "appointment_id" UUID,
    "note_type" VARCHAR(50) NOT NULL,
    "content" TEXT NOT NULL,
    "privacy" TEXT NOT NULL DEFAULT 'PRIVATE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "specialist_notes_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "specialist_notes_specialist_id_fkey" FOREIGN KEY ("specialist_id") REFERENCES "specialists"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "specialist_notes_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "customer_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "specialist_notes_profile_id_note_type_idx" ON "specialist_notes"("profile_id", "note_type");
CREATE INDEX "specialist_notes_specialist_id_created_at_idx" ON "specialist_notes"("specialist_id", "created_at");

-- 18. Procedure History
CREATE TABLE "procedure_history" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
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

    CONSTRAINT "procedure_history_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "procedure_history_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "customer_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "procedure_history_appointment_id_fkey" FOREIGN KEY ("appointment_id") REFERENCES "appointments"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "procedure_history_profile_id_performed_at_idx" ON "procedure_history"("profile_id", "performed_at");
CREATE INDEX "procedure_history_specialist_id_performed_at_idx" ON "procedure_history"("specialist_id", "performed_at");

-- 19. Before/After Photos
CREATE TABLE "before_after_photos" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "profile_id" UUID NOT NULL,
    "service_id" UUID,
    "photo_type" VARCHAR(20) NOT NULL,
    "image_url" TEXT NOT NULL,
    "thumbnail_url" TEXT,
    "taken_at" TIMESTAMP(3) NOT NULL,
    "notes" TEXT,
    "is_private" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "before_after_photos_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "before_after_photos_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "customer_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "before_after_photos_profile_id_photo_type_idx" ON "before_after_photos"("profile_id", "photo_type");

-- 20. Customer Tags
CREATE TABLE "customer_tags" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "profile_id" UUID NOT NULL,
    "tag" VARCHAR(50) NOT NULL,
    "color" VARCHAR(7),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "customer_tags_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "customer_tags_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "customer_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "customer_tags_profile_id_tag_key" ON "customer_tags"("profile_id", "tag");
CREATE INDEX "customer_tags_profile_id_idx" ON "customer_tags"("profile_id");

-- 21. Referrals
CREATE TABLE "referrals" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "referrer_id" UUID NOT NULL,
    "referred_id" UUID NOT NULL,
    "code" VARCHAR(50) NOT NULL,
    "reward_type" VARCHAR(50),
    "reward_value" DECIMAL(10,2),
    "reward_claimed" BOOLEAN NOT NULL DEFAULT false,
    "claimed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "referrals_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "referrals_referrer_id_fkey" FOREIGN KEY ("referrer_id") REFERENCES "customer_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "referrals_referred_id_fkey" FOREIGN KEY ("referred_id") REFERENCES "customer_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "referrals_referrer_id_referred_id_key" ON "referrals"("referrer_id", "referred_id");
CREATE INDEX "referrals_code_idx" ON "referrals"("code");

-- 22. Payments
CREATE TABLE "payments" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "appointment_id" UUID NOT NULL,
    "provider" TEXT NOT NULL,
    "provider_payment_id" VARCHAR(255),
    "amount" DECIMAL(10,2) NOT NULL,
    "currency" VARCHAR(3) NOT NULL DEFAULT 'RUB',
    "status" TEXT NOT NULL DEFAULT 'PENDING',
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

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "payments_appointment_id_fkey" FOREIGN KEY ("appointment_id") REFERENCES "appointments"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "payments_idempotency_key_key" ON "payments"("idempotency_key");
CREATE INDEX "payments_appointment_id_idx" ON "payments"("appointment_id");
CREATE INDEX "payments_provider_payment_id_idx" ON "payments"("provider_payment_id");
CREATE INDEX "payments_status_created_at_idx" ON "payments"("status", "created_at");
CREATE INDEX "payments_idempotency_key_idx" ON "payments"("idempotency_key");

-- 23. Refunds
CREATE TABLE "refunds" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "payment_id" UUID NOT NULL,
    "provider_refund_id" VARCHAR(255),
    "amount" DECIMAL(10,2) NOT NULL,
    "reason" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "processed_at" TIMESTAMP(3),
    "processed_by" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "refunds_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "refunds_payment_id_fkey" FOREIGN KEY ("payment_id") REFERENCES "payments"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX "refunds_payment_id_idx" ON "refunds"("payment_id");
CREATE INDEX "refunds_status_idx" ON "refunds"("status");

-- 24. Promo Codes
CREATE TABLE "promo_codes" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "code" VARCHAR(50) NOT NULL,
    "description" TEXT,
    "discount_type" TEXT NOT NULL,
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

CREATE UNIQUE INDEX "promo_codes_code_key" ON "promo_codes"("code");
CREATE INDEX "promo_codes_code_idx" ON "promo_codes"("code");
CREATE INDEX "promo_codes_is_active_valid_from_valid_until_idx" ON "promo_codes"("is_active", "valid_from", "valid_until");

-- 25. Promo Code Usages
CREATE TABLE "promo_code_usages" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "promo_code_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "appointment_id" UUID NOT NULL,
    "discount_amount" DECIMAL(10,2) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "promo_code_usages_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "promo_code_usages_promo_code_id_user_id_appointment_id_key" ON "promo_code_usages"("promo_code_id", "user_id", "appointment_id");
CREATE INDEX "promo_code_usages_promo_code_id_idx" ON "promo_code_usages"("promo_code_id");
CREATE INDEX "promo_code_usages_user_id_idx" ON "promo_code_usages"("user_id");

-- 26. Revenue Records
CREATE TABLE "revenue_records" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "date" DATE NOT NULL,
    "type" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "specialist_id" UUID,
    "service_id" UUID,
    "payment_id" UUID,
    "appointment_id" UUID,
    "location_id" UUID,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "revenue_records_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "revenue_records_specialist_id_fkey" FOREIGN KEY ("specialist_id") REFERENCES "specialists"("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "revenue_records_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "services"("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "revenue_records_payment_id_fkey" FOREIGN KEY ("payment_id") REFERENCES "payments"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX "revenue_records_date_type_idx" ON "revenue_records"("date", "type");
CREATE INDEX "revenue_records_specialist_id_date_idx" ON "revenue_records"("specialist_id", "date");
CREATE INDEX "revenue_records_location_id_date_idx" ON "revenue_records"("location_id", "date");

-- 27. Notifications
CREATE TABLE "notifications" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "appointment_id" UUID,
    "type" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "title" VARCHAR(255) NOT NULL,
    "body" TEXT NOT NULL,
    "data" JSONB,
    "sent_at" TIMESTAMP(3),
    "delivered_at" TIMESTAMP(3),
    "read_at" TIMESTAMP(3),
    "error" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "notifications_appointment_id_fkey" FOREIGN KEY ("appointment_id") REFERENCES "appointments"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX "notifications_user_id_status_idx" ON "notifications"("user_id", "status");
CREATE INDEX "notifications_appointment_id_idx" ON "notifications"("appointment_id");
CREATE INDEX "notifications_type_status_idx" ON "notifications"("type", "status");
CREATE INDEX "notifications_created_at_idx" ON "notifications"("created_at");

-- 28. Audit Logs
CREATE TABLE "audit_logs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID,
    "appointment_id" UUID,
    "action" TEXT NOT NULL,
    "entity_type" VARCHAR(50) NOT NULL,
    "entity_id" UUID,
    "old_values" JSONB,
    "new_values" JSONB,
    "ip_address" VARCHAR(45),
    "user_agent" TEXT,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "audit_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "audit_logs_appointment_id_fkey" FOREIGN KEY ("appointment_id") REFERENCES "appointments"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX "audit_logs_user_id_created_at_idx" ON "audit_logs"("user_id", "created_at");
CREATE INDEX "audit_logs_action_created_at_idx" ON "audit_logs"("action", "created_at");
CREATE INDEX "audit_logs_entity_type_entity_id_idx" ON "audit_logs"("entity_type", "entity_id");
CREATE INDEX "audit_logs_created_at_idx" ON "audit_logs"("created_at");

-- 29. AI Predictions
CREATE TABLE "ai_predictions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
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

CREATE INDEX "ai_predictions_model_type_entity_type_idx" ON "ai_predictions"("model_type", "entity_type");
CREATE INDEX "ai_predictions_entity_id_idx" ON "ai_predictions"("entity_id");
CREATE INDEX "ai_predictions_created_at_idx" ON "ai_predictions"("created_at");

-- 30. Daily Metrics
CREATE TABLE "daily_metrics" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
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

CREATE UNIQUE INDEX "daily_metrics_date_key" ON "daily_metrics"("date");
CREATE INDEX "daily_metrics_date_idx" ON "daily_metrics"("date");

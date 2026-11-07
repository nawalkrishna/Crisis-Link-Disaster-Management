-- CreateEnum
CREATE TYPE "SmsPurpose" AS ENUM ('OTP', 'INCIDENT_ALERT');

-- CreateEnum
CREATE TYPE "SmsStatus" AS ENUM ('QUEUED', 'SENDING', 'SENT', 'FAILED');

-- CreateTable
CREATE TABLE "idempotency_keys" (
    "key" TEXT NOT NULL,
    "fingerprint" TEXT NOT NULL,
    "status_code" INTEGER,
    "response" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "idempotency_keys_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "alert_subscriptions" (
    "id" UUID NOT NULL,
    "phone" TEXT NOT NULL,
    "district_id" INTEGER NOT NULL,
    "verified_at" TIMESTAMP(3),
    "otp_hash" TEXT,
    "otp_expires_at" TIMESTAMP(3),
    "otp_attempts" INTEGER NOT NULL DEFAULT 0,
    "unsubscribe_code" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "alert_subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sms_messages" (
    "id" UUID NOT NULL,
    "to" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "purpose" "SmsPurpose" NOT NULL,
    "status" "SmsStatus" NOT NULL DEFAULT 'QUEUED',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "next_attempt_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_error" TEXT,
    "provider_id" TEXT,
    "incident_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "sent_at" TIMESTAMP(3),

    CONSTRAINT "sms_messages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "idempotency_keys_expires_at_idx" ON "idempotency_keys"("expires_at");

-- CreateIndex
CREATE UNIQUE INDEX "alert_subscriptions_unsubscribe_code_key" ON "alert_subscriptions"("unsubscribe_code");

-- CreateIndex
CREATE INDEX "alert_subscriptions_district_id_verified_at_idx" ON "alert_subscriptions"("district_id", "verified_at");

-- CreateIndex
CREATE UNIQUE INDEX "alert_subscriptions_phone_district_id_key" ON "alert_subscriptions"("phone", "district_id");

-- CreateIndex
CREATE INDEX "sms_messages_status_next_attempt_at_idx" ON "sms_messages"("status", "next_attempt_at");

-- CreateIndex
CREATE INDEX "sms_messages_to_purpose_created_at_idx" ON "sms_messages"("to", "purpose", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "sms_messages_incident_id_to_key" ON "sms_messages"("incident_id", "to");

-- AddForeignKey
ALTER TABLE "alert_subscriptions" ADD CONSTRAINT "alert_subscriptions_district_id_fkey" FOREIGN KEY ("district_id") REFERENCES "districts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sms_messages" ADD CONSTRAINT "sms_messages_incident_id_fkey" FOREIGN KEY ("incident_id") REFERENCES "incident_reports"("id") ON DELETE SET NULL ON UPDATE CASCADE;

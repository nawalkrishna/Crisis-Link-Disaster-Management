-- CreateEnum
CREATE TYPE "CampStatus" AS ENUM ('OPEN', 'FULL', 'CLOSED');

-- CreateEnum
CREATE TYPE "Gender" AS ENUM ('MALE', 'FEMALE', 'OTHER', 'UNDISCLOSED');

-- CreateEnum
CREATE TYPE "SupplyCategory" AS ENUM ('FOOD', 'WATER', 'MEDICINE', 'CLOTHING', 'HYGIENE', 'BEDDING', 'OTHER');

-- CreateEnum
CREATE TYPE "Priority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "NeedStatus" AS ENUM ('OPEN', 'FULFILLED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "DonationStatus" AS ENUM ('PLEDGED', 'RECEIVED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "IncidentType" AS ENUM ('FLOOD', 'LANDSLIDE', 'FIRE', 'BUILDING_COLLAPSE', 'ROAD_BLOCKED', 'MEDICAL_EMERGENCY', 'OTHER');

-- CreateEnum
CREATE TYPE "IncidentStatus" AS ENUM ('REPORTED', 'VERIFIED', 'RESOLVED', 'DISMISSED');

-- CreateTable
CREATE TABLE "districts" (
    "id" SERIAL NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "districts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "relief_camps" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "district_id" INTEGER NOT NULL,
    "capacity" INTEGER NOT NULL,
    "status" "CampStatus" NOT NULL DEFAULT 'OPEN',
    "contact_name" TEXT,
    "contact_phone" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "relief_camps_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "evacuees" (
    "id" UUID NOT NULL,
    "camp_id" UUID NOT NULL,
    "full_name" TEXT NOT NULL,
    "age" INTEGER,
    "gender" "Gender" NOT NULL DEFAULT 'UNDISCLOSED',
    "phone" TEXT,
    "home_address" TEXT,
    "medical_notes" TEXT,
    "checked_in_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "checked_out_at" TIMESTAMP(3),

    CONSTRAINT "evacuees_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "camp_needs" (
    "id" UUID NOT NULL,
    "camp_id" UUID NOT NULL,
    "item" TEXT NOT NULL,
    "category" "SupplyCategory" NOT NULL,
    "quantity_needed" INTEGER NOT NULL,
    "quantity_fulfilled" INTEGER NOT NULL DEFAULT 0,
    "unit" TEXT NOT NULL DEFAULT 'units',
    "priority" "Priority" NOT NULL DEFAULT 'MEDIUM',
    "status" "NeedStatus" NOT NULL DEFAULT 'OPEN',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "camp_needs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "donations" (
    "id" UUID NOT NULL,
    "donor_name" TEXT NOT NULL,
    "donor_phone" TEXT,
    "category" "SupplyCategory" NOT NULL,
    "item" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "status" "DonationStatus" NOT NULL DEFAULT 'PLEDGED',
    "need_id" UUID,
    "camp_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "received_at" TIMESTAMP(3),

    CONSTRAINT "donations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "incident_reports" (
    "id" UUID NOT NULL,
    "type" "IncidentType" NOT NULL,
    "severity" "Priority" NOT NULL,
    "status" "IncidentStatus" NOT NULL DEFAULT 'REPORTED',
    "description" TEXT NOT NULL,
    "location_text" TEXT NOT NULL,
    "district_id" INTEGER NOT NULL,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "reporter_name" TEXT,
    "reporter_phone" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "incident_reports_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "districts_slug_key" ON "districts"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "districts_name_key" ON "districts"("name");

-- CreateIndex
CREATE INDEX "relief_camps_district_id_idx" ON "relief_camps"("district_id");

-- CreateIndex
CREATE INDEX "evacuees_camp_id_checked_out_at_idx" ON "evacuees"("camp_id", "checked_out_at");

-- CreateIndex
CREATE INDEX "camp_needs_status_priority_idx" ON "camp_needs"("status", "priority");

-- CreateIndex
CREATE INDEX "camp_needs_camp_id_idx" ON "camp_needs"("camp_id");

-- CreateIndex
CREATE INDEX "donations_need_id_idx" ON "donations"("need_id");

-- CreateIndex
CREATE INDEX "donations_camp_id_idx" ON "donations"("camp_id");

-- CreateIndex
CREATE INDEX "incident_reports_status_severity_idx" ON "incident_reports"("status", "severity");

-- CreateIndex
CREATE INDEX "incident_reports_district_id_idx" ON "incident_reports"("district_id");

-- AddForeignKey
ALTER TABLE "relief_camps" ADD CONSTRAINT "relief_camps_district_id_fkey" FOREIGN KEY ("district_id") REFERENCES "districts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evacuees" ADD CONSTRAINT "evacuees_camp_id_fkey" FOREIGN KEY ("camp_id") REFERENCES "relief_camps"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "camp_needs" ADD CONSTRAINT "camp_needs_camp_id_fkey" FOREIGN KEY ("camp_id") REFERENCES "relief_camps"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "donations" ADD CONSTRAINT "donations_need_id_fkey" FOREIGN KEY ("need_id") REFERENCES "camp_needs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "donations" ADD CONSTRAINT "donations_camp_id_fkey" FOREIGN KEY ("camp_id") REFERENCES "relief_camps"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "incident_reports" ADD CONSTRAINT "incident_reports_district_id_fkey" FOREIGN KEY ("district_id") REFERENCES "districts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

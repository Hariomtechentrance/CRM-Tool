-- CreateEnum
CREATE TYPE "CarBookingPaymentType" AS ENUM ('CASH', 'FINANCE');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "CarLeadStage" ADD VALUE 'BUSY';
ALTER TYPE "CarLeadStage" ADD VALUE 'PRODUCT_NOT_FOUND';

-- AlterTable
ALTER TABLE "Vehicle" ADD COLUMN     "addedToInsuranceGateway" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "addedToInsuranceGatewayAt" TIMESTAMP(3),
ADD COLUMN     "docDelayChecklistNote" TEXT,
ADD COLUMN     "docSentToRto" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "docSentToRtoAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "CarBooking" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "carLeadId" TEXT NOT NULL,
    "carPrice" DOUBLE PRECISION,
    "commission" DOUBLE PRECISION,
    "paymentType" "CarBookingPaymentType",
    "rtoCharge" DOUBLE PRECISION,
    "warranty" TEXT,
    "extraWork" TEXT,
    "rsaIncluded" BOOLEAN NOT NULL DEFAULT false,
    "rsaAmount" DOUBLE PRECISION,
    "finalPrice" DOUBLE PRECISION,
    "deliveryDate" TIMESTAMP(3),
    "termsAndConditions" TEXT,
    "insuranceIncluded" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CarBooking_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CarDelivery" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "carLeadId" TEXT NOT NULL,
    "checkedOut" BOOLEAN NOT NULL DEFAULT false,
    "checkedOutAt" TIMESTAMP(3),
    "documentsAdded" BOOLEAN NOT NULL DEFAULT false,
    "documentsAddedAt" TIMESTAMP(3),
    "deliveryNoteAdded" BOOLEAN NOT NULL DEFAULT false,
    "deliveryDone" BOOLEAN NOT NULL DEFAULT false,
    "deliveryDoneAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CarDelivery_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CarBooking_carLeadId_key" ON "CarBooking"("carLeadId");

-- CreateIndex
CREATE INDEX "CarBooking_organizationId_idx" ON "CarBooking"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "CarDelivery_carLeadId_key" ON "CarDelivery"("carLeadId");

-- CreateIndex
CREATE INDEX "CarDelivery_organizationId_idx" ON "CarDelivery"("organizationId");

-- AddForeignKey
ALTER TABLE "CarBooking" ADD CONSTRAINT "CarBooking_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CarBooking" ADD CONSTRAINT "CarBooking_carLeadId_fkey" FOREIGN KEY ("carLeadId") REFERENCES "CarLead"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CarDelivery" ADD CONSTRAINT "CarDelivery_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CarDelivery" ADD CONSTRAINT "CarDelivery_carLeadId_fkey" FOREIGN KEY ("carLeadId") REFERENCES "CarLead"("id") ON DELETE CASCADE ON UPDATE CASCADE;


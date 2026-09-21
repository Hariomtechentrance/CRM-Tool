-- CreateEnum
CREATE TYPE "TailorGarmentType" AS ENUM ('SHIRT', 'TROUSER', 'BLOUSE', 'LEHENGA', 'SHERWANI', 'KURTA', 'SUIT', 'SAREE_FALL', 'ALTERATION', 'OTHER');

-- CreateEnum
CREATE TYPE "TailorOrderStatus" AS ENUM ('ORDER_PLACED', 'CUTTING', 'STITCHING', 'TRIAL', 'ALTERATION', 'READY', 'DELIVERED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "FabricProvidedBy" AS ENUM ('CUSTOMER', 'SHOP');

-- CreateTable
CREATE TABLE "TailorCustomer" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "email" TEXT,
    "address" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TailorCustomer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TailorMeasurementProfile" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "garmentType" "TailorGarmentType" NOT NULL,
    "label" TEXT,
    "chest" DOUBLE PRECISION,
    "waist" DOUBLE PRECISION,
    "hip" DOUBLE PRECISION,
    "shoulder" DOUBLE PRECISION,
    "sleeveLength" DOUBLE PRECISION,
    "length" DOUBLE PRECISION,
    "extraMeasurements" JSONB,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TailorMeasurementProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TailorOrder" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "orderNumber" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "garmentType" "TailorGarmentType" NOT NULL,
    "measurementProfileId" TEXT,
    "measurements" JSONB,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "fabricProvidedBy" "FabricProvidedBy" NOT NULL DEFAULT 'CUSTOMER',
    "fabricDetails" TEXT,
    "styleNotes" TEXT,
    "price" DOUBLE PRECISION,
    "advancePaid" DOUBLE PRECISION,
    "status" "TailorOrderStatus" NOT NULL DEFAULT 'ORDER_PLACED',
    "orderDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "trialDate" TIMESTAMP(3),
    "expectedDeliveryDate" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),
    "assignedToId" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TailorOrder_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TailorCustomer_organizationId_idx" ON "TailorCustomer"("organizationId");

-- CreateIndex
CREATE INDEX "TailorCustomer_organizationId_phone_idx" ON "TailorCustomer"("organizationId", "phone");

-- CreateIndex
CREATE INDEX "TailorMeasurementProfile_organizationId_idx" ON "TailorMeasurementProfile"("organizationId");

-- CreateIndex
CREATE INDEX "TailorMeasurementProfile_customerId_idx" ON "TailorMeasurementProfile"("customerId");

-- CreateIndex
CREATE INDEX "TailorOrder_organizationId_idx" ON "TailorOrder"("organizationId");

-- CreateIndex
CREATE INDEX "TailorOrder_organizationId_status_idx" ON "TailorOrder"("organizationId", "status");

-- CreateIndex
CREATE INDEX "TailorOrder_customerId_idx" ON "TailorOrder"("customerId");

-- CreateIndex
CREATE UNIQUE INDEX "TailorOrder_organizationId_orderNumber_key" ON "TailorOrder"("organizationId", "orderNumber");

-- AddForeignKey
ALTER TABLE "TailorCustomer" ADD CONSTRAINT "TailorCustomer_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TailorMeasurementProfile" ADD CONSTRAINT "TailorMeasurementProfile_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TailorMeasurementProfile" ADD CONSTRAINT "TailorMeasurementProfile_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "TailorCustomer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TailorOrder" ADD CONSTRAINT "TailorOrder_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TailorOrder" ADD CONSTRAINT "TailorOrder_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "TailorCustomer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TailorOrder" ADD CONSTRAINT "TailorOrder_measurementProfileId_fkey" FOREIGN KEY ("measurementProfileId") REFERENCES "TailorMeasurementProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;


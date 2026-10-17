-- CreateTable
CREATE TABLE "CarLeadActivity" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "carLeadId" TEXT NOT NULL,
    "note" TEXT NOT NULL,
    "followUpDate" TIMESTAMP(3),
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CarLeadActivity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VehicleInsuranceActivity" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "insuranceId" TEXT NOT NULL,
    "note" TEXT NOT NULL,
    "followUpDate" TIMESTAMP(3),
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VehicleInsuranceActivity_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CarLeadActivity_organizationId_idx" ON "CarLeadActivity"("organizationId");

-- CreateIndex
CREATE INDEX "CarLeadActivity_carLeadId_idx" ON "CarLeadActivity"("carLeadId");

-- CreateIndex
CREATE INDEX "CarLeadActivity_createdAt_idx" ON "CarLeadActivity"("createdAt");

-- CreateIndex
CREATE INDEX "VehicleInsuranceActivity_organizationId_idx" ON "VehicleInsuranceActivity"("organizationId");

-- CreateIndex
CREATE INDEX "VehicleInsuranceActivity_insuranceId_idx" ON "VehicleInsuranceActivity"("insuranceId");

-- CreateIndex
CREATE INDEX "VehicleInsuranceActivity_createdAt_idx" ON "VehicleInsuranceActivity"("createdAt");

-- AddForeignKey
ALTER TABLE "CarLeadActivity" ADD CONSTRAINT "CarLeadActivity_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CarLeadActivity" ADD CONSTRAINT "CarLeadActivity_carLeadId_fkey" FOREIGN KEY ("carLeadId") REFERENCES "CarLead"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CarLeadActivity" ADD CONSTRAINT "CarLeadActivity_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VehicleInsuranceActivity" ADD CONSTRAINT "VehicleInsuranceActivity_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VehicleInsuranceActivity" ADD CONSTRAINT "VehicleInsuranceActivity_insuranceId_fkey" FOREIGN KEY ("insuranceId") REFERENCES "VehicleInsurance"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VehicleInsuranceActivity" ADD CONSTRAINT "VehicleInsuranceActivity_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


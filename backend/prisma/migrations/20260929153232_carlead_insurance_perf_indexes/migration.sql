-- CreateIndex
CREATE INDEX "CarLead_organizationId_leadType_createdAt_idx" ON "CarLead"("organizationId", "leadType", "createdAt");

-- CreateIndex
CREATE INDEX "VehicleInsurance_organizationId_vehicleId_endDate_idx" ON "VehicleInsurance"("organizationId", "vehicleId", "endDate");


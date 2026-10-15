ALTER TABLE "VehicleInsurance" ADD COLUMN "nextFollowUpDate" TIMESTAMP(3);
CREATE INDEX "VehicleInsurance_organizationId_nextFollowUpDate_idx" ON "VehicleInsurance"("organizationId", "nextFollowUpDate");

ALTER TABLE "Vehicle"
ADD COLUMN "isDoNotCall" BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX "Vehicle_organizationId_isDoNotCall_idx"
ON "Vehicle"("organizationId", "isDoNotCall");

-- AlterTable
ALTER TABLE "CarLead" ADD COLUMN     "additionalInterestedVehicles" JSONB,
ADD COLUMN     "bookingDone" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "hasExchangeVehicle" BOOLEAN;


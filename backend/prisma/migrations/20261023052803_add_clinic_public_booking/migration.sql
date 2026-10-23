ALTER TABLE "Doctor"
ADD COLUMN "workStartTime" TEXT,
ADD COLUMN "workEndTime" TEXT,
ADD COLUMN "isPubliclyBookable" BOOLEAN NOT NULL DEFAULT true;

CREATE TABLE "WhatsAppBookingSession" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "step" TEXT NOT NULL,
    "doctorId" TEXT,
    "date" TEXT,
    "timeSlot" TEXT,
    "name" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WhatsAppBookingSession_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "WhatsAppBookingSession_organizationId_phone_key" ON "WhatsAppBookingSession"("organizationId", "phone");

ALTER TABLE "WhatsAppBookingSession" ADD CONSTRAINT "WhatsAppBookingSession_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

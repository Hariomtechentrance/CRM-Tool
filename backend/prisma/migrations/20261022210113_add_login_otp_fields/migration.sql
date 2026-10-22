ALTER TABLE "User"
ADD COLUMN "loginOtpCodeHash" TEXT,
ADD COLUMN "loginOtpExpiry" TIMESTAMP(3);

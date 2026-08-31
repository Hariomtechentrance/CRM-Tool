-- Add an expiry timestamp for email-verification tokens.
-- Nullable, no backfill needed: existing unverified tokens simply have no
-- expiry until the user requests a new verification email.
ALTER TABLE "User" ADD COLUMN "emailVerifyExpiry" TIMESTAMP(3);

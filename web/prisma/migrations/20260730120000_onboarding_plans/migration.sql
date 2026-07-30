-- AlterTable
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "organizationName" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "hostType" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "plan" TEXT NOT NULL DEFAULT 'free';
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "emailVerifiedAt" TIMESTAMP(3);
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "otpHash" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "otpExpiresAt" TIMESTAMP(3);

-- Existing accounts are treated as already verified
UPDATE "User"
SET "emailVerifiedAt" = COALESCE("emailVerifiedAt", "createdAt")
WHERE "passwordHash" IS NOT NULL AND "emailVerifiedAt" IS NULL;

-- AlterTable
ALTER TABLE "Event" ADD COLUMN IF NOT EXISTS "billingMode" TEXT NOT NULL DEFAULT 'subscription';
ALTER TABLE "Event" ADD COLUMN IF NOT EXISTS "planTier" TEXT NOT NULL DEFAULT 'free';
ALTER TABLE "Event" ADD COLUMN IF NOT EXISTS "instantFeeCents" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Event" ADD COLUMN IF NOT EXISTS "highlightsPublished" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Media" ADD COLUMN IF NOT EXISTS "isHighlight" BOOLEAN NOT NULL DEFAULT false;

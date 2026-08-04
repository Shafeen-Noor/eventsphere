-- AlterTable
ALTER TABLE "GuestbookEntry" ADD COLUMN IF NOT EXISTS "signatureSvg" TEXT;

-- AlterTable
ALTER TABLE "Poll" ADD COLUMN IF NOT EXISTS "kind" TEXT NOT NULL DEFAULT 'choice';

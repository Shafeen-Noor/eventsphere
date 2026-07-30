-- AlterTable
ALTER TABLE "Event" ADD COLUMN IF NOT EXISTS "highlightTemplate" TEXT NOT NULL DEFAULT 'mosaic';
ALTER TABLE "Event" ADD COLUMN IF NOT EXISTS "highlightFilter" TEXT NOT NULL DEFAULT 'none';

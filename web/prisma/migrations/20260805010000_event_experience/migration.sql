-- Event experience rebuild: plan tiers + social / timeline / AI models

-- User
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "apiTokenHash" TEXT;

-- Event new columns + safer defaults for rebuilt free tier
ALTER TABLE "Event" ADD COLUMN IF NOT EXISTS "eventType" TEXT NOT NULL DEFAULT 'party';
ALTER TABLE "Event" ADD COLUMN IF NOT EXISTS "disposableCamera" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Event" ADD COLUMN IF NOT EXISTS "whiteLabel" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Event" ADD COLUMN IF NOT EXISTS "customDomain" TEXT;
ALTER TABLE "Event" ADD COLUMN IF NOT EXISTS "hideUntilEventEnd" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Event" ADD COLUMN IF NOT EXISTS "featuredMediaId" TEXT;
ALTER TABLE "Event" ADD COLUMN IF NOT EXISTS "featuredUntil" TIMESTAMP(3);

ALTER TABLE "Event" ALTER COLUMN "retentionHours" SET DEFAULT 24;
ALTER TABLE "Event" ALTER COLUMN "billingMode" SET DEFAULT 'free';
ALTER TABLE "Event" ALTER COLUMN "maxGuests" SET DEFAULT 5;
ALTER TABLE "Event" ALTER COLUMN "maxMedia" SET DEFAULT 40;
ALTER TABLE "Event" ALTER COLUMN "guestVisibility" SET DEFAULT 'all_members';
ALTER TABLE "Event" ALTER COLUMN "requireRsvpToUpload" SET DEFAULT false;

-- Media
ALTER TABLE "Media" ADD COLUMN IF NOT EXISTS "aiCaption" TEXT;
ALTER TABLE "Media" ADD COLUMN IF NOT EXISTS "lat" DOUBLE PRECISION;
ALTER TABLE "Media" ADD COLUMN IF NOT EXISTS "lng" DOUBLE PRECISION;
ALTER TABLE "Media" ADD COLUMN IF NOT EXISTS "scheduleItemId" TEXT;
ALTER TABLE "Media" ADD COLUMN IF NOT EXISTS "hiddenUntil" TIMESTAMP(3);
ALTER TABLE "Media" ADD COLUMN IF NOT EXISTS "unlockAt" TIMESTAMP(3);
ALTER TABLE "Media" ADD COLUMN IF NOT EXISTS "featuredUntil" TIMESTAMP(3);

-- Legacy plan tier remaps
UPDATE "Event" SET "planTier" = 'essential' WHERE "planTier" = 'pro';
UPDATE "Event" SET "planTier" = 'enterprise' WHERE "planTier" = 'professional';
UPDATE "User" SET "plan" = 'essential' WHERE "plan" = 'pro';
UPDATE "User" SET "plan" = 'enterprise' WHERE "plan" = 'professional';

-- CreateTable
CREATE TABLE IF NOT EXISTS "MediaReaction" (
    "id" TEXT NOT NULL,
    "mediaId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "emoji" TEXT NOT NULL DEFAULT 'heart',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MediaReaction_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "PhotoVote" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "mediaId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PhotoVote_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "GuestbookEntry" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GuestbookEntry_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "ScheduleItem" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "location" TEXT NOT NULL DEFAULT '',
    "startsAt" TIMESTAMP(3),
    "endsAt" TIMESTAMP(3),
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ScheduleItem_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "StoryChapter" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL DEFAULT '',
    "mediaIds" TEXT NOT NULL DEFAULT '[]',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StoryChapter_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "Poll" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'open',
    "closesAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Poll_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "PollOption" (
    "id" TEXT NOT NULL,
    "pollId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "PollOption_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "PollVote" (
    "id" TEXT NOT NULL,
    "pollId" TEXT NOT NULL,
    "optionId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PollVote_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "Challenge" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "status" TEXT NOT NULL DEFAULT 'open',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Challenge_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "ChallengeSubmission" (
    "id" TEXT NOT NULL,
    "challengeId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "mediaId" TEXT,
    "caption" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChallengeSubmission_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "SeatingTable" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "capacity" INTEGER NOT NULL DEFAULT 8,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SeatingTable_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "SeatAssignment" (
    "id" TEXT NOT NULL,
    "tableId" TEXT NOT NULL,
    "userId" TEXT,
    "guestName" TEXT NOT NULL DEFAULT '',
    "seatLabel" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SeatAssignment_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "FeedItem" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "actorId" TEXT,
    "mediaId" TEXT,
    "title" TEXT NOT NULL DEFAULT '',
    "body" TEXT NOT NULL DEFAULT '',
    "payload" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FeedItem_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "AudioMemory" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "contentType" TEXT NOT NULL DEFAULT 'audio/webm',
    "byteSize" INTEGER NOT NULL DEFAULT 0,
    "durationMs" INTEGER NOT NULL DEFAULT 0,
    "caption" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AudioMemory_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "GuestBadge" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "level" TEXT NOT NULL DEFAULT 'newcomer',
    "uploads" INTEGER NOT NULL DEFAULT 0,
    "likes" INTEGER NOT NULL DEFAULT 0,
    "reactions" INTEGER NOT NULL DEFAULT 0,
    "guestbook" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GuestBadge_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "FaceCollection" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FaceCollection_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "FaceTag" (
    "id" TEXT NOT NULL,
    "collectionId" TEXT NOT NULL,
    "mediaId" TEXT NOT NULL,
    "userId" TEXT,
    "confidence" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "boxJson" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FaceTag_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "EventRecap" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "summary" TEXT NOT NULL DEFAULT '',
    "highlights" TEXT NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EventRecap_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "DemoLead" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "company" TEXT NOT NULL DEFAULT '',
    "message" TEXT NOT NULL DEFAULT '',
    "planInterest" TEXT NOT NULL DEFAULT 'enterprise',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DemoLead_pkey" PRIMARY KEY ("id")
);

-- Unique constraints (idempotent)
DO $$ BEGIN
  ALTER TABLE "MediaReaction" ADD CONSTRAINT "MediaReaction_mediaId_userId_emoji_key" UNIQUE ("mediaId", "userId", "emoji");
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "PhotoVote" ADD CONSTRAINT "PhotoVote_eventId_userId_key" UNIQUE ("eventId", "userId");
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "PollVote" ADD CONSTRAINT "PollVote_pollId_userId_key" UNIQUE ("pollId", "userId");
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "ChallengeSubmission" ADD CONSTRAINT "ChallengeSubmission_challengeId_userId_key" UNIQUE ("challengeId", "userId");
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "GuestBadge" ADD CONSTRAINT "GuestBadge_eventId_userId_key" UNIQUE ("eventId", "userId");
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "EventRecap" ADD CONSTRAINT "EventRecap_eventId_key" UNIQUE ("eventId");
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Indexes
CREATE INDEX IF NOT EXISTS "Media_scheduleItemId_idx" ON "Media"("scheduleItemId");
CREATE INDEX IF NOT EXISTS "MediaReaction_mediaId_idx" ON "MediaReaction"("mediaId");
CREATE INDEX IF NOT EXISTS "PhotoVote_mediaId_idx" ON "PhotoVote"("mediaId");
CREATE INDEX IF NOT EXISTS "GuestbookEntry_eventId_createdAt_idx" ON "GuestbookEntry"("eventId", "createdAt");
CREATE INDEX IF NOT EXISTS "ScheduleItem_eventId_sortOrder_idx" ON "ScheduleItem"("eventId", "sortOrder");
CREATE INDEX IF NOT EXISTS "StoryChapter_eventId_sortOrder_idx" ON "StoryChapter"("eventId", "sortOrder");
CREATE INDEX IF NOT EXISTS "Poll_eventId_idx" ON "Poll"("eventId");
CREATE INDEX IF NOT EXISTS "PollOption_pollId_sortOrder_idx" ON "PollOption"("pollId", "sortOrder");
CREATE INDEX IF NOT EXISTS "PollVote_optionId_idx" ON "PollVote"("optionId");
CREATE INDEX IF NOT EXISTS "Challenge_eventId_idx" ON "Challenge"("eventId");
CREATE INDEX IF NOT EXISTS "ChallengeSubmission_mediaId_idx" ON "ChallengeSubmission"("mediaId");
CREATE INDEX IF NOT EXISTS "SeatingTable_eventId_sortOrder_idx" ON "SeatingTable"("eventId", "sortOrder");
CREATE INDEX IF NOT EXISTS "SeatAssignment_tableId_idx" ON "SeatAssignment"("tableId");
CREATE INDEX IF NOT EXISTS "SeatAssignment_userId_idx" ON "SeatAssignment"("userId");
CREATE INDEX IF NOT EXISTS "FeedItem_eventId_createdAt_idx" ON "FeedItem"("eventId", "createdAt");
CREATE INDEX IF NOT EXISTS "AudioMemory_eventId_createdAt_idx" ON "AudioMemory"("eventId", "createdAt");
CREATE INDEX IF NOT EXISTS "FaceCollection_eventId_idx" ON "FaceCollection"("eventId");
CREATE INDEX IF NOT EXISTS "FaceTag_mediaId_idx" ON "FaceTag"("mediaId");
CREATE INDEX IF NOT EXISTS "FaceTag_collectionId_idx" ON "FaceTag"("collectionId");
CREATE INDEX IF NOT EXISTS "FaceTag_userId_idx" ON "FaceTag"("userId");
CREATE INDEX IF NOT EXISTS "DemoLead_email_idx" ON "DemoLead"("email");
CREATE INDEX IF NOT EXISTS "DemoLead_createdAt_idx" ON "DemoLead"("createdAt");

-- Foreign keys (idempotent)
DO $$ BEGIN
  ALTER TABLE "Event" ADD CONSTRAINT "Event_featuredMediaId_fkey"
    FOREIGN KEY ("featuredMediaId") REFERENCES "Media"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "Media" ADD CONSTRAINT "Media_scheduleItemId_fkey"
    FOREIGN KEY ("scheduleItemId") REFERENCES "ScheduleItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "MediaReaction" ADD CONSTRAINT "MediaReaction_mediaId_fkey"
    FOREIGN KEY ("mediaId") REFERENCES "Media"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "MediaReaction" ADD CONSTRAINT "MediaReaction_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "PhotoVote" ADD CONSTRAINT "PhotoVote_eventId_fkey"
    FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "PhotoVote" ADD CONSTRAINT "PhotoVote_mediaId_fkey"
    FOREIGN KEY ("mediaId") REFERENCES "Media"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "PhotoVote" ADD CONSTRAINT "PhotoVote_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "GuestbookEntry" ADD CONSTRAINT "GuestbookEntry_eventId_fkey"
    FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "GuestbookEntry" ADD CONSTRAINT "GuestbookEntry_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "ScheduleItem" ADD CONSTRAINT "ScheduleItem_eventId_fkey"
    FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "StoryChapter" ADD CONSTRAINT "StoryChapter_eventId_fkey"
    FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "Poll" ADD CONSTRAINT "Poll_eventId_fkey"
    FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "PollOption" ADD CONSTRAINT "PollOption_pollId_fkey"
    FOREIGN KEY ("pollId") REFERENCES "Poll"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "PollVote" ADD CONSTRAINT "PollVote_pollId_fkey"
    FOREIGN KEY ("pollId") REFERENCES "Poll"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "PollVote" ADD CONSTRAINT "PollVote_optionId_fkey"
    FOREIGN KEY ("optionId") REFERENCES "PollOption"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "PollVote" ADD CONSTRAINT "PollVote_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "Challenge" ADD CONSTRAINT "Challenge_eventId_fkey"
    FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "ChallengeSubmission" ADD CONSTRAINT "ChallengeSubmission_challengeId_fkey"
    FOREIGN KEY ("challengeId") REFERENCES "Challenge"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "ChallengeSubmission" ADD CONSTRAINT "ChallengeSubmission_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "ChallengeSubmission" ADD CONSTRAINT "ChallengeSubmission_mediaId_fkey"
    FOREIGN KEY ("mediaId") REFERENCES "Media"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "SeatingTable" ADD CONSTRAINT "SeatingTable_eventId_fkey"
    FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "SeatAssignment" ADD CONSTRAINT "SeatAssignment_tableId_fkey"
    FOREIGN KEY ("tableId") REFERENCES "SeatingTable"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "SeatAssignment" ADD CONSTRAINT "SeatAssignment_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "FeedItem" ADD CONSTRAINT "FeedItem_eventId_fkey"
    FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "FeedItem" ADD CONSTRAINT "FeedItem_actorId_fkey"
    FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "FeedItem" ADD CONSTRAINT "FeedItem_mediaId_fkey"
    FOREIGN KEY ("mediaId") REFERENCES "Media"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "AudioMemory" ADD CONSTRAINT "AudioMemory_eventId_fkey"
    FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "AudioMemory" ADD CONSTRAINT "AudioMemory_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "GuestBadge" ADD CONSTRAINT "GuestBadge_eventId_fkey"
    FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "GuestBadge" ADD CONSTRAINT "GuestBadge_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "FaceCollection" ADD CONSTRAINT "FaceCollection_eventId_fkey"
    FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "FaceTag" ADD CONSTRAINT "FaceTag_collectionId_fkey"
    FOREIGN KEY ("collectionId") REFERENCES "FaceCollection"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "FaceTag" ADD CONSTRAINT "FaceTag_mediaId_fkey"
    FOREIGN KEY ("mediaId") REFERENCES "Media"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "FaceTag" ADD CONSTRAINT "FaceTag_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "EventRecap" ADD CONSTRAINT "EventRecap_eventId_fkey"
    FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

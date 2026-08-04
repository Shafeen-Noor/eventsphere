import { prisma } from "@/lib/db";

export type BadgeLevel =
  | "newcomer"
  | "regular"
  | "contributor"
  | "star"
  | "legend";

export type BadgeCounts = {
  uploads?: number;
  likes?: number;
  reactions?: number;
  guestbook?: number;
};

export function levelFromCounts(counts: BadgeCounts): BadgeLevel {
  const uploads = counts.uploads ?? 0;
  const likes = counts.likes ?? 0;
  const reactions = counts.reactions ?? 0;
  const guestbook = counts.guestbook ?? 0;
  const score = uploads * 3 + likes + reactions * 2 + guestbook * 2;

  if (score >= 100) return "legend";
  if (score >= 50) return "star";
  if (score >= 20) return "contributor";
  if (score >= 5) return "regular";
  return "newcomer";
}

export async function refreshGuestBadge(eventId: string, userId: string) {
  const [uploads, likes, reactions, guestbook] = await Promise.all([
    prisma.media.count({
      where: {
        eventId,
        uploaderId: userId,
        state: { in: ["published", "pending_approval"] },
      },
    }),
    prisma.mediaLike.count({
      where: {
        userId,
        media: { eventId },
      },
    }),
    prisma.mediaReaction.count({
      where: {
        userId,
        media: { eventId },
      },
    }),
    prisma.guestbookEntry.count({
      where: { eventId, userId },
    }),
  ]);

  const counts = { uploads, likes, reactions, guestbook };
  const level = levelFromCounts(counts);

  return prisma.guestBadge.upsert({
    where: { eventId_userId: { eventId, userId } },
    create: {
      eventId,
      userId,
      level,
      uploads,
      likes,
      reactions,
      guestbook,
    },
    update: {
      level,
      uploads,
      likes,
      reactions,
      guestbook,
    },
  });
}

import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { assertOrganizer } from "@/lib/events";
import { handleRouteError, jsonError, jsonOk } from "@/lib/http";
import { getPlan } from "@/lib/plans";

type Ctx = { params: Promise<{ slug: string }> };

export async function GET(_req: Request, ctx: Ctx) {
  try {
    const { slug } = await ctx.params;
    const user = await getCurrentUser();
    if (!user) return jsonError("AUTH_REQUIRED", "Sign in to continue.", 401);

    const event = await prisma.event.findUnique({ where: { slug } });
    if (!event) return jsonError("EVENT_NOT_FOUND", "We can’t find this event.", 404);
    await assertOrganizer(event.id, user.id);

    if (!getPlan(event.planTier).features.analytics) {
      return jsonError(
        "PLAN_REQUIRED",
        "Analytics are available on Premium and above.",
        402,
      );
    }

    const [
      memberCount,
      mediaPublished,
      mediaPending,
      likeCount,
      commentCount,
      reactionCount,
      voteCount,
      guestbookCount,
      rsvpGoing,
      rsvpMaybe,
      rsvpDeclined,
      pollCount,
      challengeCount,
      audioCount,
      topUploaders,
      recentMedia,
    ] = await Promise.all([
      prisma.membership.count({
        where: { eventId: event.id, status: "active" },
      }),
      prisma.media.count({
        where: { eventId: event.id, state: "published" },
      }),
      prisma.media.count({
        where: { eventId: event.id, state: "pending_approval" },
      }),
      prisma.mediaLike.count({ where: { media: { eventId: event.id } } }),
      prisma.mediaComment.count({ where: { media: { eventId: event.id } } }),
      prisma.mediaReaction.count({ where: { media: { eventId: event.id } } }),
      prisma.photoVote.count({ where: { eventId: event.id } }),
      prisma.guestbookEntry.count({ where: { eventId: event.id } }),
      prisma.rsvp.count({ where: { eventId: event.id, status: "going" } }),
      prisma.rsvp.count({ where: { eventId: event.id, status: "maybe" } }),
      prisma.rsvp.count({ where: { eventId: event.id, status: "declined" } }),
      prisma.poll.count({ where: { eventId: event.id } }),
      prisma.challenge.count({ where: { eventId: event.id } }),
      prisma.audioMemory.count({ where: { eventId: event.id } }),
      prisma.media.groupBy({
        by: ["uploaderId"],
        where: { eventId: event.id, state: "published" },
        _count: { _all: true },
        orderBy: { _count: { uploaderId: "desc" } },
        take: 10,
      }),
      prisma.media.findMany({
        where: { eventId: event.id, state: "published" },
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { createdAt: true },
      }),
    ]);

    const uploaderIds = topUploaders.map((u) => u.uploaderId);
    const users = uploaderIds.length
      ? await prisma.user.findMany({
          where: { id: { in: uploaderIds } },
          select: { id: true, displayName: true },
        })
      : [];
    const nameMap = new Map(users.map((u) => [u.id, u.displayName]));

    return jsonOk({
      stats: {
        members: memberCount,
        mediaPublished,
        mediaPending,
        likes: likeCount,
        comments: commentCount,
        reactions: reactionCount,
        votes: voteCount,
        guestbook: guestbookCount,
        polls: pollCount,
        challenges: challengeCount,
        audioMemories: audioCount,
        rsvp: {
          going: rsvpGoing,
          maybe: rsvpMaybe,
          declined: rsvpDeclined,
        },
        lastUploadAt: recentMedia[0]?.createdAt.toISOString() ?? null,
        topUploaders: topUploaders.map((u) => ({
          userId: u.uploaderId,
          displayName: nameMap.get(u.uploaderId) ?? "Guest",
          mediaCount: u._count._all,
        })),
      },
    });
  } catch (err) {
    return handleRouteError(err);
  }
}

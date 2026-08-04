import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { assertEventMember } from "@/lib/events";
import { addFeedItem } from "@/lib/feed";
import { handleRouteError, jsonError, jsonOk } from "@/lib/http";
import { getPlan } from "@/lib/plans";

type Ctx = { params: Promise<{ slug: string }> };

const schema = z.object({
  mediaId: z.string().min(1),
});

export async function GET(_req: Request, ctx: Ctx) {
  try {
    const { slug } = await ctx.params;
    const user = await getCurrentUser();
    if (!user) return jsonError("AUTH_REQUIRED", "Sign in to continue.", 401);

    const event = await prisma.event.findUnique({ where: { slug } });
    if (!event) return jsonError("EVENT_NOT_FOUND", "We can’t find this event.", 404);
    await assertEventMember(event.id, user.id);

    const canUseVoting = getPlan(event.planTier).features.voting;
    if (!canUseVoting) {
      return jsonError(
        "PLAN_REQUIRED",
        "Photo voting is available on Premium and above.",
        402,
      );
    }

    const [tallies, myVote] = await Promise.all([
      prisma.photoVote.groupBy({
        by: ["mediaId"],
        where: { eventId: event.id },
        _count: { _all: true },
        orderBy: { _count: { mediaId: "desc" } },
      }),
      prisma.photoVote.findUnique({
        where: { eventId_userId: { eventId: event.id, userId: user.id } },
      }),
    ]);

    return jsonOk({
      canUseVoting,
      tallies: tallies.map((t) => ({
        mediaId: t.mediaId,
        votes: t._count._all,
      })),
      myVote: myVote
        ? { mediaId: myVote.mediaId, createdAt: myVote.createdAt.toISOString() }
        : null,
    });
  } catch (err) {
    return handleRouteError(err);
  }
}

export async function POST(req: Request, ctx: Ctx) {
  try {
    const { slug } = await ctx.params;
    const user = await getCurrentUser();
    if (!user) return jsonError("AUTH_REQUIRED", "Sign in to continue.", 401);

    const event = await prisma.event.findUnique({ where: { slug } });
    if (!event) return jsonError("EVENT_NOT_FOUND", "We can’t find this event.", 404);
    await assertEventMember(event.id, user.id);

    const canUseVoting = getPlan(event.planTier).features.voting;
    if (!canUseVoting) {
      return jsonError(
        "PLAN_REQUIRED",
        "Photo voting is available on Premium and above.",
        402,
      );
    }

    const body = schema.parse(await req.json());
    const media = await prisma.media.findFirst({
      where: { id: body.mediaId, eventId: event.id, state: "published" },
    });
    if (!media) {
      return jsonError("MEDIA_NOT_FOUND", "This photo is no longer available.", 404);
    }

    const vote = await prisma.photoVote.upsert({
      where: { eventId_userId: { eventId: event.id, userId: user.id } },
      create: {
        eventId: event.id,
        userId: user.id,
        mediaId: media.id,
      },
      update: { mediaId: media.id },
    });

    await addFeedItem({
      eventId: event.id,
      type: "vote",
      actorId: user.id,
      mediaId: media.id,
      title: "Photo vote",
      body: `${user.displayName} cast a vote.`,
    });

    const tallies = await prisma.photoVote.groupBy({
      by: ["mediaId"],
      where: { eventId: event.id },
      _count: { _all: true },
      orderBy: { _count: { mediaId: "desc" } },
    });

    return jsonOk({
      canUseVoting,
      myVote: {
        mediaId: vote.mediaId,
        createdAt: vote.createdAt.toISOString(),
      },
      tallies: tallies.map((t) => ({
        mediaId: t.mediaId,
        votes: t._count._all,
      })),
    });
  } catch (err) {
    return handleRouteError(err);
  }
}

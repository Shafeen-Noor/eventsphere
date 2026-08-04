import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { refreshGuestBadge } from "@/lib/badges";
import { prisma } from "@/lib/db";
import { assertEventMember } from "@/lib/events";
import { addFeedItem } from "@/lib/feed";
import { handleRouteError, jsonError, jsonOk } from "@/lib/http";

type Ctx = { params: Promise<{ slug: string }> };

const schema = z.object({
  mediaId: z.string().min(1),
  emoji: z.string().trim().min(1).max(32).default("heart"),
});

export async function POST(req: Request, ctx: Ctx) {
  try {
    const { slug } = await ctx.params;
    const user = await getCurrentUser();
    if (!user) return jsonError("AUTH_REQUIRED", "Sign in to continue.", 401);

    const event = await prisma.event.findUnique({ where: { slug } });
    if (!event) return jsonError("EVENT_NOT_FOUND", "We can’t find this event.", 404);
    await assertEventMember(event.id, user.id);

    const body = schema.parse(await req.json());
    const media = await prisma.media.findFirst({
      where: { id: body.mediaId, eventId: event.id },
    });
    if (!media || media.state === "rejected") {
      return jsonError("MEDIA_NOT_FOUND", "This photo is no longer available.", 404);
    }
    if (media.state !== "published" && media.uploaderId !== user.id) {
      return jsonError("MEDIA_NOT_FOUND", "This photo is no longer available.", 404);
    }

    const existing = await prisma.mediaReaction.findUnique({
      where: {
        mediaId_userId_emoji: {
          mediaId: media.id,
          userId: user.id,
          emoji: body.emoji,
        },
      },
    });

    let reacted: boolean;
    if (existing) {
      await prisma.mediaReaction.delete({ where: { id: existing.id } });
      reacted = false;
    } else {
      await prisma.mediaReaction.create({
        data: {
          mediaId: media.id,
          userId: user.id,
          emoji: body.emoji,
        },
      });
      reacted = true;
      await addFeedItem({
        eventId: event.id,
        type: "reaction",
        actorId: user.id,
        mediaId: media.id,
        title: "Reaction",
        body: body.emoji,
      });
    }

    await refreshGuestBadge(event.id, user.id);

    const counts = await prisma.mediaReaction.groupBy({
      by: ["emoji"],
      where: { mediaId: media.id },
      _count: { _all: true },
    });

    return jsonOk({
      reacted,
      mediaId: media.id,
      emoji: body.emoji,
      tallies: Object.fromEntries(
        counts.map((c) => [c.emoji, c._count._all]),
      ),
    });
  } catch (err) {
    return handleRouteError(err);
  }
}

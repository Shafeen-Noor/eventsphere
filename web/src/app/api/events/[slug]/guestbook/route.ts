import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { refreshGuestBadge } from "@/lib/badges";
import { prisma } from "@/lib/db";
import { assertEventMember } from "@/lib/events";
import { addFeedItem } from "@/lib/feed";
import { handleRouteError, jsonError, jsonOk } from "@/lib/http";
import { getPlan } from "@/lib/plans";

type Ctx = { params: Promise<{ slug: string }> };

const postSchema = z.object({
  message: z.string().trim().min(1).max(1000),
  signatureSvg: z.string().trim().max(200_000).optional().nullable(),
});

export async function GET(_req: Request, ctx: Ctx) {
  try {
    const { slug } = await ctx.params;
    const user = await getCurrentUser();
    if (!user) return jsonError("AUTH_REQUIRED", "Sign in to continue.", 401);

    const event = await prisma.event.findUnique({ where: { slug } });
    if (!event) return jsonError("EVENT_NOT_FOUND", "We can’t find this event.", 404);
    await assertEventMember(event.id, user.id);

    if (!getPlan(event.planTier).features.guestbook) {
      return jsonError(
        "PLAN_REQUIRED",
        "Guestbook isn’t available on this plan.",
        402,
      );
    }

    const entries = await prisma.guestbookEntry.findMany({
      where: { eventId: event.id },
      include: { user: { select: { id: true, displayName: true } } },
      orderBy: { createdAt: "desc" },
    });

    return jsonOk({
      entries: entries.map((e) => ({
        id: e.id,
        message: e.body,
        signatureSvg: e.signatureSvg,
        createdAt: e.createdAt.toISOString(),
        user: e.user,
        isMe: e.userId === user.id,
      })),
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

    if (!getPlan(event.planTier).features.guestbook) {
      return jsonError(
        "PLAN_REQUIRED",
        "Guestbook isn’t available on this plan.",
        402,
      );
    }

    const body = postSchema.parse(await req.json());
    const entry = await prisma.guestbookEntry.create({
      data: {
        eventId: event.id,
        userId: user.id,
        body: body.message,
        signatureSvg: body.signatureSvg || null,
      },
      include: { user: { select: { id: true, displayName: true } } },
    });

    await addFeedItem({
      eventId: event.id,
      type: "guestbook",
      actorId: user.id,
      title: "Guestbook note",
      body: body.message.slice(0, 160),
    });
    await refreshGuestBadge(event.id, user.id);

    return jsonOk(
      {
        entry: {
          id: entry.id,
          message: entry.body,
          signatureSvg: entry.signatureSvg,
          createdAt: entry.createdAt.toISOString(),
          user: entry.user,
          isMe: true,
        },
      },
      201,
    );
  } catch (err) {
    return handleRouteError(err);
  }
}

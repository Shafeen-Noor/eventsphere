import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { assertEventMember } from "@/lib/events";
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
    await assertEventMember(event.id, user.id);

    if (!getPlan(event.planTier).features.feed) {
      return jsonError(
        "PLAN_REQUIRED",
        "Live feed isn’t available on this plan.",
        402,
      );
    }

    const items = await prisma.feedItem.findMany({
      where: { eventId: event.id },
      include: {
        actor: { select: { id: true, displayName: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    return jsonOk({
      items: items.map((item) => ({
        id: item.id,
        type: item.type,
        title: item.title,
        body: item.body,
        mediaId: item.mediaId,
        payload: item.payload,
        createdAt: item.createdAt.toISOString(),
        actor: item.actor
          ? {
              id: item.actor.id,
              displayName: item.actor.displayName,
              name: item.actor.displayName,
            }
          : null,
        actorName: item.actor?.displayName ?? null,
      })),
    });
  } catch (err) {
    return handleRouteError(err);
  }
}

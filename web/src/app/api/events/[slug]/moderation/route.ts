import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { assertOrganizer } from "@/lib/events";
import { addFeedItem } from "@/lib/feed";
import { handleRouteError, jsonError, jsonOk } from "@/lib/http";
import { getPlan } from "@/lib/plans";
import { createDownloadUrl } from "@/lib/storage";

type Ctx = { params: Promise<{ slug: string }> };

const postSchema = z.object({
  mediaId: z.string().min(1),
  action: z.enum(["approve", "reject"]),
});

export async function GET(_req: Request, ctx: Ctx) {
  try {
    const { slug } = await ctx.params;
    const user = await getCurrentUser();
    if (!user) return jsonError("AUTH_REQUIRED", "Sign in to continue.", 401);

    const event = await prisma.event.findUnique({ where: { slug } });
    if (!event) return jsonError("EVENT_NOT_FOUND", "We can’t find this event.", 404);
    await assertOrganizer(event.id, user.id);

    if (!getPlan(event.planTier).features.moderation) {
      return jsonError(
        "PLAN_REQUIRED",
        "Moderation is available on Premium and above.",
        402,
      );
    }

    const pending = await prisma.media.findMany({
      where: { eventId: event.id, state: "pending_approval" },
      include: {
        uploader: { select: { id: true, displayName: true } },
      },
      orderBy: { createdAt: "asc" },
    });

    return jsonOk({
      pending: await Promise.all(
        pending.map(async (m) => ({
          id: m.id,
          type: m.type,
          caption: m.caption,
          contentType: m.contentType,
          createdAt: m.createdAt.toISOString(),
          uploader: m.uploader,
          url: await createDownloadUrl(m.thumbKey || m.storageKey),
          originalUrl: await createDownloadUrl(m.storageKey),
        })),
      ),
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
    await assertOrganizer(event.id, user.id);

    if (!getPlan(event.planTier).features.moderation) {
      return jsonError(
        "PLAN_REQUIRED",
        "Moderation is available on Premium and above.",
        402,
      );
    }

    const body = postSchema.parse(await req.json());
    const media = await prisma.media.findFirst({
      where: { id: body.mediaId, eventId: event.id },
    });
    if (!media) {
      return jsonError("MEDIA_NOT_FOUND", "This photo is no longer available.", 404);
    }
    if (media.state !== "pending_approval") {
      return jsonError(
        "CONFLICT_STATE",
        "Only pending photos can be moderated.",
        409,
      );
    }

    const nextState = body.action === "approve" ? "published" : "rejected";
    const updated = await prisma.media.update({
      where: { id: media.id },
      data: { state: nextState },
      include: {
        uploader: { select: { id: true, displayName: true } },
      },
    });

    await addFeedItem({
      eventId: event.id,
      type: body.action === "approve" ? "media_approved" : "media_rejected",
      actorId: user.id,
      mediaId: media.id,
      title: body.action === "approve" ? "Photo approved" : "Photo rejected",
      body: `${user.displayName} ${body.action}d a photo.`,
    });

    return jsonOk({
      media: {
        id: updated.id,
        state: updated.state,
        caption: updated.caption,
        uploader: updated.uploader,
      },
    });
  } catch (err) {
    return handleRouteError(err);
  }
}

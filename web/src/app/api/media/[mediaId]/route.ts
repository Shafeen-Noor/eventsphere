import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { assertEventMember, assertOrganizer } from "@/lib/events";
import { handleRouteError, jsonError, jsonOk } from "@/lib/http";
import { deleteObject } from "@/lib/storage";

type Ctx = { params: Promise<{ mediaId: string }> };

const patchSchema = z.object({
  caption: z.string().trim().max(500),
});

export async function PATCH(req: Request, ctx: Ctx) {
  try {
    const { mediaId } = await ctx.params;
    const user = await getCurrentUser();
    if (!user) return jsonError("AUTH_REQUIRED", "Sign in to continue.", 401);

    const media = await prisma.media.findUnique({ where: { id: mediaId } });
    if (!media || media.state !== "published") {
      return jsonError("MEDIA_NOT_FOUND", "This photo is no longer available.", 404);
    }
    await assertEventMember(media.eventId, user.id);
    if (media.uploaderId !== user.id) {
      await assertOrganizer(media.eventId, user.id);
    }

    const body = patchSchema.parse(await req.json());
    const updated = await prisma.media.update({
      where: { id: mediaId },
      data: { caption: body.caption },
    });
    return jsonOk({ media: { id: updated.id, caption: updated.caption } });
  } catch (err) {
    return handleRouteError(err);
  }
}

export async function DELETE(_req: Request, ctx: Ctx) {
  try {
    const { mediaId } = await ctx.params;
    const user = await getCurrentUser();
    if (!user) return jsonError("AUTH_REQUIRED", "Sign in to continue.", 401);

    const media = await prisma.media.findUnique({ where: { id: mediaId } });
    if (!media) {
      return jsonError("MEDIA_NOT_FOUND", "This photo is no longer available.", 404);
    }
    await assertEventMember(media.eventId, user.id);

    const membership = await prisma.membership.findUnique({
      where: { eventId_userId: { eventId: media.eventId, userId: user.id } },
    });
    const canDelete =
      media.uploaderId === user.id ||
      membership?.role === "organizer" ||
      membership?.role === "co_organizer";
    if (!canDelete) {
      return jsonError("AUTH_FORBIDDEN", "You don’t have access to do that.", 403);
    }

    await prisma.media.update({
      where: { id: mediaId },
      data: { state: "removed" },
    });

    await deleteObject(media.storageKey).catch(() => {});
    if (media.thumbKey) await deleteObject(media.thumbKey).catch(() => {});

    return jsonOk({ ok: true });
  } catch (err) {
    return handleRouteError(err);
  }
}

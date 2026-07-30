import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { assertEventMember, assertOrganizer } from "@/lib/events";
import { handleRouteError, jsonError, jsonOk } from "@/lib/http";
import { deleteObject } from "@/lib/storage";

type Ctx = { params: Promise<{ mediaId: string }> };

const patchSchema = z
  .object({
    caption: z.string().trim().max(500).optional(),
    isHighlight: z.boolean().optional(),
    state: z.enum(["published", "pending_approval", "rejected", "removed"]).optional(),
  })
  .refine(
    (v) =>
      v.caption !== undefined ||
      v.isHighlight !== undefined ||
      v.state !== undefined,
    { message: "Nothing to update." },
  );

export async function PATCH(req: Request, ctx: Ctx) {
  try {
    const { mediaId } = await ctx.params;
    const user = await getCurrentUser();
    if (!user) return jsonError("AUTH_REQUIRED", "Sign in to continue.", 401);

    const media = await prisma.media.findUnique({ where: { id: mediaId } });
    if (!media || media.state === "removed") {
      return jsonError("MEDIA_NOT_FOUND", "This photo is no longer available.", 404);
    }
    await assertEventMember(media.eventId, user.id);

    const body = patchSchema.parse(await req.json());
    if (body.isHighlight !== undefined || body.state !== undefined) {
      await assertOrganizer(media.eventId, user.id);
    } else if (media.uploaderId !== user.id) {
      await assertOrganizer(media.eventId, user.id);
    }

    const updated = await prisma.media.update({
      where: { id: mediaId },
      data: {
        ...(body.caption !== undefined ? { caption: body.caption } : {}),
        ...(body.isHighlight !== undefined ? { isHighlight: body.isHighlight } : {}),
        ...(body.state !== undefined ? { state: body.state } : {}),
      },
    });
    return jsonOk({
      media: {
        id: updated.id,
        caption: updated.caption,
        isHighlight: updated.isHighlight,
        state: updated.state,
      },
    });
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

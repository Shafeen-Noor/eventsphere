import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { assertCanUpload, assertEventMember } from "@/lib/events";
import { handleRouteError, jsonError, jsonOk } from "@/lib/http";
import { generateThumbIfImage } from "@/lib/media";
import { createDownloadUrl, objectExists } from "@/lib/storage";

type Ctx = { params: Promise<{ slug: string; mediaId: string }> };

export async function POST(_req: Request, ctx: Ctx) {
  try {
    const { slug, mediaId } = await ctx.params;
    const user = await getCurrentUser();
    if (!user) return jsonError("AUTH_REQUIRED", "Sign in to continue.", 401);

    const event = await prisma.event.findUnique({ where: { slug } });
    if (!event) return jsonError("EVENT_NOT_FOUND", "We can’t find this event.", 404);
    const membership = await assertEventMember(event.id, user.id);
    await assertCanUpload(event, user.id, membership);

    const media = await prisma.media.findFirst({
      where: { id: mediaId, eventId: event.id },
    });
    if (!media) return jsonError("MEDIA_NOT_FOUND", "This photo is no longer available.", 404);
    if (media.uploaderId !== user.id) {
      return jsonError("AUTH_FORBIDDEN", "You don’t have access to do that.", 403);
    }

    const exists = await objectExists(media.storageKey);
    if (!exists) {
      return jsonError("UPLOAD_INCOMPLETE", "Upload did not finish. Try again.", 400);
    }

    const thumb = await generateThumbIfImage({
      eventId: event.id,
      mediaId: media.id,
      storageKey: media.storageKey,
      contentType: media.contentType,
    });

    const updated = await prisma.media.update({
      where: { id: media.id },
      data: {
        state: "published",
        thumbKey: thumb?.thumbKey ?? null,
        width: thumb?.width ?? media.width,
        height: thumb?.height ?? media.height,
      },
      include: {
        uploader: { select: { id: true, displayName: true } },
      },
    });

    return jsonOk({
      media: {
        id: updated.id,
        type: updated.type,
        caption: updated.caption,
        url: await createDownloadUrl(updated.thumbKey || updated.storageKey),
        originalUrl: await createDownloadUrl(updated.storageKey),
        uploader: updated.uploader,
        createdAt: updated.createdAt.toISOString(),
      },
    });
  } catch (err) {
    return handleRouteError(err);
  }
}

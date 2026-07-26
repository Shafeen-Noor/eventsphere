import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { assertEventMember } from "@/lib/events";
import { handleRouteError, jsonError, jsonOk } from "@/lib/http";

type Ctx = { params: Promise<{ mediaId: string }> };

export async function POST(_req: Request, ctx: Ctx) {
  try {
    const { mediaId } = await ctx.params;
    const user = await getCurrentUser();
    if (!user) return jsonError("AUTH_REQUIRED", "Sign in to continue.", 401);

    const media = await prisma.media.findUnique({ where: { id: mediaId } });
    if (!media || media.state !== "published") {
      return jsonError("MEDIA_NOT_FOUND", "This photo is no longer available.", 404);
    }
    await assertEventMember(media.eventId, user.id);

    await prisma.mediaLike.upsert({
      where: { mediaId_userId: { mediaId, userId: user.id } },
      create: { mediaId, userId: user.id },
      update: {},
    });

    const likeCount = await prisma.mediaLike.count({ where: { mediaId } });
    return jsonOk({ liked: true, likeCount });
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

    await prisma.mediaLike.deleteMany({
      where: { mediaId, userId: user.id },
    });
    const likeCount = await prisma.mediaLike.count({ where: { mediaId } });
    return jsonOk({ liked: false, likeCount });
  } catch (err) {
    return handleRouteError(err);
  }
}

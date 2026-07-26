import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { assertEventMember } from "@/lib/events";
import { handleRouteError, jsonError, jsonOk } from "@/lib/http";

type Ctx = { params: Promise<{ mediaId: string }> };

const schema = z.object({
  body: z.string().trim().min(1).max(500),
});

export async function GET(_req: Request, ctx: Ctx) {
  try {
    const { mediaId } = await ctx.params;
    const user = await getCurrentUser();
    if (!user) return jsonError("AUTH_REQUIRED", "Sign in to continue.", 401);

    const media = await prisma.media.findUnique({
      where: { id: mediaId },
      include: { event: true },
    });
    if (!media || media.state !== "published") {
      return jsonError("MEDIA_NOT_FOUND", "This photo is no longer available.", 404);
    }
    await assertEventMember(media.eventId, user.id);

    const comments = await prisma.mediaComment.findMany({
      where: { mediaId },
      include: { user: { select: { id: true, displayName: true } } },
      orderBy: { createdAt: "asc" },
      take: 100,
    });

    return jsonOk({
      commentsEnabled: media.event.commentsEnabled,
      comments: comments.map((c) => ({
        id: c.id,
        body: c.body,
        createdAt: c.createdAt.toISOString(),
        user: c.user,
        isMine: c.userId === user.id,
      })),
    });
  } catch (err) {
    return handleRouteError(err);
  }
}

export async function POST(req: Request, ctx: Ctx) {
  try {
    const { mediaId } = await ctx.params;
    const user = await getCurrentUser();
    if (!user) return jsonError("AUTH_REQUIRED", "Sign in to continue.", 401);

    const media = await prisma.media.findUnique({
      where: { id: mediaId },
      include: { event: true },
    });
    if (!media || media.state !== "published") {
      return jsonError("MEDIA_NOT_FOUND", "This photo is no longer available.", 404);
    }
    if (!media.event.commentsEnabled) {
      return jsonError("CONFLICT_STATE", "Comments are turned off for this event.", 409);
    }
    await assertEventMember(media.eventId, user.id);

    const body = schema.parse(await req.json());
    const comment = await prisma.mediaComment.create({
      data: {
        mediaId,
        userId: user.id,
        body: body.body,
      },
      include: { user: { select: { id: true, displayName: true } } },
    });

    return jsonOk(
      {
        comment: {
          id: comment.id,
          body: comment.body,
          createdAt: comment.createdAt.toISOString(),
          user: comment.user,
          isMine: true,
        },
      },
      201,
    );
  } catch (err) {
    return handleRouteError(err);
  }
}

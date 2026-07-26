import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
  assertEventMember,
  canDownload,
  hasEventStarted,
  isEventExpired,
} from "@/lib/events";
import { handleRouteError, jsonError, jsonOk } from "@/lib/http";
import { createDownloadUrl } from "@/lib/storage";

type Ctx = { params: Promise<{ slug: string }> };

export async function GET(req: Request, ctx: Ctx) {
  try {
    const { slug } = await ctx.params;
    const user = await getCurrentUser();
    if (!user) return jsonError("AUTH_REQUIRED", "Sign in to continue.", 401);

    const event = await prisma.event.findUnique({ where: { slug } });
    if (!event) return jsonError("EVENT_NOT_FOUND", "We can’t find this event.", 404);
    const membership = await assertEventMember(event.id, user.id);
    const isOrg =
      membership.role === "organizer" || membership.role === "co_organizer";

    if (!isOrg && !hasEventStarted(event.startAt)) {
      return jsonError(
        "EVENT_NOT_STARTED",
        "The gallery opens when the event begins.",
        403,
      );
    }

    const download = await canDownload(event, user.id, membership);

    const url = new URL(req.url);
    const filter = url.searchParams.get("filter") || "all";
    const sort = url.searchParams.get("sort") || "newest";

    const where: {
      eventId: string;
      state: string;
      type?: string;
      uploaderId?: string;
    } = {
      eventId: event.id,
      state: "published",
    };
    if (filter === "photos") where.type = "image";
    if (filter === "videos") where.type = "video";
    if (filter === "mine") where.uploaderId = user.id;

    const media = await prisma.media.findMany({
      where,
      orderBy:
        sort === "oldest"
          ? { createdAt: "asc" }
          : sort === "liked"
            ? { likes: { _count: "desc" } }
            : { createdAt: "desc" },
      include: {
        uploader: { select: { id: true, displayName: true } },
        likes: { where: { userId: user.id }, select: { userId: true } },
        _count: { select: { likes: true, comments: true } },
      },
    });

    const items = await Promise.all(
      media.map(async (m) => {
        const preview = await createDownloadUrl(m.thumbKey || m.storageKey);
        const original = download.allowed
          ? await createDownloadUrl(m.storageKey)
          : null;
        return {
          id: m.id,
          type: m.type,
          caption: m.caption,
          width: m.width,
          height: m.height,
          byteSize: m.byteSize,
          contentType: m.contentType,
          createdAt: m.createdAt.toISOString(),
          uploader: m.uploader,
          likeCount: m._count.likes,
          commentCount: m._count.comments,
          likedByMe: m.likes.length > 0,
          isMine: m.uploaderId === user.id,
          canDelete: m.uploaderId === user.id || isOrg,
          canDownload: download.allowed,
          url: preview,
          originalUrl: original,
        };
      }),
    );

    return jsonOk({
      media: items,
      expiresAt: event.expiresAt.toISOString(),
      expired: isEventExpired(event.expiresAt),
      commentsEnabled: event.commentsEnabled,
      canDownload: download.allowed,
      downloadBlockedReason: download.reason,
      atmosphere: event.atmosphere,
      serverTime: new Date().toISOString(),
    });
  } catch (err) {
    return handleRouteError(err);
  }
}

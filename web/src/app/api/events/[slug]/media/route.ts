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

    // Members can browse during countdown; hub is phase-aware.
    void hasEventStarted;

    const download = await canDownload(event, user.id, membership);

    const url = new URL(req.url);
    const filter = url.searchParams.get("filter") || "all";
    const sort = url.searchParams.get("sort") || "newest";

    const closed =
      isEventExpired(event.expiresAt) || event.state === "ended";

    const where: {
      eventId: string;
      state?: string | { in: string[] };
      type?: string;
      uploaderId?: string;
      isHighlight?: boolean;
      OR?: Array<Record<string, unknown>>;
    } = {
      eventId: event.id,
    };

    if (filter === "pending" && isOrg) {
      where.state = "pending_approval";
    } else if (isOrg) {
      where.state = { in: ["published", "pending_approval"] };
    } else if (filter === "mine") {
      // Guests always see their own uploads immediately (even while pending).
      where.uploaderId = user.id;
      where.state = { in: ["published", "pending_approval"] };
    } else if (filter === "highlights") {
      // Guests only see the collage after the host publishes it.
      if (!isOrg && !event.highlightsPublished) {
        return jsonOk({
          media: [],
          expiresAt: event.expiresAt.toISOString(),
          expired: closed,
          commentsEnabled: event.commentsEnabled,
          canDownload: download.allowed,
          downloadBlockedReason: download.reason,
          atmosphere: event.atmosphere,
          highlightsPublished: false,
          highlightTemplate: event.highlightTemplate || "ig8",
          highlightFilter: event.highlightFilter || "none",
          canCurateHighlights: false,
          pendingCount: 0,
          guestVisibility: event.guestVisibility,
          requireApproval: event.requireApproval,
          publishMessage: event.publishMessage,
          serverTime: new Date().toISOString(),
        });
      }
      where.isHighlight = true;
      where.state = "published";
    } else {
      // Guests: always include own photos + published media per visibility.
      where.state = "published";
    }

    if (filter === "photos") where.type = "image";
    if (filter === "videos") where.type = "video";
    if (filter === "highlights" && isOrg) where.isHighlight = true;
    if (filter === "mine" && isOrg) where.uploaderId = user.id;

    // Guest visibility rules (non-org, non-mine/highlights already handled above)
    if (!isOrg && filter !== "mine" && filter !== "highlights") {
      const visibility = event.guestVisibility || "own_only";
      const own = {
        uploaderId: user.id,
        state: { in: ["published", "pending_approval"] },
      };

      if (visibility === "own_only") {
        if (event.highlightsPublished) {
          where.OR = [own, { isHighlight: true, state: "published" }];
          delete where.state;
          delete where.uploaderId;
        } else {
          where.uploaderId = user.id;
          where.state = { in: ["published", "pending_approval"] };
        }
      } else {
        // approved_public / all_members: everyone else's published + own (incl. pending)
        where.OR = [own, { state: "published" }];
        delete where.state;
      }

      if (closed && event.highlightsPublished && filter === "all") {
        where.OR = [
          { uploaderId: user.id, state: { in: ["published", "pending_approval"] } },
          { isHighlight: true, state: "published" },
        ];
        delete where.state;
        delete where.uploaderId;
      }
    }

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
          state: m.state,
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
          isHighlight: m.isHighlight,
          url: preview,
          originalUrl: original,
        };
      }),
    );

    const pendingCount = isOrg
      ? await prisma.media.count({
          where: { eventId: event.id, state: "pending_approval" },
        })
      : 0;

    return jsonOk({
      media: items,
      expiresAt: event.expiresAt.toISOString(),
      expired: closed,
      commentsEnabled: event.commentsEnabled,
      canDownload: download.allowed,
      downloadBlockedReason: download.reason,
      atmosphere: event.atmosphere,
      highlightsPublished: event.highlightsPublished,
      highlightTemplate: event.highlightTemplate || "mosaic",
      highlightFilter: event.highlightFilter || "none",
      canCurateHighlights: isOrg,
      pendingCount,
      guestVisibility: event.guestVisibility,
      requireApproval: event.requireApproval,
      publishMessage: event.publishMessage,
      serverTime: new Date().toISOString(),
    });
  } catch (err) {
    return handleRouteError(err);
  }
}

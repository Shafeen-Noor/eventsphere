import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { assertEventMember, assertOrganizer } from "@/lib/events";
import { addFeedItem } from "@/lib/feed";
import { handleRouteError, jsonError, jsonOk } from "@/lib/http";
import { createDownloadUrl } from "@/lib/storage";

type Ctx = { params: Promise<{ slug: string }> };

const postSchema = z.object({
  mediaId: z.string().min(1),
  hours: z.number().min(0.25).max(72).optional().default(1),
});

export async function GET(_req: Request, ctx: Ctx) {
  try {
    const { slug } = await ctx.params;
    const user = await getCurrentUser();
    if (!user) return jsonError("AUTH_REQUIRED", "Sign in to continue.", 401);

    const event = await prisma.event.findUnique({
      where: { slug },
      include: {
        featuredMedia: {
          include: {
            uploader: { select: { id: true, displayName: true } },
          },
        },
      },
    });
    if (!event) return jsonError("EVENT_NOT_FOUND", "We can’t find this event.", 404);
    await assertEventMember(event.id, user.id);

    const now = Date.now();
    const active =
      event.featuredMedia &&
      event.featuredUntil &&
      event.featuredUntil.getTime() > now
        ? event.featuredMedia
        : null;

    if (!active) {
      return jsonOk({
        luckyHour: null,
        featuredUntil: null,
      });
    }

    return jsonOk({
      luckyHour: {
        id: active.id,
        caption: active.caption,
        type: active.type,
        url: await createDownloadUrl(active.thumbKey || active.storageKey),
        originalUrl: await createDownloadUrl(active.storageKey),
        uploader: active.uploader,
        createdAt: active.createdAt.toISOString(),
      },
      featuredUntil: event.featuredUntil?.toISOString() ?? null,
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

    const body = postSchema.parse(await req.json());
    const media = await prisma.media.findFirst({
      where: { id: body.mediaId, eventId: event.id, state: "published" },
      include: {
        uploader: { select: { id: true, displayName: true } },
      },
    });
    if (!media) {
      return jsonError("MEDIA_NOT_FOUND", "This photo is no longer available.", 404);
    }

    const featuredUntil = new Date(Date.now() + body.hours * 60 * 60 * 1000);

    await prisma.$transaction([
      prisma.event.update({
        where: { id: event.id },
        data: {
          featuredMediaId: media.id,
          featuredUntil,
        },
      }),
      prisma.media.update({
        where: { id: media.id },
        data: { featuredUntil },
      }),
    ]);

    await addFeedItem({
      eventId: event.id,
      type: "featured",
      actorId: user.id,
      mediaId: media.id,
      title: "Lucky hour",
      body: "A photo was featured for lucky hour.",
    });

    return jsonOk({
      luckyHour: {
        id: media.id,
        caption: media.caption,
        type: media.type,
        url: await createDownloadUrl(media.thumbKey || media.storageKey),
        originalUrl: await createDownloadUrl(media.storageKey),
        uploader: media.uploader,
        createdAt: media.createdAt.toISOString(),
      },
      featuredUntil: featuredUntil.toISOString(),
    });
  } catch (err) {
    return handleRouteError(err);
  }
}

import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { assertEventMember, assertOrganizer } from "@/lib/events";
import { handleRouteError, jsonError, jsonOk } from "@/lib/http";
import { getPlan } from "@/lib/plans";

type Ctx = { params: Promise<{ slug: string }> };

const createSchema = z.object({
  label: z.string().trim().min(1).max(80),
});

const tagSchema = z.object({
  collectionId: z.string().min(1),
  mediaId: z.string().min(1),
  userId: z.string().min(1).optional().nullable(),
  confidence: z.number().min(0).max(1).optional().default(0),
  boxJson: z.string().max(2000).optional().default(""),
});

async function serializeFaces(eventId: string) {
  const collections = await prisma.faceCollection.findMany({
    where: { eventId },
    include: {
      tags: {
        include: {
          user: { select: { id: true, displayName: true } },
          media: { select: { id: true, thumbKey: true, storageKey: true } },
        },
        orderBy: { createdAt: "desc" },
      },
      _count: { select: { tags: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return collections.map((c) => ({
    id: c.id,
    label: c.label,
    createdAt: c.createdAt.toISOString(),
    tagCount: c._count.tags,
    tags: c.tags.map((t) => ({
      id: t.id,
      mediaId: t.mediaId,
      userId: t.userId,
      confidence: t.confidence,
      boxJson: t.boxJson,
      createdAt: t.createdAt.toISOString(),
      user: t.user,
    })),
  }));
}

export async function GET(_req: Request, ctx: Ctx) {
  try {
    const { slug } = await ctx.params;
    const user = await getCurrentUser();
    if (!user) return jsonError("AUTH_REQUIRED", "Sign in to continue.", 401);

    const event = await prisma.event.findUnique({ where: { slug } });
    if (!event) return jsonError("EVENT_NOT_FOUND", "We can’t find this event.", 404);
    await assertEventMember(event.id, user.id);

    if (!getPlan(event.planTier).features.faces) {
      return jsonError(
        "PLAN_REQUIRED",
        "Face grouping is available on Premium and above.",
        402,
      );
    }

    return jsonOk({ collections: await serializeFaces(event.id) });
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
    await assertEventMember(event.id, user.id);

    if (!getPlan(event.planTier).features.faces) {
      return jsonError(
        "PLAN_REQUIRED",
        "Face grouping is available on Premium and above.",
        402,
      );
    }

    const raw = await req.json();

    if (raw && typeof raw === "object" && "collectionId" in raw) {
      const body = tagSchema.parse(raw);
      const collection = await prisma.faceCollection.findFirst({
        where: { id: body.collectionId, eventId: event.id },
      });
      if (!collection) {
        return jsonError(
          "FACE_COLLECTION_NOT_FOUND",
          "That face group wasn’t found.",
          404,
        );
      }

      const media = await prisma.media.findFirst({
        where: { id: body.mediaId, eventId: event.id },
      });
      if (!media) {
        return jsonError("MEDIA_NOT_FOUND", "This photo is no longer available.", 404);
      }

      await prisma.faceTag.create({
        data: {
          collectionId: collection.id,
          mediaId: media.id,
          userId: body.userId || user.id,
          confidence: body.confidence ?? 0,
          boxJson: body.boxJson ?? "",
        },
      });

      return jsonOk({ collections: await serializeFaces(event.id) }, 201);
    }

    await assertOrganizer(event.id, user.id);
    const body = createSchema.parse(raw);
    await prisma.faceCollection.create({
      data: {
        eventId: event.id,
        label: body.label,
      },
    });

    return jsonOk({ collections: await serializeFaces(event.id) }, 201);
  } catch (err) {
    return handleRouteError(err);
  }
}

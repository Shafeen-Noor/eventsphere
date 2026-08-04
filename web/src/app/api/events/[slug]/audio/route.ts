import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { assertEventMember } from "@/lib/events";
import { addFeedItem } from "@/lib/feed";
import { handleRouteError, jsonError, jsonOk } from "@/lib/http";
import { getPlan } from "@/lib/plans";
import { createDownloadUrl } from "@/lib/storage";

type Ctx = { params: Promise<{ slug: string }> };

const postSchema = z.object({
  storageKey: z.string().trim().min(1).max(500),
  contentType: z.string().trim().min(1).max(120).default("audio/webm"),
  byteSize: z.number().int().min(0).max(50_000_000).optional().default(0),
  durationMs: z.number().int().min(0).max(600_000).optional().default(0),
  caption: z.string().trim().max(300).optional().default(""),
});

export async function GET(_req: Request, ctx: Ctx) {
  try {
    const { slug } = await ctx.params;
    const user = await getCurrentUser();
    if (!user) return jsonError("AUTH_REQUIRED", "Sign in to continue.", 401);

    const event = await prisma.event.findUnique({ where: { slug } });
    if (!event) return jsonError("EVENT_NOT_FOUND", "We can’t find this event.", 404);
    await assertEventMember(event.id, user.id);

    if (!getPlan(event.planTier).features.audioMemories) {
      return jsonError(
        "PLAN_REQUIRED",
        "Audio memories are available on Essential and above.",
        402,
      );
    }

    const memories = await prisma.audioMemory.findMany({
      where: { eventId: event.id },
      include: { user: { select: { id: true, displayName: true } } },
      orderBy: { createdAt: "desc" },
    });

    return jsonOk({
      memories: await Promise.all(
        memories.map(async (m) => ({
          id: m.id,
          caption: m.caption,
          contentType: m.contentType,
          byteSize: m.byteSize,
          durationMs: m.durationMs,
          storageKey: m.storageKey,
          url: await createDownloadUrl(m.storageKey),
          createdAt: m.createdAt.toISOString(),
          user: m.user,
          isMe: m.userId === user.id,
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
    await assertEventMember(event.id, user.id);

    if (!getPlan(event.planTier).features.audioMemories) {
      return jsonError(
        "PLAN_REQUIRED",
        "Audio memories are available on Essential and above.",
        402,
      );
    }

    const body = postSchema.parse(await req.json());
    if (!body.storageKey.startsWith(`events/${event.id}/`)) {
      return jsonError(
        "STORAGE_KEY_INVALID",
        "Audio must be uploaded under this event’s storage prefix.",
        422,
      );
    }

    const memory = await prisma.audioMemory.create({
      data: {
        eventId: event.id,
        userId: user.id,
        storageKey: body.storageKey,
        contentType: body.contentType,
        byteSize: body.byteSize ?? 0,
        durationMs: body.durationMs ?? 0,
        caption: body.caption ?? "",
      },
      include: { user: { select: { id: true, displayName: true } } },
    });

    await addFeedItem({
      eventId: event.id,
      type: "audio",
      actorId: user.id,
      title: "Audio memory",
      body: memory.caption || "Shared a voice note",
      payload: { audioId: memory.id },
    });

    return jsonOk(
      {
        memory: {
          id: memory.id,
          caption: memory.caption,
          contentType: memory.contentType,
          byteSize: memory.byteSize,
          durationMs: memory.durationMs,
          storageKey: memory.storageKey,
          url: await createDownloadUrl(memory.storageKey),
          createdAt: memory.createdAt.toISOString(),
          user: memory.user,
          isMe: true,
        },
      },
      201,
    );
  } catch (err) {
    return handleRouteError(err);
  }
}

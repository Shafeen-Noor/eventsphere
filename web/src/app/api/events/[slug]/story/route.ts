import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { assertEventMember, assertOrganizer } from "@/lib/events";
import { handleRouteError, jsonError, jsonOk } from "@/lib/http";
import { getPlan } from "@/lib/plans";

type Ctx = { params: Promise<{ slug: string }> };

const chapterSchema = z.object({
  title: z.string().trim().min(1).max(120),
  body: z.string().trim().max(4000).optional().default(""),
  mediaIds: z.array(z.string().min(1)).max(50).optional().default([]),
  sortOrder: z.number().int().optional(),
});

const replaceSchema = z.array(chapterSchema).max(50);

function parseMediaIds(raw: string): string[] {
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed)
      ? parsed.filter((id): id is string => typeof id === "string")
      : [];
  } catch {
    return [];
  }
}

export async function GET(_req: Request, ctx: Ctx) {
  try {
    const { slug } = await ctx.params;
    const user = await getCurrentUser();
    if (!user) return jsonError("AUTH_REQUIRED", "Sign in to continue.", 401);

    const event = await prisma.event.findUnique({ where: { slug } });
    if (!event) return jsonError("EVENT_NOT_FOUND", "We can’t find this event.", 404);
    await assertEventMember(event.id, user.id);

    const chapters = await prisma.storyChapter.findMany({
      where: { eventId: event.id },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    });

    return jsonOk({
      chapters: chapters.map((c) => ({
        id: c.id,
        title: c.title,
        body: c.body,
        mediaIds: parseMediaIds(c.mediaIds),
        sortOrder: c.sortOrder,
        createdAt: c.createdAt.toISOString(),
      })),
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

    if (!getPlan(event.planTier).features.timeline) {
      return jsonError(
        "PLAN_REQUIRED",
        "Story chapters are available on Essential and above.",
        402,
      );
    }

    const chapters = replaceSchema.parse(await req.json());

    await prisma.$transaction(async (tx) => {
      await tx.storyChapter.deleteMany({ where: { eventId: event.id } });
      if (chapters.length) {
        await tx.storyChapter.createMany({
          data: chapters.map((chapter, index) => ({
            eventId: event.id,
            title: chapter.title,
            body: chapter.body ?? "",
            mediaIds: JSON.stringify(chapter.mediaIds ?? []),
            sortOrder: chapter.sortOrder ?? index,
          })),
        });
      }
    });

    const saved = await prisma.storyChapter.findMany({
      where: { eventId: event.id },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    });

    return jsonOk({
      chapters: saved.map((c) => ({
        id: c.id,
        title: c.title,
        body: c.body,
        mediaIds: parseMediaIds(c.mediaIds),
        sortOrder: c.sortOrder,
        createdAt: c.createdAt.toISOString(),
      })),
    });
  } catch (err) {
    return handleRouteError(err);
  }
}

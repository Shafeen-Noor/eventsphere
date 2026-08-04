import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { assertEventMember, assertOrganizer } from "@/lib/events";
import { handleRouteError, jsonError, jsonOk } from "@/lib/http";
import { getPlan } from "@/lib/plans";

type Ctx = { params: Promise<{ slug: string }> };

const itemSchema = z.object({
  title: z.string().trim().min(1).max(120),
  description: z.string().trim().max(500).optional().default(""),
  location: z.string().trim().max(120).optional().default(""),
  startsAt: z.string().datetime().nullable().optional(),
  endsAt: z.string().datetime().nullable().optional(),
  sortOrder: z.number().int().optional(),
});

const replaceSchema = z.array(itemSchema).max(100);

export async function GET(_req: Request, ctx: Ctx) {
  try {
    const { slug } = await ctx.params;
    const user = await getCurrentUser();
    if (!user) return jsonError("AUTH_REQUIRED", "Sign in to continue.", 401);

    const event = await prisma.event.findUnique({ where: { slug } });
    if (!event) return jsonError("EVENT_NOT_FOUND", "We can’t find this event.", 404);
    await assertEventMember(event.id, user.id);

    const items = await prisma.scheduleItem.findMany({
      where: { eventId: event.id },
      include: { _count: { select: { media: true } } },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    });

    return jsonOk({
      items: items.map((item) => ({
        id: item.id,
        title: item.title,
        description: item.description,
        location: item.location,
        startsAt: item.startsAt?.toISOString() ?? null,
        endsAt: item.endsAt?.toISOString() ?? null,
        sortOrder: item.sortOrder,
        mediaCount: item._count.media,
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
        "Schedule is available on Essential and above.",
        402,
      );
    }

    const items = replaceSchema.parse(await req.json());

    await prisma.$transaction(async (tx) => {
      await tx.media.updateMany({
        where: { eventId: event.id, scheduleItemId: { not: null } },
        data: { scheduleItemId: null },
      });
      await tx.scheduleItem.deleteMany({ where: { eventId: event.id } });
      if (items.length) {
        await tx.scheduleItem.createMany({
          data: items.map((item, index) => ({
            eventId: event.id,
            title: item.title,
            description: item.description ?? "",
            location: item.location ?? "",
            startsAt: item.startsAt ? new Date(item.startsAt) : null,
            endsAt: item.endsAt ? new Date(item.endsAt) : null,
            sortOrder: item.sortOrder ?? index,
          })),
        });
      }
    });

    const saved = await prisma.scheduleItem.findMany({
      where: { eventId: event.id },
      include: { _count: { select: { media: true } } },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    });

    return jsonOk({
      items: saved.map((item) => ({
        id: item.id,
        title: item.title,
        description: item.description,
        location: item.location,
        startsAt: item.startsAt?.toISOString() ?? null,
        endsAt: item.endsAt?.toISOString() ?? null,
        sortOrder: item.sortOrder,
        mediaCount: item._count.media,
      })),
    });
  } catch (err) {
    return handleRouteError(err);
  }
}

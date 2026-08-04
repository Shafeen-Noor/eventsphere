import { getCurrentUser } from "@/lib/auth";
import { generateEventRecap } from "@/lib/ai";
import { prisma } from "@/lib/db";
import { assertEventMember, assertOrganizer } from "@/lib/events";
import { handleRouteError, jsonError, jsonOk } from "@/lib/http";
import { getPlan } from "@/lib/plans";

type Ctx = { params: Promise<{ slug: string }> };

async function buildRecapInput(event: {
  id: string;
  title: string;
  eventType: string;
  useCase: string;
}) {
  const [guestCount, mediaCount, guestbook, highlights] = await Promise.all([
    prisma.membership.count({
      where: { eventId: event.id, status: "active" },
    }),
    prisma.media.count({
      where: { eventId: event.id, state: "published" },
    }),
    prisma.guestbookEntry.findMany({
      where: { eventId: event.id },
      orderBy: { createdAt: "desc" },
      take: 8,
      select: { body: true },
    }),
    prisma.media.findMany({
      where: { eventId: event.id, state: "published", isHighlight: true },
      orderBy: { createdAt: "desc" },
      take: 8,
      select: { caption: true, aiCaption: true },
    }),
  ]);

  return {
    eventTitle: event.title,
    eventType: event.eventType || event.useCase,
    guestCount,
    mediaCount,
    guestbookSnippets: guestbook.map((g) => g.body),
    highlightCaptions: highlights
      .map((h) => h.aiCaption || h.caption)
      .filter(Boolean),
  };
}

export async function GET(_req: Request, ctx: Ctx) {
  try {
    const { slug } = await ctx.params;
    const user = await getCurrentUser();
    if (!user) return jsonError("AUTH_REQUIRED", "Sign in to continue.", 401);

    const event = await prisma.event.findUnique({ where: { slug } });
    if (!event) return jsonError("EVENT_NOT_FOUND", "We can’t find this event.", 404);
    await assertEventMember(event.id, user.id);

    if (!getPlan(event.planTier).features.ai) {
      return jsonError(
        "PLAN_REQUIRED",
        "AI recap is available on Premium and above.",
        402,
      );
    }

    const recap = await prisma.eventRecap.findUnique({
      where: { eventId: event.id },
    });

    return jsonOk({
      recap: recap
        ? {
            summary: recap.summary,
            highlights: (() => {
              try {
                return JSON.parse(recap.highlights);
              } catch {
                return [];
              }
            })(),
            createdAt: recap.createdAt.toISOString(),
            updatedAt: recap.updatedAt.toISOString(),
          }
        : null,
    });
  } catch (err) {
    return handleRouteError(err);
  }
}

export async function POST(_req: Request, ctx: Ctx) {
  try {
    const { slug } = await ctx.params;
    const user = await getCurrentUser();
    if (!user) return jsonError("AUTH_REQUIRED", "Sign in to continue.", 401);

    const event = await prisma.event.findUnique({ where: { slug } });
    if (!event) return jsonError("EVENT_NOT_FOUND", "We can’t find this event.", 404);
    await assertOrganizer(event.id, user.id);

    if (!getPlan(event.planTier).features.ai) {
      return jsonError(
        "PLAN_REQUIRED",
        "AI recap is available on Premium and above.",
        402,
      );
    }

    const input = await buildRecapInput(event);
    const summary = await generateEventRecap(input);
    const highlights = input.highlightCaptions ?? [];

    const recap = await prisma.eventRecap.upsert({
      where: { eventId: event.id },
      create: {
        eventId: event.id,
        summary,
        highlights: JSON.stringify(highlights),
      },
      update: {
        summary,
        highlights: JSON.stringify(highlights),
      },
    });

    return jsonOk({
      recap: {
        summary: recap.summary,
        highlights,
        createdAt: recap.createdAt.toISOString(),
        updatedAt: recap.updatedAt.toISOString(),
      },
    });
  } catch (err) {
    return handleRouteError(err);
  }
}

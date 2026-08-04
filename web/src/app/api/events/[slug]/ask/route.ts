import { z } from "zod";
import { askAboutEvent } from "@/lib/ai";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { assertEventMember } from "@/lib/events";
import { handleRouteError, jsonError, jsonOk } from "@/lib/http";
import { getPlan } from "@/lib/plans";

type Ctx = { params: Promise<{ slug: string }> };

const schema = z.object({
  question: z.string().trim().min(1).max(500),
});

export async function POST(req: Request, ctx: Ctx) {
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
        "AI Q&A is available on Premium and above.",
        402,
      );
    }

    const body = schema.parse(await req.json());

    const [guestCount, mediaCount, schedule, recap] = await Promise.all([
      prisma.membership.count({
        where: { eventId: event.id, status: "active" },
      }),
      prisma.media.count({
        where: { eventId: event.id, state: "published" },
      }),
      prisma.scheduleItem.findMany({
        where: { eventId: event.id },
        orderBy: { sortOrder: "asc" },
        take: 12,
        select: { title: true, startsAt: true, location: true },
      }),
      prisma.eventRecap.findUnique({ where: { eventId: event.id } }),
    ]);

    const scheduleSummary = schedule
      .map((s) => {
        const when = s.startsAt ? s.startsAt.toISOString() : "";
        return [s.title, when, s.location].filter(Boolean).join(" · ");
      })
      .join("; ");

    const answer = await askAboutEvent({
      question: body.question,
      eventTitle: event.title,
      eventType: event.eventType || event.useCase,
      locationName: event.locationName,
      startAt: event.startAt?.toISOString() ?? null,
      guestCount,
      mediaCount,
      scheduleSummary: scheduleSummary || null,
      recapSummary: recap?.summary || null,
    });

    return jsonOk({
      question: body.question,
      answer,
    });
  } catch (err) {
    return handleRouteError(err);
  }
}

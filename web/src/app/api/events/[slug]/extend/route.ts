import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { assertOrganizer, publicEventDto } from "@/lib/events";
import { addFeedItem } from "@/lib/feed";
import { handleRouteError, jsonError, jsonOk } from "@/lib/http";
import { EXTENSION_MONTH_CENTS } from "@/lib/plans";

type Ctx = { params: Promise<{ slug: string }> };

const schema = z.object({
  confirmPayment: z.boolean().optional().default(false),
  months: z.number().int().min(1).max(24),
});

export async function POST(req: Request, ctx: Ctx) {
  try {
    const { slug } = await ctx.params;
    const user = await getCurrentUser();
    if (!user) return jsonError("AUTH_REQUIRED", "Sign in to continue.", 401);

    const event = await prisma.event.findUnique({ where: { slug } });
    if (!event) return jsonError("EVENT_NOT_FOUND", "We can’t find this event.", 404);
    await assertOrganizer(event.id, user.id);

    const body = schema.parse(await req.json().catch(() => ({})));
    const amountCents = body.months * EXTENSION_MONTH_CENTS;

    if (!body.confirmPayment) {
      return jsonError(
        "PAYMENT_REQUIRED",
        `Confirm payment of $${(amountCents / 100).toFixed(0)} to extend ${body.months} month${body.months === 1 ? "" : "s"}.`,
        402,
        { amountCents, months: body.months, perMonthCents: EXTENSION_MONTH_CENTS },
      );
    }

    const base = Math.max(event.expiresAt.getTime(), Date.now());
    const expiresAt = new Date(base + body.months * 30 * 24 * 60 * 60 * 1000);
    const retentionHours = Math.max(
      event.retentionHours,
      Math.ceil((expiresAt.getTime() - Date.now()) / (60 * 60 * 1000)),
    );

    const updated = await prisma.event.update({
      where: { id: event.id },
      data: {
        expiresAt,
        retentionHours,
        state: event.state === "expired" || event.state === "ended" ? "live" : event.state,
      },
    });

    await addFeedItem({
      eventId: event.id,
      type: "extend",
      actorId: user.id,
      title: "Event extended",
      body: `Gallery extended by ${body.months} month${body.months === 1 ? "" : "s"}.`,
    });

    return jsonOk({
      event: publicEventDto(updated),
      amountCents,
      months: body.months,
      expiresAt: updated.expiresAt.toISOString(),
    });
  } catch (err) {
    return handleRouteError(err);
  }
}

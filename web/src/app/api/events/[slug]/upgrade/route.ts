import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { assertOrganizer, publicEventDto } from "@/lib/events";
import { addFeedItem } from "@/lib/feed";
import { handleRouteError, jsonError, jsonOk } from "@/lib/http";
import {
  applyPlanLimitsToEvent,
  EXTENSION_MONTH_CENTS,
  getPlan,
} from "@/lib/plans";

type Ctx = { params: Promise<{ slug: string }> };

const schema = z.object({
  planTier: z.enum(["essential", "premium"]),
  confirmPayment: z.boolean().optional().default(false),
  extendMonths: z.number().int().min(0).max(24).optional().default(0),
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
    const plan = getPlan(body.planTier);
    const extendMonths = body.extendMonths ?? 0;
    const amountCents =
      plan.priceCents + extendMonths * EXTENSION_MONTH_CENTS;

    if (!body.confirmPayment) {
      return jsonError(
        "PAYMENT_REQUIRED",
        `Confirm payment of $${(amountCents / 100).toFixed(0)} to upgrade to ${plan.label}.`,
        402,
        { amountCents, planTier: plan.id, extendMonths },
      );
    }

    const limits = applyPlanLimitsToEvent(
      { ...event, planTier: body.planTier },
      body.planTier,
    );

    let expiresAt = event.expiresAt;
    if (extendMonths > 0) {
      expiresAt = new Date(
        Math.max(expiresAt.getTime(), Date.now()) +
          extendMonths * 30 * 24 * 60 * 60 * 1000,
      );
    } else {
      const fromRetention = new Date(
        Date.now() + limits.retentionHours * 60 * 60 * 1000,
      );
      if (fromRetention.getTime() > expiresAt.getTime()) {
        expiresAt = fromRetention;
      }
    }

    const updated = await prisma.event.update({
      where: { id: event.id },
      data: {
        planTier: limits.planTier,
        maxGuests: limits.maxGuests,
        maxMedia: limits.maxMedia,
        retentionHours: limits.retentionHours,
        whiteLabel: Boolean(limits.whiteLabel),
        billingMode: "subscription",
        expiresAt,
      },
    });

    await addFeedItem({
      eventId: event.id,
      type: "upgrade",
      actorId: user.id,
      title: `Upgraded to ${plan.label}`,
      body: `${user.displayName} upgraded this event to ${plan.label}.`,
    });

    return jsonOk({
      event: publicEventDto(updated),
      amountCents,
      planTier: updated.planTier,
    });
  } catch (err) {
    return handleRouteError(err);
  }
}

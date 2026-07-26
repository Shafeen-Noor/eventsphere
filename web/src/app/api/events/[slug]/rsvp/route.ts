import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { assertEventMember } from "@/lib/events";
import { handleRouteError, jsonError, jsonOk } from "@/lib/http";

type Ctx = { params: Promise<{ slug: string }> };

const schema = z.object({
  status: z.enum(["going", "maybe", "declined"]),
  plusOnes: z.number().int().min(0).max(10).optional().default(0),
  note: z.string().trim().max(200).optional().default(""),
});

export async function GET(_req: Request, ctx: Ctx) {
  try {
    const { slug } = await ctx.params;
    const user = await getCurrentUser();
    if (!user) return jsonError("AUTH_REQUIRED", "Sign in to continue.", 401);

    const event = await prisma.event.findUnique({ where: { slug } });
    if (!event) return jsonError("EVENT_NOT_FOUND", "We can’t find this event.", 404);
    await assertEventMember(event.id, user.id);

    const rsvps = await prisma.rsvp.findMany({
      where: { eventId: event.id },
      include: { user: { select: { id: true, displayName: true } } },
      orderBy: { updatedAt: "desc" },
    });

    const summary = {
      going: rsvps.filter((r) => r.status === "going").length,
      maybe: rsvps.filter((r) => r.status === "maybe").length,
      declined: rsvps.filter((r) => r.status === "declined").length,
    };

    return jsonOk({
      enabled: event.rsvpEnabled,
      allowPlusOnes: event.allowPlusOnes,
      maxPlusOnes: event.maxPlusOnes,
      summary,
      rsvps: rsvps.map((r) => ({
        userId: r.user.id,
        displayName: r.user.displayName,
        status: r.status,
        plusOnes: r.plusOnes,
        note: r.note,
        isMe: r.user.id === user.id,
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
    if (!event.rsvpEnabled) {
      return jsonError("CONFLICT_STATE", "RSVP is not enabled for this event.", 409);
    }
    await assertEventMember(event.id, user.id);

    const body = schema.parse(await req.json());
    let plusOnes = body.plusOnes ?? 0;
    if (!event.allowPlusOnes || body.status !== "going") {
      plusOnes = 0;
    } else if (plusOnes > event.maxPlusOnes) {
      return jsonError(
        "VAL_PLUS_ONES",
        `Plus-ones are limited to ${event.maxPlusOnes}.`,
        422,
      );
    }

    const rsvp = await prisma.rsvp.upsert({
      where: { eventId_userId: { eventId: event.id, userId: user.id } },
      create: {
        eventId: event.id,
        userId: user.id,
        status: body.status,
        plusOnes,
        note: body.note,
      },
      update: {
        status: body.status,
        plusOnes,
        note: body.note,
      },
    });

    return jsonOk({
      rsvp: {
        status: rsvp.status,
        plusOnes: rsvp.plusOnes,
        note: rsvp.note,
      },
    });
  } catch (err) {
    return handleRouteError(err);
  }
}

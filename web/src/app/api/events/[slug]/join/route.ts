import { z } from "zod";
import { ensureUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
  hashPasscode,
  isEventExpired,
  publicEventDto,
} from "@/lib/events";
import { getPlan } from "@/lib/plans";
import { handleRouteError, jsonError, jsonOk } from "@/lib/http";

const schema = z.object({
  displayName: z.string().trim().min(1).max(40),
  passcode: z.string().trim().optional().nullable(),
  rsvpStatus: z.enum(["going", "maybe", "declined"]).optional().nullable(),
  plusOnes: z.number().int().min(0).max(10).optional().default(0),
  contactEmail: z.string().trim().email().max(120).optional().nullable().or(z.literal("")),
  contactWhatsapp: z.string().trim().max(32).optional().nullable().or(z.literal("")),
  notificationsOptIn: z.boolean().optional().default(true),
});

type Ctx = { params: Promise<{ slug: string }> };

export async function POST(req: Request, ctx: Ctx) {
  try {
    const { slug } = await ctx.params;
    const body = schema.parse(await req.json());

    const event = await prisma.event.findUnique({ where: { slug } });
    if (!event) {
      return jsonError("EVENT_NOT_FOUND", "We can’t find this event.", 404);
    }
    if (isEventExpired(event.expiresAt)) {
      return jsonError("EVENT_EXPIRED", "This gallery has expired.", 410);
    }
    if (event.passcodeHash) {
      if (!body.passcode || hashPasscode(body.passcode) !== event.passcodeHash) {
        return jsonError("PASSCODE_INVALID", "That passcode isn’t correct.", 403);
      }
    }

    const plan = getPlan(event.planTier);
    const user = await ensureUser(body.displayName);

    const existing = await prisma.membership.findUnique({
      where: { eventId_userId: { eventId: event.id, userId: user.id } },
    });

    if (!existing || existing.status !== "active") {
      const guestCount = await prisma.membership.count({
        where: {
          eventId: event.id,
          status: "active",
          role: { notIn: ["organizer", "co_organizer"] },
        },
      });
      const isOwner = event.ownerId === user.id;
      if (!isOwner && guestCount >= event.maxGuests) {
        return jsonError(
          "GUEST_CAP",
          `This event is full (${event.maxGuests} guests).`,
          403,
        );
      }
    }

    const collectContacts = plan.limits.canCollectContacts;
    const contactEmail =
      collectContacts && body.contactEmail ? body.contactEmail : null;
    const contactWhatsapp =
      collectContacts && body.contactWhatsapp ? body.contactWhatsapp : null;

    if (collectContacts && !contactEmail && !contactWhatsapp) {
      return jsonError(
        "CONTACT_REQUIRED",
        "Add an email or WhatsApp number so the host can send updates.",
        422,
      );
    }

    const membership = await prisma.membership.upsert({
      where: { eventId_userId: { eventId: event.id, userId: user.id } },
      create: {
        eventId: event.id,
        userId: user.id,
        role: event.ownerId === user.id ? "organizer" : "guest",
        status: "active",
        canUpload: true,
        canDownload: true,
        contactEmail,
        contactWhatsapp,
        notificationsOptIn: body.notificationsOptIn ?? true,
      },
      update: {
        status: "active",
        ...(contactEmail !== null ? { contactEmail } : {}),
        ...(contactWhatsapp !== null ? { contactWhatsapp } : {}),
        notificationsOptIn: body.notificationsOptIn ?? true,
      },
    });

    let rsvp = null;
    if (event.rsvpEnabled && body.rsvpStatus) {
      let plusOnes = body.plusOnes ?? 0;
      if (!event.allowPlusOnes || body.rsvpStatus !== "going") {
        plusOnes = 0;
      } else {
        plusOnes = Math.min(plusOnes, event.maxPlusOnes);
      }

      rsvp = await prisma.rsvp.upsert({
        where: { eventId_userId: { eventId: event.id, userId: user.id } },
        create: {
          eventId: event.id,
          userId: user.id,
          status: body.rsvpStatus,
          plusOnes,
        },
        update: {
          status: body.rsvpStatus,
          plusOnes,
        },
      });
    }

    return jsonOk({
      event: publicEventDto(event),
      membership: {
        role: membership.role,
        status: membership.status,
        canUpload: membership.canUpload,
        canDownload: membership.canDownload,
      },
      rsvp: rsvp
        ? { status: rsvp.status, plusOnes: rsvp.plusOnes }
        : null,
      user: { id: user.id, displayName: user.displayName },
    });
  } catch (err) {
    return handleRouteError(err);
  }
}

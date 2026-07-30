import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
  assertOrganizer,
  hashPasscode,
  publicEventDto,
} from "@/lib/events";
import { handleRouteError, jsonError, jsonOk } from "@/lib/http";
import { deleteObject } from "@/lib/storage";

type Ctx = { params: Promise<{ slug: string }> };

const patchSchema = z.object({
  title: z.string().trim().min(1).max(80).optional(),
  description: z.string().trim().max(500).optional(),
  locationName: z.string().trim().max(120).optional(),
  commentsEnabled: z.boolean().optional(),
  rsvpEnabled: z.boolean().optional(),
  uploadsEnabled: z.boolean().optional(),
  requireRsvpToUpload: z.boolean().optional(),
  allowPlusOnes: z.boolean().optional(),
  maxPlusOnes: z.number().int().min(0).max(10).optional(),
  uploadMode: z.enum(["both", "camera", "library"]).optional(),
  useGuestPrivileges: z.boolean().optional(),
  startAt: z.string().datetime().nullable().optional(),
  atmosphere: z.enum(["bday", "wedding", "trip", "dinner", "party"]).optional(),
  downloadPolicy: z
    .enum(["members", "going_only", "organizer_only", "disabled"])
    .optional(),
  downloadsEnabled: z.boolean().optional(),
  downloadOpensAt: z.string().datetime().nullable().optional(),
  passcode: z.string().trim().min(4).max(12).nullable().optional(),
  extendHours: z.number().int().min(1).max(168).optional(),
  state: z.enum(["live", "ended", "scheduled"]).optional(),
  highlightsPublished: z.boolean().optional(),
  highlightTemplate: z
    .enum(["mosaic", "grid4", "story", "film", "hero"])
    .optional(),
  highlightFilter: z
    .enum(["none", "warm", "cool", "mono", "vivid", "soft", "noir"])
    .optional(),
  publishMessage: z.string().trim().max(400).optional(),
  mapsUrl: z.string().trim().max(500).optional(),
  inviteCopy: z.string().trim().max(400).optional(),
  inviteStickers: z.string().trim().max(120).optional(),
  guestVisibility: z.enum(["own_only", "approved_public", "all_members"]).optional(),
  requireApproval: z.boolean().optional(),
  maxGuests: z.number().int().min(1).max(1000).optional(),
  maxMedia: z.number().int().min(1).max(20000).optional(),
  maxMediaPerGuest: z.number().int().min(1).max(500).optional(),
  uploadWindowHours: z.number().int().min(1).max(168).nullable().optional(),
  uploadsOpenAt: z.string().datetime().nullable().optional(),
  uploadsCloseAt: z.string().datetime().nullable().optional(),
});

export async function GET(_req: Request, ctx: Ctx) {
  try {
    const { slug } = await ctx.params;
    const event = await prisma.event.findUnique({
      where: { slug },
      include: {
        owner: { select: { displayName: true } },
        _count: { select: { media: true, memberships: true } },
      },
    });
    if (!event) return jsonError("EVENT_NOT_FOUND", "We can’t find this event.", 404);

    const user = await getCurrentUser();
    const membership = user
      ? await prisma.membership.findUnique({
          where: { eventId_userId: { eventId: event.id, userId: user.id } },
        })
      : null;

    const rsvp = user
      ? await prisma.rsvp.findUnique({
          where: { eventId_userId: { eventId: event.id, userId: user.id } },
        })
      : null;

    return jsonOk({
      event: {
        ...publicEventDto(event),
        hostName: event.owner.displayName,
        mediaCount: event._count.media,
        memberCount: event._count.memberships,
      },
      membership: membership
        ? {
            role: membership.role,
            status: membership.status,
            canUpload: membership.canUpload,
            canDownload: membership.canDownload,
          }
        : null,
      rsvp: rsvp
        ? { status: rsvp.status, plusOnes: rsvp.plusOnes, note: rsvp.note }
        : null,
      user: user
        ? { id: user.id, displayName: user.displayName }
        : null,
    });
  } catch (err) {
    return handleRouteError(err);
  }
}

export async function PATCH(req: Request, ctx: Ctx) {
  try {
    const { slug } = await ctx.params;
    const user = await getCurrentUser();
    if (!user) return jsonError("AUTH_REQUIRED", "Sign in to continue.", 401);

    const event = await prisma.event.findUnique({ where: { slug } });
    if (!event) return jsonError("EVENT_NOT_FOUND", "We can’t find this event.", 404);
    await assertOrganizer(event.id, user.id);

    const body = patchSchema.parse(await req.json());
    const data: Record<string, unknown> = {};

    if (body.title !== undefined) data.title = body.title;
    if (body.description !== undefined) data.description = body.description;
    if (body.locationName !== undefined) data.locationName = body.locationName;
    if (body.commentsEnabled !== undefined) data.commentsEnabled = body.commentsEnabled;
    if (body.rsvpEnabled !== undefined) {
      data.rsvpEnabled = body.rsvpEnabled;
      if (body.rsvpEnabled && body.requireRsvpToUpload === undefined) {
        data.requireRsvpToUpload = true;
      }
    }
    if (body.uploadsEnabled !== undefined) data.uploadsEnabled = body.uploadsEnabled;
    if (body.requireRsvpToUpload !== undefined) {
      data.requireRsvpToUpload = body.requireRsvpToUpload;
    }
    if (body.allowPlusOnes !== undefined) data.allowPlusOnes = body.allowPlusOnes;
    if (body.maxPlusOnes !== undefined) data.maxPlusOnes = body.maxPlusOnes;
    if (body.uploadMode !== undefined) data.uploadMode = body.uploadMode;
    if (body.useGuestPrivileges !== undefined) {
      data.useGuestPrivileges = body.useGuestPrivileges;
    }
    if (body.startAt !== undefined) {
      data.startAt = body.startAt ? new Date(body.startAt) : null;
    }
    if (body.atmosphere !== undefined) data.atmosphere = body.atmosphere;
    if (body.downloadPolicy !== undefined) data.downloadPolicy = body.downloadPolicy;
    if (body.downloadsEnabled !== undefined) data.downloadsEnabled = body.downloadsEnabled;
    if (body.downloadOpensAt !== undefined) {
      data.downloadOpensAt = body.downloadOpensAt
        ? new Date(body.downloadOpensAt)
        : null;
    }
    if (body.state !== undefined) data.state = body.state;
    if (body.highlightsPublished !== undefined) {
      data.highlightsPublished = body.highlightsPublished;
      if (body.highlightsPublished) data.publishedAt = new Date();
    }
    if (body.highlightTemplate !== undefined) data.highlightTemplate = body.highlightTemplate;
    if (body.highlightFilter !== undefined) data.highlightFilter = body.highlightFilter;
    if (body.publishMessage !== undefined) data.publishMessage = body.publishMessage;
    if (body.mapsUrl !== undefined) data.mapsUrl = body.mapsUrl;
    if (body.inviteCopy !== undefined) data.inviteCopy = body.inviteCopy;
    if (body.inviteStickers !== undefined) data.inviteStickers = body.inviteStickers;
    if (body.guestVisibility !== undefined) data.guestVisibility = body.guestVisibility;
    if (body.requireApproval !== undefined) data.requireApproval = body.requireApproval;
    if (body.maxGuests !== undefined) data.maxGuests = body.maxGuests;
    if (body.maxMedia !== undefined) data.maxMedia = body.maxMedia;
    if (body.maxMediaPerGuest !== undefined) data.maxMediaPerGuest = body.maxMediaPerGuest;
    if (body.uploadWindowHours !== undefined) data.uploadWindowHours = body.uploadWindowHours;
    if (body.uploadsOpenAt !== undefined) {
      data.uploadsOpenAt = body.uploadsOpenAt ? new Date(body.uploadsOpenAt) : null;
    }
    if (body.uploadsCloseAt !== undefined) {
      data.uploadsCloseAt = body.uploadsCloseAt ? new Date(body.uploadsCloseAt) : null;
    }
    if (body.passcode !== undefined) {
      data.passcodeHash = body.passcode ? hashPasscode(body.passcode) : null;
    }
    if (body.extendHours) {
      const base =
        event.expiresAt.getTime() > Date.now()
          ? event.expiresAt.getTime()
          : Date.now();
      data.expiresAt = new Date(base + body.extendHours * 60 * 60 * 1000);
      data.state = "live";
    }

    const updated = await prisma.event.update({
      where: { id: event.id },
      data,
    });

    return jsonOk({ event: publicEventDto(updated) });
  } catch (err) {
    return handleRouteError(err);
  }
}

export async function DELETE(_req: Request, ctx: Ctx) {
  try {
    const { slug } = await ctx.params;
    const user = await getCurrentUser();
    if (!user) return jsonError("AUTH_REQUIRED", "Sign in to continue.", 401);

    const event = await prisma.event.findUnique({
      where: { slug },
      include: { media: true },
    });
    if (!event) return jsonError("EVENT_NOT_FOUND", "We can’t find this event.", 404);

    // Only the owner can hard-delete the whole event
    if (event.ownerId !== user.id) {
      return jsonError(
        "AUTH_FORBIDDEN",
        "Only the host can delete this event.",
        403,
      );
    }

    // Best-effort remove stored files
    for (const media of event.media) {
      await deleteObject(media.storageKey).catch(() => {});
      if (media.thumbKey) await deleteObject(media.thumbKey).catch(() => {});
    }

    await prisma.event.delete({ where: { id: event.id } });

    return jsonOk({ ok: true });
  } catch (err) {
    return handleRouteError(err);
  }
}

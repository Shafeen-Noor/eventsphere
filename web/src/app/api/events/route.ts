import { z } from "zod";
import {
  ensureUser,
  getCurrentUser,
  requireVerifiedAccount,
} from "@/lib/auth";
import { prisma } from "@/lib/db";
import { hashPasscode, publicEventDto } from "@/lib/events";
import { handleRouteError, jsonError, jsonOk } from "@/lib/http";
import { getOnetimeTier, getPlan } from "@/lib/plans";
import { slugifyTitle } from "@/lib/slug";

const createSchema = z.object({
  title: z.string().trim().min(1).max(80),
  description: z.string().trim().max(500).optional().default(""),
  hostName: z.string().trim().min(1).max(40).optional(),
  useCase: z.enum(["friends", "celebration"]).default("friends"),
  locationName: z.string().trim().max(120).optional().default(""),
  mapsUrl: z.string().trim().max(500).optional().default(""),
  inviteCopy: z.string().trim().max(400).optional().default(""),
  inviteStickers: z.string().trim().max(120).optional().default(""),
  retentionHours: z.number().int().min(1).max(720).optional(),
  uploadWindowHours: z.number().int().min(1).max(168).optional().nullable(),
  maxGuests: z.number().int().min(1).max(1000).optional(),
  maxMedia: z.number().int().min(1).max(20000).optional(),
  maxMediaPerGuest: z.number().int().min(1).max(500).optional(),
  guestVisibility: z
    .enum(["own_only", "approved_public", "all_members"])
    .optional(),
  requireApproval: z.boolean().optional(),
  passcode: z.string().trim().min(4).max(12).optional().nullable(),
  rsvpEnabled: z.boolean().optional(),
  commentsEnabled: z.boolean().optional().default(true),
  allowPlusOnes: z.boolean().optional().default(true),
  maxPlusOnes: z.number().int().min(0).max(10).optional().default(2),
  uploadMode: z.enum(["both", "camera", "library"]).optional().default("both"),
  atmosphere: z.enum(["bday", "wedding", "trip", "dinner", "party"]).default("bday"),
  downloadPolicy: z
    .enum(["members", "going_only", "organizer_only", "disabled"])
    .optional()
    .default("members"),
  downloadsEnabled: z.boolean().optional().default(true),
  startAt: z.string().datetime().optional().nullable(),
  endAt: z.string().datetime().optional().nullable(),
  billingMode: z
    .enum(["free", "onetime", "subscription", "instant"])
    .optional()
    .default("subscription"),
  planTier: z.enum(["free", "pro", "professional"]).optional(),
  onetimeTierId: z
    .enum(["cozy", "party", "gather", "celebration"])
    .optional(),
  confirmInstantPayment: z.boolean().optional().default(false),
});

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) return jsonOk({ events: [] });

    const memberships = await prisma.membership.findMany({
      where: { userId: user.id, status: "active" },
      include: {
        event: {
          include: {
            _count: { select: { media: true, memberships: true } },
          },
        },
      },
      orderBy: { joinedAt: "desc" },
    });

    return jsonOk({
      events: memberships.map((m) => ({
        ...publicEventDto(m.event),
        role: m.role,
        mediaCount: m.event._count.media,
        memberCount: m.event._count.memberships,
      })),
    });
  } catch (err) {
    return handleRouteError(err);
  }
}

export async function POST(req: Request) {
  try {
    const body = createSchema.parse(await req.json());

    // Normalize legacy "instant" → "onetime"
    const billingMode =
      body.billingMode === "instant" ? "onetime" : body.billingMode;

    let user;
    if (billingMode === "free") {
      const hostName = body.hostName?.trim();
      if (!hostName) {
        return jsonError(
          "VAL_HOST_NAME",
          "Add a host name guests will see on the invite.",
          422,
        );
      }
      // Free never requires an account — guest cookie identity is enough.
      user = await ensureUser(hostName);
    } else {
      user = await requireVerifiedAccount();
      if (body.hostName && body.hostName !== user.displayName) {
        user = await prisma.user.update({
          where: { id: user.id },
          data: { displayName: body.hostName },
        });
      }
    }

    let planTier: "free" | "pro";
    let instantFeeCents = 0;
    let onetimeGuests: number | undefined;
    let onetimeMedia: number | undefined;
    let onetimePerGuest: number | undefined;

    if (billingMode === "free") {
      planTier = "free";
    } else if (billingMode === "onetime") {
      planTier = "pro";
      const tier = getOnetimeTier(body.onetimeTierId);
      instantFeeCents = tier.priceCents;
      onetimeGuests = tier.guests;
      onetimeMedia = tier.maxMedia;
      onetimePerGuest = tier.maxMediaPerGuest;
      if (!body.confirmInstantPayment) {
        return jsonError(
          "PAYMENT_REQUIRED",
          `Confirm the ${tier.priceLabel} one-time payment to create this Pro event.`,
          402,
        );
      }
    } else {
      if (user.plan !== "pro") {
        return jsonError(
          "SUBSCRIPTION_REQUIRED",
          "A Pro subscription is required to create events this way.",
          402,
        );
      }
      planTier = "pro";
    }

    const plan = getPlan(planTier);

    let retentionHours = body.retentionHours ?? plan.limits.maxDurationHours;
    retentionHours = Math.min(retentionHours, plan.limits.maxDurationHours);

    const now = new Date();
    const rsvpEnabled = plan.limits.canUseRsvp
      ? (body.rsvpEnabled ?? body.useCase === "celebration")
      : false;

    if (rsvpEnabled && !body.startAt) {
      return jsonError(
        "VAL_START_AT",
        "Set a start date and time so guests know when the event begins.",
        422,
      );
    }

    const startAt = body.startAt ? new Date(body.startAt) : null;
    if (startAt && startAt.getTime() < now.getTime() - 60_000) {
      return jsonError(
        "VAL_START_AT",
        "Start time should be in the future.",
        422,
      );
    }

    const retentionBase = startAt ?? now;
    const expiresAt = new Date(
      retentionBase.getTime() + retentionHours * 60 * 60 * 1000,
    );

    let uploadWindowHours: number | null = null;
    let uploadsOpenAt: Date | null = startAt;
    let uploadsCloseAt: Date | null = null;
    if (plan.limits.canSetUploadWindow && body.uploadWindowHours) {
      uploadWindowHours = Math.min(
        body.uploadWindowHours,
        plan.limits.maxDurationHours,
      );
      const open = startAt ?? now;
      uploadsOpenAt = open;
      uploadsCloseAt = new Date(open.getTime() + uploadWindowHours * 60 * 60 * 1000);
      if (uploadsCloseAt > expiresAt) uploadsCloseAt = expiresAt;
    } else {
      uploadWindowHours = retentionHours;
      uploadsOpenAt = startAt ?? now;
      uploadsCloseAt = expiresAt;
    }

    const maxGuests = Math.min(
      onetimeGuests ?? body.maxGuests ?? plan.limits.maxGuests,
      plan.limits.maxGuests,
    );
    const maxMedia = Math.min(
      onetimeMedia ?? body.maxMedia ?? plan.limits.maxMedia,
      plan.limits.maxMedia,
    );
    const maxMediaPerGuest = Math.min(
      onetimePerGuest ??
        body.maxMediaPerGuest ??
        plan.limits.maxMediaPerGuestDefault,
      plan.limits.maxMedia,
    );

    const guestVisibility = plan.limits.canSetGuestVisibility
      ? body.guestVisibility || "own_only"
      : "own_only";
    const requireApproval = plan.limits.canRequireApproval
      ? Boolean(body.requireApproval)
      : false;

    const mapsUrl = plan.limits.canAddMaps ? body.mapsUrl || "" : "";
    const inviteCopy = plan.limits.canCustomizeInvite ? body.inviteCopy || "" : "";
    const inviteStickers = plan.limits.canCustomizeInvite
      ? body.inviteStickers || ""
      : "";

    const event = await prisma.event.create({
      data: {
        title: body.title,
        description: body.description,
        slug: slugifyTitle(body.title),
        useCase: body.useCase,
        locationName: body.locationName || "",
        mapsUrl,
        inviteCopy,
        inviteStickers,
        state: startAt && startAt.getTime() > now.getTime() ? "scheduled" : "live",
        retentionHours,
        expiresAt,
        startAt,
        endAt: body.endAt ? new Date(body.endAt) : null,
        passcodeHash: body.passcode ? hashPasscode(body.passcode) : null,
        rsvpEnabled,
        commentsEnabled: body.commentsEnabled,
        uploadsEnabled: true,
        requireRsvpToUpload: rsvpEnabled,
        allowPlusOnes: plan.limits.canUseRsvp ? body.allowPlusOnes : false,
        maxPlusOnes: plan.limits.canUseRsvp ? body.maxPlusOnes : 0,
        uploadMode: body.uploadMode,
        useGuestPrivileges: false,
        atmosphere: body.atmosphere,
        downloadPolicy: body.downloadPolicy,
        downloadsEnabled: body.downloadsEnabled,
        themeColor: "#0e7490",
        billingMode,
        planTier,
        instantFeeCents,
        maxGuests,
        maxMedia,
        maxMediaPerGuest,
        uploadWindowHours,
        uploadsOpenAt,
        uploadsCloseAt,
        guestVisibility,
        requireApproval,
        ownerId: user.id,
        memberships: {
          create: {
            userId: user.id,
            role: "organizer",
            canUpload: true,
            canDownload: true,
          },
        },
        rsvps: rsvpEnabled
          ? {
              create: {
                userId: user.id,
                status: "going",
              },
            }
          : undefined,
      },
    });

    return jsonOk({ event: publicEventDto(event) }, 201);
  } catch (err) {
    return handleRouteError(err);
  }
}

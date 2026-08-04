import { z } from "zod";
import {
  ensureUser,
  getCurrentUser,
  requireVerifiedAccount,
} from "@/lib/auth";
import { prisma } from "@/lib/db";
import { addFeedItem } from "@/lib/feed";
import { hashPasscode, publicEventDto } from "@/lib/events";
import { handleRouteError, jsonError, jsonOk } from "@/lib/http";
import {
  applyPlanLimitsToEvent,
  getPlan,
  normalizePlanId,
  type PlanId,
} from "@/lib/plans";
import { slugifyTitle } from "@/lib/slug";

const eventTypeEnum = z.enum([
  "wedding",
  "birthday",
  "party",
  "corporate",
  "conference",
  "reunion",
  "baby_shower",
  "graduation",
  "holiday",
  "other",
]);

const createSchema = z.object({
  title: z.string().trim().min(1).max(80),
  description: z.string().trim().max(500).optional().default(""),
  hostName: z.string().trim().min(1).max(40).optional(),
  eventType: eventTypeEnum.optional().default("other"),
  useCase: z.enum(["friends", "celebration"]).optional(),
  locationName: z.string().trim().max(120).optional().default(""),
  mapsUrl: z.string().trim().max(500).optional().default(""),
  inviteCopy: z.string().trim().max(400).optional().default(""),
  inviteStickers: z.string().trim().max(120).optional().default(""),
  retentionHours: z.number().int().min(1).max(8760).optional(),
  uploadWindowHours: z.number().int().min(1).max(168).optional().nullable(),
  maxGuests: z.number().int().min(1).max(999999).optional(),
  maxMedia: z.number().int().min(1).max(999999).optional(),
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
  atmosphere: z
    .enum(["bday", "wedding", "trip", "dinner", "party"])
    .optional(),
  downloadPolicy: z
    .enum(["members", "going_only", "organizer_only", "disabled"])
    .optional()
    .default("members"),
  downloadsEnabled: z.boolean().optional().default(true),
  startAt: z.string().datetime().optional().nullable(),
  endAt: z.string().datetime().optional().nullable(),
  billingMode: z
    .enum(["free", "onetime", "subscription", "instant", "enterprise"])
    .optional()
    .default("free"),
  planTier: z
    .enum(["free", "essential", "premium", "enterprise", "pro", "professional"])
    .optional(),
  confirmPayment: z.boolean().optional().default(false),
  confirmInstantPayment: z.boolean().optional().default(false),
  disposableCamera: z.boolean().optional().default(false),
});

function atmosphereForType(eventType: string) {
  if (eventType === "wedding" || eventType === "baby_shower") return "wedding";
  if (eventType === "birthday") return "bday";
  if (eventType === "corporate" || eventType === "conference") return "dinner";
  if (eventType === "graduation" || eventType === "party" || eventType === "holiday")
    return "party";
  return "trip";
}

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
    const billingMode =
      body.billingMode === "instant" ? "onetime" : body.billingMode;

    let user;
    if (billingMode === "free" || billingMode === "onetime") {
      const hostName = body.hostName?.trim();
      if (!hostName) {
        return jsonError(
          "VAL_HOST_NAME",
          "Add a host name guests will see on the invite.",
          422,
        );
      }
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

    let planTier: PlanId;
    let instantFeeCents = 0;

    if (billingMode === "free") {
      planTier = "free";
    } else if (billingMode === "onetime") {
      planTier = normalizePlanId(body.planTier || "essential");
      if (planTier !== "essential" && planTier !== "premium") planTier = "essential";
      const plan = getPlan(planTier);
      instantFeeCents = plan.priceCents;
      if (!body.confirmPayment && !body.confirmInstantPayment) {
        return jsonError(
          "PAYMENT_REQUIRED",
          `Confirm the ${plan.priceLabel} payment to unlock ${plan.label}.`,
          402,
        );
      }
    } else if (billingMode === "enterprise") {
      if (normalizePlanId(user.plan) !== "enterprise") {
        return jsonError(
          "SUBSCRIPTION_REQUIRED",
          "An Enterprise subscription is required.",
          402,
        );
      }
      planTier = "enterprise";
    } else {
      const accountPlan = normalizePlanId(user.plan);
      if (accountPlan !== "premium" && accountPlan !== "enterprise") {
        return jsonError(
          "SUBSCRIPTION_REQUIRED",
          "A paid account is required for subscription events.",
          402,
        );
      }
      planTier = accountPlan === "enterprise" ? "enterprise" : "premium";
    }

    const plan = getPlan(planTier);
    const limits = applyPlanLimitsToEvent({ planTier }, planTier);
    const now = new Date();
    const eventType = body.eventType || "other";
    const atmosphere = body.atmosphere || atmosphereForType(eventType);
    const useCase =
      body.useCase ||
      (eventType === "wedding" || eventType === "birthday"
        ? "celebration"
        : "friends");

    const startAt = body.startAt ? new Date(body.startAt) : now;
    const endAt = body.endAt
      ? new Date(body.endAt)
      : new Date(startAt.getTime() + 8 * 60 * 60 * 1000);
    const retentionHours = Math.min(
      body.retentionHours ?? limits.retentionHours,
      plan.retentionHours,
    );
    const expiresAt = new Date(
      Math.max(endAt.getTime(), now.getTime()) + retentionHours * 60 * 60 * 1000,
    );

    const maxGuests = Math.min(
      body.maxGuests ?? limits.maxGuests,
      plan.maxGuests,
    );
    const maxMedia = Math.min(body.maxMedia ?? limits.maxMedia, plan.maxMedia);
    const maxMediaPerGuest = body.disposableCamera
      ? 10
      : body.maxMediaPerGuest ?? 10;

    if (body.passcode && !plan.features.password) {
      return jsonError(
        "PLAN_FEATURE",
        "Password protection requires Premium.",
        403,
      );
    }

    const event = await prisma.event.create({
      data: {
        title: body.title,
        description: body.description,
        slug: slugifyTitle(body.title),
        eventType,
        useCase,
        locationName: body.locationName || "",
        mapsUrl: plan.features.coverPhoto ? body.mapsUrl || "" : "",
        inviteCopy: body.inviteCopy || "",
        inviteStickers: body.inviteStickers || "",
        state: startAt.getTime() > now.getTime() ? "scheduled" : "live",
        retentionHours,
        expiresAt,
        startAt,
        endAt,
        passcodeHash:
          body.passcode && plan.features.password
            ? hashPasscode(body.passcode)
            : null,
        rsvpEnabled: false,
        commentsEnabled: body.commentsEnabled,
        uploadsEnabled: true,
        requireRsvpToUpload: false,
        allowPlusOnes: false,
        maxPlusOnes: 0,
        uploadMode: body.uploadMode,
        atmosphere,
        downloadPolicy: body.downloadPolicy,
        downloadsEnabled: body.downloadsEnabled,
        themeColor: "#0c0b0a",
        billingMode,
        planTier,
        instantFeeCents,
        maxGuests,
        maxMedia,
        maxMediaPerGuest,
        uploadWindowHours: retentionHours,
        uploadsOpenAt: startAt,
        uploadsCloseAt: expiresAt,
        guestVisibility: "all_members",
        requireApproval: plan.features.moderation
          ? Boolean(body.requireApproval)
          : false,
        disposableCamera: Boolean(body.disposableCamera),
        ownerId: user.id,
        memberships: {
          create: {
            userId: user.id,
            role: "organizer",
            canUpload: true,
            canDownload: true,
          },
        },
      },
    });

    await addFeedItem({
      eventId: event.id,
      actorId: user.id,
      kind: "event_created",
      message: `${user.displayName} created the event website`,
    });

    const defaults =
      eventType === "wedding"
        ? ["Ceremony", "Reception", "Dance", "Cake", "After Party"]
        : eventType === "birthday"
          ? ["Arrival", "Cake", "Games", "Photos"]
          : ["Welcome", "Main Program", "Photos"];
    await prisma.scheduleItem.createMany({
      data: defaults.map((title, i) => ({
        eventId: event.id,
        title,
        sortOrder: i,
      })),
    });

    return jsonOk({ event: publicEventDto(event) }, 201);
  } catch (err) {
    return handleRouteError(err);
  }
}

import { createHash } from "node:crypto";
import { prisma } from "@/lib/db";
import { getEventPhase } from "@/lib/phase";
import { getPlan, normalizePlanId } from "@/lib/plans";

export function hashPasscode(passcode: string) {
  return createHash("sha256").update(passcode).digest("hex");
}

export function isEventExpired(expiresAt: Date) {
  return expiresAt.getTime() <= Date.now();
}

/** Event gallery/uploads unlock at startAt (or immediately if unset). */
export function hasEventStarted(startAt: Date | null | undefined) {
  if (!startAt) return true;
  return startAt.getTime() <= Date.now();
}

export async function getMembership(eventId: string, userId: string) {
  return prisma.membership.findUnique({
    where: { eventId_userId: { eventId, userId } },
  });
}

export async function assertEventMember(eventId: string, userId: string) {
  const membership = await getMembership(eventId, userId);
  if (!membership || membership.status !== "active") {
    throw new Response(
      JSON.stringify({
        error: {
          code: "AUTH_FORBIDDEN",
          message: "You don’t have access to this event.",
        },
      }),
      { status: 403, headers: { "Content-Type": "application/json" } },
    );
  }
  return membership;
}

export async function assertOrganizer(eventId: string, userId: string) {
  const membership = await assertEventMember(eventId, userId);
  if (membership.role !== "organizer" && membership.role !== "co_organizer") {
    throw new Response(
      JSON.stringify({
        error: {
          code: "AUTH_FORBIDDEN",
          message: "Only organizers can do that.",
        },
      }),
      { status: 403, headers: { "Content-Type": "application/json" } },
    );
  }
  return membership;
}

export function isStaffRole(role: string) {
  return (
    role === "organizer" ||
    role === "co_organizer" ||
    role === "photographer"
  );
}

type UploadGateEvent = {
  id: string;
  expiresAt: Date;
  startAt: Date | null;
  state: string;
  uploadsEnabled: boolean;
  rsvpEnabled: boolean;
  requireRsvpToUpload: boolean;
  useGuestPrivileges: boolean;
  uploadsOpenAt?: Date | null;
  uploadsCloseAt?: Date | null;
  maxMedia?: number;
  maxMediaPerGuest?: number;
  planTier?: string;
};

type MembershipGate = {
  role: string;
  canUpload: boolean;
};

export function isUploadWindowOpen(event: {
  startAt: Date | null;
  uploadsOpenAt?: Date | null;
  uploadsCloseAt?: Date | null;
  uploadsEnabled: boolean;
}) {
  const now = Date.now();
  const openAt = event.uploadsOpenAt ?? event.startAt;
  if (openAt && openAt.getTime() > now) return false;
  if (event.uploadsCloseAt && event.uploadsCloseAt.getTime() <= now) return false;
  return event.uploadsEnabled;
}

export async function assertCanUpload(
  event: UploadGateEvent,
  userId: string,
  membership: MembershipGate | string,
) {
  const role = typeof membership === "string" ? membership : membership.role;
  const canUploadFlag =
    typeof membership === "string" ? true : membership.canUpload;

  if (isEventExpired(event.expiresAt) || event.state === "ended") {
    throw new Response(
      JSON.stringify({
        error: {
          code: "EVENT_EXPIRED",
          message: "Uploads are closed for this event.",
        },
      }),
      { status: 410, headers: { "Content-Type": "application/json" } },
    );
  }

  const isOrg = isStaffRole(role);

  if (!isOrg) {
    const openAt = event.uploadsOpenAt ?? event.startAt;
    if (openAt && openAt.getTime() > Date.now()) {
      throw new Response(
        JSON.stringify({
          error: {
            code: "EVENT_NOT_STARTED",
            message: "Photo uploads unlock when the host opens the guest window.",
          },
        }),
        { status: 403, headers: { "Content-Type": "application/json" } },
      );
    }
    if (event.uploadsCloseAt && event.uploadsCloseAt.getTime() <= Date.now()) {
      throw new Response(
        JSON.stringify({
          error: {
            code: "UPLOAD_WINDOW_CLOSED",
            message: "The guest upload window has closed. The host is curating now.",
          },
        }),
        { status: 403, headers: { "Content-Type": "application/json" } },
      );
    }
  } else if (!hasEventStarted(event.startAt) && !event.uploadsOpenAt) {
    // organizers can still upload once event started or window set; before that block
  }

  if (isOrg) {
    // still enforce media caps for organizers? Soft — count against total
  } else {
    if (!event.uploadsEnabled) {
      throw new Response(
        JSON.stringify({
          error: {
            code: "UPLOADS_CLOSED",
            message: "The host hasn’t opened photo uploads yet.",
          },
        }),
        { status: 403, headers: { "Content-Type": "application/json" } },
      );
    }

    if (event.useGuestPrivileges && !canUploadFlag) {
      throw new Response(
        JSON.stringify({
          error: {
            code: "UPLOAD_PRIVILEGE",
            message: "The host hasn’t given you permission to upload photos.",
          },
        }),
        { status: 403, headers: { "Content-Type": "application/json" } },
      );
    }

    if (event.rsvpEnabled && event.requireRsvpToUpload) {
      const rsvp = await prisma.rsvp.findUnique({
        where: { eventId_userId: { eventId: event.id, userId } },
      });
      if (!rsvp || rsvp.status !== "going") {
        throw new Response(
          JSON.stringify({
            error: {
              code: "RSVP_REQUIRED",
              message: "RSVP as Going to unlock photo uploads.",
            },
          }),
          { status: 403, headers: { "Content-Type": "application/json" } },
        );
      }
    }
  }

  const maxMedia = event.maxMedia ?? 100;
  const total = await prisma.media.count({
    where: {
      eventId: event.id,
      state: { in: ["published", "pending_approval", "uploading"] },
    },
  });
  if (total >= maxMedia) {
    throw new Response(
      JSON.stringify({
        error: {
          code: "MEDIA_CAP",
          message: `This event has reached its ${maxMedia}-photo limit.`,
        },
      }),
      { status: 403, headers: { "Content-Type": "application/json" } },
    );
  }

  if (!isOrg) {
    const perGuest = event.maxMediaPerGuest ?? 10;
    const mine = await prisma.media.count({
      where: {
        eventId: event.id,
        uploaderId: userId,
        state: { in: ["published", "pending_approval", "uploading"] },
      },
    });
    if (mine >= perGuest) {
      throw new Response(
        JSON.stringify({
          error: {
            code: "GUEST_MEDIA_CAP",
            message: `You can upload up to ${perGuest} photos for this event.`,
          },
        }),
        { status: 403, headers: { "Content-Type": "application/json" } },
      );
    }
  }

  return { allowed: true as const };
}

type DownloadGateEvent = {
  id: string;
  downloadsEnabled: boolean;
  downloadPolicy: string;
  downloadOpensAt: Date | null;
  expiresAt: Date;
  rsvpEnabled: boolean;
  useGuestPrivileges: boolean;
};

export async function canDownload(
  event: DownloadGateEvent,
  userId: string,
  membership: { role: string; canDownload: boolean } | string,
) {
  const role = typeof membership === "string" ? membership : membership.role;
  const canDownloadFlag =
    typeof membership === "string" ? true : membership.canDownload;

  const isOrg = role === "organizer" || role === "co_organizer";
  if (isOrg) return { allowed: true, reason: null as string | null };

  if (!event.downloadsEnabled || event.downloadPolicy === "disabled") {
    return { allowed: false, reason: "Downloads are turned off by the host." };
  }

  if (event.downloadOpensAt && event.downloadOpensAt.getTime() > Date.now()) {
    return {
      allowed: false,
      reason: `Downloads open ${event.downloadOpensAt.toLocaleString()}.`,
    };
  }

  if (event.useGuestPrivileges) {
    if (!canDownloadFlag) {
      return {
        allowed: false,
        reason: "The host hasn’t given you permission to download photos.",
      };
    }
    return { allowed: true, reason: null };
  }

  if (event.downloadPolicy === "organizer_only") {
    return { allowed: false, reason: "Only the host can download photos." };
  }

  if (event.downloadPolicy === "going_only") {
    if (!event.rsvpEnabled) return { allowed: true, reason: null };
    const rsvp = await prisma.rsvp.findUnique({
      where: { eventId_userId: { eventId: event.id, userId } },
    });
    if (!rsvp || rsvp.status !== "going") {
      return { allowed: false, reason: "Only guests marked Going can download." };
    }
  }

  return { allowed: true, reason: null };
}

export function publicEventDto(event: {
  id: string;
  slug: string;
  title: string;
  description: string;
  useCase: string;
  eventType?: string;
  state: string;
  locationName?: string;
  coverKey?: string | null;
  startAt: Date | null;
  endAt: Date | null;
  expiresAt: Date;
  retentionHours: number;
  ownerId: string;
  createdAt: Date;
  passcodeHash: string | null;
  rsvpEnabled?: boolean;
  commentsEnabled?: boolean;
  uploadsEnabled?: boolean;
  requireRsvpToUpload?: boolean;
  allowPlusOnes?: boolean;
  maxPlusOnes?: number;
  uploadMode?: string;
  useGuestPrivileges?: boolean;
  atmosphere?: string;
  themeColor?: string;
  downloadPolicy?: string;
  downloadsEnabled?: boolean;
  downloadOpensAt?: Date | null;
  billingMode?: string;
  planTier?: string;
  instantFeeCents?: number;
  highlightsPublished?: boolean;
  highlightTemplate?: string;
  highlightFilter?: string;
  maxGuests?: number;
  maxMedia?: number;
  maxMediaPerGuest?: number;
  uploadWindowHours?: number | null;
  uploadsOpenAt?: Date | null;
  uploadsCloseAt?: Date | null;
  mapsUrl?: string;
  inviteCopy?: string;
  inviteStickers?: string;
  guestVisibility?: string;
  requireApproval?: boolean;
  publishMessage?: string;
  publishedAt?: Date | null;
  disposableCamera?: boolean;
  whiteLabel?: boolean;
  customDomain?: string | null;
  hideUntilEventEnd?: boolean;
  featuredMediaId?: string | null;
  featuredUntil?: Date | null;
}) {
  const expired = isEventExpired(event.expiresAt);
  const started = hasEventStarted(event.startAt);
  const uploadOpen = isUploadWindowOpen({
    startAt: event.startAt,
    uploadsOpenAt: event.uploadsOpenAt,
    uploadsCloseAt: event.uploadsCloseAt,
    uploadsEnabled: event.uploadsEnabled !== false,
  });
  const phase = getEventPhase(event);
  const computedState = expired
    ? "expired"
    : event.state === "ended"
      ? "ended"
      : phase === "countdown"
        ? "scheduled"
        : phase === "archive"
          ? "ended"
          : "live";
  const planTier = normalizePlanId(event.planTier);
  const plan = getPlan(planTier);

  return {
    id: event.id,
    slug: event.slug,
    title: event.title,
    description: event.description,
    useCase: event.useCase,
    eventType: event.eventType || "other",
    state: computedState,
    phase,
    locationName: event.locationName ?? "",
    coverKey: event.coverKey ?? null,
    startAt: event.startAt?.toISOString() ?? null,
    endAt: event.endAt?.toISOString() ?? null,
    expiresAt: event.expiresAt.toISOString(),
    retentionHours: event.retentionHours,
    requiresPasscode: Boolean(event.passcodeHash),
    rsvpEnabled: Boolean(event.rsvpEnabled),
    commentsEnabled: event.commentsEnabled !== false,
    uploadsEnabled: event.uploadsEnabled !== false,
    requireRsvpToUpload: Boolean(event.requireRsvpToUpload),
    allowPlusOnes: event.allowPlusOnes !== false,
    maxPlusOnes: event.maxPlusOnes ?? 2,
    uploadMode: event.uploadMode || "both",
    useGuestPrivileges: Boolean(event.useGuestPrivileges),
    hasStarted: started,
    uploadWindowOpen: uploadOpen,
    atmosphere: event.atmosphere || "bday",
    themeColor: event.themeColor ?? "#0c0b0a",
    downloadPolicy: event.downloadPolicy || "members",
    downloadsEnabled: event.downloadsEnabled !== false,
    downloadOpensAt: event.downloadOpensAt?.toISOString() ?? null,
    billingMode: event.billingMode || "free",
    planTier,
    planLabel: plan.label,
    features: plan.features,
    instantFeeCents: event.instantFeeCents ?? 0,
    highlightsPublished: Boolean(event.highlightsPublished),
    highlightTemplate: event.highlightTemplate || "mosaic",
    highlightFilter: event.highlightFilter || "none",
    maxGuests: event.maxGuests ?? plan.maxGuests,
    maxMedia: event.maxMedia ?? plan.maxMedia,
    maxMediaPerGuest: event.maxMediaPerGuest ?? 10,
    uploadWindowHours: event.uploadWindowHours ?? null,
    uploadsOpenAt: event.uploadsOpenAt?.toISOString() ?? null,
    uploadsCloseAt: event.uploadsCloseAt?.toISOString() ?? null,
    mapsUrl: event.mapsUrl ?? "",
    inviteCopy: event.inviteCopy ?? "",
    inviteStickers: event.inviteStickers ?? "",
    guestVisibility: event.guestVisibility || "all_members",
    requireApproval: Boolean(event.requireApproval),
    publishMessage: event.publishMessage ?? "",
    publishedAt: event.publishedAt?.toISOString() ?? null,
    disposableCamera: Boolean(event.disposableCamera),
    whiteLabel: Boolean(event.whiteLabel),
    customDomain: event.customDomain ?? "",
    hideUntilEventEnd: Boolean(event.hideUntilEventEnd),
    featuredMediaId: event.featuredMediaId ?? null,
    featuredUntil: event.featuredUntil?.toISOString() ?? null,
    showBranding: plan.features.branding && !event.whiteLabel,
    joinUrl: `/e/${event.slug}`,
    createdAt: event.createdAt.toISOString(),
  };
}

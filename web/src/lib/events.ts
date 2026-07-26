import { createHash } from "node:crypto";
import { prisma } from "@/lib/db";

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

type UploadGateEvent = {
  id: string;
  expiresAt: Date;
  startAt: Date | null;
  state: string;
  uploadsEnabled: boolean;
  rsvpEnabled: boolean;
  requireRsvpToUpload: boolean;
  useGuestPrivileges: boolean;
};

type MembershipGate = {
  role: string;
  canUpload: boolean;
};

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

  if (!hasEventStarted(event.startAt)) {
    throw new Response(
      JSON.stringify({
        error: {
          code: "EVENT_NOT_STARTED",
          message: "The event hasn’t started yet — photo uploads unlock at the start time.",
        },
      }),
      { status: 403, headers: { "Content-Type": "application/json" } },
    );
  }

  const isOrg = role === "organizer" || role === "co_organizer";
  if (isOrg) return { allowed: true as const };

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
            message: "RSVP as Going before you can upload photos.",
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
  state: string;
  locationName?: string;
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
}) {
  const expired = isEventExpired(event.expiresAt);
  const started = hasEventStarted(event.startAt);
  const computedState = expired
    ? "expired"
    : event.state === "ended"
      ? "ended"
      : started
        ? "live"
        : "scheduled";

  return {
    id: event.id,
    slug: event.slug,
    title: event.title,
    description: event.description,
    useCase: event.useCase,
    state: computedState,
    locationName: event.locationName ?? "",
    startAt: event.startAt?.toISOString() ?? null,
    endAt: event.endAt?.toISOString() ?? null,
    expiresAt: event.expiresAt.toISOString(),
    retentionHours: event.retentionHours,
    requiresPasscode: Boolean(event.passcodeHash),
    rsvpEnabled: Boolean(event.rsvpEnabled),
    commentsEnabled: event.commentsEnabled !== false,
    uploadsEnabled: event.uploadsEnabled !== false,
    requireRsvpToUpload: event.requireRsvpToUpload !== false,
    allowPlusOnes: event.allowPlusOnes !== false,
    maxPlusOnes: event.maxPlusOnes ?? 2,
    uploadMode: event.uploadMode || "both",
    useGuestPrivileges: Boolean(event.useGuestPrivileges),
    hasStarted: started,
    atmosphere: event.atmosphere || "bday",
    themeColor: event.themeColor ?? "#698ea2",
    downloadPolicy: event.downloadPolicy || "members",
    downloadsEnabled: event.downloadsEnabled !== false,
    downloadOpensAt: event.downloadOpensAt?.toISOString() ?? null,
    joinUrl: `/e/${event.slug}`,
    createdAt: event.createdAt.toISOString(),
  };
}

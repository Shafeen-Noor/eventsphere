import { z } from "zod";
import { getCurrentUser, requireAccount } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { hashPasscode, publicEventDto } from "@/lib/events";
import { handleRouteError, jsonError, jsonOk } from "@/lib/http";
import { slugifyTitle } from "@/lib/slug";

const createSchema = z.object({
  title: z.string().trim().min(1).max(80),
  description: z.string().trim().max(500).optional().default(""),
  hostName: z.string().trim().min(1).max(40).optional(),
  useCase: z.enum(["friends", "celebration"]).default("friends"),
  locationName: z.string().trim().max(120).optional().default(""),
  retentionHours: z.number().int().min(1).max(720).optional(),
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
    let user = await requireAccount();
    if (body.hostName && body.hostName !== user.displayName) {
      user = await prisma.user.update({
        where: { id: user.id },
        data: { displayName: body.hostName },
      });
    }

    const retentionHours =
      body.retentionHours ??
      (body.useCase === "celebration" ? 168 : 48);
    const now = new Date();
    const rsvpEnabled =
      body.rsvpEnabled ?? body.useCase === "celebration";

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

    const event = await prisma.event.create({
      data: {
        title: body.title,
        description: body.description,
        slug: slugifyTitle(body.title),
        useCase: body.useCase,
        locationName: body.locationName || "",
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
        allowPlusOnes: body.allowPlusOnes,
        maxPlusOnes: body.maxPlusOnes,
        uploadMode: body.uploadMode,
        useGuestPrivileges: false,
        atmosphere: body.atmosphere,
        downloadPolicy: body.downloadPolicy,
        downloadsEnabled: body.downloadsEnabled,
        themeColor: "#698ea2",
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

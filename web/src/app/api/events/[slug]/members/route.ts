import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { assertEventMember, assertOrganizer } from "@/lib/events";
import { handleRouteError, jsonError, jsonOk } from "@/lib/http";

type Ctx = { params: Promise<{ slug: string }> };

const privilegeSchema = z.object({
  userId: z.string().min(1),
  canUpload: z.boolean().optional(),
  canDownload: z.boolean().optional(),
});

const modeSchema = z.object({
  useGuestPrivileges: z.boolean(),
});

export async function GET(_req: Request, ctx: Ctx) {
  try {
    const { slug } = await ctx.params;
    const user = await getCurrentUser();
    if (!user) return jsonError("AUTH_REQUIRED", "Sign in to continue.", 401);

    const event = await prisma.event.findUnique({ where: { slug } });
    if (!event) return jsonError("EVENT_NOT_FOUND", "We can’t find this event.", 404);
    await assertEventMember(event.id, user.id);

    const members = await prisma.membership.findMany({
      where: { eventId: event.id, status: "active" },
      include: {
        user: { select: { id: true, displayName: true } },
      },
      orderBy: { joinedAt: "asc" },
    });

    const rsvps = await prisma.rsvp.findMany({
      where: { eventId: event.id },
      select: { userId: true, status: true, plusOnes: true },
    });
    const rsvpMap = new Map(rsvps.map((r) => [r.userId, r]));

    const mediaCounts = await prisma.media.groupBy({
      by: ["uploaderId"],
      where: { eventId: event.id, state: "published" },
      _count: { _all: true },
    });
    const countMap = new Map(
      mediaCounts.map((m) => [m.uploaderId, m._count._all]),
    );

    return jsonOk({
      useGuestPrivileges: event.useGuestPrivileges,
      members: members.map((m) => {
        const rsvp = rsvpMap.get(m.user.id);
        return {
          userId: m.user.id,
          displayName: m.user.displayName,
          role: m.role,
          joinedAt: m.joinedAt.toISOString(),
          mediaCount: countMap.get(m.user.id) ?? 0,
          canUpload: m.canUpload,
          canDownload: m.canDownload,
          rsvpStatus: rsvp?.status ?? null,
          plusOnes: rsvp?.plusOnes ?? 0,
          isMe: m.user.id === user.id,
        };
      }),
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

    const body = await req.json();

    if ("useGuestPrivileges" in body) {
      const parsed = modeSchema.parse(body);
      const updated = await prisma.event.update({
        where: { id: event.id },
        data: { useGuestPrivileges: parsed.useGuestPrivileges },
      });
      return jsonOk({ useGuestPrivileges: updated.useGuestPrivileges });
    }

    const parsed = privilegeSchema.parse(body);
    if (parsed.userId === event.ownerId) {
      return jsonError(
        "AUTH_FORBIDDEN",
        "The host always has full privileges.",
        403,
      );
    }

    const data: { canUpload?: boolean; canDownload?: boolean } = {};
    if (parsed.canUpload !== undefined) data.canUpload = parsed.canUpload;
    if (parsed.canDownload !== undefined) data.canDownload = parsed.canDownload;

    const membership = await prisma.membership.update({
      where: {
        eventId_userId: { eventId: event.id, userId: parsed.userId },
      },
      data,
    });

    // Selecting any guest privilege implies selective mode
    if (!event.useGuestPrivileges) {
      await prisma.event.update({
        where: { id: event.id },
        data: { useGuestPrivileges: true },
      });
    }

    return jsonOk({
      member: {
        userId: membership.userId,
        canUpload: membership.canUpload,
        canDownload: membership.canDownload,
      },
      useGuestPrivileges: true,
    });
  } catch (err) {
    return handleRouteError(err);
  }
}

export async function DELETE(req: Request, ctx: Ctx) {
  try {
    const { slug } = await ctx.params;
    const user = await getCurrentUser();
    if (!user) return jsonError("AUTH_REQUIRED", "Sign in to continue.", 401);

    const event = await prisma.event.findUnique({ where: { slug } });
    if (!event) return jsonError("EVENT_NOT_FOUND", "We can’t find this event.", 404);

    const url = new URL(req.url);
    const targetUserId = url.searchParams.get("userId") || user.id;

    if (targetUserId === user.id) {
      if (event.ownerId === user.id) {
        return jsonError(
          "OWNERSHIP_BLOCK",
          "Transfer or delete the event before leaving as host.",
          409,
        );
      }
      await prisma.membership.update({
        where: { eventId_userId: { eventId: event.id, userId: user.id } },
        data: { status: "left" },
      });
      return jsonOk({ ok: true });
    }

    await assertOrganizer(event.id, user.id);
    if (targetUserId === event.ownerId) {
      return jsonError("AUTH_FORBIDDEN", "You can’t remove the host.", 403);
    }
    await prisma.membership.update({
      where: { eventId_userId: { eventId: event.id, userId: targetUserId } },
      data: { status: "banned" },
    });
    return jsonOk({ ok: true });
  } catch (err) {
    return handleRouteError(err);
  }
}

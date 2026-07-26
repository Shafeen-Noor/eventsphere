import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { assertEventMember } from "@/lib/events";
import { handleRouteError, jsonError, jsonOk } from "@/lib/http";

type Ctx = { params: Promise<{ mediaId: string }> };

const schema = z.object({
  reason: z.enum(["spam", "nsfw", "harassment", "other"]),
  notes: z.string().trim().max(300).optional().default(""),
});

export async function POST(req: Request, ctx: Ctx) {
  try {
    const { mediaId } = await ctx.params;
    const user = await getCurrentUser();
    if (!user) return jsonError("AUTH_REQUIRED", "Sign in to continue.", 401);

    const media = await prisma.media.findUnique({ where: { id: mediaId } });
    if (!media || media.state !== "published") {
      return jsonError("MEDIA_NOT_FOUND", "This photo is no longer available.", 404);
    }
    await assertEventMember(media.eventId, user.id);

    const body = schema.parse(await req.json());
    await prisma.mediaReport.create({
      data: {
        mediaId,
        reporterId: user.id,
        reason: body.reason,
        notes: body.notes,
      },
    });

    return jsonOk({ ok: true }, 201);
  } catch (err) {
    return handleRouteError(err);
  }
}

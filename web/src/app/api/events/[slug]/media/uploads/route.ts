import { customAlphabet } from "nanoid";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { assertCanUpload, assertEventMember } from "@/lib/events";
import { handleRouteError, jsonError, jsonOk } from "@/lib/http";
import {
  isAllowedContentType,
  maxBytesFor,
  mediaKind,
} from "@/lib/media";
import { createUploadUrl, mediaObjectKey } from "@/lib/storage";

const nano = customAlphabet("abcdefghijklmnopqrstuvwxyz0123456789", 16);

const schema = z.object({
  filename: z.string().min(1).max(180),
  contentType: z.string().min(3).max(100),
  byteSize: z.number().int().positive(),
  checksum: z.string().min(8).max(128).optional().nullable(),
  caption: z.string().max(500).optional().default(""),
  batchCaption: z.string().max(500).optional().default(""),
});

type Ctx = { params: Promise<{ slug: string }> };

export async function POST(req: Request, ctx: Ctx) {
  try {
    const { slug } = await ctx.params;
    const user = await getCurrentUser();
    if (!user) return jsonError("AUTH_REQUIRED", "Sign in to continue.", 401);

    const event = await prisma.event.findUnique({ where: { slug } });
    if (!event) return jsonError("EVENT_NOT_FOUND", "We can’t find this event.", 404);
    const membership = await assertEventMember(event.id, user.id);
    await assertCanUpload(event, user.id, membership);

    const body = schema.parse(await req.json());
    if (!isAllowedContentType(body.contentType)) {
      return jsonError("VAL_MEDIA_TYPE", "This file type isn’t supported.", 422);
    }
    if (body.byteSize > maxBytesFor(body.contentType)) {
      return jsonError("VAL_MEDIA_SIZE", "This file is too large.", 422);
    }

    if (body.checksum) {
      const dup = await prisma.media.findUnique({
        where: {
          eventId_checksum: { eventId: event.id, checksum: body.checksum },
        },
      });
      if (dup) {
        return jsonError("DUPLICATE_MEDIA", "This photo was already uploaded.", 409);
      }
    }

    const mediaId = nano();
    const key = mediaObjectKey(event.id, mediaId, body.filename);
    const upload = await createUploadUrl({
      key,
      contentType: body.contentType,
      byteSize: body.byteSize,
    });

    await prisma.media.create({
      data: {
        id: mediaId,
        eventId: event.id,
        uploaderId: user.id,
        type: mediaKind(body.contentType),
        state: "uploading",
        storageKey: key,
        contentType: body.contentType,
        byteSize: body.byteSize,
        checksum: body.checksum || null,
        caption: body.caption || body.batchCaption || "",
      },
    });

    return jsonOk({
      mediaId,
      uploadUrl: upload.uploadUrl,
      uploadHeaders: upload.headers,
      driver: upload.driver,
      key: upload.key,
    }, 201);
  } catch (err) {
    return handleRouteError(err);
  }
}

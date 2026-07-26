import { createReadStream, existsSync } from "node:fs";
import path from "node:path";
import { Readable } from "node:stream";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getMembership } from "@/lib/events";
import { jsonError } from "@/lib/http";

export async function GET(req: Request) {
  const user = await getCurrentUser();
  if (!user) return jsonError("AUTH_REQUIRED", "Sign in to continue.", 401);

  const url = new URL(req.url);
  const key = url.searchParams.get("key");
  if (!key || key.includes("..")) {
    return jsonError("VALIDATION_FAILED", "Invalid key.", 400);
  }

  const media = await prisma.media.findFirst({
    where: {
      OR: [{ storageKey: key }, { thumbKey: key }],
    },
  });
  if (!media) return jsonError("MEDIA_NOT_FOUND", "This photo is no longer available.", 404);

  const membership = await getMembership(media.eventId, user.id);
  if (!membership || membership.status !== "active") {
    return jsonError("AUTH_FORBIDDEN", "You don’t have access to do that.", 403);
  }

  const full = path.join(process.cwd(), ".data", "uploads", key);
  if (!existsSync(full)) {
    return jsonError("MEDIA_NOT_FOUND", "This photo is no longer available.", 404);
  }

  const stream = createReadStream(full);
  const contentType =
    key.endsWith(".webp") ? "image/webp" : media.contentType;

  return new Response(Readable.toWeb(stream) as ReadableStream, {
    headers: {
      "Content-Type": contentType,
      "Cache-Control": "private, max-age=3600",
    },
  });
}

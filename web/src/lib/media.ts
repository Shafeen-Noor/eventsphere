import sharp from "sharp";
import {
  putObjectBuffer,
  readObjectBuffer,
  thumbObjectKey,
} from "@/lib/storage";

const ALLOWED = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
  "video/mp4",
  "video/quicktime",
]);

export function isAllowedContentType(type: string) {
  return ALLOWED.has(type.toLowerCase());
}

export function maxBytesFor(type: string) {
  if (type.startsWith("video/")) return 100 * 1024 * 1024;
  return 50 * 1024 * 1024;
}

export function mediaKind(type: string): "image" | "video" {
  return type.startsWith("video/") ? "video" : "image";
}

export async function generateThumbIfImage(params: {
  eventId: string;
  mediaId: string;
  storageKey: string;
  contentType: string;
}) {
  if (!params.contentType.startsWith("image/")) return null;
  // HEIC may fail without libvips heif; swallow and continue
  try {
    const original = await readObjectBuffer(params.storageKey);
    const thumb = await sharp(original)
      .rotate()
      .resize({ width: 720, withoutEnlargement: true })
      .webp({ quality: 78 })
      .toBuffer({ resolveWithObject: true });

    const key = thumbObjectKey(params.eventId, params.mediaId);
    await putObjectBuffer(key, thumb.data, "image/webp");
    return {
      thumbKey: key,
      width: thumb.info.width,
      height: thumb.info.height,
    };
  } catch {
    return null;
  }
}

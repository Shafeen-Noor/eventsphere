import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { createWriteStream, existsSync, mkdirSync } from "node:fs";
import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";

export type StorageDriver = "s3" | "local";

function driver(): StorageDriver {
  if (process.env.STORAGE_DRIVER === "local") return "local";
  if (
    process.env.AWS_S3_BUCKET &&
    (process.env.AWS_ACCESS_KEY_ID || process.env.AWS_PROFILE)
  ) {
    return "s3";
  }
  // Default to S3 when bucket is set; otherwise local for zero-config dev
  if (process.env.AWS_S3_BUCKET) return "s3";
  return "local";
}

function localRoot() {
  return path.join(process.cwd(), ".data", "uploads");
}

function s3() {
  const region = process.env.AWS_REGION || "us-east-1";
  return new S3Client({
    region,
    credentials:
      process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY
        ? {
            accessKeyId: process.env.AWS_ACCESS_KEY_ID,
            secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
            sessionToken: process.env.AWS_SESSION_TOKEN,
          }
        : undefined,
  });
}

function bucket() {
  const b = process.env.AWS_S3_BUCKET;
  if (!b) throw new Error("AWS_S3_BUCKET is not set");
  return b;
}

export function getStorageDriver(): StorageDriver {
  return driver();
}

export async function createUploadUrl(params: {
  key: string;
  contentType: string;
  byteSize: number;
}) {
  if (driver() === "local") {
    const base = process.env.NEXT_PUBLIC_APP_URL || "";
    return {
      driver: "local" as const,
      uploadUrl: `${base}/api/media/local-upload?key=${encodeURIComponent(params.key)}`,
      headers: { "Content-Type": params.contentType },
      key: params.key,
    };
  }

  // Do not sign ContentLength — browser PUT body length mismatches break the signature.
  const command = new PutObjectCommand({
    Bucket: bucket(),
    Key: params.key,
    ContentType: params.contentType,
  });

  const uploadUrl = await getSignedUrl(s3(), command, { expiresIn: 60 * 30 });
  return {
    driver: "s3" as const,
    uploadUrl,
    headers: { "Content-Type": params.contentType },
    key: params.key,
  };
}

export async function objectExists(key: string) {
  if (driver() === "local") {
    return existsSync(path.join(localRoot(), key));
  }
  try {
    await s3().send(new HeadObjectCommand({ Bucket: bucket(), Key: key }));
    return true;
  } catch {
    return false;
  }
}

export async function createDownloadUrl(key: string, expiresIn = 3600) {
  if (driver() === "local") {
    return `/api/media/file?key=${encodeURIComponent(key)}`;
  }
  const command = new GetObjectCommand({ Bucket: bucket(), Key: key });
  return getSignedUrl(s3(), command, { expiresIn });
}

export async function putLocalObject(
  key: string,
  body: Buffer,
  _contentType: string,
) {
  const full = path.join(localRoot(), key);
  await mkdir(path.dirname(full), { recursive: true });
  await writeFile(full, body);
}

export async function readObjectBuffer(key: string): Promise<Buffer> {
  if (driver() === "local") {
    return readFile(path.join(localRoot(), key));
  }
  const res = await s3().send(
    new GetObjectCommand({ Bucket: bucket(), Key: key }),
  );
  const stream = res.Body;
  if (!stream) throw new Error("Empty S3 object");
  const bytes = await stream.transformToByteArray();
  return Buffer.from(bytes);
}

export async function putObjectBuffer(
  key: string,
  body: Buffer,
  contentType: string,
) {
  if (driver() === "local") {
    await putLocalObject(key, body, contentType);
    return;
  }
  await s3().send(
    new PutObjectCommand({
      Bucket: bucket(),
      Key: key,
      Body: body,
      ContentType: contentType,
    }),
  );
}

export async function deleteObject(key: string) {
  if (driver() === "local") {
    const full = path.join(localRoot(), key);
    if (existsSync(full)) await unlink(full);
    return;
  }
  await s3().send(new DeleteObjectCommand({ Bucket: bucket(), Key: key }));
}

export async function saveLocalUploadStream(
  key: string,
  stream: Readable,
) {
  const full = path.join(localRoot(), key);
  mkdirSync(path.dirname(full), { recursive: true });
  await pipeline(stream, createWriteStream(full));
}

export function mediaObjectKey(eventId: string, mediaId: string, filename: string) {
  const safe = filename.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 80);
  return `events/${eventId}/media/${mediaId}/original-${safe}`;
}

export function thumbObjectKey(eventId: string, mediaId: string) {
  return `events/${eventId}/media/${mediaId}/thumb.webp`;
}

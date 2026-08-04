import { prisma } from "@/lib/db";

export type AddFeedItemInput = {
  eventId: string;
  /** Preferred field name in newer routes */
  type?: string;
  /** Alias used by some callers */
  kind?: string;
  actorId?: string | null;
  mediaId?: string | null;
  title?: string;
  body?: string;
  /** Alias for body/title */
  message?: string;
  payload?: unknown;
  meta?: Record<string, unknown>;
};

export async function addFeedItem(input: AddFeedItemInput) {
  const type = input.type || input.kind || "activity";
  const body = input.body || input.message || "";
  const title = input.title || "";
  const payloadSource = input.payload ?? input.meta;
  const payload =
    payloadSource === undefined || payloadSource === null
      ? ""
      : typeof payloadSource === "string"
        ? payloadSource
        : JSON.stringify(payloadSource);

  return prisma.feedItem.create({
    data: {
      eventId: input.eventId,
      type,
      actorId: input.actorId ?? null,
      mediaId: input.mediaId ?? null,
      title,
      body,
      payload,
    },
  });
}

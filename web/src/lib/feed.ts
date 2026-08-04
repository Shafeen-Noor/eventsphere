import { prisma } from "@/lib/db";

export type AddFeedItemInput = {
  eventId: string;
  type: string;
  actorId?: string | null;
  mediaId?: string | null;
  title?: string;
  body?: string;
  payload?: unknown;
};

export async function addFeedItem(input: AddFeedItemInput) {
  const payload =
    input.payload === undefined || input.payload === null
      ? ""
      : typeof input.payload === "string"
        ? input.payload
        : JSON.stringify(input.payload);

  return prisma.feedItem.create({
    data: {
      eventId: input.eventId,
      type: input.type,
      actorId: input.actorId ?? null,
      mediaId: input.mediaId ?? null,
      title: input.title ?? "",
      body: input.body ?? "",
      payload,
    },
  });
}

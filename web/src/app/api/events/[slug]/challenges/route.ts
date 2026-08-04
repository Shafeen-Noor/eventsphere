import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { assertEventMember, assertOrganizer } from "@/lib/events";
import { addFeedItem } from "@/lib/feed";
import { handleRouteError, jsonError, jsonOk } from "@/lib/http";
import { getPlan } from "@/lib/plans";

type Ctx = { params: Promise<{ slug: string }> };

const createSchema = z.object({
  title: z.string().trim().min(1).max(120),
  description: z.string().trim().max(500).optional().default(""),
});

const submitSchema = z.object({
  challengeId: z.string().min(1),
  mediaId: z.string().min(1).optional().nullable(),
  note: z.string().trim().max(500).optional().default(""),
});

async function serializeChallenges(eventId: string, userId: string) {
  const challenges = await prisma.challenge.findMany({
    where: { eventId },
    include: {
      submissions: {
        include: {
          user: { select: { id: true, displayName: true } },
        },
        orderBy: { createdAt: "desc" },
      },
      _count: { select: { submissions: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return challenges.map((c) => ({
    id: c.id,
    title: c.title,
    description: c.description,
    status: c.status,
    createdAt: c.createdAt.toISOString(),
    submissionCount: c._count.submissions,
    mySubmission:
      c.submissions
        .filter((s) => s.userId === userId)
        .map((s) => ({
          id: s.id,
          mediaId: s.mediaId,
          note: s.caption,
          createdAt: s.createdAt.toISOString(),
        }))[0] ?? null,
    submissions: c.submissions.map((s) => ({
      id: s.id,
      mediaId: s.mediaId,
      note: s.caption,
      createdAt: s.createdAt.toISOString(),
      user: s.user,
    })),
  }));
}

export async function GET(_req: Request, ctx: Ctx) {
  try {
    const { slug } = await ctx.params;
    const user = await getCurrentUser();
    if (!user) return jsonError("AUTH_REQUIRED", "Sign in to continue.", 401);

    const event = await prisma.event.findUnique({ where: { slug } });
    if (!event) return jsonError("EVENT_NOT_FOUND", "We can’t find this event.", 404);
    await assertEventMember(event.id, user.id);

    if (!getPlan(event.planTier).features.challenges) {
      return jsonError(
        "PLAN_REQUIRED",
        "Challenges are available on Essential and above.",
        402,
      );
    }

    return jsonOk({
      challenges: await serializeChallenges(event.id, user.id),
    });
  } catch (err) {
    return handleRouteError(err);
  }
}

export async function POST(req: Request, ctx: Ctx) {
  try {
    const { slug } = await ctx.params;
    const user = await getCurrentUser();
    if (!user) return jsonError("AUTH_REQUIRED", "Sign in to continue.", 401);

    const event = await prisma.event.findUnique({ where: { slug } });
    if (!event) return jsonError("EVENT_NOT_FOUND", "We can’t find this event.", 404);
    await assertEventMember(event.id, user.id);

    if (!getPlan(event.planTier).features.challenges) {
      return jsonError(
        "PLAN_REQUIRED",
        "Challenges are available on Essential and above.",
        402,
      );
    }

    const raw = await req.json();

    if (raw && typeof raw === "object" && "challengeId" in raw) {
      const body = submitSchema.parse(raw);
      const challenge = await prisma.challenge.findFirst({
        where: { id: body.challengeId, eventId: event.id },
      });
      if (!challenge) {
        return jsonError("CHALLENGE_NOT_FOUND", "That challenge wasn’t found.", 404);
      }
      if (challenge.status !== "open") {
        return jsonError("CHALLENGE_CLOSED", "This challenge is closed.", 409);
      }

      if (body.mediaId) {
        const media = await prisma.media.findFirst({
          where: {
            id: body.mediaId,
            eventId: event.id,
            state: { in: ["published", "pending_approval"] },
          },
        });
        if (!media) {
          return jsonError(
            "MEDIA_NOT_FOUND",
            "This photo is no longer available.",
            404,
          );
        }
      }

      await prisma.challengeSubmission.upsert({
        where: {
          challengeId_userId: {
            challengeId: challenge.id,
            userId: user.id,
          },
        },
        create: {
          challengeId: challenge.id,
          userId: user.id,
          mediaId: body.mediaId || null,
          caption: body.note ?? "",
        },
        update: {
          mediaId: body.mediaId || null,
          caption: body.note ?? "",
        },
      });

      await addFeedItem({
        eventId: event.id,
        type: "challenge_submit",
        actorId: user.id,
        mediaId: body.mediaId || null,
        title: "Challenge entry",
        body: challenge.title,
      });

      return jsonOk({
        challenges: await serializeChallenges(event.id, user.id),
      });
    }

    await assertOrganizer(event.id, user.id);
    const body = createSchema.parse(raw);
    const challenge = await prisma.challenge.create({
      data: {
        eventId: event.id,
        title: body.title,
        description: body.description ?? "",
      },
    });

    await addFeedItem({
      eventId: event.id,
      type: "challenge",
      actorId: user.id,
      title: "New challenge",
      body: challenge.title,
      payload: { challengeId: challenge.id },
    });

    return jsonOk(
      { challenges: await serializeChallenges(event.id, user.id) },
      201,
    );
  } catch (err) {
    return handleRouteError(err);
  }
}

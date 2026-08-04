import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { assertEventMember, assertOrganizer } from "@/lib/events";
import { addFeedItem } from "@/lib/feed";
import { handleRouteError, jsonError, jsonOk } from "@/lib/http";
import { getPlan } from "@/lib/plans";

type Ctx = { params: Promise<{ slug: string }> };

const createSchema = z.object({
  kind: z.string().trim().min(1).max(40).default("choice"),
  question: z.string().trim().min(1).max(240),
  options: z.array(z.string().trim().min(1).max(120)).min(2).max(12),
});

const voteSchema = z.object({
  pollId: z.string().min(1),
  optionId: z.string().min(1),
});

async function serializePolls(eventId: string, userId: string) {
  const polls = await prisma.poll.findMany({
    where: { eventId },
    include: {
      options: {
        include: { _count: { select: { votes: true } } },
        orderBy: { sortOrder: "asc" },
      },
      votes: {
        where: { userId },
        select: { optionId: true },
        take: 1,
      },
      _count: { select: { votes: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return polls.map((poll) => ({
    id: poll.id,
    kind: poll.kind,
    question: poll.question,
    status: poll.status,
    closesAt: poll.closesAt?.toISOString() ?? null,
    createdAt: poll.createdAt.toISOString(),
    voteCount: poll._count.votes,
    myOptionId: poll.votes[0]?.optionId ?? null,
    options: poll.options.map((opt) => ({
      id: opt.id,
      label: opt.label,
      sortOrder: opt.sortOrder,
      votes: opt._count.votes,
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

    if (!getPlan(event.planTier).features.polls) {
      return jsonError(
        "PLAN_REQUIRED",
        "Polls are available on Essential and above.",
        402,
      );
    }

    return jsonOk({ polls: await serializePolls(event.id, user.id) });
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

    if (!getPlan(event.planTier).features.polls) {
      return jsonError(
        "PLAN_REQUIRED",
        "Polls are available on Essential and above.",
        402,
      );
    }

    const raw = await req.json();

    if (raw && typeof raw === "object" && "pollId" in raw) {
      const body = voteSchema.parse(raw);
      const poll = await prisma.poll.findFirst({
        where: { id: body.pollId, eventId: event.id },
        include: { options: true },
      });
      if (!poll) return jsonError("POLL_NOT_FOUND", "That poll wasn’t found.", 404);
      if (poll.status !== "open") {
        return jsonError("POLL_CLOSED", "This poll is closed.", 409);
      }
      if (poll.closesAt && poll.closesAt.getTime() <= Date.now()) {
        return jsonError("POLL_CLOSED", "This poll is closed.", 409);
      }
      if (!poll.options.some((o) => o.id === body.optionId)) {
        return jsonError("OPTION_INVALID", "Choose a valid poll option.", 422);
      }

      await prisma.pollVote.upsert({
        where: { pollId_userId: { pollId: poll.id, userId: user.id } },
        create: {
          pollId: poll.id,
          optionId: body.optionId,
          userId: user.id,
        },
        update: { optionId: body.optionId },
      });

      await addFeedItem({
        eventId: event.id,
        type: "poll_vote",
        actorId: user.id,
        title: "Poll vote",
        body: poll.question,
        payload: { pollId: poll.id, optionId: body.optionId },
      });

      return jsonOk({ polls: await serializePolls(event.id, user.id) });
    }

    await assertOrganizer(event.id, user.id);
    const body = createSchema.parse(raw);
    const poll = await prisma.poll.create({
      data: {
        eventId: event.id,
        kind: body.kind,
        question: body.question,
        options: {
          create: body.options.map((label, index) => ({
            label,
            sortOrder: index,
          })),
        },
      },
    });

    await addFeedItem({
      eventId: event.id,
      type: "poll",
      actorId: user.id,
      title: "New poll",
      body: body.question,
      payload: { pollId: poll.id },
    });

    return jsonOk({ polls: await serializePolls(event.id, user.id) }, 201);
  } catch (err) {
    return handleRouteError(err);
  }
}

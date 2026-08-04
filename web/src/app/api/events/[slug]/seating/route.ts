import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { assertEventMember, assertOrganizer } from "@/lib/events";
import { handleRouteError, jsonError, jsonOk } from "@/lib/http";
import { getPlan } from "@/lib/plans";

type Ctx = { params: Promise<{ slug: string }> };

const assignmentSchema = z.object({
  userId: z.string().min(1).optional().nullable(),
  guestName: z.string().trim().max(80).optional().default(""),
  seatLabel: z.string().trim().max(40).optional().default(""),
});

const tableSchema = z.object({
  id: z.string().min(1).optional(),
  name: z.string().trim().min(1).max(80),
  capacity: z.number().int().min(1).max(100).optional().default(8),
  sortOrder: z.number().int().optional(),
  assignments: z.array(assignmentSchema).max(100).optional().default([]),
});

const upsertSchema = z.object({
  tables: z.array(tableSchema).max(100),
});

async function loadSeating(eventId: string, userId: string) {
  const tables = await prisma.seatingTable.findMany({
    where: { eventId },
    include: {
      assignments: {
        include: {
          user: { select: { id: true, displayName: true } },
        },
        orderBy: { createdAt: "asc" },
      },
    },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
  });

  let myTable: {
    id: string;
    name: string;
    seatLabel: string;
  } | null = null;

  const mapped = tables.map((table) => {
    const assignments = table.assignments.map((a) => {
      if (a.userId === userId) {
        myTable = {
          id: table.id,
          name: table.name,
          seatLabel: a.seatLabel,
        };
      }
      return {
        id: a.id,
        userId: a.userId,
        guestName: a.guestName || a.user?.displayName || "",
        seatLabel: a.seatLabel,
        user: a.user,
      };
    });
    return {
      id: table.id,
      name: table.name,
      capacity: table.capacity,
      sortOrder: table.sortOrder,
      assignments,
    };
  });

  return { tables: mapped, myTable };
}

export async function GET(_req: Request, ctx: Ctx) {
  try {
    const { slug } = await ctx.params;
    const user = await getCurrentUser();
    if (!user) return jsonError("AUTH_REQUIRED", "Sign in to continue.", 401);

    const event = await prisma.event.findUnique({ where: { slug } });
    if (!event) return jsonError("EVENT_NOT_FOUND", "We can’t find this event.", 404);
    await assertEventMember(event.id, user.id);

    if (!getPlan(event.planTier).features.seating) {
      return jsonError(
        "PLAN_REQUIRED",
        "Seating charts are available on Essential and above.",
        402,
      );
    }

    return jsonOk(await loadSeating(event.id, user.id));
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
    await assertOrganizer(event.id, user.id);

    if (!getPlan(event.planTier).features.seating) {
      return jsonError(
        "PLAN_REQUIRED",
        "Seating charts are available on Essential and above.",
        402,
      );
    }

    const body = upsertSchema.parse(await req.json());

    await prisma.$transaction(async (tx) => {
      const existing = await tx.seatingTable.findMany({
        where: { eventId: event.id },
        select: { id: true },
      });
      const keepIds = new Set(
        body.tables.map((t) => t.id).filter((id): id is string => Boolean(id)),
      );
      const toDelete = existing.filter((t) => !keepIds.has(t.id)).map((t) => t.id);
      if (toDelete.length) {
        await tx.seatAssignment.deleteMany({
          where: { tableId: { in: toDelete } },
        });
        await tx.seatingTable.deleteMany({
          where: { id: { in: toDelete } },
        });
      }

      for (const [index, table] of body.tables.entries()) {
        const sortOrder = table.sortOrder ?? index;
        let tableId = table.id;
        if (tableId) {
          const updated = await tx.seatingTable.updateMany({
            where: { id: tableId, eventId: event.id },
            data: {
              name: table.name,
              capacity: table.capacity ?? 8,
              sortOrder,
            },
          });
          if (!updated.count) {
            const created = await tx.seatingTable.create({
              data: {
                eventId: event.id,
                name: table.name,
                capacity: table.capacity ?? 8,
                sortOrder,
              },
            });
            tableId = created.id;
          }
        } else {
          const created = await tx.seatingTable.create({
            data: {
              eventId: event.id,
              name: table.name,
              capacity: table.capacity ?? 8,
              sortOrder,
            },
          });
          tableId = created.id;
        }

        await tx.seatAssignment.deleteMany({ where: { tableId } });
        if (table.assignments?.length) {
          await tx.seatAssignment.createMany({
            data: table.assignments.map((a) => ({
              tableId: tableId!,
              userId: a.userId || null,
              guestName: a.guestName ?? "",
              seatLabel: a.seatLabel ?? "",
            })),
          });
        }
      }
    });

    return jsonOk(await loadSeating(event.id, user.id));
  } catch (err) {
    return handleRouteError(err);
  }
}

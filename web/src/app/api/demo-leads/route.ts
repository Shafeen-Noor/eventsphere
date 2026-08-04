import { z } from "zod";
import { prisma } from "@/lib/db";
import { handleRouteError, jsonOk } from "@/lib/http";
import { normalizePlanId } from "@/lib/plans";

const schema = z.object({
  name: z.string().trim().min(1).max(120),
  email: z.string().trim().email().max(200),
  company: z.string().trim().max(160).optional().default(""),
  message: z.string().trim().max(2000).optional().default(""),
  planInterest: z.string().trim().max(40).optional().default("enterprise"),
});

export async function POST(req: Request) {
  try {
    const body = schema.parse(await req.json());
    const planInterest = normalizePlanId(body.planInterest);

    const lead = await prisma.demoLead.create({
      data: {
        name: body.name,
        email: body.email.toLowerCase(),
        company: body.company ?? "",
        message: body.message ?? "",
        planInterest,
      },
    });

    return jsonOk(
      {
        lead: {
          id: lead.id,
          name: lead.name,
          email: lead.email,
          company: lead.company,
          planInterest: lead.planInterest,
          createdAt: lead.createdAt.toISOString(),
        },
      },
      201,
    );
  } catch (err) {
    return handleRouteError(err);
  }
}

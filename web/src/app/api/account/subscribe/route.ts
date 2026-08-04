import { z } from "zod";
import { publicUserDto, requireVerifiedAccount } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { handleRouteError, jsonError, jsonOk } from "@/lib/http";
import { getPlan, normalizePlanId } from "@/lib/plans";

const schema = z.object({
  plan: z
    .enum(["essential", "premium", "enterprise", "pro", "professional"])
    .optional()
    .default("essential"),
  confirmPayment: z.boolean().optional().default(false),
});

export async function POST(req: Request) {
  try {
    const body = schema.parse(await req.json().catch(() => ({})));
    const planId = normalizePlanId(body.plan);
    if (planId === "free") {
      return jsonError(
        "PLAN_INVALID",
        "Choose Essential, Premium, or Enterprise.",
        422,
      );
    }

    const plan = getPlan(planId);

    if (!body.confirmPayment) {
      return jsonError(
        "PAYMENT_REQUIRED",
        `Confirm subscription payment to upgrade to ${plan.label}.`,
        402,
        { amountCents: plan.priceCents, plan: plan.id },
      );
    }

    const user = await requireVerifiedAccount();
    if (normalizePlanId(user.plan) === plan.id) {
      return jsonOk({ user: publicUserDto(user), alreadySubscribed: true });
    }

    const updated = await prisma.user.update({
      where: { id: user.id },
      data: { plan: plan.id },
    });

    return jsonOk({
      user: publicUserDto(updated),
      alreadySubscribed: false,
      plan: plan.id,
    });
  } catch (err) {
    return handleRouteError(err);
  }
}

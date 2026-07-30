import { z } from "zod";
import { requireVerifiedAccount } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { handleRouteError, jsonError, jsonOk } from "@/lib/http";
import { publicUserDto } from "@/lib/auth";

const schema = z.object({
  confirmPayment: z.boolean().optional().default(false),
});

export async function POST(req: Request) {
  try {
    const body = schema.parse(await req.json().catch(() => ({})));
    if (!body.confirmPayment) {
      return jsonError(
        "PAYMENT_REQUIRED",
        "Confirm subscription payment to upgrade to Pro.",
        402,
      );
    }

    const user = await requireVerifiedAccount();
    if (user.plan === "pro") {
      return jsonOk({ user: publicUserDto(user), alreadyPro: true });
    }

    const updated = await prisma.user.update({
      where: { id: user.id },
      data: { plan: "pro" },
    });

    return jsonOk({ user: publicUserDto(updated), alreadyPro: false });
  } catch (err) {
    return handleRouteError(err);
  }
}

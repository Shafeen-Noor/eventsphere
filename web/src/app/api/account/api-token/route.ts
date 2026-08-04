import { createHash, randomBytes } from "node:crypto";
import { publicUserDto, requireVerifiedAccount } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { handleRouteError, jsonError, jsonOk } from "@/lib/http";
import { getPlan, normalizePlanId } from "@/lib/plans";

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export async function POST() {
  try {
    const user = await requireVerifiedAccount();
    const plan = getPlan(normalizePlanId(user.plan));

    if (!plan.features.api) {
      return jsonError(
        "PLAN_REQUIRED",
        "API tokens are available on Enterprise.",
        402,
      );
    }

    const token = `es_${randomBytes(24).toString("hex")}`;
    const updated = await prisma.user.update({
      where: { id: user.id },
      data: { apiTokenHash: hashToken(token) },
    });

    return jsonOk({
      token,
      user: publicUserDto(updated),
      message: "Store this token now — it won’t be shown again.",
    });
  } catch (err) {
    return handleRouteError(err);
  }
}

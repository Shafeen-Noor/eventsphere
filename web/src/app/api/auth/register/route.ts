import { z } from "zod";
import { publicUserDto, registerAccount } from "@/lib/auth";
import { handleRouteError, jsonOk } from "@/lib/http";

const schema = z.object({
  displayName: z.string().trim().min(1).max(40),
  email: z.string().trim().email().max(120),
  password: z.string().min(8).max(72),
  organizationName: z.string().trim().max(80).optional().nullable(),
  hostType: z.enum(["planner", "venue", "individual"]).optional().nullable(),
  plan: z
    .enum(["free", "essential", "premium", "enterprise", "pro", "professional"])
    .optional()
    .default("free"),
  skipOtp: z.boolean().optional().default(false),
});

export async function POST(req: Request) {
  try {
    const body = schema.parse(await req.json());
    const { user, demoCode } = await registerAccount(body);
    return jsonOk(
      {
        user: publicUserDto(user),
        demoCode,
        needsVerification: !user.emailVerifiedAt,
      },
      201,
    );
  } catch (err) {
    return handleRouteError(err);
  }
}

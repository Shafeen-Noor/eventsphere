import { z } from "zod";
import {
  getCurrentUser,
  isAccountUser,
  issueEmailOtp,
  publicUserDto,
  requireAccount,
  verifyEmailOtp,
} from "@/lib/auth";
import { handleRouteError, jsonError, jsonOk } from "@/lib/http";

const verifySchema = z.object({
  code: z.string().trim().regex(/^\d{4}$/, "Enter the 4-digit code."),
});

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user || !isAccountUser(user)) {
      return jsonError("AUTH_REQUIRED", "Sign in to continue.", 401);
    }
    if (user.emailVerifiedAt) {
      return jsonOk({
        user: publicUserDto(user),
        verified: true,
        demoCode: null,
      });
    }
    // Re-issue if missing/expired so the verify screen always has a working code.
    let demoCode: string | null = null;
    if (!user.otpHash || !user.otpExpiresAt || user.otpExpiresAt < new Date()) {
      const issued = await issueEmailOtp(user.id);
      demoCode = issued.code;
    }
    return jsonOk({
      user: publicUserDto(user),
      verified: false,
      demoCode,
      hint: "Email delivery isn’t connected yet — use the demo code shown here.",
    });
  } catch (err) {
    return handleRouteError(err);
  }
}

export async function POST(req: Request) {
  try {
    const user = await requireAccount();
    if (user.emailVerifiedAt) {
      return jsonOk({ user: publicUserDto(user), verified: true });
    }
    const body = verifySchema.parse(await req.json());
    const updated = await verifyEmailOtp(user.id, body.code);
    return jsonOk({ user: publicUserDto(updated), verified: true });
  } catch (err) {
    return handleRouteError(err);
  }
}

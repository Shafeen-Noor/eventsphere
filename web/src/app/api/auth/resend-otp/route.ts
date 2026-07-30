import { issueEmailOtp, publicUserDto, requireAccount } from "@/lib/auth";
import { handleRouteError, jsonOk } from "@/lib/http";

export async function POST() {
  try {
    const user = await requireAccount();
    if (user.emailVerifiedAt) {
      return jsonOk({ user: publicUserDto(user), demoCode: null, verified: true });
    }
    const { code } = await issueEmailOtp(user.id);
    return jsonOk({
      user: publicUserDto(user),
      demoCode: code,
      verified: false,
      hint: "Email delivery isn’t connected yet — use the demo code shown here.",
    });
  } catch (err) {
    return handleRouteError(err);
  }
}

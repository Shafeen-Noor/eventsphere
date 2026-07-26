import { getCurrentUser, publicUserDto } from "@/lib/auth";
import { handleRouteError, jsonOk } from "@/lib/http";

export async function GET() {
  try {
    const user = await getCurrentUser();
    return jsonOk({
      user: user ? publicUserDto(user) : null,
    });
  } catch (err) {
    return handleRouteError(err);
  }
}

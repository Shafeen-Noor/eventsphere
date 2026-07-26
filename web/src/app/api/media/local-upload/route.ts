import { getCurrentUser } from "@/lib/auth";
import { handleRouteError, jsonError, jsonOk } from "@/lib/http";
import { putLocalObject } from "@/lib/storage";

export async function PUT(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) return jsonError("AUTH_REQUIRED", "Sign in to continue.", 401);

    const url = new URL(req.url);
    const key = url.searchParams.get("key");
    if (!key || key.includes("..")) {
      return jsonError("VALIDATION_FAILED", "Invalid upload key.", 400);
    }

    const contentType = req.headers.get("content-type") || "application/octet-stream";
    const buf = Buffer.from(await req.arrayBuffer());
    await putLocalObject(key, buf, contentType);
    return jsonOk({ ok: true, key });
  } catch (err) {
    return handleRouteError(err);
  }
}

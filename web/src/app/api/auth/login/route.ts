import { z } from "zod";
import { loginAccount, publicUserDto } from "@/lib/auth";
import { handleRouteError, jsonOk } from "@/lib/http";

const schema = z.object({
  email: z.string().trim().email().max(120),
  password: z.string().min(1).max(72),
});

export async function POST(req: Request) {
  try {
    const body = schema.parse(await req.json());
    const user = await loginAccount(body);
    return jsonOk({ user: publicUserDto(user) });
  } catch (err) {
    return handleRouteError(err);
  }
}

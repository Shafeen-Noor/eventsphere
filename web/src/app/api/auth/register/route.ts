import { z } from "zod";
import { publicUserDto, registerAccount } from "@/lib/auth";
import { handleRouteError, jsonOk } from "@/lib/http";

const schema = z.object({
  displayName: z.string().trim().min(1).max(40),
  email: z.string().trim().email().max(120),
  password: z.string().min(8).max(72),
});

export async function POST(req: Request) {
  try {
    const body = schema.parse(await req.json());
    const user = await registerAccount(body);
    return jsonOk({ user: publicUserDto(user) }, 201);
  } catch (err) {
    return handleRouteError(err);
  }
}

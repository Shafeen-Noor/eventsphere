import { NextResponse } from "next/server";
import { ZodError } from "zod";

export function jsonOk<T>(data: T, status = 200) {
  return NextResponse.json(data, { status });
}

export function jsonError(
  code: string,
  message: string,
  status = 400,
  details?: unknown,
) {
  return NextResponse.json(
    { error: { code, message, details } },
    { status },
  );
}

export function handleRouteError(err: unknown) {
  if (err instanceof Response) return err;
  if (err instanceof ZodError) {
    return jsonError(
      "VALIDATION_FAILED",
      "Check the highlighted fields.",
      422,
      err.flatten(),
    );
  }
  console.error(err);
  return jsonError("SERVER_ERROR", "Something went wrong.", 500);
}

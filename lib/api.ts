import { ZodError, type ZodType } from "zod";
import { AppError, publicError } from "@/lib/errors";

export function jsonOk<T>(data: T, init?: ResponseInit): Response {
  return Response.json({ ok: true, data }, init);
}

export function jsonError(error: unknown): Response {
  if (error instanceof ZodError) {
    return Response.json(
      { ok: false, error: { code: "validation_error", message: error.issues[0]?.message ?? "Validation failed.", issues: error.issues } },
      { status: 400 }
    );
  }
  const details = publicError(error);
  return Response.json(
    { ok: false, error: { code: details.code, message: details.message } },
    { status: details.statusCode }
  );
}

export async function readJson(request: Request, maxBytes = 100_000): Promise<unknown> {
  const declared = Number(request.headers.get("content-length") ?? 0);
  if (declared > maxBytes) throw new AppError("Request body is too large.", 413, "request_too_large");
  const text = await request.text();
  if (text.length > maxBytes) throw new AppError("Request body is too large.", 413, "request_too_large");
  try {
    return text ? JSON.parse(text) : {};
  } catch {
    throw new AppError("Request body must be valid JSON.", 400, "invalid_json");
  }
}

export function parseWith<T>(schema: ZodType<T>, value: unknown): T {
  return schema.parse(value);
}

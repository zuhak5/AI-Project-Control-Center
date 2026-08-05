import { ZodError, type ZodType } from "zod";
import { AppError, publicError } from "@/lib/errors";
import { getAppOrigin } from "@/lib/auth/config";

function responseHeaders(init?: ResponseInit): Headers {
  const headers = new Headers(init?.headers);
  headers.set("Cache-Control", "no-store, max-age=0");
  headers.set("Pragma", "no-cache");
  return headers;
}
export function jsonOk<T>(data: T, init?: ResponseInit): Response {
  return Response.json({ ok: true, data }, { ...init, headers: responseHeaders(init) });
}
export function jsonError(error: unknown): Response {
  if (error instanceof ZodError) {
    return Response.json(
      { ok: false, error: { code: "validation_error", message: error.issues[0]?.message ?? "Validation failed.", issues: error.issues } },
      { status: 400, headers: responseHeaders() }
    );
  }
  const details = publicError(error);
  return Response.json({ ok: false, error: { code: details.code, message: details.message } }, { status: details.statusCode, headers: responseHeaders() });
}
export function assertSameOrigin(request: Request): void {
  const fetchSite = request.headers.get("sec-fetch-site");
  if (fetchSite && fetchSite !== "same-origin") throw new AppError("Cross-origin mutation requests are not allowed.", 403, "cross_origin_request");
  const expectedOrigin = getAppOrigin();
  const suppliedOrigin = request.headers.get("origin");
  const referer = request.headers.get("referer");
  let actualOrigin: string | null = suppliedOrigin;
  if (!actualOrigin && referer) {
    try { actualOrigin = new URL(referer).origin; } catch { actualOrigin = null; }
  }
  if (!actualOrigin || actualOrigin !== expectedOrigin) throw new AppError("Request origin could not be verified.", 403, "cross_origin_request");
}
export async function readJson(request: Request, maxBytes = 100_000): Promise<unknown> {
  const contentType = request.headers.get("content-type")?.split(";", 1)[0]?.trim().toLowerCase();
  if (!contentType || (contentType !== "application/json" && !contentType.endsWith("+json"))) throw new AppError("Request Content-Type must be application/json.", 415, "unsupported_media_type");
  const declared = Number(request.headers.get("content-length") ?? 0);
  if (Number.isFinite(declared) && declared > maxBytes) throw new AppError("Request body is too large.", 413, "request_too_large");
  const text = await request.text();
  if (new TextEncoder().encode(text).byteLength > maxBytes) throw new AppError("Request body is too large.", 413, "request_too_large");
  try { return text ? JSON.parse(text) : {}; }
  catch { throw new AppError("Request body must be valid JSON.", 400, "invalid_json"); }
}
export function parseWith<T>(schema: ZodType<T>, value: unknown): T { return schema.parse(value); }

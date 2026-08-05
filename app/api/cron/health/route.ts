import { AppError } from "@/lib/errors";
import { performHealthCheck } from "@/lib/gateway";
import { appendHealthCheck, getState } from "@/lib/store";

export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return Response.json({ ok: false, error: { code: "cron_not_configured", message: "CRON_SECRET is not configured." } }, { status: 500 });
  if (request.headers.get("authorization") !== `Bearer ${secret}`) return Response.json({ ok: false, error: { code: "unauthorized", message: "Unauthorized." } }, { status: 401 });
  try { const state = await getState(); const result = await performHealthCheck(state.settings); await appendHealthCheck(result.check, result.event); return Response.json({ ok: true, data: result.check }); }
  catch (error) { const message = error instanceof AppError ? error.message : "Scheduled health check failed."; console.error(error); return Response.json({ ok: false, error: { code: "cron_failed", message } }, { status: 500 }); }
}

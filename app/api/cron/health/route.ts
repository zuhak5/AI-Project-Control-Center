import { safeEqual } from "@/lib/crypto";
import { performHealthCheck } from "@/lib/gateway";
import { getOperationalSettings, tryAppendHealthCheck } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || secret.length < 16 || /[\r\n]/.test(secret)) {
    return Response.json({ ok: false, error: { code: "cron_not_configured", message: "CRON_SECRET is not configured correctly." } }, { status: 500, headers: { "Cache-Control": "no-store" } });
  }
  if (!safeEqual(request.headers.get("authorization") ?? "", `Bearer ${secret}`)) {
    return Response.json({ ok: false, error: { code: "unauthorized", message: "Unauthorized." } }, { status: 401, headers: { "Cache-Control": "no-store" } });
  }
  try {
    const result = await performHealthCheck(await getOperationalSettings());
    const telemetryStored = await tryAppendHealthCheck(result.check, result.event);
    return Response.json({ ok: true, data: { ...result.check, telemetryStored } }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Scheduled health check failed", error);
    return Response.json({ ok: false, error: { code: "cron_failed", message: "Scheduled health check failed." } }, { status: 500, headers: { "Cache-Control": "no-store" } });
  }
}

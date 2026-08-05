import { assertSameOrigin, jsonError, jsonOk } from "@/lib/api";
import { requireApiSession } from "@/lib/auth/session";
import { performHealthCheck } from "@/lib/gateway";
import { getOperationalSettings, getState, tryAppendHealthCheck } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function GET() {
  try { await requireApiSession(); return jsonOk((await getState()).healthChecks); }
  catch (error) { return jsonError(error); }
}

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    await requireApiSession();
    const result = await performHealthCheck(await getOperationalSettings());
    const telemetryStored = await tryAppendHealthCheck(result.check, result.event);
    return jsonOk({ ...result.check, telemetryStored });
  } catch (error) { return jsonError(error); }
}

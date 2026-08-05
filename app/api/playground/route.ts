import { assertSameOrigin, jsonError, jsonOk, readJson } from "@/lib/api";
import { requireApiSession } from "@/lib/auth/session";
import { errorEvent, executeGateway, successEvent } from "@/lib/gateway";
import { getOperationalSettings, tryAppendGatewayEvent } from "@/lib/store";
import { playgroundSchema } from "@/lib/validation";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const started = Date.now();
  let authenticated = false;
  try {
    assertSameOrigin(request);
    await requireApiSession();
    authenticated = true;
    const input = playgroundSchema.parse(await readJson(request));
    const settings = await getOperationalSettings();
    const result = await executeGateway(input, settings.timeoutMs);
    const telemetryStored = await tryAppendGatewayEvent(successEvent(result, "playground"));
    return jsonOk({ ...result, telemetryStored });
  } catch (error) {
    if (authenticated) await tryAppendGatewayEvent(errorEvent(error, "playground", started));
    return jsonError(error);
  }
}

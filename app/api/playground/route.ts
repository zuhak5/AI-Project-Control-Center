import { jsonError, jsonOk, readJson } from "@/lib/api";
import { requireApiSession } from "@/lib/auth/session";
import { errorEvent, executeGateway, successEvent } from "@/lib/gateway";
import { appendGatewayEvent, getState } from "@/lib/store";
import { playgroundSchema } from "@/lib/validation";

export const dynamic = "force-dynamic";
export async function POST(request: Request) {
  const started = Date.now();
  let authenticated = false;
  try {
    await requireApiSession(); authenticated = true;
    const input = playgroundSchema.parse(await readJson(request));
    const state = await getState();
    const result = await executeGateway(input, state.settings.timeoutMs);
    await appendGatewayEvent(successEvent(result, "playground"));
    return jsonOk(result);
  } catch (error) {
    if (authenticated) {
      try { await appendGatewayEvent(errorEvent(error, "playground", started)); }
      catch (storageError) { console.error("Could not persist failed gateway event", storageError); }
    }
    return jsonError(error);
  }
}

import { jsonError } from "@/lib/api";
import { requireApiSession } from "@/lib/auth/session";
import { getGatewayReadiness, INFRASTRUCTURE } from "@/lib/gateway-config";
import { getState } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await requireApiSession();
    const state = await getState();
    const body = JSON.stringify({
      exportedAt: new Date().toISOString(), gateway: getGatewayReadiness(), infrastructure: INFRASTRUCTURE,
      settings: state.settings, healthChecks: state.healthChecks, events: state.events, auditLog: state.auditLog
    }, null, 2);
    return new Response(body, { headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="homepilot-gateway-export-${new Date().toISOString().slice(0, 10)}.json"`,
      "Cache-Control": "no-store, max-age=0", Pragma: "no-cache"
    } });
  } catch (error) { return jsonError(error); }
}

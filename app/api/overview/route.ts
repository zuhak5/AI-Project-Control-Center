import { jsonError, jsonOk } from "@/lib/api";
import { requireApiSession } from "@/lib/auth/session";
import { getGatewayReadiness, INFRASTRUCTURE } from "@/lib/gateway-config";
import { calculateOverview, latestHealthStatus } from "@/lib/metrics";
import { getState, getStorageMode } from "@/lib/store";
export const dynamic = "force-dynamic";
export async function GET() { try { await requireApiSession(); const state = await getState(); return jsonOk({ metrics: calculateOverview(state), health: latestHealthStatus(state), gateway: getGatewayReadiness(), infrastructure: INFRASTRUCTURE, storageMode: getStorageMode() }); } catch (error) { return jsonError(error); } }

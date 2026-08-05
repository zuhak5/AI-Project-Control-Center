import { jsonError, jsonOk } from "@/lib/api";
import { requireApiSession } from "@/lib/auth/session";
import { performHealthCheck } from "@/lib/gateway";
import { appendHealthCheck, getState } from "@/lib/store";

export const dynamic = "force-dynamic";
export async function GET() { try { await requireApiSession(); const state = await getState(); return jsonOk(state.healthChecks); } catch (error) { return jsonError(error); } }
export async function POST() { try { await requireApiSession(); const state = await getState(); const result = await performHealthCheck(state.settings); await appendHealthCheck(result.check, result.event); return jsonOk(result.check); } catch (error) { return jsonError(error); } }

import { jsonError, jsonOk } from "@/lib/api";
import { requireApiSession } from "@/lib/auth/session";
import { getState } from "@/lib/store";
export const dynamic = "force-dynamic";
export async function GET() { try { await requireApiSession(); return jsonOk((await getState()).events); } catch (error) { return jsonError(error); } }

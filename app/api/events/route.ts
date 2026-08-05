import { jsonError, jsonOk } from "@/lib/api";
import { requireApiSession } from "@/lib/auth/session";
import { getState } from "@/lib/store";

export async function GET(request: Request) {
  try {
    await requireApiSession();
    const url = new URL(request.url);
    const projectId = url.searchParams.get("projectId");
    const limit = Math.min(Math.max(Number(url.searchParams.get("limit") ?? 100), 1), 500);
    const state = await getState();
    const events = state.events.filter((event) => !projectId || event.projectId === projectId).slice(0, limit);
    return jsonOk(events);
  } catch (error) {
    return jsonError(error);
  }
}

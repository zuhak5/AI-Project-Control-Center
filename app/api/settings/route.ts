import { randomUUID } from "node:crypto";
import { jsonError, jsonOk, readJson } from "@/lib/api";
import { requireApiSession } from "@/lib/auth/session";
import { getState, updateSettings } from "@/lib/store";
import { settingsSchema } from "@/lib/validation";
export const dynamic = "force-dynamic";
export async function GET() { try { await requireApiSession(); return jsonOk((await getState()).settings); } catch (error) { return jsonError(error); } }
export async function PATCH(request: Request) { try { const session = await requireApiSession(); const settings = settingsSchema.parse(await readJson(request)); const saved = await updateSettings(settings, { id: randomUUID(), timestamp: new Date().toISOString(), actor: session.user.login, action: "settings.updated", summary: "Updated gateway health, timeout, output, and retention settings." }); return jsonOk(saved); } catch (error) { return jsonError(error); } }

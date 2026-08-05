import { z } from "zod";
import { jsonError, jsonOk, parseWith, readJson } from "@/lib/api";
import { requireApiSession } from "@/lib/auth/session";
import { audit } from "@/lib/factories";
import { getState, updateSettings } from "@/lib/store";

const settingsSchema = z.object({
  retentionDays: z.number().int().min(7).max(3650).optional(),
  defaultTimeoutMs: z.number().int().min(1000).max(120000).optional(),
  telemetryEnabled: z.boolean().optional()
});

export async function GET() {
  try {
    await requireApiSession();
    return jsonOk((await getState()).settings);
  } catch (error) {
    return jsonError(error);
  }
}

export async function PATCH(request: Request) {
  try {
    const session = await requireApiSession();
    const input = parseWith(settingsSchema, await readJson(request));
    const settings = await updateSettings(input, audit(session, "settings.updated", "settings", null, "Updated control-center settings."));
    return jsonOk(settings);
  } catch (error) {
    return jsonError(error);
  }
}

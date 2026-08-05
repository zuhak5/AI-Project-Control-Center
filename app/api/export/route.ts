import { requireApiSession } from "@/lib/auth/session";
import { jsonError } from "@/lib/api";
import { getState } from "@/lib/store";

export async function GET() {
  try {
    await requireApiSession();
    const state = await getState();
    const sanitized = {
      ...state,
      projects: state.projects.map((project) => ({
        ...project,
        telemetry: { enabled: project.telemetry.enabled, tokenConfigured: Boolean(project.telemetry.ingestTokenHash) }
      }))
    };
    return new Response(JSON.stringify(sanitized, null, 2), {
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="ai-control-center-export-${new Date().toISOString().slice(0, 10)}.json"`
      }
    });
  } catch (error) {
    return jsonError(error);
  }
}

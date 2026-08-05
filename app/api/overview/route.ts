import { jsonError, jsonOk } from "@/lib/api";
import { requireApiSession } from "@/lib/auth/session";
import { calculateOverview, latestProjectStatus } from "@/lib/metrics";
import { hasProviderSecret } from "@/lib/security";
import { getState } from "@/lib/store";

export async function GET() {
  try {
    await requireApiSession();
    const state = await getState();
    return jsonOk({
      metrics: calculateOverview(state),
      projects: state.projects.map((project) => ({
        id: project.id,
        name: project.name,
        environment: project.environment,
        provider: project.provider,
        enabled: project.enabled,
        status: latestProjectStatus(state, project),
        apiKeyConfigured: hasProviderSecret(project.apiKeyEnv)
      })),
      recentEvents: state.events.slice(0, 15)
    });
  } catch (error) {
    return jsonError(error);
  }
}

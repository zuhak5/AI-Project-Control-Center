import { jsonError, jsonOk } from "@/lib/api";
import { AppError } from "@/lib/errors";
import { performHealthCheck } from "@/lib/providers";
import { appendHealthCheck, getState } from "@/lib/store";

export const maxDuration = 300;

export async function GET(request: Request) {
  try {
    const secret = process.env.CRON_SECRET;
    if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
      throw new AppError("Unauthorized cron invocation.", 401, "unauthorized_cron");
    }

    const state = await getState();
    const projects = state.projects.filter((project) => project.enabled && project.healthCheck.enabled);
    const results: Array<{ projectId: string; status: string }> = [];

    for (const project of projects) {
      const result = await performHealthCheck(project);
      await appendHealthCheck(result.check, result.event);
      results.push({ projectId: project.id, status: result.check.status });
    }

    return jsonOk({ checked: results.length, results });
  } catch (error) {
    return jsonError(error);
  }
}

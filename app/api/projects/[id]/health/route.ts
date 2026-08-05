import { jsonError, jsonOk } from "@/lib/api";
import { requireApiSession } from "@/lib/auth/session";
import { AppError } from "@/lib/errors";
import { performHealthCheck } from "@/lib/providers";
import { appendHealthCheck, getProject } from "@/lib/store";

export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    await requireApiSession();
    const { id } = await context.params;
    const project = await getProject(id);
    if (!project) throw new AppError("Project not found.", 404, "project_not_found");
    const result = await performHealthCheck(project);
    await appendHealthCheck(result.check, result.event);
    return jsonOk(result.check);
  } catch (error) {
    return jsonError(error);
  }
}

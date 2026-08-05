import { jsonError, jsonOk, parseWith, readJson } from "@/lib/api";
import { requireApiSession } from "@/lib/auth/session";
import { audit } from "@/lib/factories";
import { assertSafeOutboundUrl } from "@/lib/security";
import { deleteProject, getProject, updateProject } from "@/lib/store";
import { projectUpdateSchema } from "@/lib/validation";
import { AppError } from "@/lib/errors";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    await requireApiSession();
    const { id } = await context.params;
    const project = await getProject(id);
    if (!project) throw new AppError("Project not found.", 404, "project_not_found");
    return jsonOk({ ...project, telemetry: { enabled: project.telemetry.enabled, tokenConfigured: Boolean(project.telemetry.ingestTokenHash) }, apiKeyConfigured: Boolean(process.env[project.apiKeyEnv]) });
  } catch (error) {
    return jsonError(error);
  }
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireApiSession();
    const { id } = await context.params;
    const input = parseWith(projectUpdateSchema, await readJson(request));
    if (input.baseUrl) assertSafeOutboundUrl(input.baseUrl);
    const project = await updateProject(
      id,
      (current) => ({
        ...current,
        ...input,
        baseUrl: input.baseUrl ? input.baseUrl.replace(/\/$/, "") : current.baseUrl,
        allowedModels: input.allowedModels
          ? [...new Set([input.defaultModel ?? current.defaultModel, ...input.allowedModels])]
          : current.allowedModels,
        tags: input.tags ? [...new Set(input.tags)] : current.tags,
        healthCheck: input.healthCheck ? { ...current.healthCheck, ...input.healthCheck } : current.healthCheck,
        telemetry: typeof input.telemetryEnabled === "boolean"
          ? { ...current.telemetry, enabled: input.telemetryEnabled }
          : current.telemetry,
        updatedAt: new Date().toISOString()
      }),
      audit(session, "project.updated", "project", id, `Updated project ${id}.`)
    );
    return jsonOk({ ...project, telemetry: { enabled: project.telemetry.enabled, tokenConfigured: Boolean(project.telemetry.ingestTokenHash) } });
  } catch (error) {
    return jsonError(error);
  }
}

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireApiSession();
    const { id } = await context.params;
    await deleteProject(id, audit(session, "project.deleted", "project", id, `Deleted project ${id} and its retained telemetry.`));
    return jsonOk({ deleted: true });
  } catch (error) {
    return jsonError(error);
  }
}

import { randomUUID } from "node:crypto";
import { jsonError, jsonOk, parseWith, readJson } from "@/lib/api";
import { AppError } from "@/lib/errors";
import { safeEqual, sha256 } from "@/lib/crypto";
import { appendEvent, getProject, getState } from "@/lib/store";
import { telemetrySchema } from "@/lib/validation";

export async function POST(request: Request, context: { params: Promise<{ projectId: string }> }) {
  try {
    const { projectId } = await context.params;
    const [project, state] = await Promise.all([getProject(projectId), getState()]);
    if (!project) throw new AppError("Project not found.", 404, "project_not_found");
    if (!state.settings.telemetryEnabled || !project.telemetry.enabled || !project.telemetry.ingestTokenHash) {
      throw new AppError("Telemetry ingestion is disabled.", 409, "telemetry_disabled");
    }

    const supplied = request.headers.get("x-aicc-ingest-token") ?? "";
    if (!supplied || !safeEqual(sha256(supplied), project.telemetry.ingestTokenHash)) {
      throw new AppError("Invalid telemetry token.", 401, "invalid_telemetry_token");
    }

    const input = parseWith(telemetrySchema, await readJson(request, 20_000));
    await appendEvent({
      id: randomUUID(),
      projectId,
      source: "telemetry",
      timestamp: input.timestamp ?? new Date().toISOString(),
      status: input.status,
      statusCode: input.statusCode,
      model: input.model,
      latencyMs: input.latencyMs,
      inputTokens: input.inputTokens,
      outputTokens: input.outputTokens,
      estimatedCostUsd: input.estimatedCostUsd,
      requestId: input.requestId,
      errorCategory: input.errorCategory,
      note: input.note
    });
    return jsonOk({ accepted: true }, { status: 202 });
  } catch (error) {
    return jsonError(error);
  }
}

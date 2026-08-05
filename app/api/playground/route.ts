import { jsonError, jsonOk, parseWith, readJson } from "@/lib/api";
import { requireApiSession } from "@/lib/auth/session";
import { AppError } from "@/lib/errors";
import { errorEvent, executeProvider, successEvent } from "@/lib/providers";
import { appendEvent, getProject } from "@/lib/store";
import { playgroundSchema } from "@/lib/validation";

export async function POST(request: Request) {
  const started = Date.now();
  let project = null;
  try {
    await requireApiSession();
    const input = parseWith(playgroundSchema, await readJson(request, 40_000));
    project = await getProject(input.projectId);
    if (!project) throw new AppError("Project not found.", 404, "project_not_found");
    const result = await executeProvider({
      project,
      prompt: input.prompt,
      system: input.system,
      model: input.model,
      maxOutputTokens: input.maxOutputTokens,
      temperature: input.temperature
    });
    await appendEvent(successEvent(project, result, "playground"));
    return jsonOk({
      text: result.text,
      model: result.model,
      latencyMs: result.latencyMs,
      inputTokens: result.inputTokens,
      outputTokens: result.outputTokens,
      requestId: result.requestId,
      raw: result.raw
    });
  } catch (error) {
    if (project) await appendEvent(errorEvent(project, error, "playground", started)).catch(console.error);
    return jsonError(error);
  }
}

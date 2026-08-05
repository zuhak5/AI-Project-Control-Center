import { jsonError, jsonOk, parseWith, readJson } from "@/lib/api";
import { requireApiSession } from "@/lib/auth/session";
import { audit, createProjectRecord } from "@/lib/factories";
import { assertSafeOutboundUrl } from "@/lib/security";
import { createProject, getState } from "@/lib/store";
import { projectCreateSchema } from "@/lib/validation";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await requireApiSession();
    const state = await getState();
    const projects = state.projects.map(({ telemetry, ...project }) => ({
      ...project,
      telemetry: { enabled: telemetry.enabled, tokenConfigured: Boolean(telemetry.ingestTokenHash) },
      apiKeyConfigured: Boolean(process.env[project.apiKeyEnv])
    }));
    return jsonOk(projects);
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: Request) {
  try {
    const session = await requireApiSession();
    const input = parseWith(projectCreateSchema, await readJson(request));
    assertSafeOutboundUrl(input.baseUrl);
    const state = await getState();
    const { project, ingestToken } = createProjectRecord(input, state.projects.map((entry) => entry.id));
    await createProject(project, audit(session, "project.created", "project", project.id, `Created ${project.name}.`));
    return jsonOk({ project: { ...project, telemetry: { enabled: project.telemetry.enabled, tokenConfigured: Boolean(project.telemetry.ingestTokenHash) } }, ingestToken }, { status: 201 });
  } catch (error) {
    return jsonError(error);
  }
}

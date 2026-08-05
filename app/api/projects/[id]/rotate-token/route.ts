import { jsonError, jsonOk } from "@/lib/api";
import { requireApiSession } from "@/lib/auth/session";
import { randomToken, sha256 } from "@/lib/crypto";
import { audit } from "@/lib/factories";
import { updateProject } from "@/lib/store";

export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireApiSession();
    const { id } = await context.params;
    const ingestToken = randomToken(32);
    await updateProject(
      id,
      (project) => ({ ...project, telemetry: { enabled: true, ingestTokenHash: sha256(ingestToken) }, updatedAt: new Date().toISOString() }),
      audit(session, "telemetry.token_rotated", "project", id, `Rotated telemetry token for ${id}.`)
    );
    return jsonOk({ ingestToken });
  } catch (error) {
    return jsonError(error);
  }
}

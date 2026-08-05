import { randomUUID } from "node:crypto";
import { randomToken, sha256 } from "@/lib/crypto";
import { slugify } from "@/lib/validation";
import type { AuditEvent, ProjectConfig, SessionPayload } from "@/lib/types";
import type { z } from "zod";
import type { projectCreateSchema } from "@/lib/validation";

type ProjectInput = z.infer<typeof projectCreateSchema>;

export function createProjectRecord(input: ProjectInput, existingIds: string[]): { project: ProjectConfig; ingestToken: string | null } {
  const base = slugify(input.name);
  let id = base;
  let suffix = 2;
  while (existingIds.includes(id)) id = `${base}-${suffix++}`;
  const now = new Date().toISOString();
  const ingestToken = input.telemetryEnabled ? randomToken(32) : null;

  return {
    project: {
      id,
      name: input.name,
      description: input.description,
      environment: input.environment,
      provider: input.provider,
      enabled: input.enabled,
      baseUrl: input.baseUrl.replace(/\/$/, ""),
      apiKeyEnv: input.apiKeyEnv,
      defaultModel: input.defaultModel,
      allowedModels: [...new Set([input.defaultModel, ...input.allowedModels])],
      tags: [...new Set(input.tags)],
      monthlyBudgetUsd: input.monthlyBudgetUsd,
      healthCheck: input.healthCheck,
      telemetry: {
        enabled: input.telemetryEnabled,
        ingestTokenHash: ingestToken ? sha256(ingestToken) : null
      },
      createdAt: now,
      updatedAt: now
    },
    ingestToken
  };
}

export function audit(session: SessionPayload, action: string, resourceType: AuditEvent["resourceType"], resourceId: string | null, summary: string): AuditEvent {
  return {
    id: randomUUID(),
    timestamp: new Date().toISOString(),
    actor: session.user.login,
    action,
    resourceType,
    resourceId,
    summary
  };
}

import "server-only";
import { AppError } from "@/lib/errors";
import { BlobPreconditionFailedError, getStorageMode, isPersistentStorageConfigured, readState, writeState } from "@/lib/state-storage";
import type { AuditEvent, ControlCenterSettings, ControlCenterState, HealthCheckResult, ProjectConfig, UsageEvent } from "@/lib/types";

let queue: Promise<void> = Promise.resolve();

async function mutate<T>(mutator: (state: ControlCenterState) => T | Promise<T>): Promise<T> {
  let release: () => void = () => undefined;
  const previous = queue;
  queue = new Promise<void>((resolve) => { release = resolve; });
  await previous;
  try {
    for (let attempt = 0; attempt < 4; attempt += 1) {
      const { state, etag } = await readState();
      const result = await mutator(state);
      try {
        await writeState(state, etag);
        return result;
      } catch (error) {
        if (error instanceof BlobPreconditionFailedError && attempt < 3) continue;
        throw error;
      }
    }
    throw new AppError("Concurrent storage update could not be completed.", 409, "storage_conflict");
  } finally {
    release();
  }
}

export { getStorageMode, isPersistentStorageConfigured };
export async function getState(): Promise<ControlCenterState> { return (await readState()).state; }
export async function getProject(id: string): Promise<ProjectConfig | null> {
  return (await getState()).projects.find((project) => project.id === id) ?? null;
}
export async function createProject(project: ProjectConfig, audit: AuditEvent): Promise<void> {
  await mutate((state) => {
    if (state.projects.some((entry) => entry.id === project.id)) throw new AppError("A project with this identifier already exists.", 409, "project_exists");
    state.projects.push(project);
    state.auditLog.unshift(audit);
  });
}
export async function updateProject(id: string, updater: (project: ProjectConfig) => ProjectConfig, audit: AuditEvent): Promise<ProjectConfig> {
  return mutate((state) => {
    const index = state.projects.findIndex((project) => project.id === id);
    if (index < 0) throw new AppError("Project not found.", 404, "project_not_found");
    const next = updater(state.projects[index]);
    state.projects[index] = next;
    state.auditLog.unshift(audit);
    return next;
  });
}
export async function deleteProject(id: string, audit: AuditEvent): Promise<void> {
  await mutate((state) => {
    const before = state.projects.length;
    state.projects = state.projects.filter((project) => project.id !== id);
    if (before === state.projects.length) throw new AppError("Project not found.", 404, "project_not_found");
    state.events = state.events.filter((event) => event.projectId !== id);
    state.healthChecks = state.healthChecks.filter((check) => check.projectId !== id);
    state.auditLog.unshift(audit);
  });
}
export async function appendEvent(event: UsageEvent): Promise<void> { await mutate((state) => { state.events.unshift(event); }); }
export async function appendHealthCheck(check: HealthCheckResult, event: UsageEvent): Promise<void> {
  await mutate((state) => { state.healthChecks.unshift(check); state.events.unshift(event); });
}
export async function updateSettings(settings: Partial<ControlCenterSettings>, audit: AuditEvent): Promise<ControlCenterSettings> {
  return mutate((state) => {
    state.settings = { ...state.settings, ...settings };
    state.auditLog.unshift(audit);
    return state.settings;
  });
}

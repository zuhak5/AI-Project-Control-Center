import "server-only";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { get, put, BlobPreconditionFailedError } from "@vercel/blob";
import { AppError } from "@/lib/errors";
import type {
  AuditEvent,
  ControlCenterSettings,
  ControlCenterState,
  HealthCheckResult,
  ProjectConfig,
  UsageEvent
} from "@/lib/types";

const STATE_PATH = "ai-project-control-center/state.json";
const LOCAL_PATH = join(process.cwd(), ".data", "state.json");
const MAX_EVENTS = 5000;
const MAX_HEALTH_CHECKS = 1500;
const MAX_AUDIT_EVENTS = 2000;

interface StateRead {
  state: ControlCenterState;
  etag?: string;
}

function emptyState(): ControlCenterState {
  return {
    version: 1,
    projects: [],
    events: [],
    healthChecks: [],
    auditLog: [],
    settings: {
      retentionDays: 90,
      currency: "USD",
      defaultTimeoutMs: 30000,
      telemetryEnabled: true
    },
    updatedAt: new Date().toISOString()
  };
}

function usesBlob(): boolean {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN);
}

async function streamToText(stream: ReadableStream<Uint8Array>): Promise<string> {
  return new Response(stream).text();
}

async function readState(): Promise<StateRead> {
  if (usesBlob()) {
    const result = await get(STATE_PATH, { access: "private" });
    if (!result || result.statusCode !== 200 || !result.stream) return { state: emptyState() };
    const text = await streamToText(result.stream);
    return { state: normalizeState(JSON.parse(text)), etag: result.blob.etag };
  }

  try {
    const text = await readFile(LOCAL_PATH, "utf8");
    return { state: normalizeState(JSON.parse(text)) };
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return { state: emptyState() };
    throw error;
  }
}

async function writeState(state: ControlCenterState, etag?: string): Promise<void> {
  state.updatedAt = new Date().toISOString();
  pruneState(state);
  const body = JSON.stringify(state, null, 2);

  if (usesBlob()) {
    await put(STATE_PATH, body, {
      access: "private",
      contentType: "application/json",
      addRandomSuffix: false,
      allowOverwrite: true,
      ...(etag ? { ifMatch: etag } : {})
    });
    return;
  }

  await mkdir(dirname(LOCAL_PATH), { recursive: true });
  await writeFile(LOCAL_PATH, body, "utf8");
}

function normalizeState(value: unknown): ControlCenterState {
  if (!value || typeof value !== "object") return emptyState();
  const input = value as Partial<ControlCenterState>;
  const fallback = emptyState();
  return {
    version: 1,
    projects: Array.isArray(input.projects) ? input.projects : [],
    events: Array.isArray(input.events) ? input.events : [],
    healthChecks: Array.isArray(input.healthChecks) ? input.healthChecks : [],
    auditLog: Array.isArray(input.auditLog) ? input.auditLog : [],
    settings: { ...fallback.settings, ...(input.settings ?? {}) },
    updatedAt: typeof input.updatedAt === "string" ? input.updatedAt : fallback.updatedAt
  };
}

function pruneState(state: ControlCenterState): void {
  const cutoff = Date.now() - state.settings.retentionDays * 86400000;
  state.events = state.events
    .filter((event) => Date.parse(event.timestamp) >= cutoff)
    .sort((a, b) => Date.parse(b.timestamp) - Date.parse(a.timestamp))
    .slice(0, MAX_EVENTS);
  state.healthChecks = state.healthChecks
    .filter((check) => Date.parse(check.timestamp) >= cutoff)
    .sort((a, b) => Date.parse(b.timestamp) - Date.parse(a.timestamp))
    .slice(0, MAX_HEALTH_CHECKS);
  state.auditLog = state.auditLog
    .sort((a, b) => Date.parse(b.timestamp) - Date.parse(a.timestamp))
    .slice(0, MAX_AUDIT_EVENTS);
}

let localQueue: Promise<void> = Promise.resolve();

async function mutate<T>(mutator: (state: ControlCenterState) => T | Promise<T>): Promise<T> {
  let resolveQueue: () => void = () => undefined;
  const previous = localQueue;
  localQueue = new Promise<void>((resolve) => { resolveQueue = resolve; });
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
    resolveQueue();
  }
}

export async function getState(): Promise<ControlCenterState> {
  return (await readState()).state;
}

export async function getProject(id: string): Promise<ProjectConfig | null> {
  const state = await getState();
  return state.projects.find((project) => project.id === id) ?? null;
}

export async function createProject(project: ProjectConfig, audit: AuditEvent): Promise<void> {
  await mutate((state) => {
    if (state.projects.some((entry) => entry.id === project.id)) {
      throw new AppError("A project with this identifier already exists.", 409, "project_exists");
    }
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
    if (state.projects.length === before) throw new AppError("Project not found.", 404, "project_not_found");
    state.events = state.events.filter((event) => event.projectId !== id);
    state.healthChecks = state.healthChecks.filter((check) => check.projectId !== id);
    state.auditLog.unshift(audit);
  });
}

export async function appendEvent(event: UsageEvent): Promise<void> {
  await mutate((state) => { state.events.unshift(event); });
}

export async function appendHealthCheck(check: HealthCheckResult, event: UsageEvent): Promise<void> {
  await mutate((state) => {
    state.healthChecks.unshift(check);
    state.events.unshift(event);
  });
}

export async function updateSettings(settings: Partial<ControlCenterSettings>, audit: AuditEvent): Promise<ControlCenterSettings> {
  return mutate((state) => {
    state.settings = { ...state.settings, ...settings };
    state.auditLog.unshift(audit);
    return state.settings;
  });
}

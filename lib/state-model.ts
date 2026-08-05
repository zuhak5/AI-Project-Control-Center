import type { ControlCenterState, ProjectConfig } from "@/lib/types";

const MAX_EVENTS = 5000;
const MAX_HEALTH_CHECKS = 1500;
const MAX_AUDIT_EVENTS = 2000;

export function emptyState(): ControlCenterState {
  return {
    version: 1,
    projects: [],
    events: [],
    healthChecks: [],
    auditLog: [],
    settings: { retentionDays: 90, currency: "USD", defaultTimeoutMs: 30000, telemetryEnabled: true },
    updatedAt: new Date().toISOString()
  };
}

function normalizeProject(value: unknown): ProjectConfig | null {
  if (!value || typeof value !== "object") return null;
  const input = value as ProjectConfig;
  return typeof input.id === "string" && typeof input.name === "string" ? input : null;
}

export function normalizeState(value: unknown): ControlCenterState {
  if (!value || typeof value !== "object") return emptyState();
  const input = value as Partial<ControlCenterState>;
  const fallback = emptyState();
  return {
    version: 1,
    projects: Array.isArray(input.projects)
      ? input.projects.map(normalizeProject).filter((project): project is ProjectConfig => Boolean(project))
      : [],
    events: Array.isArray(input.events) ? input.events : [],
    healthChecks: Array.isArray(input.healthChecks) ? input.healthChecks : [],
    auditLog: Array.isArray(input.auditLog) ? input.auditLog : [],
    settings: { ...fallback.settings, ...(input.settings ?? {}) },
    updatedAt: typeof input.updatedAt === "string" ? input.updatedAt : fallback.updatedAt
  };
}

export function pruneState(state: ControlCenterState): void {
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

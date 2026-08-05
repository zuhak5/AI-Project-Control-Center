import type { GatewayState } from "@/lib/types";

const MAX_EVENTS = 5000;
const MAX_HEALTH_CHECKS = 1500;
const MAX_AUDIT_EVENTS = 2000;

export function emptyState(): GatewayState {
  return {
    version: 2,
    events: [],
    healthChecks: [],
    auditLog: [],
    settings: {
      healthPrompt: "Reply with exactly: OK",
      expectedText: "OK",
      timeoutMs: 30000,
      maxOutputTokens: 800,
      retentionDays: 90
    },
    updatedAt: new Date().toISOString()
  };
}

export function normalizeState(value: unknown): GatewayState {
  if (!value || typeof value !== "object") return emptyState();
  const input = value as Partial<GatewayState> & { version?: number };
  if (input.version !== 2) return emptyState();
  const fallback = emptyState();
  return {
    version: 2,
    events: Array.isArray(input.events) ? input.events : [],
    healthChecks: Array.isArray(input.healthChecks) ? input.healthChecks : [],
    auditLog: Array.isArray(input.auditLog) ? input.auditLog : [],
    settings: { ...fallback.settings, ...(input.settings ?? {}) },
    updatedAt: typeof input.updatedAt === "string" ? input.updatedAt : fallback.updatedAt
  };
}

export function pruneState(state: GatewayState): void {
  const cutoff = Date.now() - state.settings.retentionDays * 86400000;
  state.events = state.events.filter((event) => Date.parse(event.timestamp) >= cutoff).sort((a, b) => Date.parse(b.timestamp) - Date.parse(a.timestamp)).slice(0, MAX_EVENTS);
  state.healthChecks = state.healthChecks.filter((check) => Date.parse(check.timestamp) >= cutoff).sort((a, b) => Date.parse(b.timestamp) - Date.parse(a.timestamp)).slice(0, MAX_HEALTH_CHECKS);
  state.auditLog = state.auditLog.sort((a, b) => Date.parse(b.timestamp) - Date.parse(a.timestamp)).slice(0, MAX_AUDIT_EVENTS);
}

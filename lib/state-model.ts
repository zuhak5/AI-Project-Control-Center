import { z } from "zod";
import type { GatewayState } from "@/lib/types";

const MAX_EVENTS = 5000;
const MAX_HEALTH_CHECKS = 1500;
const MAX_AUDIT_EVENTS = 2000;
const MAX_NORMALIZE_ITEMS = 20_000;
const timestampSchema = z.string().max(64).refine((value) => Number.isFinite(Date.parse(value)), "Invalid timestamp");
const statusCodeSchema = z.number().int().min(100).max(599).nullable();
const modelSchema = z.string().trim().min(1).max(128);
const eventSchema = z.object({
  id: z.string().trim().min(1).max(200), source: z.enum(["playground", "health-check"]), timestamp: timestampSchema,
  status: z.enum(["success", "error"]), statusCode: statusCodeSchema, model: modelSchema,
  latencyMs: z.number().finite().nonnegative().max(600_000), inputTokens: z.number().int().nonnegative().max(100_000_000),
  outputTokens: z.number().int().nonnegative().max(100_000_000), requestId: z.string().trim().max(256).nullable(),
  errorCategory: z.string().trim().max(128).nullable(), note: z.string().trim().max(300).nullable()
});
const healthSchema = z.object({
  id: z.string().trim().min(1).max(200), timestamp: timestampSchema, status: z.enum(["healthy", "degraded", "down"]),
  latencyMs: z.number().finite().nonnegative().max(600_000), model: modelSchema,
  message: z.string().trim().min(1).max(500), statusCode: statusCodeSchema
});
const auditSchema = z.object({
  id: z.string().trim().min(1).max(200), timestamp: timestampSchema, actor: z.string().trim().min(1).max(100),
  action: z.string().trim().min(1).max(100), summary: z.string().trim().min(1).max(500)
});
const settingsSchema = z.object({
  healthPrompt: z.string().trim().min(1).max(1000), expectedText: z.string().trim().max(200),
  timeoutMs: z.number().int().min(1000).max(120000), maxOutputTokens: z.number().int().min(16).max(8000),
  retentionDays: z.number().int().min(7).max(3650)
});

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
function normalizeList<T extends { id: string }>(value: unknown, schema: z.ZodType<T>): T[] {
  if (!Array.isArray(value)) return [];
  const normalized: T[] = [];
  const seen = new Set<string>();
  for (const item of value.slice(0, MAX_NORMALIZE_ITEMS)) {
    const parsed = schema.safeParse(item);
    if (parsed.success && !seen.has(parsed.data.id)) { seen.add(parsed.data.id); normalized.push(parsed.data); }
  }
  return normalized;
}
function newest<T extends { timestamp: string }>(items: T[]): T[] {
  return items.sort((left, right) => Date.parse(right.timestamp) - Date.parse(left.timestamp));
}

export function defaultGatewaySettings(): GatewayState["settings"] {
  return { healthPrompt: "Reply with exactly: OK", expectedText: "OK", timeoutMs: 30000, maxOutputTokens: 800, retentionDays: 90 };
}
export function emptyState(): GatewayState {
  return { version: 2, events: [], healthChecks: [], auditLog: [], settings: defaultGatewaySettings(), updatedAt: new Date().toISOString() };
}
export function normalizeState(value: unknown): GatewayState {
  if (!isRecord(value) || value.version !== 2) return emptyState();
  const fallback = emptyState();
  const settingsResult = settingsSchema.safeParse(isRecord(value.settings) ? { ...fallback.settings, ...value.settings } : fallback.settings);
  const updatedAt = timestampSchema.safeParse(value.updatedAt);
  const state: GatewayState = {
    version: 2,
    events: newest(normalizeList(value.events, eventSchema)),
    healthChecks: newest(normalizeList(value.healthChecks, healthSchema)),
    auditLog: newest(normalizeList(value.auditLog, auditSchema)),
    settings: settingsResult.success ? settingsResult.data : fallback.settings,
    updatedAt: updatedAt.success ? updatedAt.data : fallback.updatedAt
  };
  pruneState(state);
  return state;
}
export function pruneState(state: GatewayState, now = Date.now()): void {
  const cutoff = now - state.settings.retentionDays * 86_400_000;
  const futureLimit = now + 5 * 60_000;
  state.events = newest(state.events.filter((event) => { const time = Date.parse(event.timestamp); return time >= cutoff && time <= futureLimit; })).slice(0, MAX_EVENTS);
  state.healthChecks = newest(state.healthChecks.filter((check) => { const time = Date.parse(check.timestamp); return time >= cutoff && time <= futureLimit; })).slice(0, MAX_HEALTH_CHECKS);
  state.auditLog = newest(state.auditLog.filter((event) => Date.parse(event.timestamp) <= futureLimit)).slice(0, MAX_AUDIT_EVENTS);
}

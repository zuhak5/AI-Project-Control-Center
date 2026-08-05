import type { ControlCenterState, HealthStatus, ProjectConfig, UsageEvent } from "@/lib/types";

export interface OverviewMetrics {
  requests24h: number;
  successRate24h: number;
  tokens24h: number;
  spend24h: number;
  avgLatency24h: number;
  activeProjects: number;
  unhealthyProjects: number;
  daily: Array<{ label: string; requests: number; errors: number; tokens: number }>;
}

export function latestProjectStatus(state: ControlCenterState, project: ProjectConfig): HealthStatus {
  if (!project.enabled) return "unknown";
  return state.healthChecks.find((check) => check.projectId === project.id)?.status ?? "unknown";
}

export function calculateOverview(state: ControlCenterState, now = Date.now()): OverviewMetrics {
  const dayAgo = now - 86400000;
  const events24h = state.events.filter((event) => Date.parse(event.timestamp) >= dayAgo);
  const successful = events24h.filter((event) => event.status === "success").length;
  const latencyEvents = events24h.filter((event) => event.latencyMs > 0);
  const statuses = state.projects.map((project) => latestProjectStatus(state, project));

  return {
    requests24h: events24h.length,
    successRate24h: events24h.length ? (successful / events24h.length) * 100 : 100,
    tokens24h: events24h.reduce((sum, event) => sum + event.inputTokens + event.outputTokens, 0),
    spend24h: events24h.reduce((sum, event) => sum + event.estimatedCostUsd, 0),
    avgLatency24h: latencyEvents.length
      ? Math.round(latencyEvents.reduce((sum, event) => sum + event.latencyMs, 0) / latencyEvents.length)
      : 0,
    activeProjects: state.projects.filter((project) => project.enabled).length,
    unhealthyProjects: statuses.filter((status) => status === "down" || status === "degraded").length,
    daily: buildDailySeries(state.events, now)
  };
}

function buildDailySeries(events: UsageEvent[], now: number): OverviewMetrics["daily"] {
  const days = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(now - (6 - index) * 86400000);
    const key = date.toISOString().slice(0, 10);
    return { key, label: date.toLocaleDateString("en-US", { weekday: "short" }), requests: 0, errors: 0, tokens: 0 };
  });
  const byKey = new Map(days.map((day) => [day.key, day]));
  for (const event of events) {
    const day = byKey.get(event.timestamp.slice(0, 10));
    if (!day) continue;
    day.requests += 1;
    if (event.status === "error") day.errors += 1;
    day.tokens += event.inputTokens + event.outputTokens;
  }
  return days.map(({ label, requests, errors, tokens }) => ({ label, requests, errors, tokens }));
}

export function projectUsage(state: ControlCenterState, projectId: string) {
  const events = state.events.filter((event) => event.projectId === projectId);
  const monthStart = new Date();
  monthStart.setUTCDate(1);
  monthStart.setUTCHours(0, 0, 0, 0);
  const monthEvents = events.filter((event) => Date.parse(event.timestamp) >= monthStart.getTime());
  return {
    requestCount: monthEvents.length,
    totalTokens: monthEvents.reduce((sum, event) => sum + event.inputTokens + event.outputTokens, 0),
    estimatedCostUsd: monthEvents.reduce((sum, event) => sum + event.estimatedCostUsd, 0),
    lastEventAt: events[0]?.timestamp ?? null
  };
}

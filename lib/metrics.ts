import type { GatewayState, HealthCheckResult, HealthStatus } from "@/lib/types";

function latestHealthCheck(state: GatewayState): HealthCheckResult | null {
  return state.healthChecks.reduce<HealthCheckResult | null>((latest, check) => {
    if (!latest) return check;
    return Date.parse(check.timestamp) > Date.parse(latest.timestamp) ? check : latest;
  }, null);
}
export function latestHealthStatus(state: GatewayState): HealthStatus { return latestHealthCheck(state)?.status ?? "unknown"; }
export function calculateOverview(state: GatewayState, now = Date.now()) {
  const day = 86_400_000;
  const recent = state.events.filter((event) => {
    const timestamp = Date.parse(event.timestamp);
    return Number.isFinite(timestamp) && timestamp >= now - day && timestamp <= now + 60_000;
  });
  const successes = recent.filter((event) => event.status === "success");
  const requests24h = recent.length;
  const successRate24h = requests24h ? (successes.length / requests24h) * 100 : 0;
  const tokens24h = recent.reduce((sum, event) => sum + event.inputTokens + event.outputTokens, 0);
  const avgLatency24h = requests24h ? recent.reduce((sum, event) => sum + event.latencyMs, 0) / requests24h : 0;
  const daily = Array.from({ length: 7 }, (_, index) => {
    const start = new Date(now - (6 - index) * day); start.setUTCHours(0, 0, 0, 0);
    const end = start.getTime() + day;
    const events = state.events.filter((event) => { const time = Date.parse(event.timestamp); return Number.isFinite(time) && time >= start.getTime() && time < end; });
    return { label: start.toLocaleDateString("en-US", { weekday: "short", timeZone: "UTC" }), requests: events.length, errors: events.filter((event) => event.status === "error").length };
  });
  return { requests24h, successRate24h, tokens24h, avgLatency24h, latestHealth: latestHealthCheck(state), daily };
}

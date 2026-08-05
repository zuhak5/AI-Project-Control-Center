import { describe, expect, it } from "vitest";
import { calculateOverview } from "@/lib/metrics";
import type { ControlCenterState } from "@/lib/types";

function state(now: number): ControlCenterState {
  return {
    version: 1,
    projects: [],
    healthChecks: [],
    auditLog: [],
    settings: { retentionDays: 90, currency: "USD", defaultTimeoutMs: 30000, telemetryEnabled: true },
    updatedAt: new Date(now).toISOString(),
    events: [
      { id: "1", projectId: "p", source: "telemetry", timestamp: new Date(now - 1000).toISOString(), status: "success", statusCode: 200, model: "m", latencyMs: 500, inputTokens: 100, outputTokens: 20, estimatedCostUsd: 0.01, requestId: null, errorCategory: null, note: null },
      { id: "2", projectId: "p", source: "telemetry", timestamp: new Date(now - 2000).toISOString(), status: "error", statusCode: 500, model: "m", latencyMs: 1500, inputTokens: 0, outputTokens: 0, estimatedCostUsd: 0, requestId: null, errorCategory: "provider_error", note: null }
    ]
  };
}

describe("overview metrics", () => {
  it("aggregates requests, success rate, tokens, spend, and latency", () => {
    const now = Date.parse("2026-08-05T12:00:00.000Z");
    const metrics = calculateOverview(state(now), now);
    expect(metrics.requests24h).toBe(2);
    expect(metrics.successRate24h).toBe(50);
    expect(metrics.tokens24h).toBe(120);
    expect(metrics.spend24h).toBeCloseTo(0.01);
    expect(metrics.avgLatency24h).toBe(1000);
  });
});

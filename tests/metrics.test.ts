import { describe, expect, it } from "vitest";
import { calculateOverview, latestHealthStatus } from "@/lib/metrics";
import { emptyState } from "@/lib/state-model";

describe("gateway metrics", () => {
  it("summarizes the last 24 hours", () => {
    const now = Date.parse("2026-08-05T17:00:00Z"); const state = emptyState();
    state.events = [
      { id: "1", source: "playground", timestamp: "2026-08-05T16:00:00Z", status: "success", statusCode: 200, model: "gpt", latencyMs: 100, inputTokens: 10, outputTokens: 5, requestId: null, errorCategory: null, note: null },
      { id: "2", source: "health-check", timestamp: "2026-08-05T15:00:00Z", status: "error", statusCode: 502, model: "gpt", latencyMs: 300, inputTokens: 0, outputTokens: 0, requestId: null, errorCategory: "down", note: "down" }
    ];
    const result = calculateOverview(state, now);
    expect(result.requests24h).toBe(2); expect(result.successRate24h).toBe(50); expect(result.tokens24h).toBe(15); expect(result.avgLatency24h).toBe(200);
  });
  it("reports unknown before the first check", () => { expect(latestHealthStatus(emptyState())).toBe("unknown"); });
});

import { describe, expect, it } from "vitest";
import { defaultGatewaySettings, emptyState, normalizeState, pruneState } from "@/lib/state-model";

describe("gateway state normalization", () => {
  it("uses the version-2 gateway schema", () => { expect(emptyState().version).toBe(2); });
  it("does not import legacy multi-project state", () => {
    const state = normalizeState({ version: 1, projects: [{ id: "old" }], events: [{ id: "old" }] });
    expect(state.version).toBe(2); expect(state.events).toEqual([]);
  });
  it("drops malformed stored entries and invalid settings", () => {
    const state = normalizeState({
      version: 2,
      events: [{ id: "broken", timestamp: "not-a-date" }],
      healthChecks: "wrong",
      auditLog: [{ id: "audit", timestamp: new Date().toISOString(), actor: "owner", action: "test", summary: "ok" }],
      settings: { timeoutMs: "fast", retentionDays: -10 },
      updatedAt: "bad"
    });
    expect(state.events).toEqual([]);
    expect(state.healthChecks).toEqual([]);
    expect(state.auditLog).toHaveLength(1);
    expect(state.settings).toEqual(defaultGatewaySettings());
    expect(Number.isFinite(Date.parse(state.updatedAt))).toBe(true);
  });
  it("prunes events outside retention", () => {
    const state = emptyState();
    const now = Date.UTC(2026, 7, 5);
    state.settings.retentionDays = 7;
    state.events = [{
      id: "old", source: "playground", timestamp: new Date(now - 8 * 86_400_000).toISOString(), status: "success",
      statusCode: 200, model: "gpt-5.4-mini", latencyMs: 1, inputTokens: 1, outputTokens: 1,
      requestId: null, errorCategory: null, note: null
    }];
    pruneState(state, now);
    expect(state.events).toEqual([]);
  });
});

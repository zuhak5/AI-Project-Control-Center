import { describe, expect, it } from "vitest";
import { emptyState, normalizeState } from "@/lib/state-model";

describe("state migration", () => {
  it("uses the version-2 gateway schema", () => { expect(emptyState().version).toBe(2); });
  it("does not import legacy multi-project state", () => { const state = normalizeState({ version: 1, projects: [{ id: "old" }], events: [{ id: "old" }] }); expect(state.version).toBe(2); expect(state.events).toEqual([]); });
});

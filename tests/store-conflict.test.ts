import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const storage = vi.hoisted(() => {
  class BlobPreconditionFailedError extends Error {}
  return {
    BlobPreconditionFailedError,
    getStorageMode: vi.fn(() => "blob-token"),
    isPersistentStorageConfigured: vi.fn(() => true),
    readState: vi.fn(),
    writeState: vi.fn()
  };
});

vi.mock("@/lib/state-storage", () => storage);

describe("distributed Blob conflicts", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.useFakeTimers();
    storage.getStorageMode.mockReturnValue("blob-token");
    storage.isPersistentStorageConfigured.mockReturnValue(true);
    storage.readState.mockReset();
    storage.writeState.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("persists append-only telemetry after repeated ETag conflicts", async () => {
    const { emptyState } = await import("@/lib/state-model");
    storage.readState.mockImplementation(async () => ({ state: emptyState(), etag: "\"stale-etag\"" }));
    storage.writeState.mockImplementation(async (_state, etag?: string) => {
      if (etag) throw new storage.BlobPreconditionFailedError("ETag mismatch");
    });
    vi.spyOn(console, "warn").mockImplementation(() => undefined);

    const { tryAppendGatewayEvent } = await import("@/lib/store");
    const operation = tryAppendGatewayEvent({
      id: "event-1",
      source: "health-check",
      timestamp: "2026-08-05T20:44:45.000Z",
      status: "success",
      statusCode: 200,
      model: "gpt-5.4-mini",
      latencyMs: 100,
      inputTokens: 1,
      outputTokens: 1,
      requestId: "request-1",
      errorCategory: null,
      note: "OK"
    });

    await vi.runAllTimersAsync();

    await expect(operation).resolves.toBe(true);
    expect(storage.writeState).toHaveBeenCalledTimes(8);
    expect(storage.writeState.mock.calls.at(-1)?.[1]).toBeUndefined();
  });

  it("keeps settings writes strictly conditional", async () => {
    const { defaultGatewaySettings, emptyState } = await import("@/lib/state-model");
    storage.readState.mockImplementation(async () => ({ state: emptyState(), etag: "\"stale-etag\"" }));
    storage.writeState.mockImplementation(async () => {
      throw new storage.BlobPreconditionFailedError("ETag mismatch");
    });

    const { updateSettings } = await import("@/lib/store");
    const operation = updateSettings(defaultGatewaySettings(), {
      id: "audit-1",
      timestamp: "2026-08-05T20:44:45.000Z",
      actor: "zuhak5",
      action: "settings.update",
      summary: "Test"
    }).catch((error: unknown) => error);

    await vi.runAllTimersAsync();
    const error = await operation;

    expect(error).toMatchObject({ code: "storage_conflict", statusCode: 409 });
    expect(storage.writeState).toHaveBeenCalledTimes(7);
    expect(storage.writeState.mock.calls.every((call) => typeof call[1] === "string")).toBe(true);
  });
});

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const blob = vi.hoisted(() => ({
  get: vi.fn(),
  put: vi.fn()
}));

vi.mock("@vercel/blob", () => ({
  BlobPreconditionFailedError: class BlobPreconditionFailedError extends Error {},
  get: blob.get,
  put: blob.put
}));

describe("state storage", () => {
  const originalToken = process.env.BLOB_READ_WRITE_TOKEN;
  const originalVercel = process.env.VERCEL;

  beforeEach(() => {
    vi.resetModules();
    blob.get.mockReset();
    blob.put.mockReset();
    process.env.BLOB_READ_WRITE_TOKEN = "test-token";
    process.env.VERCEL = "1";
  });

  afterEach(() => {
    if (originalToken === undefined) delete process.env.BLOB_READ_WRITE_TOKEN;
    else process.env.BLOB_READ_WRITE_TOKEN = originalToken;
    if (originalVercel === undefined) delete process.env.VERCEL;
    else process.env.VERCEL = originalVercel;
  });

  it("bypasses the private Blob CDN when reading mutable state", async () => {
    blob.get.mockResolvedValue(null);
    const { readState } = await import("@/lib/state-storage");

    await readState();

    expect(blob.get).toHaveBeenCalledWith(
      "homepilot-ai-gateway-console/state.json",
      { access: "private", useCache: false }
    );
  });
});

import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchJson } from "@/lib/http";

const original = process.env.HOME_GATEWAY_SECRET;
afterEach(() => {
  vi.unstubAllGlobals();
  if (original === undefined) delete process.env.HOME_GATEWAY_SECRET;
  else process.env.HOME_GATEWAY_SECRET = original;
});

describe("verified Google Cloud gateway", () => {
  it("adds the gateway secret without replacing bearer authentication", async () => {
    process.env.HOME_GATEWAY_SECRET = "test-gateway-secret";
    const mock = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
      const headers = new Headers(init?.headers);
      expect(headers.get("authorization")).toBe("Bearer test-api-key");
      expect(headers.get("x-homepilot-gateway-secret")).toBe("test-gateway-secret");
      return new Response(JSON.stringify({ output_text: "OK" }), { status: 200, headers: { "Content-Type": "application/json" } });
    });
    vi.stubGlobal("fetch", mock);
    await fetchJson(new URL("https://homepilot-ai.shares.zrok.io/v1/responses"), {
      method: "POST",
      headers: { Authorization: "Bearer test-api-key", "Content-Type": "application/json" },
      body: "{}"
    }, 30000);
    expect(mock).toHaveBeenCalledTimes(1);
  });
});

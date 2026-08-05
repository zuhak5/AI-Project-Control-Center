import { afterEach, describe, expect, it, vi } from "vitest";
import { executeGateway, extractGatewayText } from "@/lib/gateway";
import { getGatewayBaseUrl } from "@/lib/gateway-config";

describe("fixed gateway", () => {
  afterEach(() => { vi.unstubAllGlobals(); delete process.env.CLIPROXY_API_KEY; delete process.env.HOME_GATEWAY_SECRET; delete process.env.GATEWAY_BASE_URL; });
  it("accepts only the verified hostname and /v1 path", () => {
    expect(getGatewayBaseUrl().toString()).toBe("https://homepilot-ai.shares.zrok.io/v1");
    process.env.GATEWAY_BASE_URL = "https://example.com/v1";
    expect(() => getGatewayBaseUrl()).toThrow(/verified HomePilot/);
  });
  it("sends both gateway credentials to /v1/responses", async () => {
    process.env.CLIPROXY_API_KEY = "cli-test"; process.env.HOME_GATEWAY_SECRET = "gateway-test";
    const fetchMock = vi.fn(async (url: URL | RequestInfo, init?: RequestInit) => {
      expect(String(url)).toBe("https://homepilot-ai.shares.zrok.io/v1/responses");
      const headers = new Headers(init?.headers);
      expect(headers.get("authorization")).toBe("Bearer cli-test");
      expect(headers.get("x-homepilot-gateway-secret")).toBe("gateway-test");
      return new Response(JSON.stringify({ id: "resp_1", model: "gpt-5.4-mini", output_text: "OK", usage: { input_tokens: 2, output_tokens: 1 } }), { status: 200, headers: { "Content-Type": "application/json" } });
    });
    vi.stubGlobal("fetch", fetchMock);
    const result = await executeGateway({ prompt: "test" }, 5000);
    expect(result.text).toBe("OK"); expect(result.inputTokens).toBe(2); expect(fetchMock).toHaveBeenCalledOnce();
  });
  it("extracts Responses API content arrays", () => {
    expect(extractGatewayText({ output: [{ content: [{ text: "HomePilot ready" }] }] })).toBe("HomePilot ready");
  });
});

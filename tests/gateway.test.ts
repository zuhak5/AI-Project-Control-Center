import { afterEach, describe, expect, it, vi } from "vitest";
import { executeGateway, extractGatewayText, performHealthCheck } from "@/lib/gateway";
import { getGatewayBaseUrl } from "@/lib/gateway-config";
import { defaultGatewaySettings } from "@/lib/state-model";

describe("fixed gateway", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    delete process.env.CLIPROXY_API_KEY;
    delete process.env.HOME_GATEWAY_SECRET;
    delete process.env.GATEWAY_BASE_URL;
    delete process.env.GATEWAY_MODEL;
  });
  it("accepts only the verified HTTPS origin and /v1 path", () => {
    expect(getGatewayBaseUrl().toString()).toBe("https://ai.safenetvpn.dedyn.io/v1");
    process.env.GATEWAY_BASE_URL = "https://example.com/v1";
    expect(() => getGatewayBaseUrl()).toThrow(/verified HomePilot Caddy/);
    process.env.GATEWAY_BASE_URL = "https://ai.safenetvpn.dedyn.io:444/v1";
    expect(() => getGatewayBaseUrl()).toThrow(/standard HTTPS port/);
  });
  it("sends both credentials, disables provider storage, and tracks separate IDs", async () => {
    process.env.CLIPROXY_API_KEY = "cli-test";
    process.env.HOME_GATEWAY_SECRET = "gateway-test";
    const fetchMock = vi.fn(async (url: URL | RequestInfo, init?: RequestInit) => {
      expect(String(url)).toBe("https://ai.safenetvpn.dedyn.io/v1/responses");
      const headers = new Headers(init?.headers);
      expect(headers.get("authorization")).toBe("Bearer cli-test");
      expect(headers.get("x-homepilot-gateway-secret")).toBe("gateway-test");
      expect(headers.get("x-client-request-id")).toBeTruthy();
      expect(JSON.parse(String(init?.body)).store).toBe(false);
      return new Response(JSON.stringify({ id: "resp_1", status: "completed", model: "gpt-5.6-luna", output_text: "OK", usage: { input_tokens: 2, output_tokens: 1 } }), { status: 200, headers: { "X-Request-Id": "req_1" } });
    });
    vi.stubGlobal("fetch", fetchMock);
    const result = await executeGateway({ prompt: "test" }, 5000);
    expect(result.text).toBe("OK");
    expect(result.requestId).toBe("req_1");
    expect(result.responseId).toBe("resp_1");
    expect(result.inputTokens).toBe(2);
  });
  it("rejects non-JSON successful gateway responses", async () => {
    process.env.CLIPROXY_API_KEY = "cli-test";
    process.env.HOME_GATEWAY_SECRET = "gateway-test";
    vi.stubGlobal("fetch", vi.fn(async () => new Response("<html>proxy error</html>", { status: 200 })));
    await expect(executeGateway({ prompt: "test" }, 5000)).rejects.toMatchObject({ code: "gateway_invalid_json" });
  });
  it("requires an exact normalized health response", async () => {
    process.env.CLIPROXY_API_KEY = "cli-test";
    process.env.HOME_GATEWAY_SECRET = "gateway-test";
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ status: "completed", output_text: "NOT OK", model: "gpt-5.6-luna" }), { status: 200 })));
    expect((await performHealthCheck(defaultGatewaySettings())).check.status).toBe("degraded");
  });
  it("extracts Responses API content arrays and refusals", () => {
    expect(extractGatewayText({ output: [{ content: [{ text: "HomePilot ready" }] }] })).toBe("HomePilot ready");
    expect(extractGatewayText({ output: [{ content: [{ refusal: "Unable to answer" }] }] })).toBe("Unable to answer");
  });
});

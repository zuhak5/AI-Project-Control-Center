import { afterEach, describe, expect, it } from "vitest";
import { assertSameOrigin, readJson } from "@/lib/api";

describe("API request boundaries", () => {
  afterEach(() => { delete process.env.APP_BASE_URL; });
  it("rejects mutation requests from another origin", () => {
    process.env.APP_BASE_URL = "https://ai-project-control-center.vercel.app";
    const request = new Request("https://ai-project-control-center.vercel.app/api/settings", {
      method: "PATCH", headers: { Origin: "https://attacker.example", "Sec-Fetch-Site": "cross-site" }
    });
    expect(() => assertSameOrigin(request)).toThrow(/Cross-origin/);
  });
  it("accepts the canonical same-origin request", () => {
    process.env.APP_BASE_URL = "https://ai-project-control-center.vercel.app";
    const request = new Request("https://ai-project-control-center.vercel.app/api/settings", {
      method: "PATCH", headers: { Origin: "https://ai-project-control-center.vercel.app", "Sec-Fetch-Site": "same-origin" }
    });
    expect(() => assertSameOrigin(request)).not.toThrow();
  });
  it("requires a JSON content type", async () => {
    const request = new Request("https://example.test/api", { method: "POST", body: "{}", headers: { "Content-Type": "text/plain" } });
    await expect(readJson(request)).rejects.toMatchObject({ code: "unsupported_media_type" });
  });
});

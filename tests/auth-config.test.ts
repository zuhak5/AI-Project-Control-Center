import { afterEach, describe, expect, it } from "vitest";
import { getAppOrigin, isGitHubLoginAllowed } from "@/lib/auth/config";

describe("canonical application configuration", () => {
  afterEach(() => { delete process.env.APP_BASE_URL; delete process.env.ALLOWED_GITHUB_LOGINS; });
  it("uses a fixed canonical origin", () => {
    process.env.APP_BASE_URL = "https://ai-project-control-center.vercel.app";
    expect(getAppOrigin()).toBe("https://ai-project-control-center.vercel.app");
  });
  it("rejects application URLs with paths or credentials", () => {
    process.env.APP_BASE_URL = "https://user@example.com/admin";
    expect(() => getAppOrigin()).toThrow();
  });
  it("normalizes the GitHub login allowlist", () => {
    process.env.ALLOWED_GITHUB_LOGINS = "Zuhak5, other-user, zuhak5";
    expect(isGitHubLoginAllowed("zuhak5")).toBe(true);
    expect(isGitHubLoginAllowed("unknown")).toBe(false);
  });
});

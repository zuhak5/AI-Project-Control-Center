import { describe, expect, it } from "vitest";
import { projectCreateSchema, slugify } from "@/lib/validation";

describe("project validation", () => {
  it("accepts a secure provider configuration", () => {
    const result = projectCreateSchema.parse({
      name: "Support AI",
      description: "Customer support",
      environment: "production",
      provider: "openai-responses",
      enabled: true,
      baseUrl: "https://api.openai.com/v1",
      apiKeyEnv: "OPENAI_API_KEY",
      defaultModel: "gpt-5-mini",
      allowedModels: ["gpt-5-mini"],
      tags: ["critical"],
      monthlyBudgetUsd: 50,
      healthCheck: { enabled: true, prompt: "Reply OK", expectedText: "OK", timeoutMs: 30000 },
      telemetryEnabled: true
    });
    expect(result.apiKeyEnv).toBe("OPENAI_API_KEY");
  });

  it("rejects lowercase secret references", () => {
    expect(() => projectCreateSchema.parse({
      name: "Support AI",
      environment: "production",
      provider: "openai-responses",
      baseUrl: "https://api.openai.com/v1",
      apiKeyEnv: "openai_key",
      defaultModel: "gpt-5-mini",
      allowedModels: ["gpt-5-mini"],
      healthCheck: { enabled: true, prompt: "OK", expectedText: "OK", timeoutMs: 30000 }
    })).toThrow();
  });

  it("creates stable slugs", () => {
    expect(slugify("Customer Support — AI")).toBe("customer-support-ai");
  });
});

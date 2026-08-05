import { describe, expect, it } from "vitest";
import { playgroundSchema, settingsSchema } from "@/lib/validation";

describe("gateway validation", () => {
  it("accepts a bounded playground request", () => { expect(playgroundSchema.parse({ prompt: "hello", maxOutputTokens: 800 }).prompt).toBe("hello"); });
  it("rejects an empty prompt", () => { expect(() => playgroundSchema.parse({ prompt: "" })).toThrow(); });
  it("validates operational settings", () => { expect(settingsSchema.parse({ healthPrompt: "OK", expectedText: "OK", timeoutMs: 30000, maxOutputTokens: 800, retentionDays: 90 }).retentionDays).toBe(90); });
});

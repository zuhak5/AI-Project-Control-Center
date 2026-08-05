import { describe, expect, it } from "vitest";
import { safeEqual, sha256, signValue, verifySignedValue } from "@/lib/crypto";

describe("crypto primitives", () => {
  it("round-trips signed values", () => {
    const token = signValue('{"role":"owner"}', "a-secret-value-that-is-long-enough");
    expect(verifySignedValue(token, "a-secret-value-that-is-long-enough")).toBe('{"role":"owner"}');
  });

  it("rejects tampering", () => {
    const token = signValue("payload", "a-secret-value-that-is-long-enough");
    expect(verifySignedValue(`${token}x`, "a-secret-value-that-is-long-enough")).toBeNull();
  });

  it("hashes and compares deterministic values", () => {
    expect(sha256("token")).toHaveLength(64);
    expect(safeEqual("same", "same")).toBe(true);
    expect(safeEqual("same", "different")).toBe(false);
  });
});

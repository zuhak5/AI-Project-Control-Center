import { describe, expect, it } from "vitest";
import { formatDate, formatDuration, formatNumber } from "@/lib/format";

describe("defensive formatting", () => {
  it("does not throw for invalid values", () => {
    expect(formatDate("not-a-date")).toBe("Invalid date");
    expect(formatDuration(Number.NaN)).toBe("0 ms");
    expect(formatNumber(Number.POSITIVE_INFINITY)).toBe("0");
  });
});

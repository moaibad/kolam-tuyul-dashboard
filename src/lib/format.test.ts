import { describe, expect, it } from "vitest";

import {
  formatCurrency,
  formatPercent,
  formatPrice,
  getRangeProgress,
  isValidWalletAddress,
} from "@/lib/format";

describe("format helpers", () => {
  it("validates EVM addresses", () => {
    expect(
      isValidWalletAddress("0x0000000000000000000000000000000000000001"),
    ).toBe(true);
    expect(isValidWalletAddress("0x1234")).toBe(false);
  });

  it("formats financial values consistently", () => {
    expect(formatCurrency(1302.6)).toBe("$1,302.60");
    expect(formatPercent(13.026)).toBe("+13.03%");
    expect(formatPercent(-2.41)).toBe("-2.41%");
  });

  it("preserves significant digits for small prices", () => {
    expect(formatPrice(0.00000003142)).toBe("0.00000003142");
    expect(formatPrice(0)).toBe("0");
  });
});

describe("range progress", () => {
  it.each([
    [-1, 0, 10, "below", 0],
    [5, 0, 10, "inside", 50],
    [11, 0, 10, "above", 100],
  ] as const)(
    "maps tick %s to %s",
    (current, lower, upper, placement, percent) => {
      expect(getRangeProgress(current, lower, upper)).toEqual({
        placement,
        percent,
      });
    },
  );
});

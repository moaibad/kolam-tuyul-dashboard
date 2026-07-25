import { describe, expect, it } from "vitest";

import {
  formatCurrency,
  formatPercent,
  formatPrice,
  formatQuoteValue,
  formatSyncAge,
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

  it("formats position values in quote token with their USDG equivalent", () => {
    expect(formatQuoteValue(0.016, "ETH", 1_856.25)).toBe(
      "0.0160 ETH ($29.70)",
    );
    expect(formatQuoteValue(0.004266, "ETH", 1_856.25, true)).toBe(
      "+0.004266 ETH (+$7.92)",
    );
    expect(formatQuoteValue(20, "USDG", 1)).toBe("20.00 USDG");
    expect(formatQuoteValue(0.016, "ETH", null)).toBe(
      "0.0160 ETH (USDG unavailable)",
    );
  });

  it("preserves significant digits for small prices", () => {
    expect(formatPrice(0.00000003142)).toBe("0.00000003142");
    expect(formatPrice(0)).toBe("0");
  });

  it.each([
    [0, "0s ago"],
    [59_999, "59s ago"],
    [60_000, "1m ago"],
    [59 * 60_000, "59m ago"],
    [60 * 60_000, "1h ago"],
    [23 * 60 * 60_000, "23h ago"],
    [24 * 60 * 60_000, "1d ago"],
  ])("formats a sync age of %i milliseconds", (elapsedMs, expected) => {
    expect(formatSyncAge(1_000_000 + elapsedMs, 1_000_000)).toBe(expected);
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

import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { buildPortfolioCalendar } from "@/server/portfolio-calendar-service";

const NOW = Date.parse("2026-07-28T12:00:00Z");
const ADDRESS = "0x0000000000000000000000000000000000000001";

describe("Krystal portfolio calendar", () => {
  it("groups every position in the rolling 365-day window by Bangkok date", () => {
    const result = buildPortfolioCalendar(
      ADDRESS,
      [
        closedPosition("window-start", "2025-07-28T12:30:00Z"),
        closedPosition("inside", "2026-07-27T18:30:00Z"),
        closedPosition("too-old", "2025-07-20T00:00:00Z"),
        closedPosition("future", "2026-07-29T00:00:00Z"),
      ],
      NOW,
    );

    expect(result.months).toHaveLength(13);
    expect(result.months[0]).toMatchObject({
      month: "2025-07",
      days: [
        {
          date: "2025-07-28",
          positions: [expect.objectContaining({ id: "56:window-start" })],
        },
      ],
    });
    expect(result.months.at(-1)?.month).toBe("2026-07");
    expect(result.windowStart).toBe("2025-07-28");
    expect(result.months.at(-1)?.days).toEqual([
      {
        date: "2026-07-28",
        status: "complete",
        positions: [
          expect.objectContaining({
            id: "56:inside",
            pair: "WETH / USDC",
            chainId: 56,
            chainName: "BNB Chain",
            protocolKey: "pancakeswapv3",
            protocolName: "PancakeSwap",
            protocolVersion: "v3",
            pnl: 12,
            depositedUsdg: 100,
            withdrawnUsdg: 110,
            claimedFeesUsdg: 2,
            kind: "closure",
          }),
        ],
      },
    ]);
  });
});

function closedPosition(id: string, closedTime: string) {
  const amounts = [
    {
      token: {
        address: "0x0000000000000000000000000000000000000002",
        symbol: "WETH",
        decimals: 18,
      },
      balance: "0",
      quotes: { usd: { value: 0 } },
    },
    {
      token: {
        address: "0x0000000000000000000000000000000000000003",
        symbol: "USDC",
        decimals: 6,
      },
      balance: "0",
      quotes: { usd: { value: 0 } },
    },
  ];
  return {
    id,
    tokenAddress: "0x0000000000000000000000000000000000000004",
    tokenId: id,
    chainId: 56,
    minPrice: 1_500,
    maxPrice: 2_500,
    currentPrice: 2_000,
    currentAmounts: amounts,
    closedTime,
    pnl: 12,
    totalDepositValue: 100,
    totalWithdrawValue: 110,
    feesClaimed: [
      {
        ...amounts[1],
        quotes: { usd: { value: 2 } },
      },
    ],
    pool: {
      projectKey: "pancakeswapv3",
      price: 2_000,
      tokenAmounts: amounts,
    },
  };
}

import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import {
  fetchKrystalPositions,
  mapKrystalPortfolio,
  normalizeTimestamp,
} from "@/server/krystal-api";

const ADDRESS = "0x0000000000000000000000000000000000000001";

describe("Krystal API adapter", () => {
  it("maps a Robinhood v3 position and derives stable USD metrics", () => {
    const portfolio = mapKrystalPortfolio(
      ADDRESS,
      {
        positions: [position()],
        stats: {
          totalDepositValue: 100,
          currentLiquidityValue: 112,
          currentPositionValue: 115,
          unclaimedFees: 3,
          totalFeeEarned: 5,
          pnl: 15,
        },
        warnings: [],
      },
      123,
    );

    expect(portfolio.dataSource).toBe("krystal");
    expect(portfolio.updatedAtMs).toBe(123);
    expect(portfolio.totals).toMatchObject({
      depositedUsdg: 100,
      currentLpValueUsdg: 115,
      currentLiquidityUsdg: 112,
      claimedFeesUsdg: 2,
      unclaimedFeesUsdg: 3,
      profitLossUsdg: 15,
      profitLossPercent: 15,
    });
    expect(portfolio.positions[0]).toMatchObject({
      version: "v3",
      feeLabel: "0.05%",
      status: "in_range",
      depositedValueQuote: 100,
      activeLpValueQuote: 4_100,
      unclaimedFeesValueQuote: 3,
      claimedFeesValueQuote: 2,
      netLpResultQuote: 15,
      netLpResultPercent: 15,
    });
    expect(portfolio.positions[0].token0.logoUrl).toBe(
      "https://cdn.example/weth.png",
    );
    expect(portfolio.positions[0].token1.logoUrl).toBe(
      "http://cdn.example/usdc.png",
    );
    expect(portfolio.positions[0].amounts[0].formatted).toBe("2");
  });

  it("ignores empty, malformed, and non-HTTP token logo URLs", () => {
    const portfolio = mapKrystalPortfolio(ADDRESS, {
      positions: [
        position({
          id: "unsafe-logos",
          token0Logo: "javascript:alert(1)",
          token1Logo: "not a URL",
        }),
        position({
          id: "empty-logo",
          token0Logo: " ",
        }),
      ],
      stats: null,
      warnings: [],
    });

    expect(portfolio.positions[0].token0.logoUrl).toBeUndefined();
    expect(portfolio.positions[0].token1.logoUrl).toBeUndefined();
    expect(portfolio.positions[1].token0.logoUrl).toBeUndefined();
  });

  it("skips positions with non-positive or inverted Krystal price ranges", () => {
    const portfolio = mapKrystalPortfolio(ADDRESS, {
      positions: [
        position({ id: "zero-price", price: 0 }),
        position({ id: "zero-lower", minPrice: 0 }),
        position({ id: "inverted", minPrice: 2_500, maxPrice: 1_500 }),
      ],
      stats: null,
      warnings: [],
    });

    expect(portfolio.positions).toEqual([]);
    expect(portfolio.warnings).toHaveLength(3);
    expect(portfolio.totals.partial).toBe(true);
  });

  it("accepts seconds, milliseconds, numeric strings, and ISO timestamps", () => {
    expect(normalizeTimestamp(1_700_000_000)).toBe(1_700_000_000_000);
    expect(normalizeTimestamp(1_700_000_000_000)).toBe(1_700_000_000_000);
    expect(normalizeTimestamp("1700000000")).toBe(1_700_000_000_000);
    expect(normalizeTimestamp("2026-07-28T00:00:00Z")).toBe(
      Date.parse("2026-07-28T00:00:00Z"),
    );
  });

  it("uses cached data by default and fresh data on explicit refresh", async () => {
    const fetcher = vi.fn(async (input: RequestInfo | URL) => {
      void input;
      return Response.json({
        statsByChain: { "4663": { openPositionCount: 1 } },
        positions: [position()],
      });
    });

    await fetchKrystalPositions({
      walletAddress: ADDRESS,
      status: "open",
      fetcher,
    });
    await fetchKrystalPositions({
      walletAddress: ADDRESS,
      status: "open",
      refresh: true,
      fetcher,
    });

    expect(String(fetcher.mock.calls[0]![0])).toContain("refreshAll=false");
    expect(String(fetcher.mock.calls[1]![0])).toContain("refreshAll=true");
  });

  it("paginates, deduplicates, and filters unsupported protocols", async () => {
    const firstPage = Array.from({ length: 500 }, (_, index) =>
      position({ id: `position-${index}` }),
    );
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(
        Response.json({
          statsByChain: { "4663": { openPositionCount: 502 } },
          positions: firstPage,
        }),
      )
      .mockResolvedValueOnce(
        Response.json({
          positions: [
            position({ id: "position-500", projectKey: "uniswapv4" }),
            position({ id: "position-500", projectKey: "uniswapv4" }),
            position({ id: "ignored", projectKey: "uniswapv2" }),
          ],
        }),
      );

    const result = await fetchKrystalPositions({
      walletAddress: ADDRESS,
      status: "open",
      fetcher,
    });

    expect(fetcher).toHaveBeenCalledTimes(2);
    expect(String(fetcher.mock.calls[1]![0])).toContain("offset=500");
    expect(result.positions).toHaveLength(501);
    expect(result.warnings).toContain(
      "Skipped unsupported Krystal protocol uniswapv2.",
    );
  });

  it("rejects malformed successful responses", async () => {
    await expect(
      fetchKrystalPositions({
        walletAddress: ADDRESS,
        status: "open",
        fetcher: vi.fn(async () => Response.json({ data: [] })),
      }),
    ).rejects.toThrow("invalid positions response");
  });

  it("accepts Krystal's stats-only response for a wallet with no positions", async () => {
    const result = await fetchKrystalPositions({
      walletAddress: ADDRESS,
      status: "open",
      fetcher: vi.fn(async () =>
        Response.json({
          statsByChain: {
            all: {
              openPositionCount: 0,
              closedPositionCount: 0,
            },
          },
        }),
      ),
    });

    expect(result.positions).toEqual([]);
    expect(result.stats).toMatchObject({ openPositionCount: 0 });
  });
});

function position(
  overrides: {
    id?: string;
    projectKey?: string;
    price?: number;
    minPrice?: number;
    maxPrice?: number;
    token0Logo?: string;
    token1Logo?: string;
  } = {},
): Record<string, unknown> {
  const token0 = {
    token: {
      address: "0x0000000000000000000000000000000000000002",
      symbol: "WETH",
      decimals: 18,
      price: 2_000,
      logo: overrides.token0Logo ?? "https://cdn.example/weth.png",
    },
    balance: "2000000000000000000",
    quotes: { usd: { price: 2_000, value: 4_000 } },
  };
  const token1 = {
    token: {
      address: "0x0000000000000000000000000000000000000003",
      symbol: "USDC",
      decimals: 6,
      price: 1,
      logo: overrides.token1Logo ?? "http://cdn.example/usdc.png",
    },
    balance: "100000000",
    quotes: { usd: { price: 1, value: 100 } },
  };
  return {
    id: overrides.id ?? "position-1",
    tokenAddress: "0x0000000000000000000000000000000000000004",
    tokenId: "42",
    liquidity: "123",
    minPrice: overrides.minPrice ?? 1_500,
    maxPrice: overrides.maxPrice ?? 2_500,
    currentAmounts: [token0, token1],
    feePending: [
      { ...token1, balance: "3000000", quotes: { usd: { value: 3 } } },
    ],
    feesClaimed: [
      { ...token1, balance: "2000000", quotes: { usd: { value: 2 } } },
    ],
    openedTime: 1_700_000_000,
    impermanentLoss: -1,
    apr: 12,
    pnl: 15,
    returnOnInvestment: 0.15,
    totalDepositValue: 100,
    totalWithdrawValue: 0,
    currentUnderlyingValue: 112,
    currentPositionValue: 115,
    status: "IN_RANGE",
    pool: {
      projectKey: overrides.projectKey ?? "uniswapv3",
      price: overrides.price ?? 2_000,
      fees: ["0.0005"],
      tokenAmounts: [token0, token1],
    },
  };
}

import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import {
  InvalidWalletAddressError,
  parseWalletAddress,
  serializePortfolio,
} from "@/server/portfolio-service";
import type {
  PortfolioSnapshot as CorePortfolioSnapshot,
  PositionSnapshot as CorePositionSnapshot,
} from "@/server/live-core/types";

const ADDRESS = "0x0000000000000000000000000000000000000001";
const TOKEN = {
  address: "0x0000000000000000000000000000000000000002",
  symbol: "TOK",
  decimals: 18,
} as const;

describe("portfolio service", () => {
  it("validates and normalizes EVM addresses", () => {
    expect(parseWalletAddress(` ${ADDRESS} `)).toBe(ADDRESS);
    expect(() => parseWalletAddress("not-an-address")).toThrow(
      InvalidWalletAddressError,
    );
  });

  it("serializes bigint fields and preserves nullable partial totals", () => {
    const position = {
      id: "v4:manager:42",
      tokenId: 42n,
      version: "v4",
      manager: ADDRESS,
      token0: TOKEN,
      token1: TOKEN,
      quoteToken: TOKEN,
      quoteTokenPriceUsdg: null,
      feeTier: 3_000,
      tickLower: -10,
      tickUpper: 10,
      currentTick: 0,
      currentPrice: 1,
      lowerPrice: 0.9,
      upperPrice: 1.1,
      liquidity: 123n,
      status: "in_range",
      mintTimestampMs: 1,
      blockNumber: 99n,
      amounts: [
        { token: TOKEN, raw: 7n, formatted: "7", valueUsdg: null },
      ],
      currentLpValueUsdg: null,
      claimedFeesUsdg: null,
      unclaimedFeesUsdg: null,
      depositedUsdg: null,
      withdrawnUsdg: null,
      totalResultUsdg: null,
      profitLossUsdg: null,
      profitLossPercent: null,
      hodlValueQuote: null,
      lpPrincipalValueQuote: null,
      claimedFeesValueQuote: null,
      unclaimedFeesValueQuote: null,
      impermanentLossQuote: null,
      impermanentLossPercent: null,
      netLpResultQuote: null,
      netLpResultPercent: null,
      depositedValueQuote: null,
      activeLpValueQuote: 7,
      totalResultValueQuote: null,
      accountingStatus: "unavailable",
      accountingError: "Historical RPC unavailable",
      uniswapUrl: "https://app.uniswap.org",
      explorerUrl: "https://example.com",
    } satisfies CorePositionSnapshot;
    const core = {
      chainName: "Robinhood Chain",
      blockNumber: 99n,
      updatedAtMs: 123,
      positions: [position],
      totals: {
        depositedUsdg: null,
        currentLpValueUsdg: null,
        claimedFeesUsdg: null,
        unclaimedFeesUsdg: null,
        totalResultUsdg: null,
        profitLossUsdg: null,
        profitLossPercent: null,
        partial: true,
      },
      warnings: ["partial"],
    } satisfies CorePortfolioSnapshot;

    const result = serializePortfolio(ADDRESS, core);

    expect(result.blockNumber).toBe("99");
    expect(result.positions[0].tokenId).toBe("42");
    expect(result.positions[0].liquidity).toBe("123");
    expect(result.positions[0].quoteTokenPriceUsdg).toBeNull();
    expect(result.positions[0].amounts[0].raw).toBe("7");
    expect(result.positions[0].accountingError).toBe(
      "Historical RPC unavailable",
    );
    expect(result.totals.partial).toBe(true);
    expect(result.totals.depositedUsdg).toBeNull();
  });
});

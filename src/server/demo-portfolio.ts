import "server-only";

import type {
  PortfolioSnapshot,
  PositionSnapshot,
  TokenInfo,
} from "@/lib/types";
import { parseWalletAddress } from "@/server/portfolio-service";

const USDG: TokenInfo = {
  address: "0x5fc5360D0400a0Fd4f2af552ADD042D716F1d168",
  symbol: "USDG",
  decimals: 18,
};

const WETH: TokenInfo = {
  address: "0x0Bd7D308f8E1639FAb988df18A8011f41EAcAD73",
  symbol: "WETH",
  decimals: 18,
};

const INDEX: TokenInfo = {
  address: "0xA1b2c3D4e5F60718293a4B5c6D7e8F9012345678",
  symbol: "INDEX",
  decimals: 18,
};

function createPositions(nowMs: number): PositionSnapshot[] {
  return [
    {
      id: "demo-v4-123456",
      tokenId: "123456",
      version: "v4",
      token0: INDEX,
      token1: USDG,
      quoteToken: USDG,
      quoteTokenPriceUsdg: 1,
      feeLabel: "0.30%",
      tickLower: -313_880,
      tickUpper: -308_280,
      currentTick: -310_460,
      currentPrice: 0.033239,
      lowerPrice: 0.023391,
      upperPrice: 0.040949,
      liquidity: "23894012759432750",
      status: "in_range",
      mintTimestampMs: nowMs - 12 * 24 * 60 * 60_000,
      blockNumber: "38291407",
      amounts: [
        {
          token: INDEX,
          raw: "12450000000000000000000",
          formatted: "12,450.00",
          valueUsdg: 1_551.27,
        },
        {
          token: USDG,
          raw: "1290250000000000000000",
          formatted: "1,290.25",
          valueUsdg: 1_290.25,
        },
      ],
      depositedValueQuote: 2_000,
      activeLpValueQuote: 2_841.52,
      claimedFeesValueQuote: 9.2,
      unclaimedFeesValueQuote: 18.42,
      totalResultValueQuote: 2_869.14,
      netLpResultQuote: 869.14,
      netLpResultPercent: 43.46,
      accountingStatus: "synced",
      uniswapUrl: "https://app.uniswap.org/portfolio",
      explorerUrl: "https://robinhoodchain.blockscout.com",
    },
    {
      id: "demo-v3-98721",
      tokenId: "98721",
      version: "v3",
      token0: WETH,
      token1: USDG,
      quoteToken: USDG,
      quoteTokenPriceUsdg: 1,
      feeLabel: "0.05%",
      tickLower: -1_200,
      tickUpper: 800,
      currentTick: 1_240,
      currentPrice: 2_018.42,
      lowerPrice: 1_845.1,
      upperPrice: 1_992.75,
      liquidity: "91421075238440120",
      status: "out_of_range",
      outOfRangeSinceMs: nowMs - 2.5 * 60 * 60_000,
      mintTimestampMs: nowMs - 37 * 24 * 60 * 60_000,
      blockNumber: "38291407",
      amounts: [
        {
          token: WETH,
          raw: "1324000000000000000",
          formatted: "1.3240",
          valueUsdg: 2_672.39,
        },
        {
          token: USDG,
          raw: "5670290000000000000000",
          formatted: "5,670.29",
          valueUsdg: 5_670.29,
        },
      ],
      depositedValueQuote: 8_000,
      activeLpValueQuote: 8_342.68,
      claimedFeesValueQuote: 42.8,
      unclaimedFeesValueQuote: 47.98,
      totalResultValueQuote: 8_433.46,
      netLpResultQuote: 433.46,
      netLpResultPercent: 5.42,
      accountingStatus: "synced",
      uniswapUrl: "https://app.uniswap.org/portfolio",
      explorerUrl: "https://robinhoodchain.blockscout.com",
    },
  ];
}

export async function getDemoPortfolio(
  walletAddressInput: string,
): Promise<PortfolioSnapshot> {
  const address = parseWalletAddress(walletAddressInput);
  const updatedAtMs = Date.now();

  return {
    address,
    chainName: "Robinhood Chain (Demo)",
    blockNumber: "38291407",
    updatedAtMs,
    positions: createPositions(updatedAtMs),
    totals: {
      depositedUsdg: 10_000,
      currentLpValueUsdg: 11_184.2,
      claimedFeesUsdg: 52,
      unclaimedFeesUsdg: 66.4,
      totalResultUsdg: 11_302.6,
      profitLossUsdg: 1_302.6,
      profitLossPercent: 13.026,
      partial: false,
    },
    warnings: [],
  };
}

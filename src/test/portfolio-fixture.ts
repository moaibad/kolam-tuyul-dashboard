import type {
  PortfolioSnapshot,
  PositionDataSource,
  PositionSnapshot,
  PositionVersion,
  RangeStatus,
} from "@/lib/types";

const USDG = {
  address: "0x5fc5360D0400a0Fd4f2af552ADD042D716F1d168",
  symbol: "USDG",
  decimals: 18,
};

function position(
  overrides: Partial<PositionSnapshot> & {
    id: string;
    version: PositionVersion;
    status: RangeStatus;
  },
): PositionSnapshot {
  return {
    tokenId: "123456",
    token0: {
      address: "0xA1b2c3D4e5F60718293a4B5c6D7e8F9012345678",
      symbol: "INDEX",
      decimals: 18,
    },
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
    mintTimestampMs: Date.now() - 12 * 24 * 60 * 60_000,
    blockNumber: "38291407",
    amounts: [
      {
        token: {
          address: "0xA1b2c3D4e5F60718293a4B5c6D7e8F9012345678",
          symbol: "INDEX",
          decimals: 18,
        },
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
    ...overrides,
  };
}

function createPortfolio(address: string, updatedAtMs: number): PortfolioSnapshot {
  return {
    address,
    chainName: "Robinhood Chain",
    blockNumber: "38291407",
    updatedAtMs,
    positions: [
      position({
        id: "v4:position-manager:123456",
        version: "v4",
        status: "in_range",
      }),
      position({
        id: "v3:position-manager:98721",
        version: "v3",
        status: "out_of_range",
        tokenId: "98721",
        token0: {
          address: "0x0Bd7D308f8E1639FAb988df18A8011f41EAcAD73",
          symbol: "WETH",
          decimals: 18,
        },
        feeLabel: "0.05%",
        tickLower: -1_200,
        tickUpper: 800,
        currentTick: 1_240,
        currentPrice: 2_018.42,
        lowerPrice: 1_845.1,
        upperPrice: 1_992.75,
        mintTimestampMs: Date.now() - 37 * 24 * 60 * 60_000,
        outOfRangeSinceMs: Date.now() - 2.5 * 60 * 60_000,
        amounts: [
          {
            token: {
              address: "0x0Bd7D308f8E1639FAb988df18A8011f41EAcAD73",
              symbol: "WETH",
              decimals: 18,
            },
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
      }),
    ],
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

export class FixturePositionDataSource implements PositionDataSource {
  constructor(private readonly delayMs = 450) {}

  async getPortfolio(address: string) {
    if (this.delayMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, this.delayMs));
    }
    return createPortfolio(address, Date.now());
  }
}

export const fixturePositionDataSource = new FixturePositionDataSource();

export type PositionVersion = "v3" | "v4";
export type RangeStatus = "in_range" | "out_of_range";
export type AccountingStatus = "syncing" | "synced" | "partial" | "unavailable";

export interface TokenInfo {
  address: string;
  symbol: string;
  decimals: number;
}

export interface TokenAmount {
  token: TokenInfo;
  raw: string;
  formatted: string;
  valueUsdg: number | null;
}

export interface PositionSnapshot {
  id: string;
  tokenId: string;
  version: PositionVersion;
  token0: TokenInfo;
  token1: TokenInfo;
  quoteToken: TokenInfo;
  quoteTokenPriceUsdg: number | null;
  feeLabel: string;
  tickLower?: number;
  tickUpper?: number;
  currentTick?: number;
  currentPrice: number;
  lowerPrice: number;
  upperPrice: number;
  liquidity: string;
  status: RangeStatus;
  outOfRangeSinceMs?: number;
  mintTimestampMs: number;
  blockNumber?: string;
  amounts: TokenAmount[];
  depositedValueQuote: number | null;
  activeLpValueQuote: number | null;
  claimedFeesValueQuote: number | null;
  unclaimedFeesValueQuote: number | null;
  totalResultValueQuote: number | null;
  netLpResultQuote: number | null;
  netLpResultPercent: number | null;
  impermanentLossUsdg?: number | null;
  compareToHodlUsdg?: number | null;
  apr?: number | null;
  withdrawnUsdg?: number | null;
  accountingStatus: AccountingStatus;
  accountingError?: string;
  uniswapUrl: string;
  explorerUrl: string;
}

export interface PortfolioSnapshot {
  address: string;
  chainName: string;
  blockNumber?: string;
  updatedAtMs: number;
  dataSource?: "krystal" | "demo";
  positions: PositionSnapshot[];
  totals: {
    depositedUsdg: number | null;
    currentLpValueUsdg: number | null;
    currentLiquidityUsdg?: number | null;
    claimedFeesUsdg: number | null;
    unclaimedFeesUsdg: number | null;
    totalResultUsdg: number | null;
    profitLossUsdg: number | null;
    profitLossPercent: number | null;
    partial: boolean;
  };
  warnings: string[];
}

export interface PositionDataSource {
  getPortfolio(
    address: string,
    options?: { refresh?: boolean },
  ): Promise<PortfolioSnapshot>;
}

import "server-only";

import { getAddress, isAddress, type Address } from "viem";

import { createChainClient } from "@/server/live-core/chain";
import { resolveDeployments } from "@/server/live-core/contracts";
import type { AppConfig } from "@/server/live-core/config";
import { RefreshService } from "@/server/live-core/refresh";
import { StateDatabase } from "@/server/live-core/state/database";
import type {
  PortfolioSnapshot as CorePortfolioSnapshot,
  PositionSnapshot as CorePositionSnapshot,
} from "@/server/live-core/types";
import type {
  PortfolioSnapshot,
  PositionSnapshot,
  TokenAmount,
} from "@/lib/types";

const DEFAULT_ROBINHOOD_RPC_URL = "https://rpc.mainnet.chain.robinhood.com";
const USDG_ADDRESS = getAddress(
  "0x5fc5360D0400a0Fd4f2af552ADD042D716F1d168",
);
const WETH_ADDRESS = getAddress(
  "0x0Bd7D308f8E1639FAb988df18A8011f41EAcAD73",
);

export class InvalidWalletAddressError extends Error {}

let databasePromise: Promise<StateDatabase> | undefined;

function getDatabase() {
  if (!databasePromise) {
    databasePromise = (async () => {
      const url = process.env.TURSO_DATABASE_URL;
      const authToken = process.env.TURSO_AUTH_TOKEN;
      if (!url || !authToken) {
        throw new Error(
          "TURSO_DATABASE_URL and TURSO_AUTH_TOKEN must be configured.",
        );
      }
      const database = new StateDatabase(url, authToken);
      return database;
    })().catch((error) => {
      databasePromise = undefined;
      throw error;
    });
  }
  return databasePromise;
}

export function parseWalletAddress(value: string | null): Address {
  const trimmed = value?.trim() ?? "";
  if (!isAddress(trimmed)) {
    throw new InvalidWalletAddressError("A valid EVM wallet address is required.");
  }
  return getAddress(trimmed);
}

export async function getLivePortfolio(
  walletAddressInput: string,
): Promise<PortfolioSnapshot> {
  const walletAddress = parseWalletAddress(walletAddressInput);
  const config: AppConfig = {
    walletAddress,
    robinhoodRpcUrl:
      process.env.ROBINHOOD_RPC_URL ?? DEFAULT_ROBINHOOD_RPC_URL,
    usdgAddress: USDG_ADDRESS,
    wethAddress: WETH_ADDRESS,
    pricePoolCacheMs: 0,
    priceRouteIntermediateTokens: [WETH_ADDRESS],
  };
  const database = await getDatabase();
  const service = new RefreshService(
    config,
    createChainClient(config),
    database,
    resolveDeployments(),
  );
  const result = await service.refresh();
  return serializePortfolio(walletAddress, result.portfolio);
}

export function serializePortfolio(
  address: Address,
  portfolio: CorePortfolioSnapshot,
): PortfolioSnapshot {
  return {
    address,
    chainName: portfolio.chainName,
    blockNumber: portfolio.blockNumber.toString(),
    updatedAtMs: portfolio.updatedAtMs,
    positions: portfolio.positions.map(serializePosition),
    totals: {
      depositedUsdg: portfolio.totals.depositedUsdg,
      currentLpValueUsdg: portfolio.totals.currentLpValueUsdg,
      claimedFeesUsdg: portfolio.totals.claimedFeesUsdg,
      unclaimedFeesUsdg: portfolio.totals.unclaimedFeesUsdg,
      totalResultUsdg: portfolio.totals.totalResultUsdg,
      profitLossUsdg: portfolio.totals.profitLossUsdg,
      profitLossPercent: portfolio.totals.profitLossPercent,
      partial: portfolio.totals.partial,
    },
    warnings: portfolio.warnings,
  };
}

function serializePosition(position: CorePositionSnapshot): PositionSnapshot {
  return {
    id: position.id,
    tokenId: position.tokenId.toString(),
    version: position.version,
    token0: position.token0,
    token1: position.token1,
    quoteToken: position.quoteToken,
    quoteTokenPriceUsdg: position.quoteTokenPriceUsdg,
    feeLabel: position.feeLabel ?? formatFeeTier(position.feeTier),
    tickLower: position.tickLower,
    tickUpper: position.tickUpper,
    currentTick: position.currentTick,
    currentPrice: position.currentPrice,
    lowerPrice: position.lowerPrice,
    upperPrice: position.upperPrice,
    liquidity: position.liquidity.toString(),
    status: position.status,
    outOfRangeSinceMs: position.outOfRangeSinceMs,
    mintTimestampMs: position.mintTimestampMs,
    blockNumber: position.blockNumber.toString(),
    amounts: position.amounts.map(serializeAmount),
    depositedValueQuote: position.depositedValueQuote,
    activeLpValueQuote: position.activeLpValueQuote,
    claimedFeesValueQuote: position.claimedFeesValueQuote,
    unclaimedFeesValueQuote: position.unclaimedFeesValueQuote,
    totalResultValueQuote: position.totalResultValueQuote,
    netLpResultQuote: position.netLpResultQuote,
    netLpResultPercent: position.netLpResultPercent,
    accountingStatus: position.accountingStatus,
    accountingError: position.accountingError,
    uniswapUrl: position.uniswapUrl,
    explorerUrl: position.explorerUrl,
  };
}

function serializeAmount(
  amount: CorePositionSnapshot["amounts"][number],
): TokenAmount {
  return {
    token: amount.token,
    raw: amount.raw.toString(),
    formatted: amount.formatted,
    valueUsdg: amount.valueUsdg,
  };
}

function formatFeeTier(feeTier: number) {
  return `${(feeTier / 10_000).toFixed(2)}%`;
}

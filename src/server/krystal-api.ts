import "server-only";

import type {
  PortfolioSnapshot,
  PositionSnapshot,
  PositionVersion,
  TokenAmount,
  TokenInfo,
} from "@/lib/types";

const DEFAULT_KRYSTAL_POSITIONS_URL =
  "https://api.krystal.app/all/v2/lp/userPositions";
const PAGE_SIZE = 500;
const REQUEST_TIMEOUT_MS = 8_000;

const CHAIN_METADATA: Record<
  number,
  { name: string; explorerUrl?: string; explorerKind?: "blockscout" }
> = {
  1: { name: "Ethereum", explorerUrl: "https://etherscan.io" },
  10: { name: "Optimism", explorerUrl: "https://optimistic.etherscan.io" },
  56: { name: "BNB Chain", explorerUrl: "https://bscscan.com" },
  137: { name: "Polygon", explorerUrl: "https://polygonscan.com" },
  250: { name: "Fantom", explorerUrl: "https://ftmscan.com" },
  324: { name: "zkSync Era", explorerUrl: "https://explorer.zksync.io" },
  4663: {
    name: "Robinhood Chain",
    explorerUrl: "https://robinhoodchain.blockscout.com",
    explorerKind: "blockscout",
  },
  8453: { name: "Base", explorerUrl: "https://basescan.org" },
  42161: { name: "Arbitrum One", explorerUrl: "https://arbiscan.io" },
  43114: { name: "Avalanche", explorerUrl: "https://snowtrace.io" },
  59144: { name: "Linea", explorerUrl: "https://lineascan.build" },
  81457: { name: "Blast", explorerUrl: "https://blastscan.io" },
};

export type KrystalPositionStatus = "open" | "closed";

export interface KrystalPositionsResult {
  positions: Record<string, unknown>[];
  stats: Record<string, unknown> | null;
  warnings: string[];
}

export class KrystalApiError extends Error {
  constructor(
    message: string,
    readonly status?: number,
  ) {
    super(message);
  }
}

function krystalPositionsUrl(): string {
  return (
    process.env.KRYSTAL_POSITIONS_URL?.trim() ||
    DEFAULT_KRYSTAL_POSITIONS_URL
  );
}

export async function fetchKrystalPositions(input: {
  walletAddress: string;
  status: KrystalPositionStatus;
  refresh?: boolean;
  fetcher?: typeof fetch;
}): Promise<KrystalPositionsResult> {
  const fetcher = input.fetcher ?? fetch;
  const positions: Record<string, unknown>[] = [];
  const warnings: string[] = [];
  let stats: Record<string, unknown> | null = null;

  for (let offset = 0; ; offset += PAGE_SIZE) {
    const url = new URL(krystalPositionsUrl());
    url.searchParams.set("addresses", input.walletAddress);
    url.searchParams.set("walletAddress", input.walletAddress);
    url.searchParams.set("quoteSymbols", "usd");
    url.searchParams.set("offset", String(offset));
    url.searchParams.set("limit", String(PAGE_SIZE));
    url.searchParams.set(
      "orderBy",
      input.status === "open" ? "liquidity" : "lastAction",
    );
    url.searchParams.set("positionStatus", input.status);
    url.searchParams.set("isIncludeSpamPosition", "false");
    url.searchParams.set("refreshAll", String(Boolean(input.refresh)));

    let response: Response;
    try {
      response = await fetcher(url, {
        cache: "no-store",
        headers: { Accept: "application/json" },
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });
    } catch (error) {
      if (error instanceof Error && error.name === "TimeoutError") {
        throw new KrystalApiError("Krystal timed out while loading positions.");
      }
      throw new KrystalApiError(
        `Krystal could not be reached: ${error instanceof Error ? error.message : String(error)}`,
      );
    }

    const body = (await response.json().catch(() => null)) as unknown;
    if (!response.ok) {
      throw new KrystalApiError(
        readUpstreamError(body) ?? `Krystal returned HTTP ${response.status}.`,
        response.status,
      );
    }
    if (!isRecord(body)) {
      throw new KrystalApiError(
        "Krystal returned an invalid positions response.",
        502,
      );
    }
    const upstreamErrors = Array.isArray(body.err)
      ? body.err.filter((value): value is string => typeof value === "string")
      : [];
    if (upstreamErrors.length > 0) {
      throw new KrystalApiError(upstreamErrors.join(" "), 502);
    }

    if (!stats) {
      const statsByChain = asRecord(body.statsByChain);
      stats = asRecord(statsByChain?.all);
    }

    const expectedCount = numberValue(
      stats?.[
        input.status === "open" ? "openPositionCount" : "closedPositionCount"
      ],
    );
    const rawPage =
      body.positions == null && expectedCount === 0 ? [] : body.positions;
    if (!Array.isArray(rawPage)) {
      throw new KrystalApiError(
        "Krystal returned an invalid positions response.",
        502,
      );
    }

    const page = rawPage.filter(isRecord);
    positions.push(...page);
    if (page.length < PAGE_SIZE) break;

    if (expectedCount != null && positions.length >= expectedCount) break;
  }

  const unique = [
    ...new Map(
      positions.map((position, index) => [
        rawPositionIdentity(position, index),
        position,
      ]),
    ).values(),
  ];

  return { positions: unique, stats, warnings: [...new Set(warnings)] };
}

export function mapKrystalPortfolio(
  walletAddress: string,
  result: KrystalPositionsResult,
  nowMs = Date.now(),
): PortfolioSnapshot {
  const warnings = [...result.warnings];
  const positions: PositionSnapshot[] = [];

  for (const raw of result.positions) {
    try {
      positions.push(mapKrystalPosition(raw));
    } catch (error) {
      warnings.push(
        `Skipped a malformed Krystal position: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  const depositedUsdg = sum(
    positions.map((position) => position.depositedValueQuote),
  );
  const currentLiquidityUsdg = sum(
    positions.map((position) => position.activeLpValueQuote),
  );
  const currentPositionUsdg = sum(
    positions.map((position) => position.totalResultValueQuote),
  );
  const unclaimedFeesUsdg = sum(
    positions.map((position) => position.unclaimedFeesValueQuote),
  );
  const claimedFeesUsdg = sum(
    positions.map((position) => position.claimedFeesValueQuote),
  );
  const profitLossUsdg = sum(
    positions.map((position) => position.netLpResultQuote),
  );
  const calculatedRoi =
    depositedUsdg > 0 ? (profitLossUsdg / depositedUsdg) * 100 : null;
  const profitLossPercent = calculatedRoi;

  return {
    address: walletAddress,
    chainName: "All Krystal chains",
    updatedAtMs: nowMs,
    dataSource: "krystal",
    positions,
    totals: {
      depositedUsdg,
      currentLpValueUsdg: currentPositionUsdg,
      currentLiquidityUsdg,
      claimedFeesUsdg,
      unclaimedFeesUsdg,
      totalResultUsdg: currentPositionUsdg,
      profitLossUsdg,
      profitLossPercent,
      partial: warnings.length > 0,
    },
    warnings,
  };
}

export function mapKrystalPosition(
  raw: Record<string, unknown>,
): PositionSnapshot {
  const pool = requiredRecord(raw.pool, "pool");
  const chain = chainFields(raw, pool);
  const protocol = protocolFields(raw, pool);
  const currentAmounts = recordArray(raw.currentAmounts);
  const poolAmounts = recordArray(pool.tokenAmounts);
  const tokenEntries = currentAmounts.length >= 2 ? currentAmounts : poolAmounts;
  if (tokenEntries.length < 2) {
    throw new Error("token pair is missing");
  }

  const amounts = tokenEntries.slice(0, 2).map(mapTokenAmount);
  const token0 = amounts[0]!.token;
  const token1 = amounts[1]!.token;
  const feePending = recordArray(raw.feePending);
  const feesClaimed = recordArray(raw.feesClaimed);
  const unclaimedFees = sumUsdValues(feePending);
  const claimedFees = sumUsdValues(feesClaimed);
  const currentLiquidity =
    sumUsdValues(currentAmounts) ||
    numberValue(raw.currentUnderlyingValue) ||
    0;
  const currentPosition =
    numberValue(raw.currentPositionValue) ??
    currentLiquidity + unclaimedFees;
  const deposited = numberValue(raw.totalDepositValue) ?? 0;
  const withdrawn = numberValue(raw.totalWithdrawValue) ?? 0;
  const pnl = numberValue(raw.pnl) ?? 0;
  const calculatedRoi = deposited > 0 ? (pnl / deposited) * 100 : null;
  const lowerPrice = requiredPositiveNumber(raw.minPrice, "minPrice");
  const upperPrice = requiredPositiveNumber(raw.maxPrice, "maxPrice");
  if (lowerPrice > upperPrice) {
    throw new Error("price range is invalid");
  }
  const currentPrice =
    positiveNumberValue(pool.price) ??
    positiveNumberValue(raw.currentPrice);
  if (currentPrice == null) {
    throw new Error("currentPrice is missing or invalid");
  }
  const tokenAddress = requiredString(raw.tokenAddress, "tokenAddress");
  const tokenId = requiredString(raw.tokenId, "tokenId");
  const id =
    `${chain.chainId}:${stringValue(raw.id) ?? `${tokenAddress.toLowerCase()}:${tokenId}`}`;

  return {
    id,
    tokenId,
    ...chain,
    ...protocol,
    token0,
    token1,
    quoteToken: token1,
    quoteTokenPriceUsdg: tokenPriceUsdg(tokenEntries[1]!),
    feeLabel: formatFeeLabel(pool.fees, protocol.protocolVersion),
    currentPrice,
    lowerPrice,
    upperPrice,
    liquidity: stringValue(raw.liquidity) ?? "0",
    status:
      stringValue(raw.status)?.toUpperCase() === "OUT_RANGE"
        ? "out_of_range"
        : "in_range",
    mintTimestampMs: normalizeTimestamp(raw.openedTime ?? raw.createdTime),
    amounts,
    depositedValueQuote: deposited,
    activeLpValueQuote: currentLiquidity,
    claimedFeesValueQuote: claimedFees,
    unclaimedFeesValueQuote: unclaimedFees,
    totalResultValueQuote: currentPosition,
    netLpResultQuote: pnl,
    netLpResultPercent: normalizeReportedPercent(
      raw.returnOnInvestment,
      calculatedRoi,
    ),
    impermanentLossUsdg: numberValue(raw.impermanentLoss),
    compareToHodlUsdg: numberValue(raw.compareWithHodl),
    apr: numberValue(raw.apr),
    withdrawnUsdg: withdrawn,
    accountingStatus: "synced",
    positionUrl:
      safeImageUrl(raw.positionUrl) ??
      safeImageUrl(pool.positionUrl) ??
      protocolPositionUrl(protocol.protocolKey),
    explorerUrl:
      safeImageUrl(raw.explorerUrl) ??
      explorerPositionUrl(chain.chainId, tokenAddress, tokenId),
  };
}

export function krystalClosedPositionFields(raw: Record<string, unknown>) {
  const pool = requiredRecord(raw.pool, "pool");
  const chain = chainFields(raw, pool);
  const protocol = protocolFields(raw, pool);
  const lowerPrice = requiredPositiveNumber(raw.minPrice, "minPrice");
  const upperPrice = requiredPositiveNumber(raw.maxPrice, "maxPrice");
  if (lowerPrice > upperPrice) throw new Error("price range is invalid");
  if (
    positiveNumberValue(pool.price) == null &&
    positiveNumberValue(raw.currentPrice) == null
  ) {
    throw new Error("currentPrice is missing or invalid");
  }
  const amounts = recordArray(raw.currentAmounts);
  const poolAmounts = recordArray(pool.tokenAmounts);
  const tokens = amounts.length >= 2 ? amounts : poolAmounts;
  const symbols = tokens
    .slice(0, 2)
    .map((entry) => stringValue(asRecord(entry.token)?.symbol))
    .filter((value): value is string => Boolean(value));
  if (symbols.length < 2) throw new Error("token pair is missing");

  return {
    id:
      `${chain.chainId}:${stringValue(raw.id) ??
      `${requiredString(raw.tokenAddress, "tokenAddress")}:${requiredString(raw.tokenId, "tokenId")}`}`,
    pair: `${symbols[0]} / ${symbols[1]}`,
    ...chain,
    ...protocol,
    closedAtMs: normalizeTimestamp(raw.closedTime),
    pnl: numberValue(raw.pnl) ?? 0,
    depositedUsdg: numberValue(raw.totalDepositValue) ?? 0,
    withdrawnUsdg: numberValue(raw.totalWithdrawValue) ?? 0,
    claimedFeesUsdg: sumUsdValues(recordArray(raw.feesClaimed)),
  };
}

function mapTokenAmount(raw: Record<string, unknown>): TokenAmount {
  const tokenRecord = requiredRecord(raw.token, "token");
  const token: TokenInfo = {
    address: requiredString(tokenRecord.address, "token address"),
    symbol: requiredString(tokenRecord.symbol, "token symbol"),
    decimals: numberValue(tokenRecord.decimals) ?? 18,
    logoUrl: safeImageUrl(tokenRecord.logo),
  };
  const balance = stringValue(raw.balance) ?? "0";
  return {
    token,
    raw: balance,
    formatted: formatRawAmount(balance, token.decimals),
    valueUsdg: usdValue(raw),
  };
}

function formatRawAmount(raw: string, decimals: number) {
  if (!/^\d+$/.test(raw)) return raw;
  const safeDecimals = Math.max(0, Math.min(255, Math.trunc(decimals)));
  const padded = raw.padStart(safeDecimals + 1, "0");
  const whole = padded.slice(0, padded.length - safeDecimals) || "0";
  if (safeDecimals === 0) return whole;
  const fraction = padded
    .slice(padded.length - safeDecimals)
    .replace(/0+$/, "")
    .slice(0, 8);
  return fraction ? `${whole}.${fraction}` : whole;
}

function sumUsdValues(entries: Record<string, unknown>[]) {
  return entries.reduce((total, entry) => total + (usdValue(entry) ?? 0), 0);
}

function usdValue(entry: Record<string, unknown>) {
  const quote = asRecord(asRecord(entry.quotes)?.usd);
  return numberValue(quote?.value);
}

function tokenPriceUsdg(entry: Record<string, unknown>) {
  const quote = asRecord(asRecord(entry.quotes)?.usd);
  return numberValue(quote?.price) ?? numberValue(asRecord(entry.token)?.price);
}

function formatFeeLabel(value: unknown, version?: PositionVersion) {
  const values = Array.isArray(value) ? value : [];
  const fee = values.map(numberValue).find((entry) => entry != null && entry > 0);
  if (fee == null) return version === "v4" ? "Dynamic" : "Unknown";
  const percent = fee < 1 ? fee * 100 : fee;
  return `${percent.toFixed(4).replace(/0+$/, "").replace(/\.$/, "")}%`;
}

function rawPositionIdentity(position: Record<string, unknown>, index: number) {
  const pool = asRecord(position.pool);
  const chainId =
    numberValue(position.chainId) ??
    numberValue(pool?.chainId) ??
    numberValue(asRecord(position.chain)?.id) ??
    "unknown";
  return `${chainId}:${stringValue(position.id) ??
    `${stringValue(position.tokenAddress) ?? "unknown"}:${stringValue(position.tokenId) ?? index}`}`;
}

function chainFields(raw: Record<string, unknown>, pool: Record<string, unknown>) {
  const rawChain = asRecord(raw.chain);
  const poolChain = asRecord(pool.chain);
  const chainIdValue =
    numberValue(raw.chainId) ??
    numberValue(pool.chainId) ??
    numberValue(rawChain?.id) ??
    numberValue(poolChain?.id);
  if (
    chainIdValue == null ||
    !Number.isSafeInteger(chainIdValue) ||
    chainIdValue <= 0
  ) {
    throw new Error("chainId is missing or invalid");
  }
  const chainName =
    stringValue(raw.chainName) ??
    stringValue(pool.chainName) ??
    stringValue(rawChain?.name) ??
    stringValue(poolChain?.name) ??
    CHAIN_METADATA[chainIdValue]?.name ??
    `Chain ${chainIdValue}`;
  return { chainId: chainIdValue, chainName };
}

function protocolFields(
  raw: Record<string, unknown>,
  pool: Record<string, unknown>,
) {
  const protocolKey =
    stringValue(pool.projectKey)?.trim().toLowerCase() ??
    stringValue(raw.projectKey)?.trim().toLowerCase() ??
    stringValue(pool.project)?.replace(/\s+/g, "").toLowerCase() ??
    "";
  if (!protocolKey) throw new Error("protocol is missing");
  const protocolVersion = protocolKey.match(/v\d+$/i)?.[0]?.toLowerCase();
  const rawName =
    stringValue(pool.project) ??
    stringValue(pool.projectName) ??
    stringValue(raw.projectName);
  const baseKey = protocolVersion
    ? protocolKey.slice(0, -protocolVersion.length)
    : protocolKey;
  const protocolName =
    rawName
      ?.trim()
      .replace(/\s+v\d+$/i, "") || humanizeProtocol(baseKey);
  return { protocolKey, protocolName, protocolVersion };
}

function humanizeProtocol(value: string) {
  const known: Record<string, string> = {
    uniswap: "Uniswap",
    pancakeswap: "PancakeSwap",
    sushiswap: "SushiSwap",
    quickswap: "QuickSwap",
    camelot: "Camelot",
  };
  return (
    known[value] ??
    value.replace(/[-_]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
  );
}

function protocolPositionUrl(protocolKey: string) {
  if (protocolKey.startsWith("uniswap")) {
    return "https://app.uniswap.org/positions";
  }
  if (protocolKey.startsWith("pancakeswap")) {
    return "https://pancakeswap.finance/liquidity";
  }
  return undefined;
}

function explorerPositionUrl(
  chainId: number,
  tokenAddress: string,
  tokenId: string,
) {
  const metadata = CHAIN_METADATA[chainId];
  if (!metadata?.explorerUrl) return undefined;
  return metadata.explorerKind === "blockscout"
    ? `${metadata.explorerUrl}/token/${tokenAddress}/instance/${tokenId}`
    : `${metadata.explorerUrl}/token/${tokenAddress}?a=${tokenId}`;
}

export function normalizeTimestamp(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value > 10_000_000_000 ? value : value * 1_000;
  }
  if (typeof value === "string") {
    const numeric = Number(value);
    if (Number.isFinite(numeric) && value.trim() !== "") {
      return numeric > 10_000_000_000 ? numeric : numeric * 1_000;
    }
    const parsed = Date.parse(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  throw new Error("position timestamp is invalid");
}

function readUpstreamError(body: unknown) {
  if (!isRecord(body)) return null;
  if (typeof body.error === "string") return body.error;
  if (Array.isArray(body.err)) {
    return body.err.filter((value) => typeof value === "string").join(" ");
  }
  return null;
}

function sum(values: Array<number | null>) {
  return values.reduce<number>((total, value) => total + (value ?? 0), 0);
}

function requiredRecord(value: unknown, field: string) {
  const result = asRecord(value);
  if (!result) throw new Error(`${field} is missing`);
  return result;
}

function requiredString(value: unknown, field: string) {
  const result = stringValue(value);
  if (!result) throw new Error(`${field} is missing`);
  return result;
}

function requiredPositiveNumber(value: unknown, field: string) {
  const result = positiveNumberValue(value);
  if (result == null) throw new Error(`${field} is missing or invalid`);
  return result;
}

function positiveNumberValue(value: unknown) {
  const result = numberValue(value);
  return result != null && result > 0 ? result : null;
}

function recordArray(value: unknown) {
  return Array.isArray(value) ? value.filter(isRecord) : [];
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return isRecord(value) ? value : null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function stringValue(value: unknown) {
  if (typeof value === "string") return value;
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return null;
}

function safeImageUrl(value: unknown) {
  const raw = stringValue(value)?.trim();
  if (!raw) return undefined;
  try {
    const url = new URL(raw);
    return url.protocol === "https:" || url.protocol === "http:"
      ? url.toString()
      : undefined;
  } catch {
    return undefined;
  }
}

function numberValue(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

function normalizeReportedPercent(value: unknown, fallback: number | null) {
  const reported = numberValue(value);
  if (reported == null) return fallback;
  if (fallback == null) return reported;

  const candidates = [reported, reported * 100];
  return candidates.reduce((closest, candidate) =>
    Math.abs(candidate - fallback) < Math.abs(closest - fallback)
      ? candidate
      : closest,
  );
}

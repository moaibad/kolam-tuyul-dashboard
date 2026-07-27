import { isAddress } from "viem";

export function isValidWalletAddress(value: string) {
  return isAddress(value.trim());
}

export function formatCurrency(value: number, digits = 2) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(value);
}

export function formatNumber(value: number, digits = 2) {
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(value);
}

export function formatPercent(value: number) {
  const sign = value > 0 ? "+" : "";
  return `${sign}${formatNumber(value, 2)}%`;
}

export function formatSignedCurrency(value: number) {
  const sign = value > 0 ? "+" : "";
  return `${sign}${formatCurrency(value)}`;
}

export function formatQuoteValue(
  value: number,
  symbol: string,
  quoteTokenPriceUsdg: number | null,
  signed = false,
) {
  const digits =
    symbol.toUpperCase() === "USDG"
      ? 2
      : value !== 0 && Math.abs(value) < 0.01
        ? 6
        : 4;
  const sign = signed && value > 0 ? "+" : "";
  const primary = `${sign}${formatNumber(value, digits)} ${symbol}`;
  if (symbol.toUpperCase() === "USDG") return primary;
  if (quoteTokenPriceUsdg == null) return `${primary} (USDG unavailable)`;
  const usdgValue = value * quoteTokenPriceUsdg;
  const usdgSign = signed && usdgValue > 0 ? "+" : "";
  return `${primary} (${usdgSign}${formatCurrency(usdgValue)})`;
}

export function formatPrice(value: number) {
  if (value === 0) return "0";
  if (Math.abs(value) >= 1) return formatNumber(value, 3);
  const absolute = Math.abs(value);
  const digits =
    absolute >= 0.000001
      ? 6
      : Math.min(18, Math.max(6, Math.floor(-Math.log10(absolute)) + 4));
  return value.toFixed(digits).replace(/0+$/, "").replace(/\.$/, "");
}

export function getPairOrientedPriceRange(
  currentPrice: number,
  lowerPrice: number,
  upperPrice: number,
) {
  if (
    ![currentPrice, lowerPrice, upperPrice].every(
      (value) => Number.isFinite(value) && value > 0,
    )
  ) {
    throw new RangeError("Price range values must be positive finite numbers.");
  }

  return {
    currentPrice: 1 / currentPrice,
    lowerPrice: 1 / upperPrice,
    upperPrice: 1 / lowerPrice,
  };
}

export function formatPairPriceUnit(token0Symbol: string, token1Symbol: string) {
  return `${formatPriceTokenSymbol(token0Symbol)}/${formatPriceTokenSymbol(token1Symbol)}`;
}

function formatPriceTokenSymbol(symbol: string) {
  return symbol.toUpperCase() === "WETH" ? "ETH" : symbol;
}

export function formatCompactAddress(address: string) {
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

export function formatAge(nowMs: number, timestampMs: number) {
  const totalMinutes = Math.max(0, Math.floor((nowMs - timestampMs) / 60_000));
  const days = Math.floor(totalMinutes / 1_440);
  const hours = Math.floor((totalMinutes % 1_440) / 60);
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${totalMinutes % 60}m`;
  return `${totalMinutes}m`;
}

export function formatSyncAge(nowMs: number, timestampMs: number) {
  const totalSeconds = Math.max(0, Math.floor((nowMs - timestampMs) / 1_000));
  if (totalSeconds < 60) return `${totalSeconds}s ago`;

  const totalMinutes = Math.floor(totalSeconds / 60);
  if (totalMinutes < 60) return `${totalMinutes}m ago`;

  const totalHours = Math.floor(totalMinutes / 60);
  if (totalHours < 24) return `${totalHours}h ago`;

  return `${Math.floor(totalHours / 24)}d ago`;
}

export function getRangeProgress(
  currentTick: number,
  tickLower: number,
  tickUpper: number,
) {
  if (currentTick < tickLower) return { placement: "below" as const, percent: 0 };
  if (currentTick >= tickUpper)
    return { placement: "above" as const, percent: 100 };
  const span = tickUpper - tickLower;
  const percent = span > 0 ? ((currentTick - tickLower) / span) * 100 : 50;
  return {
    placement: "inside" as const,
    percent: Math.max(0, Math.min(100, percent)),
  };
}

export function getPriceRangeProgress(
  currentPrice: number,
  lowerPrice: number,
  upperPrice: number,
) {
  if (currentPrice < lowerPrice) {
    return { placement: "below" as const, percent: 0 };
  }
  if (currentPrice > upperPrice) {
    return { placement: "above" as const, percent: 100 };
  }
  const span = upperPrice - lowerPrice;
  const percent =
    span > 0 ? ((currentPrice - lowerPrice) / span) * 100 : 50;
  return {
    placement: "inside" as const,
    percent: Math.max(0, Math.min(100, percent)),
  };
}

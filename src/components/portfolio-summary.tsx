import {
  Activity,
  Layers3,
  TrendingUp,
} from "lucide-react";

import {
  formatCurrency,
  formatPercent,
  formatSignedCurrency,
} from "@/lib/format";
import type { PortfolioSnapshot } from "@/lib/types";
import { cn } from "@/lib/utils";

export function PortfolioSummary({
  portfolio,
}: {
  portfolio: PortfolioSnapshot;
}) {
  const inRange = portfolio.positions.filter(
    (position) => position.status === "in_range",
  ).length;
  const outOfRange = portfolio.positions.length - inRange;
  const totalFees =
    portfolio.totals.claimedFeesUsdg == null ||
    portfolio.totals.unclaimedFeesUsdg == null
      ? null
      : portfolio.totals.claimedFeesUsdg +
        portfolio.totals.unclaimedFeesUsdg;

  const isProfitable =
    portfolio.totals.profitLossUsdg == null ||
    portfolio.totals.profitLossUsdg >= 0;

  return (
    <section
      aria-labelledby="portfolio-health-title"
      className="relative overflow-hidden rounded-2xl bg-[#1b182b] shadow-[0_24px_70px_rgba(0,0,0,.24)]"
    >
      <div
        aria-hidden="true"
        className={cn(
          "absolute inset-x-0 top-0 h-1",
          outOfRange > 0 ? "bg-amber-300" : "bg-emerald-300",
        )}
      />
      <div className="grid lg:grid-cols-[1.3fr_1fr_1fr_1fr]">
        <div className="p-5 pt-7 sm:p-7 sm:pt-8">
          <p
            id="portfolio-health-title"
            className="text-xs font-medium text-slate-400"
          >
            Portfolio value
          </p>
          <p className="mt-2 truncate text-4xl font-semibold tracking-[-0.03em] text-slate-50 sm:text-5xl">
            {formatMaybeCurrency(portfolio.totals.currentLpValueUsdg)}
          </p>
          <dl
            aria-label="Portfolio value details"
            className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-xs"
          >
            <InlineDetail
              label="Deposited"
              value={formatMaybeCurrency(portfolio.totals.depositedUsdg)}
            />
            <InlineDetail
              label="Current liquidity"
              value={formatMaybeCurrency(
                portfolio.totals.currentLiquidityUsdg ??
                  portfolio.totals.currentLpValueUsdg,
              )}
            />
          </dl>
          <p className="mt-2 text-xs text-slate-500">
            Across {portfolio.positions.length} open{" "}
            {portfolio.positions.length === 1 ? "position" : "positions"}
          </p>
        </div>
        <div className="border-t border-white/[0.06] p-5 sm:p-7 lg:border-t-0 lg:border-l">
          <div className="flex items-center gap-2 text-xs font-medium text-slate-400">
            <Layers3 className="size-4" />
            Fees
          </div>
          <p className="mt-2 truncate text-2xl font-semibold tracking-tight text-cyan-300">
            {formatMaybeCurrency(totalFees)}
          </p>
          <dl
            aria-label="Fee details"
            className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs"
          >
            <InlineDetail
              label="Claimed"
              value={formatMaybeCurrency(portfolio.totals.claimedFeesUsdg)}
            />
            <InlineDetail
              label="Unclaimed"
              value={formatMaybeCurrency(portfolio.totals.unclaimedFeesUsdg)}
            />
          </dl>
        </div>
        <div className="border-t border-white/[0.06] p-5 sm:p-7 lg:border-t-0 lg:border-l">
          <div className="flex items-center gap-2 text-xs font-medium text-slate-400">
            <TrendingUp className="size-4" />
            Profit / loss
          </div>
          <p
            className={cn(
              "mt-2 truncate text-2xl font-semibold tracking-tight",
              isProfitable ? "text-emerald-300" : "text-rose-300",
            )}
          >
            {formatMaybeSignedCurrency(portfolio.totals.profitLossUsdg)}
          </p>
          <p className="mt-2 text-xs text-slate-500">
            {formatMaybePercent(portfolio.totals.profitLossPercent)} including
            fees
          </p>
        </div>
        <div className="border-t border-white/[0.06] p-5 sm:p-7 lg:border-t-0 lg:border-l">
          <div className="flex items-center gap-2 text-xs font-medium text-slate-400">
            <Activity className="size-4" />
            Range health
          </div>
          <p
            className={cn(
              "mt-2 text-2xl font-semibold tracking-[-0.025em]",
              outOfRange > 0 ? "text-amber-300" : "text-emerald-300",
            )}
          >
            {outOfRange > 0
              ? `${outOfRange} need${outOfRange === 1 ? "s" : ""} attention`
              : "All in range"}
          </p>
          <p className="mt-2 text-xs text-slate-500">
            {inRange} in range · {outOfRange} out of range
          </p>
        </div>
      </div>
    </section>
  );
}

function InlineDetail({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="flex min-w-0 items-baseline gap-1.5">
      <dt className="text-slate-500">{label}</dt>
      <dd className="truncate font-medium text-slate-300">{value}</dd>
    </div>
  );
}

function formatMaybeCurrency(value: number | null) {
  return value == null ? "Unavailable" : formatCurrency(value);
}

function formatMaybeSignedCurrency(value: number | null) {
  return value == null ? "Unavailable" : formatSignedCurrency(value);
}

function formatMaybePercent(value: number | null) {
  return value == null ? "Unavailable" : formatPercent(value);
}

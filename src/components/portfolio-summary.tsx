import {
  Activity,
  ChevronDown,
  CircleDollarSign,
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
      className="overflow-hidden rounded-2xl bg-[#1b182b]"
    >
      <div className="grid lg:grid-cols-[1.15fr_1fr_1fr]">
        <div className="p-5 sm:p-6">
          <p
            id="portfolio-health-title"
            className="text-xs font-medium text-slate-400"
          >
            Portfolio value
          </p>
          <p className="mt-2 truncate text-3xl font-semibold tracking-tight text-slate-50">
            {formatMaybeCurrency(portfolio.totals.currentLpValueUsdg)}
          </p>
          <p className="mt-2 text-xs text-slate-500">
            Across {portfolio.positions.length} open{" "}
            {portfolio.positions.length === 1 ? "position" : "positions"}
          </p>
        </div>
        <div className="border-t border-white/[0.06] p-5 sm:p-6 lg:border-t-0 lg:border-l">
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
        <div className="border-t border-white/[0.06] p-5 sm:p-6 lg:border-t-0 lg:border-l">
          <div className="flex items-center gap-2 text-xs font-medium text-slate-400">
            <Activity className="size-4" />
            Range health
          </div>
          <p
            className={cn(
              "mt-2 text-2xl font-semibold tracking-tight",
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
      <details className="group border-t border-white/[0.06]">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-5 py-3.5 text-xs font-medium text-slate-400 transition-colors hover:bg-white/[0.025] hover:text-slate-200 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-violet-400 sm:px-6">
          Accounting details
          <ChevronDown className="size-4 transition-transform group-open:rotate-180" />
        </summary>
        <div className="grid gap-x-8 gap-y-5 border-t border-white/[0.05] px-5 py-5 sm:grid-cols-2 sm:px-6 xl:grid-cols-4">
          <DetailMetric
            icon={CircleDollarSign}
            label="Deposited benchmark"
            value={formatMaybeCurrency(portfolio.totals.depositedUsdg)}
          />
          <DetailMetric
            icon={CircleDollarSign}
            label="Current LP value"
            value={formatMaybeCurrency(portfolio.totals.currentLpValueUsdg)}
          />
          <DetailMetric
            icon={Layers3}
            label="Total fees"
            value={formatMaybeCurrency(totalFees)}
            note={`${formatMaybeCurrency(portfolio.totals.unclaimedFeesUsdg)} unclaimed`}
          />
          <DetailMetric
            icon={Activity}
            label="LP value + fees"
            value={formatMaybeCurrency(portfolio.totals.totalResultUsdg)}
          />
        </div>
      </details>
    </section>
  );
}

function DetailMetric({
  icon: Icon,
  label,
  value,
  note,
}: {
  icon: typeof Activity;
  label: string;
  value: string;
  note?: string;
}) {
  return (
    <div className="min-w-0">
      <div className="flex items-center gap-2 text-xs text-slate-500">
        <Icon className="size-3.5" />
        {label}
      </div>
      <p className="mt-1.5 truncate text-sm font-medium text-slate-200">
        {value}
      </p>
      {note && <p className="mt-1 text-xs text-slate-600">{note}</p>}
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

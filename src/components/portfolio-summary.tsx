import {
  Activity,
  CircleDollarSign,
  Coins,
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

  const metrics = [
    {
      label: "Open positions",
      value: String(portfolio.positions.length),
      detail: `${inRange} in range · ${outOfRange} out`,
      icon: Layers3,
      accent: "violet",
    },
    {
      label: "Deposited",
      value: formatMaybeCurrency(portfolio.totals.depositedUsdg),
      detail: "HODL benchmark",
      icon: CircleDollarSign,
      accent: "cyan",
    },
    {
      label: "Current LP value",
      value: formatMaybeCurrency(portfolio.totals.currentLpValueUsdg),
      detail: "Across all positions",
      icon: Activity,
      accent: "blue",
    },
    {
      label: "Total fees",
      value: formatMaybeCurrency(totalFees),
      detail: `${formatMaybeCurrency(portfolio.totals.unclaimedFeesUsdg)} unclaimed`,
      icon: Coins,
      accent: "pink",
    },
    {
      label: "Total result",
      value: formatMaybeCurrency(portfolio.totals.totalResultUsdg),
      detail: "LP value + all fees",
      icon: CircleDollarSign,
      accent: "violet",
    },
    {
      label: "Profit / loss",
      value: formatMaybeSignedCurrency(portfolio.totals.profitLossUsdg),
      detail: `${formatMaybePercent(portfolio.totals.profitLossPercent)} · includes IL + fees`,
      icon: TrendingUp,
      accent:
        portfolio.totals.profitLossUsdg == null ||
        portfolio.totals.profitLossUsdg >= 0
          ? "green"
          : "red",
    },
  ] as const;

  return (
    <section aria-label="Portfolio overview">
      <div className="grid min-w-0 grid-cols-2 gap-3 xl:grid-cols-3 2xl:grid-cols-6">
        {metrics.map((metric) => (
          <article
            key={metric.label}
            className="group relative min-w-0 overflow-hidden rounded-2xl border border-white/[0.055] bg-card/85 p-4 shadow-[0_12px_40px_rgba(0,0,0,.14)] transition-colors hover:border-white/10 sm:p-5"
          >
            <div
              className={cn(
                "absolute -top-8 -right-8 size-24 rounded-full opacity-[0.08] blur-2xl",
                accentBackground[metric.accent],
              )}
            />
            <div
              className={cn(
                "mb-5 grid size-9 place-items-center rounded-xl",
                accentIcon[metric.accent],
              )}
            >
              <metric.icon className="size-4" />
            </div>
            <p className="text-[11px] font-medium tracking-wide text-slate-500 uppercase">
              {metric.label}
            </p>
            <p className="mt-1.5 truncate text-base font-semibold tracking-tight text-slate-50 sm:text-lg">
              {metric.value}
            </p>
            <p className="mt-1 truncate text-[11px] text-slate-600">
              {metric.detail}
            </p>
          </article>
        ))}
      </div>
    </section>
  );
}

const accentBackground = {
  violet: "bg-violet-400",
  cyan: "bg-cyan-400",
  blue: "bg-blue-400",
  pink: "bg-pink-400",
  green: "bg-emerald-400",
  red: "bg-rose-400",
};

const accentIcon = {
  violet: "bg-violet-400/10 text-violet-300 ring-1 ring-violet-400/10",
  cyan: "bg-cyan-400/10 text-cyan-300 ring-1 ring-cyan-400/10",
  blue: "bg-blue-400/10 text-blue-300 ring-1 ring-blue-400/10",
  pink: "bg-pink-400/10 text-pink-300 ring-1 ring-pink-400/10",
  green: "bg-emerald-400/10 text-emerald-300 ring-1 ring-emerald-400/10",
  red: "bg-rose-400/10 text-rose-300 ring-1 ring-rose-400/10",
};

function formatMaybeCurrency(value: number | null) {
  return value == null ? "Unavailable" : formatCurrency(value);
}

function formatMaybeSignedCurrency(value: number | null) {
  return value == null ? "Unavailable" : formatSignedCurrency(value);
}

function formatMaybePercent(value: number | null) {
  return value == null ? "Unavailable" : formatPercent(value);
}

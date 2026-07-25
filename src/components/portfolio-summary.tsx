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
      detail: `Across ${portfolio.positions.length} positions`,
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
      emphasize: true,
    },
  ] as const;

  return (
    <section aria-label="Portfolio overview">
      <div className="grid min-w-0 grid-cols-2 gap-3 xl:grid-cols-6">
        {metrics.map((metric) => (
          <article
            key={metric.label}
            className="group flex min-h-40 min-w-0 flex-col rounded-2xl border border-white/[0.065] bg-[#1b182b] p-4 shadow-[0_12px_36px_rgba(0,0,0,.16)] transition-colors hover:border-white/12 sm:p-5"
          >
            <div className="flex items-center justify-between gap-3">
              <div
                className={cn(
                  "flex min-w-0 items-center gap-2",
                  accentText[metric.accent],
                )}
              >
                <metric.icon className="size-3.5 shrink-0" />
                <p className="truncate text-[10px] font-semibold tracking-[0.1em] text-slate-400 uppercase">
                  {metric.label}
                </p>
              </div>
              <span
                className={cn(
                  "size-1.5 shrink-0 rounded-full",
                  accentDot[metric.accent],
                )}
              />
            </div>

            <p
              className={cn(
                "mt-4 truncate text-xl font-semibold tracking-tight text-slate-50 2xl:text-2xl",
                "emphasize" in metric &&
                  metric.emphasize &&
                  accentText[metric.accent],
              )}
            >
              {metric.value}
            </p>

            <p
              className={cn(
                "mt-auto w-fit max-w-full truncate rounded-md border px-2 py-1 text-[10px]",
                accentBadge[metric.accent],
              )}
            >
              {metric.detail}
            </p>
          </article>
        ))}
      </div>
    </section>
  );
}

const accentText = {
  violet: "text-violet-300",
  cyan: "text-cyan-300",
  blue: "text-blue-300",
  pink: "text-pink-300",
  green: "text-emerald-300",
  red: "text-rose-300",
};

const accentDot = {
  violet: "bg-violet-400",
  cyan: "bg-cyan-400",
  blue: "bg-blue-400",
  pink: "bg-pink-400",
  green: "bg-emerald-400",
  red: "bg-rose-400",
};

const accentBadge = {
  violet: "border-violet-400/15 bg-violet-400/[0.07] text-violet-200/75",
  cyan: "border-cyan-400/15 bg-cyan-400/[0.07] text-cyan-200/75",
  blue: "border-blue-400/15 bg-blue-400/[0.07] text-blue-200/75",
  pink: "border-pink-400/15 bg-pink-400/[0.07] text-pink-200/75",
  green: "border-emerald-400/15 bg-emerald-400/[0.07] text-emerald-200/75",
  red: "border-rose-400/15 bg-rose-400/[0.07] text-rose-200/75",
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

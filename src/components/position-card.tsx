import {
  ArrowUpRight,
  Clock3,
  Coins,
  ExternalLink,
  Layers3,
} from "lucide-react";

import { RangeVisualizer } from "@/components/range-visualizer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  formatAge,
  formatCurrency,
  formatNumber,
  formatPercent,
  formatQuoteValue,
} from "@/lib/format";
import type { PositionSnapshot } from "@/lib/types";
import { cn } from "@/lib/utils";

export function PositionCard({
  position,
  nowMs,
}: {
  position: PositionSnapshot;
  nowMs: number;
}) {
  const inRange = position.status === "in_range";
  const totalFees =
    position.claimedFeesValueQuote == null ||
    position.unclaimedFeesValueQuote == null
      ? null
      : position.claimedFeesValueQuote + position.unclaimedFeesValueQuote;
  const formatQuote = (value: number | null, signed = false) =>
    value == null
      ? "Unavailable"
      : formatQuoteValue(
          value,
          position.quoteToken.symbol,
          position.quoteTokenPriceUsdg,
          signed,
        );

  return (
    <Card className="min-w-0 max-w-full gap-0 overflow-hidden border-white/[0.06] bg-card/90 py-0 shadow-[0_20px_50px_rgba(0,0,0,.18)]">
      <div
        className={cn(
          "h-0.5 w-full",
          inRange ? "bg-emerald-400" : "bg-amber-400",
        )}
      />
      <div className="p-5 sm:p-6">
        <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
          <div className="flex min-w-0 items-center gap-3">
            <TokenPair position={position} />
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="truncate text-lg font-semibold tracking-tight text-slate-50">
                  {position.token0.symbol} / {position.token1.symbol}
                </h2>
                <Badge
                  variant="outline"
                  className="border-violet-400/20 bg-violet-400/8 text-[10px] text-violet-200"
                >
                  Uniswap {position.version}
                </Badge>
              </div>
              <p className="mt-1 text-xs text-slate-500">
                {position.feeLabel} fee · Position #{position.tokenId}
              </p>
            </div>
          </div>
          <Badge
            className={cn(
              "w-fit rounded-full border px-3 py-1 text-[10px] font-semibold tracking-[0.08em]",
              inRange
                ? "border-emerald-400/20 bg-emerald-400/10 text-emerald-300"
                : "border-amber-400/20 bg-amber-400/10 text-amber-300",
            )}
          >
            <span
              className={cn(
                "mr-1.5 size-1.5 rounded-full",
                inRange ? "bg-emerald-300" : "bg-amber-300",
              )}
            />
            {inRange ? "IN RANGE" : "OUT OF RANGE"}
          </Badge>
        </header>

        <div className="my-5 h-px bg-white/[0.055]" />

        <div className="grid grid-cols-2 gap-x-5 gap-y-5 sm:grid-cols-3">
          <Metric
            label="Deposit"
            value={formatQuote(position.depositedValueQuote)}
          />
          <Metric
            label="Current value"
            value={formatQuote(position.activeLpValueQuote)}
          />
          <Metric label="Total fees" value={formatQuote(totalFees)} />
          <Metric
            label="Claimed"
            value={formatQuote(position.claimedFeesValueQuote)}
            subdued
          />
          <Metric
            label="Unclaimed"
            value={formatQuote(position.unclaimedFeesValueQuote)}
            valueClassName="text-cyan-300"
          />
          <Metric
            label="Total result"
            value={formatQuote(position.totalResultValueQuote)}
          />
        </div>

        <div
          className={cn(
            "mt-5 flex items-center justify-between rounded-2xl border px-4 py-3.5",
            (position.netLpResultQuote ?? 0) >= 0
              ? "border-emerald-400/12 bg-emerald-400/[0.055]"
              : "border-rose-400/12 bg-rose-400/[0.055]",
          )}
        >
          <div>
            <p className="text-[10px] font-semibold tracking-[0.15em] text-slate-500 uppercase">
              Profit / Loss
            </p>
            <p className="mt-1 text-[10px] text-slate-600">Includes IL + fees</p>
          </div>
          <div className="text-right">
            <p
              className={cn(
                "font-semibold",
                (position.netLpResultQuote ?? 0) >= 0
                  ? "text-emerald-300"
                  : "text-rose-300",
              )}
            >
              {formatQuote(position.netLpResultQuote, true)}
            </p>
            <p className="mt-0.5 text-xs text-slate-500">
              {position.netLpResultPercent == null
                ? "Unavailable"
                : formatPercent(position.netLpResultPercent)}
            </p>
          </div>
        </div>

        <div className="mt-5 grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
          <TokenComposition position={position} />
          <RangeVisualizer position={position} />
        </div>

        <footer className="mt-5 flex flex-col gap-4 border-t border-white/[0.055] pt-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[11px] text-slate-600">
            <span className="flex items-center gap-1.5">
              <Clock3 className="size-3.5" />
              Age {formatAge(nowMs, position.mintTimestampMs)}
            </span>
            <span className="flex items-center gap-1.5">
              <Layers3 className="size-3.5" />
              Block {Number(position.blockNumber).toLocaleString("en-US")}
            </span>
            {!inRange && position.outOfRangeSinceMs && (
              <span className="text-amber-400/80">
                Out for {formatAge(nowMs, position.outOfRangeSinceMs)}
              </span>
            )}
          </div>
          <div className="flex gap-2">
            <Button
              asChild
              variant="outline"
              size="sm"
              className="flex-1 border-white/8 bg-white/[0.025] text-slate-300 hover:bg-white/[0.06] sm:flex-none"
            >
              <a href={position.explorerUrl} target="_blank" rel="noreferrer">
                Explorer <ExternalLink className="size-3.5" />
              </a>
            </Button>
            <Button
              asChild
              size="sm"
              className="flex-1 bg-violet-500 text-white hover:bg-violet-400 sm:flex-none"
            >
              <a href={position.uniswapUrl} target="_blank" rel="noreferrer">
                Open Uniswap <ArrowUpRight className="size-3.5" />
              </a>
            </Button>
          </div>
        </footer>
      </div>
    </Card>
  );
}

function TokenPair({ position }: { position: PositionSnapshot }) {
  return (
    <div className="relative h-11 w-[66px] shrink-0">
      <div className="absolute left-0 grid size-11 place-items-center rounded-2xl bg-violet-600 text-xs font-bold text-white ring-4 ring-card">
        {position.token0.symbol.slice(0, 2)}
      </div>
      <div className="absolute right-0 grid size-11 place-items-center rounded-2xl bg-cyan-400 text-xs font-bold text-[#10101d] ring-4 ring-card">
        {position.token1.symbol.slice(0, 2)}
      </div>
    </div>
  );
}

function Metric({
  label,
  value,
  subdued,
  valueClassName,
}: {
  label: string;
  value: string;
  subdued?: boolean;
  valueClassName?: string;
}) {
  return (
    <div className="min-w-0">
      <p className="text-[10px] font-semibold tracking-[0.12em] text-slate-600 uppercase">
        {label}
      </p>
      <p
        className={cn(
          "mt-1.5 truncate text-sm font-medium text-slate-200",
          subdued && "text-slate-400",
          valueClassName,
        )}
      >
        {value}
      </p>
    </div>
  );
}

function TokenComposition({ position }: { position: PositionSnapshot }) {
  const total = position.amounts.reduce(
    (sum, amount) => sum + (amount.valueUsdg ?? 0),
    0,
  );

  return (
    <div className="rounded-2xl border border-white/[0.055] bg-[#171426]/75 p-4 sm:p-5">
      <div className="flex items-center gap-2">
        <Coins className="size-4 text-violet-300" />
        <h3 className="text-xs font-medium text-slate-300">Token composition</h3>
      </div>
      <div className="mt-4 space-y-4">
        {position.amounts.map((amount, index) => {
          const percent = total > 0 ? ((amount.valueUsdg ?? 0) / total) * 100 : 0;
          return (
            <div key={amount.token.symbol}>
              <div className="flex items-end justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs font-medium text-slate-300">
                    {amount.token.symbol}
                  </p>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <p className="mt-1 max-w-32 truncate font-mono text-[11px] text-slate-600 sm:max-w-44">
                        {amount.formatted}
                      </p>
                    </TooltipTrigger>
                    <TooltipContent>{amount.formatted}</TooltipContent>
                  </Tooltip>
                </div>
                <div className="text-right">
                  <p className="text-xs font-medium text-slate-300">
                    {amount.valueUsdg == null
                      ? "Unavailable"
                      : formatCurrency(amount.valueUsdg)}
                  </p>
                  <p className="mt-1 text-[10px] text-slate-600">
                    {formatNumber(percent, 1)}%
                  </p>
                </div>
              </div>
              <div className="mt-2 h-1 overflow-hidden rounded-full bg-white/[0.05]">
                <div
                  className={cn(
                    "h-full rounded-full",
                    index === 0 ? "bg-violet-400" : "bg-cyan-400",
                  )}
                  style={{ width: `${percent}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

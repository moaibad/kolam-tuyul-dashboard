import { formatPrice, getRangeProgress } from "@/lib/format";
import type { PositionSnapshot } from "@/lib/types";
import { cn } from "@/lib/utils";

export function RangeVisualizer({
  position,
}: {
  position: PositionSnapshot;
}) {
  const progress = getRangeProgress(
    position.currentTick,
    position.tickLower,
    position.tickUpper,
  );
  const isInside = progress.placement === "inside";
  const statusLabel = isInside
    ? "Inside liquidity range"
    : progress.placement === "below"
      ? "Below liquidity range"
      : "Above liquidity range";

  return (
    <div
      className={cn(
        "overflow-hidden rounded-2xl border bg-[#171426]/75 p-4 sm:p-5",
        isInside ? "border-emerald-300/10" : "border-amber-300/20",
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-medium text-slate-400">
            Current price
          </p>
          <p className="mt-1 text-xl font-semibold text-slate-50">
            {formatPrice(position.currentPrice)}{" "}
            <span className="text-xs font-medium text-slate-500">
              {position.quoteToken.symbol}
            </span>
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs font-medium text-slate-500">
            Tick
          </p>
          <p className="mt-1 font-mono text-xs text-slate-400">
            {position.currentTick.toLocaleString("en-US")}
          </p>
        </div>
      </div>

      <div className="mt-7">
        <div
          className={cn(
            "mb-3 text-xs font-semibold",
            isInside ? "text-emerald-300" : "text-amber-300",
          )}
        >
          {statusLabel}
        </div>
        <div className="relative px-1">
          <div className="grid h-3 grid-cols-[1fr_4fr_1fr] overflow-hidden rounded-sm bg-[#0e0c19] ring-1 ring-white/[0.07]">
            <span className="bg-white/[0.025]" />
            <span
              className={cn(
                "border-x",
                isInside
                  ? "border-emerald-300/25 bg-emerald-300/20"
                  : "border-violet-300/20 bg-violet-400/20",
              )}
            />
            <span className="bg-white/[0.025]" />
          </div>
          <div
            aria-label={`Current price is ${progress.placement} the range`}
            className={cn(
              "absolute top-1/2 size-5 -translate-x-1/2 -translate-y-1/2 rounded-sm border-[3px] border-[#171426] shadow-[0_4px_12px_rgba(0,0,0,.4)]",
              isInside ? "bg-cyan-300 text-cyan-300" : "bg-amber-300 text-amber-300",
            )}
            style={{ left: `${progress.percent}%` }}
          />
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-6">
        <div>
          <p className="text-[10px] text-slate-600">Lower</p>
          <p className="mt-0.5 font-mono text-xs text-slate-400">
            {formatPrice(position.lowerPrice)}
          </p>
        </div>
        <div className="text-right">
          <p className="text-[10px] text-slate-600">Upper</p>
          <p className="mt-0.5 font-mono text-xs text-slate-400">
            {formatPrice(position.upperPrice)}
          </p>
        </div>
      </div>
    </div>
  );
}

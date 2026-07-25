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

  return (
    <div className="rounded-2xl border border-white/[0.055] bg-[#171426]/75 p-4 sm:p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[10px] font-semibold tracking-[0.15em] text-slate-600 uppercase">
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
          <p className="text-[10px] font-semibold tracking-[0.15em] text-slate-600 uppercase">
            Tick
          </p>
          <p className="mt-1 font-mono text-xs text-slate-400">
            {position.currentTick.toLocaleString("en-US")}
          </p>
        </div>
      </div>

      <div className="relative mt-8 px-1">
        <div className="h-2 rounded-full bg-[#0e0c19] ring-1 ring-white/[0.055]">
          <div className="h-full w-full rounded-full bg-violet-500/70" />
        </div>
        <div
          aria-label={`Current price is ${progress.placement} the range`}
          className={cn(
            "absolute top-1/2 size-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-[3px] border-[#171426] ring-2 ring-white/10",
            isInside ? "bg-cyan-300 text-cyan-300" : "bg-amber-300 text-amber-300",
          )}
          style={{ left: `${progress.percent}%` }}
        />
      </div>

      <div className="mt-4 flex justify-between gap-6">
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

"use client";

import { Check, Copy } from "lucide-react";
import { useState } from "react";

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
  const [copiedBoundary, setCopiedBoundary] = useState<
    "lower" | "upper" | null
  >(null);
  const statusLabel = isInside
    ? "Inside liquidity range"
    : progress.placement === "below"
      ? "Below liquidity range"
      : "Above liquidity range";

  async function copyBoundary(
    boundary: "lower" | "upper",
    value: number,
  ) {
    try {
      await navigator.clipboard.writeText(toPlainDecimal(value));
      setCopiedBoundary(boundary);
      window.setTimeout(() => {
        setCopiedBoundary((current) =>
          current === boundary ? null : current,
        );
      }, 1_500);
    } catch {
      setCopiedBoundary(null);
    }
  }

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

      <div className="mt-4 grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={() => copyBoundary("lower", position.lowerPrice)}
          className="group min-w-0 cursor-pointer rounded-lg p-2 text-left transition-colors hover:bg-white/[0.045] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400"
          aria-label={`Copy lower price ${formatPrice(position.lowerPrice)}`}
        >
          <p className="text-[10px] text-slate-600">Lower</p>
          <span className="mt-0.5 flex min-w-0 items-center gap-1.5 font-mono text-xs text-slate-400 group-hover:text-slate-200">
            <span className="truncate">{formatPrice(position.lowerPrice)}</span>
            {copiedBoundary === "lower" ? (
              <Check className="size-3.5 shrink-0 text-emerald-300" />
            ) : (
              <Copy className="size-3.5 shrink-0" />
            )}
          </span>
        </button>
        <button
          type="button"
          onClick={() => copyBoundary("upper", position.upperPrice)}
          className="group min-w-0 cursor-pointer rounded-lg p-2 text-right transition-colors hover:bg-white/[0.045] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400"
          aria-label={`Copy upper price ${formatPrice(position.upperPrice)}`}
        >
          <p className="text-[10px] text-slate-600">Upper</p>
          <span className="mt-0.5 flex min-w-0 items-center justify-end gap-1.5 font-mono text-xs text-slate-400 group-hover:text-slate-200">
            {copiedBoundary === "upper" ? (
              <Check className="size-3.5 shrink-0 text-emerald-300" />
            ) : (
              <Copy className="size-3.5 shrink-0" />
            )}
            <span className="truncate">{formatPrice(position.upperPrice)}</span>
          </span>
        </button>
      </div>
    </div>
  );
}

function toPlainDecimal(value: number) {
  const raw = String(value);
  if (!/[eE]/.test(raw)) return raw;

  const [coefficient, exponentText] = raw.toLowerCase().split("e");
  const exponent = Number(exponentText);
  const negative = coefficient.startsWith("-");
  const unsigned = negative ? coefficient.slice(1) : coefficient;
  const [integer, fraction = ""] = unsigned.split(".");
  const digits = integer + fraction;
  const decimalIndex = integer.length + exponent;

  let expanded: string;
  if (decimalIndex <= 0) {
    expanded = `0.${"0".repeat(-decimalIndex)}${digits}`;
  } else if (decimalIndex >= digits.length) {
    expanded = `${digits}${"0".repeat(decimalIndex - digits.length)}`;
  } else {
    expanded = `${digits.slice(0, decimalIndex)}.${digits.slice(decimalIndex)}`;
  }

  return negative ? `-${expanded}` : expanded;
}

"use client";

import { useState } from "react";

import type { TokenInfo } from "@/lib/types";
import { cn } from "@/lib/utils";

export function TokenPairIcon({
  token0,
  token1,
}: {
  token0: TokenInfo;
  token1: TokenInfo;
}) {
  return (
    <div className="relative h-11 w-[66px] shrink-0">
      <TokenIcon
        token={token0}
        className="absolute left-0 bg-violet-600 text-white"
      />
      <TokenIcon
        token={token1}
        className="absolute right-0 bg-cyan-400 text-[#10101d]"
      />
    </div>
  );
}

function TokenIcon({
  token,
  className,
}: {
  token: TokenInfo;
  className: string;
}) {
  const [failedUrl, setFailedUrl] = useState<string>();
  const showLogo = token.logoUrl && failedUrl !== token.logoUrl;

  return (
    <div
      className={cn(
        "grid size-11 place-items-center overflow-hidden rounded-2xl text-xs font-bold ring-4 ring-card",
        className,
      )}
    >
      {showLogo ? (
        // Token logo hosts are supplied dynamically by Krystal.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={token.logoUrl}
          alt={`${token.symbol} token logo`}
          className="size-full object-cover"
          onError={() => setFailedUrl(token.logoUrl)}
        />
      ) : (
        token.symbol.slice(0, 2)
      )}
    </div>
  );
}

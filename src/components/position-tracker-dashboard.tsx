"use client";

import {
  Activity,
  AlertTriangle,
  Database,
  RefreshCw,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { AppShell } from "@/components/app-shell";
import { DashboardLoading } from "@/components/dashboard-loading";
import { EmptyState } from "@/components/empty-state";
import { PortfolioSummary } from "@/components/portfolio-summary";
import { PositionCard } from "@/components/position-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { WalletSearch } from "@/components/wallet-search";
import {
  formatCompactAddress,
  formatSyncAge,
  isValidWalletAddress,
} from "@/lib/format";
import { httpPositionDataSource } from "@/lib/http-position-data-source";
import type { PortfolioSnapshot } from "@/lib/types";
import { cn } from "@/lib/utils";

const AUTO_REFETCH_INTERVAL_MS = 60_000;

export function PositionTrackerDashboard() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const queryAddress = searchParams.get("address")?.trim() ?? "";
  const address = isValidWalletAddress(queryAddress) ? queryAddress : "";
  const [portfolio, setPortfolio] = useState<PortfolioSnapshot | null>(null);
  const [loadFailure, setLoadFailure] = useState<{
    address: string;
    message: string;
  } | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [nowMs, setNowMs] = useState(() => Date.now());
  const activeAddressRef = useRef(address);
  const latestRequestRef = useRef(0);
  const inFlightRef = useRef<{
    address: string;
    requestId: number;
    promise: Promise<void>;
  } | null>(null);

  const loadPortfolio = useCallback(async (walletAddress: string) => {
    const normalizedAddress = walletAddress.toLowerCase();
    const currentRequest = inFlightRef.current;
    if (currentRequest?.address === normalizedAddress) {
      return currentRequest.promise;
    }

    const requestId = ++latestRequestRef.current;
    setIsRefreshing(true);

    const promise = httpPositionDataSource
      .getPortfolio(walletAddress)
      .then((result) => {
        if (
          activeAddressRef.current.toLowerCase() === normalizedAddress &&
          latestRequestRef.current === requestId
        ) {
          setPortfolio(result);
          setLoadFailure(null);
          setNowMs(Date.now());
        }
      })
      .catch((error) => {
        if (
          activeAddressRef.current.toLowerCase() === normalizedAddress &&
          latestRequestRef.current === requestId
        ) {
          setLoadFailure({
            address: normalizedAddress,
            message:
              error instanceof Error
                ? error.message
                : "Live portfolio could not be loaded. Please try again.",
          });
        }
      })
      .finally(() => {
        if (inFlightRef.current?.requestId === requestId) {
          inFlightRef.current = null;
        }
        if (
          activeAddressRef.current.toLowerCase() === normalizedAddress &&
          latestRequestRef.current === requestId
        ) {
          setIsRefreshing(false);
        }
      });

    inFlightRef.current = { address: normalizedAddress, requestId, promise };
    return promise;
  }, []);

  useEffect(() => {
    activeAddressRef.current = address;
    if (!address) {
      latestRequestRef.current += 1;
      return;
    }
    void loadPortfolio(address);
  }, [address, loadPortfolio]);

  useEffect(() => {
    if (!address) return;

    const refreshWhenVisible = () => {
      if (document.visibilityState === "visible") {
        void loadPortfolio(address);
      }
    };
    const interval = window.setInterval(
      refreshWhenVisible,
      AUTO_REFETCH_INTERVAL_MS,
    );
    document.addEventListener("visibilitychange", refreshWhenVisible);

    return () => {
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", refreshWhenVisible);
    };
  }, [address, loadPortfolio]);

  const displayedPortfolio =
    portfolio?.address.toLowerCase() === address.toLowerCase() ? portfolio : null;
  const loadError =
    loadFailure?.address === address.toLowerCase() ? loadFailure.message : "";
  const isLoading = Boolean(address && !displayedPortfolio && !loadError);

  useEffect(() => {
    if (!displayedPortfolio) return;
    const interval = window.setInterval(() => setNowMs(Date.now()), 1_000);
    return () => window.clearInterval(interval);
  }, [displayedPortfolio]);

  const formattedUpdate = useMemo(() => {
    if (!displayedPortfolio) return "";
    return new Intl.DateTimeFormat("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
      timeZone: "UTC",
    }).format(new Date(displayedPortfolio.updatedAtMs));
  }, [displayedPortfolio]);

  function search(walletAddress: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("address", walletAddress);
    router.push(`${pathname}?${params.toString()}`);
  }

  async function refresh() {
    if (!address || isRefreshing) return;
    await loadPortfolio(address);
  }

  return (
    <AppShell>
      <main className="min-h-screen w-full min-w-0 max-w-full overflow-x-hidden">
        <header className="border-b border-white/[0.055] bg-[#11101e]/70 backdrop-blur-xl">
          <div className="mx-auto flex min-h-20 min-w-0 max-w-[1800px] items-center justify-between gap-4 px-5 pl-20 sm:px-7 sm:pl-7 xl:px-10">
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-semibold tracking-tight text-slate-50">
                  Position Tracker
                </h1>
                <Badge className="border-violet-400/15 bg-violet-400/8 text-[9px] font-semibold tracking-wider text-violet-200 uppercase">
                  Live data
                </Badge>
              </div>
              <p className="mt-1 hidden text-xs text-slate-600 sm:block">
                Monitor your Uniswap liquidity performance
              </p>
            </div>
            <div className="flex items-center gap-2">
              <div className="hidden items-center gap-2 rounded-full border border-white/[0.06] bg-white/[0.025] px-3 py-2 text-[11px] text-slate-400 sm:flex">
                <span className="relative flex size-2">
                  <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-30" />
                  <span className="relative inline-flex size-2 rounded-full bg-emerald-400" />
                </span>
                Robinhood Chain
              </div>
              <Button
                variant="outline"
                size="icon"
                aria-label="Refresh portfolio"
                disabled={!address || isRefreshing}
                onClick={refresh}
                className="border-white/[0.07] bg-white/[0.025] text-slate-400 hover:bg-white/[0.06] hover:text-white"
              >
                <RefreshCw
                  className={cn("size-4", isRefreshing && "animate-spin")}
                />
              </Button>
            </div>
          </div>
        </header>

        <div className="mx-auto min-w-0 max-w-[1800px] px-5 py-6 sm:px-7 sm:py-8 xl:px-10">
          <section className="relative min-w-0 max-w-full overflow-hidden rounded-3xl border border-white/[0.055] bg-[#19162b]/80 p-5 shadow-[0_20px_60px_rgba(0,0,0,.16)] sm:p-7">
            <div className="pointer-events-none absolute -top-24 right-[10%] size-64 rounded-full bg-violet-500/[0.07] blur-3xl" />
            <div className="relative flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
              <div className="min-w-0">
                <div className="flex items-center gap-2 text-[10px] font-semibold tracking-[0.16em] text-violet-300 uppercase">
                  <Sparkles className="size-3.5" />
                  Read-only portfolio intelligence
                </div>
                <h2 className="mt-3 text-2xl font-semibold tracking-tight text-slate-50 sm:text-3xl">
                  Track every LP position.
                </h2>
                <p className="mt-2 max-w-xl text-sm leading-6 text-slate-500">
                  Explore position value, fees, range health, and performance
                  without connecting a wallet.
                </p>
              </div>
              <div className="min-w-0 w-full max-w-full xl:max-w-2xl">
                <WalletSearch initialValue={queryAddress} onSearch={search} />
              </div>
            </div>
          </section>

          {displayedPortfolio && (
            <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/[0.045] bg-white/[0.018] px-4 py-3">
              <div className="flex min-w-0 items-center gap-2 text-xs text-slate-500">
                <ShieldCheck className="size-4 shrink-0 text-cyan-400" />
                <span>Tracking</span>
                <code className="truncate font-mono text-slate-300">
                  {formatCompactAddress(displayedPortfolio.address)}
                </code>
              </div>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[10px] text-slate-600">
                <span className="flex items-center gap-1.5">
                  <Activity className="size-3" />
                  Updated {formattedUpdate} UTC
                </span>
                <span className="flex items-center gap-1.5">
                  <Database className="size-3" />
                  Block{" "}
                  {Number(displayedPortfolio.blockNumber).toLocaleString("en-US")}
                </span>
              </div>
            </div>
          )}

          <div className="mt-5">
            {!address && <EmptyState />}
            {isLoading && <DashboardLoading />}
            {loadError && address && !displayedPortfolio && (
              <div
                role="alert"
                className="rounded-2xl border border-rose-400/15 bg-rose-400/[0.055] p-5 text-sm text-rose-300"
              >
                {loadError}
              </div>
            )}
            {displayedPortfolio && (
              <div className="space-y-5">
                {loadError && (
                  <div
                    role="alert"
                    className="rounded-2xl border border-amber-400/15 bg-amber-400/[0.055] p-4 text-sm text-amber-200"
                  >
                    Refresh failed. Showing the last successful snapshot.{" "}
                    {loadError}
                  </div>
                )}
                {displayedPortfolio.warnings.length > 0 && (
                  <div
                    role="status"
                    className="rounded-2xl border border-amber-400/15 bg-amber-400/[0.045] p-4"
                  >
                    <div className="flex items-center gap-2 text-sm font-medium text-amber-200">
                      <AlertTriangle className="size-4" />
                      Some portfolio data is unavailable
                    </div>
                    <ul className="mt-2 space-y-1 pl-6 text-xs leading-5 text-amber-100/60">
                      {displayedPortfolio.warnings.map((warning) => (
                        <li key={warning} className="list-disc">
                          {warning}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                <PortfolioSummary portfolio={displayedPortfolio} />
                <section aria-labelledby="positions-title">
                  <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h2
                        id="positions-title"
                        className="text-base font-semibold text-slate-100"
                      >
                        Open positions
                      </h2>
                      <p className="mt-1 text-xs text-slate-600">
                        Uniswap v3 and v4 positions in this wallet
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center justify-end gap-2">
                      <span
                        role="status"
                        aria-live="polite"
                        className="flex items-center gap-1.5 text-[11px] text-slate-500"
                      >
                        {isRefreshing ? (
                          <>
                            <RefreshCw className="size-3.5 animate-spin text-violet-300" />
                            Syncing all positions...
                          </>
                        ) : (
                          <>
                            <Activity className="size-3.5 text-emerald-400" />
                            Last synced{" "}
                            {formatSyncAge(
                              nowMs,
                              displayedPortfolio.updatedAtMs,
                            )}
                          </>
                        )}
                      </span>
                      <span className="rounded-full border border-white/[0.06] bg-white/[0.025] px-3 py-1 text-xs text-slate-500">
                        {displayedPortfolio.positions.length} positions
                      </span>
                    </div>
                  </div>
                  {displayedPortfolio.positions.length === 0 ? (
                    <div className="rounded-2xl border border-white/[0.055] bg-white/[0.018] p-8 text-center">
                      <h3 className="text-sm font-medium text-slate-200">
                        No open positions found
                      </h3>
                      <p className="mt-2 text-xs text-slate-500">
                        This wallet has no open Uniswap v3 or v4 positions on
                        Robinhood Chain.
                      </p>
                    </div>
                  ) : (
                    <div className="grid min-w-0 gap-4 2xl:grid-cols-2">
                      {displayedPortfolio.positions.map((position) => (
                        <PositionCard
                          key={position.id}
                          position={position}
                          nowMs={displayedPortfolio.updatedAtMs}
                        />
                      ))}
                    </div>
                  )}
                </section>
              </div>
            )}
          </div>
        </div>
      </main>
    </AppShell>
  );
}

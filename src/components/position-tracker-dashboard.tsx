"use client";

import {
  Activity,
  AlertTriangle,
  Database,
  RefreshCw,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import { AppShell } from "@/components/app-shell";
import { DashboardPageHeader } from "@/components/dashboard-page-header";
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
} from "@/lib/format";
import { httpPositionDataSource } from "@/lib/http-position-data-source";
import type { PortfolioSnapshot } from "@/lib/types";
import { cn } from "@/lib/utils";

const AUTO_REFETCH_INTERVAL_MS = 90_000;
const DEMO_WALLET_ADDRESS = "0x0000000000000000000000000000000000000001";

export function PositionTrackerDashboard({
  demoMode = false,
}: {
  demoMode?: boolean;
}) {
  const [address, setAddress] = useState(
    demoMode ? DEMO_WALLET_ADDRESS : "",
  );
  const [portfolio, setPortfolio] = useState<PortfolioSnapshot | null>(null);
  const [loadFailure, setLoadFailure] = useState<{
    address: string;
    message: string;
  } | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isOffline, setIsOffline] = useState(false);
  const [nowMs, setNowMs] = useState(() => Date.now());
  const activeAddressRef = useRef(address);
  const latestRequestRef = useRef(0);
  const inFlightRef = useRef<{
    address: string;
    requestId: number;
    promise: Promise<void>;
  } | null>(null);

  const loadPortfolio = useCallback(async (
    walletAddress: string,
    refresh = false,
  ) => {
    const normalizedAddress = walletAddress.toLowerCase();
    const currentRequest = inFlightRef.current;
    if (currentRequest?.address === normalizedAddress) {
      return currentRequest.promise;
    }

    const requestId = ++latestRequestRef.current;
    setIsRefreshing(true);

    const promise = httpPositionDataSource
      .getPortfolio(walletAddress, { refresh })
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
    const updateConnection = () => setIsOffline(!window.navigator.onLine);
    updateConnection();
    window.addEventListener("online", updateConnection);
    window.addEventListener("offline", updateConnection);
    return () => {
      window.removeEventListener("online", updateConnection);
      window.removeEventListener("offline", updateConnection);
    };
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

    const interval = window.setInterval(() => {
      if (window.navigator.onLine && document.visibilityState === "visible") {
        void loadPortfolio(address);
      }
    }, AUTO_REFETCH_INTERVAL_MS);

    return () => {
      window.clearInterval(interval);
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

  function search(walletAddress: string) {
    if (isRefreshing) return;
    if (walletAddress.toLowerCase() === address.toLowerCase()) {
      void loadPortfolio(walletAddress);
      return;
    }
    setAddress(walletAddress);
  }

  async function refresh() {
    if (!address || isRefreshing) return;
    await loadPortfolio(address, true);
  }

  return (
    <AppShell>
      <main className="min-h-screen w-full min-w-0 max-w-full overflow-x-hidden">
        <DashboardPageHeader
          title="Position Tracker"
          subtitle="Monitor your Uniswap liquidity performance"
          titleAccessory={
            <Badge className="border-violet-400/15 bg-violet-400/8 text-[9px] font-semibold tracking-wider text-violet-200 uppercase">
              {demoMode ? "Demo data" : "Live data"}
            </Badge>
          }
          actions={
            <div className="flex items-center gap-2">
              <div className="hidden items-center px-2 py-2 text-[11px] text-slate-500 sm:flex">
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
          }
        />

        <div className="mx-auto min-w-0 max-w-[1800px] px-5 py-6 sm:px-7 sm:py-8 xl:px-10">
          <section className="relative min-w-0 max-w-full overflow-hidden border-b border-white/[0.06] pb-7 sm:pb-9">
            <div
              aria-hidden="true"
              className="absolute inset-y-0 left-0 hidden w-px bg-violet-400/30 sm:block"
            />
            <div
              aria-hidden="true"
              className="absolute top-0 left-0 hidden h-7 w-px bg-cyan-300 sm:block"
            />
            <div className="flex flex-col gap-6 sm:pl-7 xl:flex-row xl:items-end xl:justify-between">
              <div className="min-w-0 max-w-2xl">
                <h2 className="max-w-xl text-3xl font-semibold tracking-[-0.03em] text-balance text-slate-50 sm:text-5xl">
                  Track a wallet
                </h2>
                <p className="mt-3 max-w-xl text-sm leading-6 text-slate-400">
                  See LP value, performance, and positions that need attention.
                  No wallet connection required.
                </p>
              </div>
              <div className="min-w-0 w-full max-w-full xl:max-w-2xl">
                <WalletSearch onSearch={search} isLoading={isLoading} />
              </div>
            </div>
          </section>

          {displayedPortfolio && (
            <div className="mt-5 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500">
              <div className="flex min-w-0 items-center gap-2 text-xs text-slate-500">
                <span>Tracking</span>
                <code className="truncate font-mono text-slate-300">
                  {formatCompactAddress(displayedPortfolio.address)}
                </code>
              </div>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[10px] text-slate-600">
                <span className="flex items-center gap-1.5">
                  <Database className="size-3" />
                  Data by Krystal
                </span>
              </div>
            </div>
          )}

          <div className="mt-5">
            {isOffline && (
              <div
                role="status"
                className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber-400/15 bg-amber-400/[0.055] p-4 text-sm text-amber-200"
              >
                <span>
                  You’re offline. Live updates will resume when your connection
                  returns.
                </span>
                {displayedPortfolio && (
                  <span className="text-xs text-amber-100/60">
                    Showing the last successful snapshot
                  </span>
                )}
              </div>
            )}
            {!address && <EmptyState />}
            {isLoading && <DashboardLoading />}
            {loadError && address && !displayedPortfolio && (
              <div
                role="alert"
                className="rounded-2xl border border-rose-400/15 bg-rose-400/[0.055] p-5 text-sm text-rose-300"
              >
                <p className="font-medium text-rose-200">
                  Portfolio couldn’t be loaded
                </p>
                <p className="mt-1 leading-6 text-rose-200/75">{loadError}</p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={isRefreshing || isOffline}
                  onClick={refresh}
                  className="mt-4 border-rose-300/20 bg-rose-300/[0.06] text-rose-100 hover:bg-rose-300/10"
                >
                  <RefreshCw
                    className={cn(
                      "size-3.5",
                      isRefreshing && "animate-spin",
                    )}
                  />
                  {isRefreshing ? "Trying again…" : "Try again"}
                </Button>
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
                            Refreshing from Krystal...
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
                    <div className="grid min-w-0 gap-4 xl:grid-cols-3">
                      {[...displayedPortfolio.positions]
                        .sort((a, b) =>
                          a.status === b.status
                            ? 0
                            : a.status === "out_of_range"
                              ? -1
                              : 1,
                        )
                        .map((position) => (
                          <PositionCard
                            key={position.id}
                            position={position}
                            nowMs={nowMs}
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

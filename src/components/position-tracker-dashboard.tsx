"use client";

import {
  Activity,
  AlertTriangle,
  Database,
  RefreshCw,
} from "lucide-react";
import { useRouter } from "next/navigation";
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
import {
  getLiveRefreshRetryDelayMs,
  isLiveSnapshotStale,
  LIVE_REFRESH_INTERVAL_MS,
} from "@/lib/realtime-refresh";
import type { PortfolioSnapshot } from "@/lib/types";
import { cn } from "@/lib/utils";
import { buildWalletHref } from "@/lib/wallet-url";

const DEMO_WALLET_ADDRESS = "0x0000000000000000000000000000000000000001";
type RefreshPhase = "idle" | "initial" | "background" | "manual";
type RefreshKind = Exclude<RefreshPhase, "idle">;

export function PositionTrackerDashboard({
  demoMode = false,
  initialAddress = "",
}: {
  demoMode?: boolean;
  initialAddress?: string;
}) {
  const router = useRouter();
  const [address, setAddress] = useState(
    demoMode ? DEMO_WALLET_ADDRESS : initialAddress,
  );
  const [portfolio, setPortfolio] = useState<PortfolioSnapshot | null>(null);
  const [loadFailure, setLoadFailure] = useState<{
    address: string;
    message: string;
  } | null>(null);
  const [refreshPhase, setRefreshPhase] = useState<RefreshPhase>("idle");
  const [isOffline, setIsOffline] = useState(false);
  const [isPageVisible, setIsPageVisible] = useState(true);
  const [lastFreshAtMs, setLastFreshAtMs] = useState<number | null>(null);
  const [nextPollAtMs, setNextPollAtMs] = useState<number | null>(null);
  const [backgroundRefreshDelayed, setBackgroundRefreshDelayed] =
    useState(false);
  const [nowMs, setNowMs] = useState(() => Date.now());
  const activeAddressRef = useRef(address);
  const onlineRef = useRef(
    typeof navigator === "undefined" ? true : navigator.onLine,
  );
  const pageVisibleRef = useRef(
    typeof document === "undefined"
      ? true
      : document.visibilityState === "visible",
  );
  const lastFreshAtRef = useRef<number | null>(null);
  const consecutiveFailuresRef = useRef(0);
  const latestRequestRef = useRef(0);
  const inFlightRef = useRef<{
    address: string;
    requestId: number;
    refresh: boolean;
    controller: AbortController;
    promise: Promise<boolean>;
  } | null>(null);

  const loadPortfolio = useCallback(
    (
      walletAddress: string,
      options: { refresh: boolean; kind: RefreshKind },
    ): Promise<boolean> => {
      const normalizedAddress = walletAddress.toLowerCase();
      const currentRequest = inFlightRef.current;
      if (currentRequest?.address === normalizedAddress) {
        if (options.refresh && !currentRequest.refresh) {
          return currentRequest.promise.then(() =>
            loadPortfolio(walletAddress, options),
          );
        }
        return currentRequest.promise;
      }
      if (currentRequest) {
        currentRequest.controller.abort();
      }

      const requestId = ++latestRequestRef.current;
      const controller = new AbortController();
      setRefreshPhase(options.kind);

      const promise = httpPositionDataSource
        .getPortfolio(walletAddress, {
          refresh: options.refresh,
          signal: controller.signal,
        })
        .then((result) => {
          if (
            activeAddressRef.current.toLowerCase() !== normalizedAddress ||
            latestRequestRef.current !== requestId
          ) {
            return false;
          }

          const receivedAtMs = Date.now();
          setPortfolio(result);
          setLoadFailure(null);
          setNowMs(receivedAtMs);
          if (options.refresh) {
            lastFreshAtRef.current = receivedAtMs;
            setLastFreshAtMs(receivedAtMs);
            setBackgroundRefreshDelayed(false);
          }
          return true;
        })
        .catch((error) => {
          if (
            isAbortError(error) ||
            activeAddressRef.current.toLowerCase() !== normalizedAddress ||
            latestRequestRef.current !== requestId
          ) {
            return false;
          }

          if (options.kind === "background") {
            setBackgroundRefreshDelayed(true);
          } else {
            setLoadFailure({
              address: normalizedAddress,
              message:
                error instanceof Error
                  ? error.message
                  : "Live portfolio could not be loaded. Please try again.",
            });
          }
          return false;
        })
        .finally(() => {
          if (inFlightRef.current?.requestId === requestId) {
            inFlightRef.current = null;
          }
          if (
            activeAddressRef.current.toLowerCase() === normalizedAddress &&
            latestRequestRef.current === requestId
          ) {
            setRefreshPhase("idle");
          }
        });

      inFlightRef.current = {
        address: normalizedAddress,
        requestId,
        refresh: options.refresh,
        controller,
        promise,
      };
      return promise;
    },
    [],
  );

  const scheduleAfterFreshAttempt = useCallback((success: boolean) => {
    if (success) {
      consecutiveFailuresRef.current = 0;
      setBackgroundRefreshDelayed(false);
      setNextPollAtMs(Date.now() + LIVE_REFRESH_INTERVAL_MS);
      return;
    }

    consecutiveFailuresRef.current += 1;
    setBackgroundRefreshDelayed(true);
    setNextPollAtMs(
      Date.now() +
        getLiveRefreshRetryDelayMs(consecutiveFailuresRef.current),
    );
  }, []);

  const refreshInBackground = useCallback(
    async (walletAddress: string) => {
      setNextPollAtMs(null);
      const success = await loadPortfolio(walletAddress, {
        refresh: true,
        kind: "background",
      });
      if (
        activeAddressRef.current.toLowerCase() === walletAddress.toLowerCase()
      ) {
        scheduleAfterFreshAttempt(success);
      }
      return success;
    },
    [loadPortfolio, scheduleAfterFreshAttempt],
  );

  const refreshIfStale = useCallback(() => {
    if (
      !address ||
      !onlineRef.current ||
      !pageVisibleRef.current
    ) {
      return;
    }

    const currentTimeMs = Date.now();
    if (isLiveSnapshotStale(currentTimeMs, lastFreshAtRef.current)) {
      void refreshInBackground(address);
      return;
    }

    setNextPollAtMs(
      lastFreshAtRef.current! + LIVE_REFRESH_INTERVAL_MS,
    );
  }, [address, refreshInBackground]);

  useEffect(() => {
    const updateConnection = () => {
      const online = window.navigator.onLine;
      onlineRef.current = online;
      setIsOffline(!online);
      if (online) refreshIfStale();
      else setNextPollAtMs(null);
    };
    const updateVisibility = () => {
      const visible = document.visibilityState === "visible";
      pageVisibleRef.current = visible;
      setIsPageVisible(visible);
      if (visible) refreshIfStale();
      else setNextPollAtMs(null);
    };

    const initialStatusTimer = window.setTimeout(() => {
      const online = window.navigator.onLine;
      const visible = document.visibilityState === "visible";
      onlineRef.current = online;
      pageVisibleRef.current = visible;
      setIsOffline(!online);
      setIsPageVisible(visible);
    }, 0);
    window.addEventListener("online", updateConnection);
    window.addEventListener("offline", updateConnection);
    window.addEventListener("focus", refreshIfStale);
    document.addEventListener("visibilitychange", updateVisibility);
    return () => {
      window.clearTimeout(initialStatusTimer);
      window.removeEventListener("online", updateConnection);
      window.removeEventListener("offline", updateConnection);
      window.removeEventListener("focus", refreshIfStale);
      document.removeEventListener("visibilitychange", updateVisibility);
    };
  }, [refreshIfStale]);

  useEffect(() => {
    const normalizedAddress = address.toLowerCase();
    activeAddressRef.current = normalizedAddress;
    lastFreshAtRef.current = null;
    consecutiveFailuresRef.current = 0;

    if (!address) {
      latestRequestRef.current += 1;
      inFlightRef.current?.controller.abort();
      inFlightRef.current = null;
      return;
    }

    let cancelled = false;
    void (async () => {
      await loadPortfolio(address, { refresh: false, kind: "initial" });
      if (
        cancelled ||
        activeAddressRef.current !== normalizedAddress
      ) {
        return;
      }
      if (onlineRef.current && pageVisibleRef.current) {
        await refreshInBackground(address);
      }
    })();

    return () => {
      cancelled = true;
      const currentRequest = inFlightRef.current;
      if (currentRequest?.address === normalizedAddress) {
        currentRequest.controller.abort();
      }
    };
  }, [address, loadPortfolio, refreshInBackground]);

  useEffect(() => {
    if (
      !address ||
      nextPollAtMs == null ||
      isOffline ||
      !isPageVisible
    ) {
      return;
    }

    const timer = window.setTimeout(() => {
      void refreshInBackground(address);
    }, Math.max(0, nextPollAtMs - Date.now()));
    return () => window.clearTimeout(timer);
  }, [
    address,
    isOffline,
    isPageVisible,
    nextPollAtMs,
    refreshInBackground,
  ]);

  const displayedPortfolio =
    portfolio?.address.toLowerCase() === address.toLowerCase() ? portfolio : null;
  const loadError =
    loadFailure?.address === address.toLowerCase() ? loadFailure.message : "";
  const isLoading = Boolean(address && !displayedPortfolio && !loadError);
  const isBusy = refreshPhase !== "idle";
  const isManualRefreshing = refreshPhase === "manual";

  useEffect(() => {
    if (!displayedPortfolio) return;
    const interval = window.setInterval(() => setNowMs(Date.now()), 1_000);
    return () => window.clearInterval(interval);
  }, [displayedPortfolio]);

  function search(walletAddress: string) {
    router.replace(buildWalletHref("/", walletAddress), { scroll: false });
    if (walletAddress.toLowerCase() === address.toLowerCase()) {
      void refresh();
      return;
    }
    activeAddressRef.current = walletAddress.toLowerCase();
    lastFreshAtRef.current = null;
    consecutiveFailuresRef.current = 0;
    setLastFreshAtMs(null);
    setNextPollAtMs(null);
    setBackgroundRefreshDelayed(false);
    setLoadFailure(null);
    setAddress(walletAddress);
  }

  async function refresh() {
    if (!address || isBusy || !window.navigator.onLine) return;
    setNextPollAtMs(null);
    const success = await loadPortfolio(address, {
      refresh: true,
      kind: "manual",
    });
    scheduleAfterFreshAttempt(success);
  }

  return (
    <AppShell walletAddress={address}>
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
            <div className="hidden items-center px-2 py-2 text-[11px] text-slate-500 sm:flex">
              Robinhood Chain
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
                <WalletSearch
                  onSearch={search}
                  isLoading={isLoading}
                  initialValue={initialAddress}
                />
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
              <div className="flex flex-wrap items-center justify-end gap-x-3 gap-y-2 text-[10px] text-slate-600">
                <span className="flex items-center gap-1.5">
                  <Database className="size-3" />
                  Data by Krystal
                </span>
                <LiveRefreshStatus
                  refreshPhase={refreshPhase}
                  backgroundRefreshDelayed={backgroundRefreshDelayed}
                  lastFreshAtMs={lastFreshAtMs}
                  nowMs={nowMs}
                />
                <Button
                  variant="outline"
                  size="icon-sm"
                  aria-label="Refresh portfolio"
                  disabled={isBusy || isOffline}
                  onClick={refresh}
                  className="border-white/[0.07] bg-white/[0.025] text-slate-400 hover:bg-white/[0.06] hover:text-white"
                >
                  <RefreshCw
                    className={cn(
                      "size-3.5",
                      isManualRefreshing && "animate-spin",
                    )}
                  />
                </Button>
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
                  disabled={isBusy || isOffline}
                  onClick={refresh}
                  className="mt-4 border-rose-300/20 bg-rose-300/[0.06] text-rose-100 hover:bg-rose-300/10"
                >
                  <RefreshCw
                    className={cn(
                      "size-3.5",
                      isManualRefreshing && "animate-spin",
                    )}
                  />
                  {isManualRefreshing ? "Trying again…" : "Try again"}
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

function isAbortError(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "name" in error &&
    error.name === "AbortError"
  );
}

function LiveRefreshStatus({
  refreshPhase,
  backgroundRefreshDelayed,
  lastFreshAtMs,
  nowMs,
}: {
  refreshPhase: RefreshPhase;
  backgroundRefreshDelayed: boolean;
  lastFreshAtMs: number | null;
  nowMs: number;
}) {
  return (
    <span
      role="status"
      aria-live="polite"
      className="flex items-center gap-1.5 border-l border-white/[0.07] pl-3 text-[11px] text-slate-500"
    >
      {refreshPhase === "manual" ? (
        <>
          <RefreshCw className="size-3.5 animate-spin text-violet-300" />
          Refreshing from Krystal...
        </>
      ) : refreshPhase === "background" ? (
        <>
          <Activity className="size-3.5 animate-pulse text-violet-300" />
          {lastFreshAtMs == null ? "Checking latest data…" : "Updating…"}
        </>
      ) : backgroundRefreshDelayed ? (
        <>
          <AlertTriangle className="size-3.5 text-amber-300" />
          Live update delayed · Retrying…
        </>
      ) : lastFreshAtMs != null ? (
        <>
          <Activity className="size-3.5 text-emerald-400" />
          Live · Updated {formatSyncAge(nowMs, lastFreshAtMs)}
        </>
      ) : (
        <>
          <Database className="size-3.5 text-slate-500" />
          Cached snapshot
        </>
      )}
    </span>
  );
}

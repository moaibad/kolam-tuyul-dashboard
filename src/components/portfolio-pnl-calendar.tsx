"use client";

import {
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight as ExternalLink,
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  CalendarDays,
  RefreshCw,
} from "lucide-react";
import { useMemo, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { WalletSearch } from "@/components/wallet-search";
import { httpPortfolioCalendarDataSource } from "@/lib/http-portfolio-calendar-data-source";
import {
  getDayPnl,
  getMonthAnalytics,
  type PortfolioCalendarDay,
  type PortfolioCalendarMonth,
} from "@/lib/portfolio-calendar";
import { portfolioCalendarMock } from "@/lib/portfolio-calendar-mock";
import { formatCurrency, formatNumber, formatSignedCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";

const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const MONTH_FORMATTER = new Intl.DateTimeFormat("en-US", {
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});
const DAY_FORMATTER = new Intl.DateTimeFormat("en-US", {
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});

export function PortfolioPnlCalendar({
  demoMode = false,
}: {
  demoMode?: boolean;
}) {
  const currentMonth = getBangkokMonth();
  const [address, setAddress] = useState("");
  const [displayedAddress, setDisplayedAddress] = useState("");
  const [months, setMonths] = useState<PortfolioCalendarMonth[]>(
    demoMode ? portfolioCalendarMock : [],
  );
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [progress, setProgress] = useState("");
  const activeAddressRef = useRef("");
  const latestRequestRef = useRef(0);
  const inFlightRef = useRef<{
    address: string;
    promise: Promise<void>;
  } | null>(null);

  function load(walletAddress: string) {
    const normalizedAddress = walletAddress.toLowerCase();
    if (inFlightRef.current?.address === normalizedAddress) {
      return inFlightRef.current.promise;
    }

    const requestId = ++latestRequestRef.current;
    activeAddressRef.current = normalizedAddress;
    setAddress(walletAddress);
    setIsLoading(true);
    setError("");
    setProgress("Loading saved realized PnL…");
    if (
      displayedAddress &&
      displayedAddress.toLowerCase() !== normalizedAddress
    ) {
      setMonths([]);
      setDisplayedAddress("");
    }

    const isCurrentRequest = () =>
      activeAddressRef.current === normalizedAddress &&
      latestRequestRef.current === requestId;

    const promise = (async () => {
      let hasCachedCalendar = false;
      try {
        const cached = await httpPortfolioCalendarDataSource.get(
          walletAddress,
          currentMonth,
        );
        if (!isCurrentRequest()) return;
        hasCachedCalendar = true;
        setMonths([cached.month]);
        setDisplayedAddress(walletAddress);
        setProgress(syncMessage(cached.backfill.state));
        setError(cached.backfill.error ?? "");
      } catch (cacheError) {
        if (!isCurrentRequest()) return;
        setProgress("Discovering withdrawn LP positions…");
        setError(
          cacheError instanceof Error
            ? cacheError.message
            : "Saved realized PnL could not be loaded.",
        );
      }

      try {
        const backfill =
          await httpPortfolioCalendarDataSource.backfill(walletAddress);
        if (!isCurrentRequest()) return;
        if (backfill.error) setError(backfill.error);

        const refreshed = await httpPortfolioCalendarDataSource.get(
          walletAddress,
          currentMonth,
        );
        if (!isCurrentRequest()) return;
        setMonths([refreshed.month]);
        setDisplayedAddress(walletAddress);
        setProgress(
          refreshed.backfill.state === "complete"
            ? "Realized history is up to date"
            : `Indexed ${refreshed.backfill.completed} of ${refreshed.backfill.total} positions`,
        );
        setError(refreshed.backfill.error ?? "");
      } catch (syncError) {
        if (!isCurrentRequest()) return;
        setError(
          syncError instanceof Error
            ? syncError.message
            : "Realized PnL synchronization failed.",
        );
        if (!hasCachedCalendar) {
          setProgress("Realized PnL history is unavailable");
        }
      } finally {
        if (isCurrentRequest()) {
          setIsLoading(false);
        }
        if (inFlightRef.current?.address === normalizedAddress) {
          inFlightRef.current = null;
        }
      }
    })();

    inFlightRef.current = { address: normalizedAddress, promise };
    return promise;
  }

  if (demoMode) {
    return <CalendarView months={months} />;
  }

  return (
    <div className="mx-auto max-w-[1800px] px-4 py-6 sm:px-7 sm:py-8 xl:px-10">
      <section className="border-b border-white/[0.07] pb-7">
        <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-2xl">
            <h2 className="text-3xl font-semibold tracking-[-0.03em] text-slate-50 sm:text-4xl">
              Realized LP performance
            </h2>
            <p className="mt-3 max-w-xl text-sm leading-6 text-slate-400">
              Only fully withdrawn positions are counted. Active and partially
              withdrawn liquidity stays outside the calendar.
            </p>
          </div>
          <div className="w-full max-w-2xl">
            <WalletSearch onSearch={load} isLoading={isLoading} />
          </div>
        </div>
      </section>

      {progress && (
        <div
          role="status"
          aria-live="polite"
          className="mt-5 flex min-h-6 items-center gap-2 text-xs text-slate-400"
        >
          {isLoading ? (
            <RefreshCw className="size-3.5 animate-spin text-violet-300" />
          ) : (
            <CalendarDays className="size-3.5 text-emerald-400" />
          )}
          {progress}
        </div>
      )}

      {error && (
        <div
          role="alert"
          className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber-300/20 bg-amber-300/[0.07] px-4 py-3 text-sm text-amber-100"
        >
          <span className="flex min-w-0 items-center gap-2">
            <AlertTriangle className="size-4 shrink-0" />
            <span className="min-w-0 break-words">{error}</span>
          </span>
          {address && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isLoading}
              onClick={() => load(address)}
              className="border-amber-200/20 bg-amber-200/[0.06] text-amber-50 hover:bg-amber-200/10"
            >
              <RefreshCw className="size-3.5" />
              Retry sync
            </Button>
          )}
        </div>
      )}

      {months.length > 0 ? (
        <CalendarView months={months} embedded />
      ) : (
        <div className="py-20 text-center">
          <CalendarDays className="mx-auto size-7 text-violet-300/60" />
          <h3 className="mt-4 text-base font-semibold text-slate-200">
            Enter a wallet to build its realized PnL calendar
          </h3>
          <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-slate-500">
            Full withdrawals and post-closure fee claims will appear on their
            transaction date in Bangkok time.
          </p>
        </div>
      )}
    </div>
  );
}

function CalendarView({
  months,
  embedded = false,
}: {
  months: PortfolioCalendarMonth[];
  embedded?: boolean;
}) {
  const todayMonth = getBangkokMonth();
  const initialIndex = Math.max(
    0,
    months.findIndex((month) => month.month === todayMonth),
  );
  const [monthIndex, setMonthIndex] = useState(initialIndex);
  const currentMonth = months[monthIndex];
  const initialSelectedDate =
    currentMonth.days.at(-1)?.date ?? `${currentMonth.month}-01`;
  const [selectedDate, setSelectedDate] = useState(initialSelectedDate);

  const analytics = useMemo(
    () => getMonthAnalytics(currentMonth.days),
    [currentMonth.days],
  );
  const previousAnalytics = useMemo(
    () =>
      monthIndex > 0 ? getMonthAnalytics(months[monthIndex - 1].days) : null,
    [monthIndex, months],
  );
  const selectedDay =
    currentMonth.days.find((day) => day.date === selectedDate) ??
    emptyDay(selectedDate);
  const monthDelta =
    previousAnalytics && previousAnalytics.totalPnl !== 0
      ? ((analytics.totalPnl - previousAnalytics.totalPnl) /
          Math.abs(previousAnalytics.totalPnl)) *
        100
      : null;

  const changeMonth = (nextIndex: number) => {
    const bounded = Math.max(0, Math.min(months.length - 1, nextIndex));
    const nextMonth = months[bounded];
    setMonthIndex(bounded);
    setSelectedDate(nextMonth.days.at(-1)?.date ?? `${nextMonth.month}-01`);
  };

  return (
    <div
      className={cn(
        embedded ? "pt-8" : "mx-auto max-w-[1800px] px-4 py-6 sm:px-7 sm:py-8 xl:px-10",
      )}
    >
      {/* THESIS: Daily portfolio performance becomes a navigable field, not a row of disconnected KPI cards.
          OWN-WORLD: Ink-violet surfaces, precise dividers, emerald/rose PnL fields, and restrained violet controls.
          STORY: Scan the month, recognize momentum, select a date, then trace the result back to each LP position.
          FIRST VIEWPORT: A compact monthly ledger leads directly into a full-width seven-column calendar.
          FORM: Operate-mode performance ledger, inherited from the established KolamTuyul dashboard. */}
      <section aria-labelledby="monthly-performance-title">
        <div className="flex flex-col gap-5 border-b border-white/[0.07] pb-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="flex items-center gap-2 text-sm text-violet-300">
              <span className="grid size-8 place-items-center rounded-lg bg-violet-500/12">
                <CalendarDays className="size-4" />
              </span>
              Monthly realized PnL
            </div>
            <h2
              id="monthly-performance-title"
              className="mt-4 text-3xl font-semibold tracking-[-0.03em] text-slate-50 sm:text-4xl"
            >
              {formatSignedCurrency(analytics.totalPnl)}
            </h2>
            <p className="mt-2 text-sm text-slate-400">
              {analytics.activeDays} days with completed withdrawals or late fee claims
              {monthDelta != null && (
                <span
                  className={cn(
                    "ml-2 inline-flex items-center gap-1 font-medium",
                    monthDelta >= 0 ? "text-emerald-300" : "text-rose-300",
                  )}
                >
                  {monthDelta >= 0 ? (
                    <ArrowUpRight className="size-3.5" />
                  ) : (
                    <ArrowDownRight className="size-3.5" />
                  )}
                  {formatNumber(Math.abs(monthDelta), 1)}% vs previous month
                </span>
              )}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-x-8 gap-y-5 sm:grid-cols-4 xl:gap-x-12">
            <Metric label="Win rate" value={`${formatNumber(analytics.winRate, 0)}%`} />
            <Metric
              label="Daily average"
              value={formatSignedCurrency(analytics.averageDailyPnl)}
            />
            <Metric
              label="Best day"
              value={
                analytics.bestDay
                  ? formatSignedCurrency(getDayPnl(analytics.bestDay))
                  : "—"
              }
            />
            <Metric
              label="Win streak"
              value={`${analytics.longestWinStreak} days`}
            />
          </div>
        </div>
      </section>

      <section aria-label="PnL calendar" className="mt-7">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-1.5">
            <Button
              variant="outline"
              size="icon"
              aria-label="Previous month"
              disabled={monthIndex === 0}
              onClick={() => changeMonth(monthIndex - 1)}
              className="border-white/[0.08] bg-white/[0.025] text-slate-300 hover:bg-white/[0.06]"
            >
              <ArrowLeft className="size-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              aria-label="Next month"
              disabled={monthIndex === months.length - 1}
              onClick={() => changeMonth(monthIndex + 1)}
              className="border-white/[0.08] bg-white/[0.025] text-slate-300 hover:bg-white/[0.06]"
            >
              <ArrowRight className="size-4" />
            </Button>
            <Button
              variant="ghost"
              onClick={() => changeMonth(initialIndex)}
              disabled={monthIndex === initialIndex}
              className="ml-1 text-xs text-slate-400 hover:bg-white/[0.04] hover:text-slate-100"
            >
              This month
            </Button>
          </div>
          <h3 className="text-base font-semibold text-slate-100">
            {formatMonth(currentMonth.month)}
          </h3>
          <div className="hidden items-center gap-4 text-[11px] text-slate-500 sm:flex">
            <Legend color="bg-emerald-400" label="Profit" />
            <Legend color="bg-rose-400" label="Loss" />
            <Legend color="bg-slate-600" label="No activity" />
          </div>
        </div>

        <div className="scrollbar-thin overflow-x-auto pb-2">
          <div className="min-w-[760px] rounded-2xl bg-[#151221] p-2 shadow-[0_24px_70px_rgba(0,0,0,.2)]">
            <div className="grid grid-cols-7 gap-2">
              {DAY_LABELS.map((label) => (
                <div
                  key={label}
                  className="px-3 py-2.5 text-center text-[11px] font-medium text-slate-400"
                >
                  {label}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-2">
              {buildCalendarCells(currentMonth.month).map((date, index) => {
                if (!date) {
                  return (
                    <div
                      key={`blank-${index}`}
                      aria-hidden="true"
                      className="min-h-28 rounded-xl bg-black/[0.08]"
                    />
                  );
                }
                const day =
                  currentMonth.days.find((item) => item.date === date) ??
                  emptyDay(date);
                return (
                  <CalendarCell
                    key={date}
                    day={day}
                    selected={date === selectedDate}
                    onSelect={() => setSelectedDate(date)}
                  />
                );
              })}
            </div>
          </div>
        </div>
      </section>

      <DayDetail day={selectedDay} />
    </div>
  );
}

function CalendarCell({
  day,
  selected,
  onSelect,
}: {
  day: PortfolioCalendarDay;
  selected: boolean;
  onSelect: () => void;
}) {
  const pnl = getDayPnl(day);
  const active = day.positions.length > 0;
  const intensity = Math.min(Math.abs(pnl) / 160, 1);

  return (
    <button
      type="button"
      aria-pressed={selected}
      aria-label={`${formatDay(day.date)}, ${active ? formatSignedCurrency(pnl) : "no activity"}`}
      onClick={onSelect}
      className={cn(
        "group relative min-h-28 rounded-xl border p-3 text-left outline-none transition-[filter,background-color,border-color,box-shadow] duration-200 hover:brightness-110 focus-visible:z-10 focus-visible:ring-2 focus-visible:ring-violet-300 focus-visible:ring-offset-2 focus-visible:ring-offset-[#151221]",
        !active &&
          "border-violet-300/10 bg-[#211c35] hover:border-violet-300/20 hover:bg-[#282141]",
        selected &&
          "z-10 ring-2 ring-violet-400 ring-offset-2 ring-offset-[#151221]",
      )}
      style={
        active
          ? {
              backgroundColor:
                pnl >= 0
                  ? `rgb(5 150 105 / ${0.22 + intensity * 0.32})`
                  : `rgb(225 29 72 / ${0.22 + intensity * 0.32})`,
              borderColor:
                pnl >= 0
                  ? `rgb(52 211 153 / ${0.3 + intensity * 0.3})`
                  : `rgb(251 113 133 / ${0.3 + intensity * 0.3})`,
            }
          : undefined
      }
    >
      <div className="flex items-start justify-between gap-2">
        <span
          className={cn(
            "text-xs font-semibold",
            !active
              ? selected
                ? "text-violet-200"
                : "text-slate-300"
              : pnl >= 0
                ? "text-emerald-100"
                : "text-rose-100",
          )}
        >
          {Number(day.date.slice(-2))}
        </span>
        {active && (
          <span
            className={cn(
              "text-[10px] font-medium",
              pnl >= 0 ? "text-emerald-100/75" : "text-rose-100/75",
            )}
          >
            {day.positions.length} pos.
          </span>
        )}
      </div>
      <div className="mt-8">
        <p
          className={cn(
            "text-sm font-semibold tracking-[-0.02em]",
            !active
              ? "text-slate-400"
              : pnl >= 0
                ? "text-emerald-50"
                : "text-rose-50",
          )}
        >
          {active ? formatSignedCurrency(pnl) : "—"}
        </p>
        <p
          className={cn(
            "mt-1 text-[10px]",
            !active
              ? "text-violet-200/55"
              : pnl >= 0
                ? "text-emerald-100/70"
                : "text-rose-100/70",
          )}
        >
          {active ? "Realized event" : "No realized PnL"}
        </p>
      </div>
    </button>
  );
}

function DayDetail({ day }: { day: PortfolioCalendarDay }) {
  const pnl = getDayPnl(day);
  const absoluteTotal = day.positions.reduce(
    (sum, position) => sum + Math.abs(position.pnl),
    0,
  );

  return (
    <section
      aria-labelledby="day-detail-title"
      className="mt-6 overflow-hidden rounded-2xl bg-[#1b182b] shadow-[0_22px_60px_rgba(0,0,0,.18)]"
    >
      <header className="flex flex-col gap-4 border-b border-white/[0.06] px-5 py-5 sm:flex-row sm:items-end sm:justify-between sm:px-6">
        <div>
          <p className="text-xs text-slate-500">Selected day</p>
          <h3
            id="day-detail-title"
            className="mt-1 text-lg font-semibold text-slate-100"
          >
            {formatDay(day.date)}
          </h3>
        </div>
        <div className="sm:text-right">
          <p className="text-xs text-slate-500">Combined realized PnL</p>
          <p
            className={cn(
              "mt-1 text-2xl font-semibold tracking-[-0.025em]",
              pnl >= 0 ? "text-emerald-300" : "text-rose-300",
            )}
          >
            {day.positions.length ? formatSignedCurrency(pnl) : "No activity"}
          </p>
        </div>
      </header>

      {day.positions.length ? (
        <div className="divide-y divide-white/[0.055]">
          {day.positions.map((position) => {
            const contribution =
              absoluteTotal === 0
                ? 0
                : (Math.abs(position.pnl) / absoluteTotal) * 100;
            return (
              <div
                key={position.id}
                className="grid gap-4 px-5 py-4 sm:grid-cols-[1fr_auto_auto] sm:items-center sm:px-6"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <div
                    className={cn(
                      "grid size-10 shrink-0 place-items-center rounded-xl text-xs font-bold",
                      position.pnl >= 0
                        ? "bg-emerald-400/10 text-emerald-200"
                        : "bg-rose-400/10 text-rose-200",
                    )}
                  >
                    {position.pair.slice(0, 2)}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-slate-200">
                      {position.pair}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      Uniswap {position.version}
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4 sm:min-w-[360px]">
                  <DetailValue
                    label="Deposited"
                    value={formatCurrency(position.depositedUsdg ?? 0)}
                  />
                  <DetailValue
                    label="Withdrawn"
                    value={formatCurrency(position.withdrawnUsdg ?? 0)}
                  />
                  <DetailValue
                    label="Claimed fees"
                    value={formatCurrency(position.claimedFeesUsdg ?? 0)}
                  />
                </div>
                <div className="flex items-center justify-between gap-3 sm:min-w-32 sm:block sm:text-right">
                  <p
                    className={cn(
                      "text-base font-semibold",
                      position.pnl >= 0
                        ? "text-emerald-300"
                        : "text-rose-300",
                    )}
                  >
                    {formatSignedCurrency(position.pnl)}
                  </p>
                  <p className="mt-1 text-[10px] text-slate-500">
                    {position.kind === "late_fee"
                      ? "Late fee claim"
                      : `Lifecycle ${position.lifecycle ?? 1} closure`}{" "}
                    · {formatNumber(contribution, 1)}%
                  </p>
                  {position.transactionUrl && (
                    <a
                      href={position.transactionUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-2 inline-flex items-center gap-1 text-[11px] text-violet-300 hover:text-violet-200"
                    >
                      Transaction <ExternalLink className="size-3" />
                    </a>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="px-5 py-12 text-center sm:px-6">
          <CalendarDays className="mx-auto size-6 text-slate-600" />
          <p className="mt-3 text-sm font-medium text-slate-300">
            No realized PnL for this day
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Active and partially withdrawn positions are intentionally excluded.
          </p>
        </div>
      )}
    </section>
  );
}

function DetailValue({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <p className="text-[10px] text-slate-500">{label}</p>
      <p className="mt-1 truncate text-xs font-medium text-slate-300">{value}</p>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <p className="text-[11px] text-slate-500">{label}</p>
      <p className="mt-1 truncate text-sm font-semibold text-slate-200">
        {value}
      </p>
    </div>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className={cn("size-1.5 rounded-full", color)} />
      {label}
    </span>
  );
}

function emptyDay(date: string): PortfolioCalendarDay {
  return { date, positions: [] };
}

function formatMonth(month: string) {
  return MONTH_FORMATTER.format(new Date(`${month}-01T00:00:00Z`));
}

function formatDay(date: string) {
  return DAY_FORMATTER.format(new Date(`${date}T00:00:00Z`));
}

function buildCalendarCells(month: string) {
  const [year, monthNumber] = month.split("-").map(Number);
  const first = new Date(Date.UTC(year, monthNumber - 1, 1));
  const daysInMonth = new Date(Date.UTC(year, monthNumber, 0)).getUTCDate();
  const mondayOffset = (first.getUTCDay() + 6) % 7;
  const cells: Array<string | null> = Array(mondayOffset).fill(null);

  for (let day = 1; day <= daysInMonth; day += 1) {
    cells.push(
      `${month}-${String(day).padStart(2, "0")}`,
    );
  }
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

function getBangkokMonth() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Bangkok",
    year: "numeric",
    month: "2-digit",
  }).formatToParts(new Date());
  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  return `${year}-${month}`;
}

function syncMessage(
  state: "idle" | "running" | "complete" | "partial" | "failed",
) {
  if (state === "complete") return "Checking for new withdrawals…";
  if (state === "partial" || state === "failed") {
    return "Resuming realized PnL history…";
  }
  if (state === "running") return "Synchronizing realized PnL history…";
  return "Discovering withdrawn LP positions…";
}

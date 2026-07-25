"use client";

import {
  ArrowDownRight,
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  CalendarDays,
} from "lucide-react";
import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  getDayPnl,
  getMonthAnalytics,
  type PortfolioCalendarDay,
  type PortfolioCalendarMonth,
} from "@/lib/portfolio-calendar";
import { formatNumber, formatSignedCurrency } from "@/lib/format";
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
  months,
}: {
  months: PortfolioCalendarMonth[];
}) {
  const todayMonth = "2026-07";
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
    <div className="mx-auto max-w-[1800px] px-4 py-6 sm:px-7 sm:py-8 xl:px-10">
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
              Monthly performance
            </div>
            <h2
              id="monthly-performance-title"
              className="mt-4 text-3xl font-semibold tracking-[-0.03em] text-slate-50 sm:text-4xl"
            >
              {formatSignedCurrency(analytics.totalPnl)}
            </h2>
            <p className="mt-2 text-sm text-slate-400">
              Aggregated PnL across {analytics.activeDays} active days
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
          {active ? "End-of-day snapshot" : "No activity"}
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
          <p className="text-xs text-slate-500">Combined position PnL</p>
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
                <div className="sm:min-w-28 sm:text-right">
                  <p className="text-[10px] text-slate-500">Contribution</p>
                  <p className="mt-1 text-sm text-slate-300">
                    {formatNumber(contribution, 1)}%
                  </p>
                </div>
                <p
                  className={cn(
                    "text-base font-semibold sm:min-w-28 sm:text-right",
                    position.pnl >= 0
                      ? "text-emerald-300"
                      : "text-rose-300",
                  )}
                >
                  {formatSignedCurrency(position.pnl)}
                </p>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="px-5 py-12 text-center sm:px-6">
          <CalendarDays className="mx-auto size-6 text-slate-600" />
          <p className="mt-3 text-sm font-medium text-slate-300">
            No position snapshots for this day
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Select another date to inspect its PnL contribution.
          </p>
        </div>
      )}
    </section>
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

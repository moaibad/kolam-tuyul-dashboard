export type CalendarPositionVersion = "v3" | "v4";
export type RealizedEventKind = "closure";
export type CalendarDataStatus =
  | "complete"
  | "partial"
  | "pending"
  | "unavailable";

export interface CalendarPositionPnl {
  id: string;
  pair: string;
  version: CalendarPositionVersion;
  pnl: number;
  kind?: RealizedEventKind;
  depositedUsdg?: number;
  withdrawnUsdg?: number;
  claimedFeesUsdg?: number;
}

export interface PortfolioCalendarDay {
  date: string;
  positions: CalendarPositionPnl[];
  status?: CalendarDataStatus;
}

export interface PortfolioCalendarMonth {
  month: string;
  days: PortfolioCalendarDay[];
}

export interface PortfolioCalendarResponse {
  address: string;
  timezone: "Asia/Bangkok";
  months: PortfolioCalendarMonth[];
  windowStart: string;
  updatedAtMs: number;
}

export interface PortfolioCalendarAnalytics {
  totalPnl: number;
  winRate: number;
  averageDailyPnl: number;
  bestDay: PortfolioCalendarDay | null;
  worstDay: PortfolioCalendarDay | null;
  longestWinStreak: number;
  activeDays: number;
}

export function getDayPnl(day: PortfolioCalendarDay) {
  return day.positions.reduce((sum, position) => sum + position.pnl, 0);
}

export function getMonthAnalytics(
  days: PortfolioCalendarDay[],
): PortfolioCalendarAnalytics {
  const activeDays = days.filter((day) => day.positions.length > 0);
  const sorted = [...activeDays].sort((a, b) => getDayPnl(a) - getDayPnl(b));
  const totalPnl = activeDays.reduce((sum, day) => sum + getDayPnl(day), 0);
  const wins = activeDays.filter((day) => getDayPnl(day) > 0).length;
  let longestWinStreak = 0;
  let currentWinStreak = 0;

  for (const day of [...activeDays].sort((a, b) =>
    a.date.localeCompare(b.date),
  )) {
    if (getDayPnl(day) > 0) {
      currentWinStreak += 1;
      longestWinStreak = Math.max(longestWinStreak, currentWinStreak);
    } else {
      currentWinStreak = 0;
    }
  }

  return {
    totalPnl,
    winRate: activeDays.length === 0 ? 0 : (wins / activeDays.length) * 100,
    averageDailyPnl:
      activeDays.length === 0 ? 0 : totalPnl / activeDays.length,
    bestDay: sorted.at(-1) ?? null,
    worstDay: sorted[0] ?? null,
    longestWinStreak,
    activeDays: activeDays.length,
  };
}

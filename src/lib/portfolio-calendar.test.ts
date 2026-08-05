import { describe, expect, it } from "vitest";

import {
  getDayPnl,
  getMonthAnalytics,
  type PortfolioCalendarDay,
} from "@/lib/portfolio-calendar";

const IDENTITY = {
  chainId: 1,
  chainName: "Ethereum",
  protocolKey: "uniswapv4",
  protocolName: "Uniswap",
  protocolVersion: "v4",
};

const days: PortfolioCalendarDay[] = [
  {
    date: "2026-07-01",
    positions: [
      { ...IDENTITY, id: "a", pair: "ETH / USDC", pnl: 30 },
      { ...IDENTITY, id: "b", pair: "WBTC / USDC", pnl: -10 },
    ],
  },
  {
    date: "2026-07-02",
    positions: [{ ...IDENTITY, id: "a", pair: "ETH / USDC", pnl: 40 }],
  },
  {
    date: "2026-07-03",
    positions: [{ ...IDENTITY, id: "a", pair: "ETH / USDC", pnl: -15 }],
  },
  { date: "2026-07-04", positions: [] },
];

describe("portfolio calendar calculations", () => {
  it("adds every position PnL into the daily total", () => {
    expect(getDayPnl(days[0])).toBe(20);
  });

  it("calculates monthly analytics from active calendar days", () => {
    expect(getMonthAnalytics(days)).toEqual({
      totalPnl: 45,
      winRate: (2 / 3) * 100,
      averageDailyPnl: 15,
      bestDay: days[1],
      worstDay: days[2],
      longestWinStreak: 2,
      activeDays: 3,
    });
  });

  it("returns safe values for an empty month", () => {
    expect(getMonthAnalytics([])).toEqual({
      totalPnl: 0,
      winRate: 0,
      averageDailyPnl: 0,
      bestDay: null,
      worstDay: null,
      longestWinStreak: 0,
      activeDays: 0,
    });
  });
});

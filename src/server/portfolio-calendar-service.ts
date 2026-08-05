import "server-only";

import type {
  PortfolioCalendarDay,
  PortfolioCalendarMonth,
  PortfolioCalendarResponse,
} from "@/lib/portfolio-calendar";
import {
  fetchKrystalPositions,
  krystalClosedPositionFields,
} from "@/server/krystal-api";
import { parseWalletAddress } from "@/server/portfolio-service";

const MONTH_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/;
const CALENDAR_TIMEZONE = "Asia/Bangkok";
const WINDOW_DAYS = 365;

export class InvalidCalendarMonthError extends Error {}

export function parseCalendarMonth(value: string | null) {
  const month = value?.trim() ?? "";
  if (!MONTH_PATTERN.test(month)) {
    throw new InvalidCalendarMonthError(
      "Month must use the YYYY-MM format.",
    );
  }
  return month;
}

export async function getPortfolioCalendar(
  walletAddressInput: string,
  monthInput: string,
  nowMs = Date.now(),
): Promise<PortfolioCalendarResponse> {
  const walletAddress = parseWalletAddress(walletAddressInput);
  parseCalendarMonth(monthInput);
  const result = await fetchKrystalPositions({
    walletAddress,
    status: "closed",
    refresh: false,
  });
  return buildPortfolioCalendar(walletAddress, result.positions, nowMs);
}

export function buildPortfolioCalendar(
  walletAddress: string,
  rawPositions: Record<string, unknown>[],
  nowMs: number,
): PortfolioCalendarResponse {
  const windowStartMs = nowMs - WINDOW_DAYS * 24 * 60 * 60_000;
  const windowStartMonth = formatBangkokMonth(windowStartMs);
  const currentMonth = formatBangkokMonth(nowMs);
  const months = calendarMonths(windowStartMonth, currentMonth);
  const daysByMonth = new Map<string, Map<string, PortfolioCalendarDay>>(
    months.map((month) => [month, new Map()]),
  );

  for (const raw of rawPositions) {
    let position: ReturnType<typeof krystalClosedPositionFields>;
    try {
      position = krystalClosedPositionFields(raw);
    } catch {
      continue;
    }
    if (
      position.closedAtMs < windowStartMs ||
      position.closedAtMs > nowMs
    ) {
      continue;
    }
    const date = formatBangkokDate(position.closedAtMs);
    const month = date.slice(0, 7);
    const monthDays = daysByMonth.get(month);
    if (!monthDays) continue;
    const day = monthDays.get(date) ?? {
      date,
      positions: [],
      status: "complete" as const,
    };
    day.positions.push({
      id: position.id,
      pair: position.pair,
      chainId: position.chainId,
      chainName: position.chainName,
      protocolKey: position.protocolKey,
      protocolName: position.protocolName,
      protocolVersion: position.protocolVersion,
      pnl: position.pnl,
      kind: "closure",
      depositedUsdg: position.depositedUsdg,
      withdrawnUsdg: position.withdrawnUsdg,
      claimedFeesUsdg: position.claimedFeesUsdg,
    });
    monthDays.set(date, day);
  }

  return {
    address: walletAddress,
    timezone: CALENDAR_TIMEZONE,
    months: months.map<PortfolioCalendarMonth>((month) => ({
      month,
      days: [...(daysByMonth.get(month)?.values() ?? [])].sort((a, b) =>
        a.date.localeCompare(b.date),
      ),
    })),
    windowStart: formatBangkokDate(windowStartMs),
    updatedAtMs: nowMs,
  };
}

function calendarMonths(startMonth: string, endMonth: string) {
  const [startYear, startMonthNumber] = startMonth.split("-").map(Number);
  const [endYear, endMonthNumber] = endMonth.split("-").map(Number);
  const endIndex = endYear * 12 + endMonthNumber - 1;
  const result: string[] = [];
  for (
    let index = startYear * 12 + startMonthNumber - 1;
    index <= endIndex;
    index += 1
  ) {
    const date = new Date(Date.UTC(Math.floor(index / 12), index % 12, 1));
    result.push(
      `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`,
    );
  }
  return result;
}

function formatBangkokMonth(timestampMs: number) {
  return formatParts(timestampMs, false).slice(0, 7);
}

function formatBangkokDate(timestampMs: number) {
  return formatParts(timestampMs, true);
}

function formatParts(timestampMs: number, includeDay: boolean) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: CALENDAR_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    ...(includeDay ? { day: "2-digit" } : {}),
  }).formatToParts(new Date(timestampMs));
  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  const day = parts.find((part) => part.type === "day")?.value;
  return includeDay ? `${year}-${month}-${day}` : `${year}-${month}`;
}

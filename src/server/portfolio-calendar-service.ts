import "server-only";

import { randomUUID } from "node:crypto";

import type {
  PortfolioCalendarDay,
  PortfolioCalendarResponse,
} from "@/lib/portfolio-calendar";
import { parseWalletAddress, getLivePortfolio, getStateDatabase } from "@/server/portfolio-service";

const MONTH_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/;
const EXPLORER_URL = "https://robinhoodchain.blockscout.com";

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
): Promise<PortfolioCalendarResponse> {
  const walletAddress = parseWalletAddress(walletAddressInput);
  const month = parseCalendarMonth(monthInput);
  const database = await getStateDatabase();
  const [events, backfill] = await Promise.all([
    database.listRealizedEvents(walletAddress, month),
    database.getCalendarBackfill(walletAddress),
  ]);
  const days = new Map<string, PortfolioCalendarDay>();

  for (const event of events) {
    const day = days.get(event.dateKey) ?? {
      date: event.dateKey,
      positions: [],
      status: "complete" as const,
    };
    day.positions.push({
      id: event.eventKey,
      pair: event.pair,
      version: event.version,
      pnl: event.pnlUsdg,
      kind: event.kind,
      lifecycle: event.lifecycle,
      depositedUsdg: event.depositedUsdg,
      withdrawnUsdg: event.withdrawnUsdg,
      claimedFeesUsdg: event.claimedFeesUsdg,
      transactionUrl: `${EXPLORER_URL}/tx/${event.txHash}`,
    });
    if (event.status === "unavailable") day.status = "unavailable";
    days.set(event.dateKey, day);
  }

  return {
    address: walletAddress,
    timezone: "Asia/Bangkok",
    month: {
      month,
      days: [...days.values()].sort((a, b) => a.date.localeCompare(b.date)),
    },
    backfill: {
      state: backfill.state,
      completed: backfill.completed,
      total: backfill.total,
      retryable: backfill.retryable,
      error: backfill.error,
    },
  };
}

export async function backfillPortfolioCalendar(walletAddressInput: string) {
  const walletAddress = parseWalletAddress(walletAddressInput);
  const database = await getStateDatabase();
  const current = await database.getCalendarBackfill(walletAddress);
  const nowMs = Date.now();

  if (
    current.state === "running" &&
    current.leaseExpiresAtMs != null &&
    current.leaseExpiresAtMs > nowMs
  ) {
    return current;
  }

  const leaseOwnerId = randomUUID();
  const knownPositions = await database.listPositionsForWallet(walletAddress);
  const total = Math.max(knownPositions.length, 1);
  await database.setCalendarBackfill({
    walletAddress,
    state: "running",
    completed: 0,
    total,
    retryable: true,
    leaseOwnerId,
    leaseExpiresAtMs: nowMs + 5 * 60_000,
  });

  try {
    const portfolio = await getLivePortfolio(walletAddress);
    const refreshedPositions = await database.listPositionsForWallet(walletAddress);
    const completed = Math.max(refreshedPositions.length, portfolio.positions.length);
    const state = portfolio.warnings.length > 0 ? "partial" : "complete";
    await database.setCalendarBackfill({
      walletAddress,
      state,
      completed,
      total: Math.max(total, completed),
      retryable: state !== "complete",
      error:
        portfolio.warnings.length > 0
          ? portfolio.warnings.join(" ")
          : undefined,
    });
  } catch (error) {
    await database.setCalendarBackfill({
      walletAddress,
      state: "failed",
      completed: current.completed,
      total,
      retryable: true,
      error: error instanceof Error ? error.message : String(error),
    });
  }

  return database.getCalendarBackfill(walletAddress);
}


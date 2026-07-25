import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const dataSource = vi.hoisted(() => ({
  get: vi.fn(),
  backfill: vi.fn(),
}));

vi.mock("@/lib/http-portfolio-calendar-data-source", () => ({
  httpPortfolioCalendarDataSource: dataSource,
}));

import { PortfolioPnlCalendar } from "@/components/portfolio-pnl-calendar";

const ADDRESS = "0x0000000000000000000000000000000000000001";

function calendar(
  pair: string,
  backfillState: "idle" | "running" | "complete" | "partial" | "failed",
) {
  return {
    address: ADDRESS,
    timezone: "Asia/Bangkok" as const,
    month: {
      month: "2026-07",
      days: [
        {
          date: "2026-07-20",
          positions: [
            {
              id: pair,
              pair,
              version: "v4" as const,
              pnl: 25,
              kind: "closure" as const,
              lifecycle: 1,
              depositedUsdg: 100,
              withdrawnUsdg: 120,
              claimedFeesUsdg: 5,
            },
          ],
        },
      ],
    },
    backfill: {
      state: backfillState,
      completed: backfillState === "complete" ? 1 : 0,
      total: 1,
      retryable: backfillState !== "complete",
    },
  };
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}

async function submitWallet(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText("Wallet address"), ADDRESS);
  await user.click(screen.getByRole("button", { name: "Track positions" }));
}

describe("PortfolioPnlCalendar cache-first synchronization", () => {
  beforeEach(() => {
    dataSource.get.mockReset();
    dataSource.backfill.mockReset();
  });

  it("renders cached events while synchronization is still running", async () => {
    const sync = deferred<{
      state: "complete";
      completed: number;
      total: number;
      retryable: boolean;
    }>();
    dataSource.get
      .mockResolvedValueOnce(calendar("CACHED / USDC", "complete"))
      .mockResolvedValueOnce(calendar("UPDATED / USDC", "complete"));
    dataSource.backfill.mockReturnValue(sync.promise);
    const user = userEvent.setup();
    render(<PortfolioPnlCalendar />);

    await submitWallet(user);

    expect(await screen.findByText("CACHED / USDC")).toBeInTheDocument();
    expect(
      screen.getByText("Checking for new withdrawals…"),
    ).toBeInTheDocument();

    await act(async () => {
      sync.resolve({
        state: "complete",
        completed: 1,
        total: 1,
        retryable: false,
      });
      await sync.promise;
    });

    expect(await screen.findByText("UPDATED / USDC")).toBeInTheDocument();
    expect(screen.getByText("Realized history is up to date")).toBeInTheDocument();
  });

  it("keeps cached events visible when synchronization fails", async () => {
    dataSource.get.mockResolvedValueOnce(calendar("CACHED / USDC", "partial"));
    dataSource.backfill.mockRejectedValueOnce(new Error("RPC unavailable"));
    const user = userEvent.setup();
    render(<PortfolioPnlCalendar />);

    await submitWallet(user);

    expect(await screen.findByText("CACHED / USDC")).toBeInTheDocument();
    expect(await screen.findByText("RPC unavailable")).toBeInTheDocument();
    expect(screen.getByText("CACHED / USDC")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Retry sync" })).toBeEnabled();
  });

  it("does not start a duplicate request for repeated submission", async () => {
    const sync = deferred<{
      state: "complete";
      completed: number;
      total: number;
      retryable: boolean;
    }>();
    dataSource.get.mockResolvedValue(calendar("CACHED / USDC", "complete"));
    dataSource.backfill.mockReturnValue(sync.promise);
    const user = userEvent.setup();
    render(<PortfolioPnlCalendar />);

    await submitWallet(user);
    expect(await screen.findByText("CACHED / USDC")).toBeInTheDocument();
    expect(dataSource.backfill).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("button", { name: "Loading positions…" })).toBeDisabled();

    await act(async () => {
      sync.resolve({
        state: "complete",
        completed: 1,
        total: 1,
        retryable: false,
      });
      await sync.promise;
    });
  });
});

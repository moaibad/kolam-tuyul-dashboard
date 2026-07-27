import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const dataSource = vi.hoisted(() => ({
  get: vi.fn(),
}));
const navigation = vi.hoisted(() => ({
  replace: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => navigation,
}));

vi.mock("@/lib/http-portfolio-calendar-data-source", () => ({
  httpPortfolioCalendarDataSource: dataSource,
}));

import { PortfolioPnlCalendar } from "@/components/portfolio-pnl-calendar";

const ADDRESS = "0x0000000000000000000000000000000000000001";

function calendar(pair = "WETH / USDC") {
  return {
    address: ADDRESS,
    timezone: "Asia/Bangkok" as const,
    months: [
      {
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
                depositedUsdg: 100,
                withdrawnUsdg: 120,
                claimedFeesUsdg: 5,
              },
            ],
          },
        ],
      },
    ],
    windowStart: "2025-07-28",
    updatedAtMs: Date.now(),
  };
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((resolvePromise) => {
    resolve = resolvePromise;
  });
  return { promise, resolve };
}

async function submitWallet(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText("Wallet address"), ADDRESS);
  await user.click(screen.getByRole("button", { name: "Track positions" }));
}

describe("PortfolioPnlCalendar Krystal loading", () => {
  beforeEach(() => {
    dataSource.get.mockReset();
    navigation.replace.mockReset();
  });

  it("renders closed positions from the rolling Krystal window", async () => {
    dataSource.get.mockResolvedValue(calendar());
    const user = userEvent.setup();
    render(<PortfolioPnlCalendar />);

    await submitWallet(user);

    expect(await screen.findByText("WETH / USDC")).toBeInTheDocument();
    expect(
      screen.getByText(
        "Showing closed positions since 2025-07-28 · Data by Krystal",
      ),
    ).toBeInTheDocument();
    expect(screen.getByText(/Position closure/)).toBeInTheDocument();
    expect(dataSource.get).toHaveBeenCalledOnce();
    expect(navigation.replace).toHaveBeenCalledWith(
      "/portfolio-calendar?address=0x0000000000000000000000000000000000000001",
      { scroll: false },
    );
  });

  it("prefills and automatically loads a valid initial address", async () => {
    dataSource.get.mockResolvedValue(calendar());

    render(<PortfolioPnlCalendar initialAddress={ADDRESS} />);

    expect(screen.getByLabelText("Wallet address")).toHaveValue(ADDRESS);
    expect(await screen.findByText("WETH / USDC")).toBeInTheDocument();
    expect(dataSource.get).toHaveBeenCalledOnce();
    expect(dataSource.get).toHaveBeenCalledWith(ADDRESS, expect.any(String));
    expect(navigation.replace).not.toHaveBeenCalled();
  });

  it("shows an upstream error and allows retry", async () => {
    dataSource.get.mockRejectedValue(new Error("Krystal unavailable"));
    const user = userEvent.setup();
    render(<PortfolioPnlCalendar />);

    await submitWallet(user);

    expect(await screen.findByText("Krystal unavailable")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Retry" })).toBeEnabled();
    expect(
      screen.getByText("Realized PnL history is unavailable"),
    ).toBeInTheDocument();
  });

  it("keeps one request in flight for a wallet", async () => {
    const request = deferred<ReturnType<typeof calendar>>();
    dataSource.get.mockReturnValue(request.promise);
    const user = userEvent.setup();
    render(<PortfolioPnlCalendar />);

    await submitWallet(user);
    expect(
      screen.getByRole("button", { name: "Loading positions…" }),
    ).toBeDisabled();
    expect(dataSource.get).toHaveBeenCalledOnce();

    await act(async () => {
      request.resolve(calendar());
      await request.promise;
    });

    expect(await screen.findByText("WETH / USDC")).toBeInTheDocument();
  });
});

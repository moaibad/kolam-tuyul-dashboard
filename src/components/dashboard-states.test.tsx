import { act, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { EmptyState } from "@/components/empty-state";
import { PositionTrackerDashboard } from "@/components/position-tracker-dashboard";
import { TooltipProvider } from "@/components/ui/tooltip";
import { httpPositionDataSource } from "@/lib/http-position-data-source";

vi.mock("@/lib/http-position-data-source", async () => {
  const { fixturePositionDataSource } = await import(
    "@/test/portfolio-fixture"
  );
  return { httpPositionDataSource: fixturePositionDataSource };
});

describe("dashboard states", () => {
  it("renders the initial empty state", () => {
    render(<EmptyState />);
    expect(
      screen.getByRole("heading", { name: "Find your liquidity positions" }),
    ).toBeInTheDocument();
  });

  it("renders v3 and v4 live positions for a tracked address", async () => {
    const user = userEvent.setup();
    render(
      <TooltipProvider>
        <PositionTrackerDashboard />
      </TooltipProvider>,
    );

    await user.type(
      screen.getByLabelText("Wallet address"),
      "0x0000000000000000000000000000000000000001",
    );
    await user.click(screen.getByRole("button", { name: "Track positions" }));

    expect(await screen.findByText("Uniswap v4", {}, { timeout: 2_000 })).toBeInTheDocument();
    expect(screen.getByText("Uniswap v3")).toBeInTheDocument();
    expect(screen.getByText("IN RANGE")).toBeInTheDocument();
    expect(screen.getByText("OUT OF RANGE")).toBeInTheDocument();
    expect(screen.getByText("Live data")).toBeInTheDocument();
    expect(screen.getByText(/Last synced \d+s ago/)).toBeInTheDocument();
  });

  it("keeps positions visible and shows a global status while refreshing", async () => {
    const user = userEvent.setup();
    render(
      <TooltipProvider>
        <PositionTrackerDashboard />
      </TooltipProvider>,
    );

    await user.type(
      screen.getByLabelText("Wallet address"),
      "0x0000000000000000000000000000000000000001",
    );
    await user.click(screen.getByRole("button", { name: "Track positions" }));
    await screen.findByText("Uniswap v4", {}, { timeout: 2_000 });
    await user.click(screen.getByRole("button", { name: "Track positions" }));

    expect(screen.getByText("Syncing all positions...")).toBeInTheDocument();
    expect(screen.getByText("Uniswap v4")).toBeInTheDocument();
    expect(
      await screen.findByText(/Last synced \d+s ago/, {}, { timeout: 2_000 }),
    ).toBeInTheDocument();
  });

  it("polls every 60 seconds while the tab is hidden", async () => {
    vi.useFakeTimers();
    const getPortfolio = vi.spyOn(httpPositionDataSource, "getPortfolio");
    const visibilityDescriptor = Object.getOwnPropertyDescriptor(
      document,
      "visibilityState",
    );

    try {
      render(
        <TooltipProvider>
          <PositionTrackerDashboard />
        </TooltipProvider>,
      );

      fireEvent.change(screen.getByLabelText("Wallet address"), {
        target: {
          value: "0x0000000000000000000000000000000000000001",
        },
      });
      fireEvent.click(
        screen.getByRole("button", { name: "Track positions" }),
      );
      await act(() => vi.advanceTimersByTimeAsync(450));
      expect(getPortfolio).toHaveBeenCalledTimes(1);

      Object.defineProperty(document, "visibilityState", {
        configurable: true,
        value: "hidden",
      });
      await act(() => vi.advanceTimersByTimeAsync(59_550));

      expect(getPortfolio).toHaveBeenCalledTimes(2);
      expect(screen.getByText("Syncing all positions...")).toBeInTheDocument();
      expect(screen.getByText("Uniswap v4")).toBeInTheDocument();

      document.dispatchEvent(new Event("visibilitychange"));
      expect(getPortfolio).toHaveBeenCalledTimes(2);

      await act(() => vi.advanceTimersByTimeAsync(450));
      expect(screen.getByText(/Last synced \d+s ago/)).toBeInTheDocument();
    } finally {
      getPortfolio.mockRestore();
      if (visibilityDescriptor) {
        Object.defineProperty(
          document,
          "visibilityState",
          visibilityDescriptor,
        );
      }
      vi.useRealTimers();
    }
  });
});

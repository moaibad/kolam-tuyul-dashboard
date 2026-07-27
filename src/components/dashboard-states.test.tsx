import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { EmptyState } from "@/components/empty-state";
import { PositionTrackerDashboard } from "@/components/position-tracker-dashboard";
import { TooltipProvider } from "@/components/ui/tooltip";
import { httpPositionDataSource } from "@/lib/http-position-data-source";

const navigation = vi.hoisted(() => ({
  replace: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  usePathname: () => "/",
  useRouter: () => navigation,
}));

vi.mock("@/lib/http-position-data-source", async () => {
  const { fixturePositionDataSource } = await import(
    "@/test/portfolio-fixture"
  );
  return { httpPositionDataSource: fixturePositionDataSource };
});

describe("dashboard states", () => {
  beforeEach(() => {
    navigation.replace.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders the initial empty state", () => {
    render(<EmptyState />);
    expect(
      screen.getByRole("heading", { name: "Find your liquidity positions" }),
    ).toBeInTheDocument();
  });

  it("renders v3 and v4 live positions for a tracked address", async () => {
    const user = userEvent.setup();
    const getPortfolio = vi.spyOn(httpPositionDataSource, "getPortfolio");
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
    expect(
      await screen.findByText(/Live · Updated \d+s ago/, {}, { timeout: 2_000 }),
    ).toBeInTheDocument();
    expect(getPortfolio).toHaveBeenNthCalledWith(
      1,
      "0x0000000000000000000000000000000000000001",
      expect.objectContaining({ refresh: false }),
    );
    expect(getPortfolio).toHaveBeenNthCalledWith(
      2,
      "0x0000000000000000000000000000000000000001",
      expect.objectContaining({ refresh: true }),
    );
    expect(navigation.replace).toHaveBeenCalledWith(
      "/?address=0x0000000000000000000000000000000000000001",
      { scroll: false },
    );
  });

  it("prefills and automatically loads a valid initial address", async () => {
    const getPortfolio = vi.spyOn(httpPositionDataSource, "getPortfolio");

    render(
      <TooltipProvider>
        <PositionTrackerDashboard initialAddress="0x0000000000000000000000000000000000000001" />
      </TooltipProvider>,
    );

    expect(screen.getByLabelText("Wallet address")).toHaveValue(
      "0x0000000000000000000000000000000000000001",
    );
    expect(
      await screen.findByText(/Live · Updated \d+s ago/, {}, { timeout: 2_000 }),
    ).toBeInTheDocument();
    expect(getPortfolio).toHaveBeenCalledTimes(2);
    expect(getPortfolio).toHaveBeenNthCalledWith(
      1,
      "0x0000000000000000000000000000000000000001",
      expect.objectContaining({ refresh: false }),
    );
    expect(getPortfolio).toHaveBeenNthCalledWith(
      2,
      "0x0000000000000000000000000000000000000001",
      expect.objectContaining({ refresh: true }),
    );
    expect(navigation.replace).not.toHaveBeenCalled();
  });

  it("clears only the input while keeping the active snapshot", async () => {
    vi.useFakeTimers();
    const getPortfolio = vi.spyOn(httpPositionDataSource, "getPortfolio");

    try {
      render(
        <TooltipProvider>
          <PositionTrackerDashboard initialAddress="0x0000000000000000000000000000000000000001" />
        </TooltipProvider>,
      );
      await act(() => vi.advanceTimersByTimeAsync(900));

      const input = screen.getByLabelText("Wallet address");
      fireEvent.click(
        screen.getByRole("button", { name: "Clear wallet address" }),
      );

      expect(input).toHaveValue("");
      expect(input).toHaveFocus();
      expect(screen.getByText("Uniswap v4")).toBeInTheDocument();
      expect(navigation.replace).not.toHaveBeenCalled();

      await act(() => vi.advanceTimersByTimeAsync(30_000));
      expect(getPortfolio).toHaveBeenCalledTimes(3);
      expect(getPortfolio).toHaveBeenLastCalledWith(
        "0x0000000000000000000000000000000000000001",
        expect.objectContaining({ refresh: true }),
      );
    } finally {
      getPortfolio.mockRestore();
      vi.useRealTimers();
    }
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
    await screen.findByText(/Live · Updated/, {}, { timeout: 2_000 });
    await user.click(screen.getByRole("button", { name: "Refresh portfolio" }));

    expect(screen.getByText("Refreshing from Krystal...")).toBeInTheDocument();
    expect(screen.getByText("Uniswap v4")).toBeInTheDocument();
    expect(
      await screen.findByText(/Live · Updated \d+s ago/, {}, { timeout: 2_000 }),
    ).toBeInTheDocument();
  });

  it("pauses polling while the tab is hidden", async () => {
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
      expect(getPortfolio).toHaveBeenCalledTimes(2);
      await act(() => vi.advanceTimersByTimeAsync(450));
      expect(getPortfolio).toHaveBeenCalledTimes(2);
      expect(getPortfolio).toHaveBeenNthCalledWith(
        1,
        "0x0000000000000000000000000000000000000001",
        expect.objectContaining({ refresh: false }),
      );
      expect(getPortfolio).toHaveBeenNthCalledWith(
        2,
        "0x0000000000000000000000000000000000000001",
        expect.objectContaining({ refresh: true }),
      );

      Object.defineProperty(document, "visibilityState", {
        configurable: true,
        value: "hidden",
      });
      fireEvent(document, new Event("visibilitychange"));
      await act(() => vi.advanceTimersByTimeAsync(30_000));

      expect(getPortfolio).toHaveBeenCalledTimes(2);
      expect(screen.getByText("Uniswap v4")).toBeInTheDocument();

      Object.defineProperty(document, "visibilityState", {
        configurable: true,
        value: "visible",
      });
      fireEvent(document, new Event("visibilitychange"));
      expect(getPortfolio).toHaveBeenCalledTimes(3);

      await act(() => vi.advanceTimersByTimeAsync(450));
      expect(screen.getByText(/Live · Updated/)).toBeInTheDocument();
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

  it("polls fresh data every 30 seconds without overlapping requests", async () => {
    vi.useFakeTimers();
    const getPortfolio = vi.spyOn(httpPositionDataSource, "getPortfolio");

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

      await act(() => vi.advanceTimersByTimeAsync(900));
      expect(getPortfolio).toHaveBeenCalledTimes(2);

      await act(() => vi.advanceTimersByTimeAsync(29_999));
      expect(getPortfolio).toHaveBeenCalledTimes(2);
      await act(() => vi.advanceTimersByTimeAsync(1));
      expect(getPortfolio).toHaveBeenCalledTimes(3);
      expect(getPortfolio).toHaveBeenLastCalledWith(
        "0x0000000000000000000000000000000000000001",
        expect.objectContaining({ refresh: true }),
      );

      await act(() => vi.advanceTimersByTimeAsync(30_000));
      expect(getPortfolio).toHaveBeenCalledTimes(3);
      await act(() => vi.advanceTimersByTimeAsync(450));
      expect(getPortfolio).toHaveBeenCalledTimes(4);
    } finally {
      getPortfolio.mockRestore();
      vi.useRealTimers();
    }
  });

  it("pauses while offline and refreshes immediately when connectivity returns", async () => {
    vi.useFakeTimers();
    const getPortfolio = vi.spyOn(httpPositionDataSource, "getPortfolio");
    const onlineDescriptor = Object.getOwnPropertyDescriptor(
      navigator,
      "onLine",
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
      await act(() => vi.advanceTimersByTimeAsync(900));
      expect(getPortfolio).toHaveBeenCalledTimes(2);

      Object.defineProperty(navigator, "onLine", {
        configurable: true,
        value: false,
      });
      fireEvent(window, new Event("offline"));
      await act(() => vi.advanceTimersByTimeAsync(30_000));
      expect(getPortfolio).toHaveBeenCalledTimes(2);
      expect(screen.getByText(/You’re offline/)).toBeInTheDocument();

      Object.defineProperty(navigator, "onLine", {
        configurable: true,
        value: true,
      });
      fireEvent(window, new Event("online"));
      expect(getPortfolio).toHaveBeenCalledTimes(3);
    } finally {
      getPortfolio.mockRestore();
      if (onlineDescriptor) {
        Object.defineProperty(navigator, "onLine", onlineDescriptor);
      } else {
        Reflect.deleteProperty(navigator, "onLine");
      }
      vi.useRealTimers();
    }
  });

  it("keeps the snapshot visible and shows a delayed status after background failure", async () => {
    const { FixturePositionDataSource } = await import(
      "@/test/portfolio-fixture"
    );
    const portfolio = await new FixturePositionDataSource(0).getPortfolio(
      "0x0000000000000000000000000000000000000001",
    );
    const getPortfolio = vi
      .spyOn(httpPositionDataSource, "getPortfolio")
      .mockResolvedValueOnce(portfolio)
      .mockRejectedValueOnce(new Error("Krystal unavailable"));

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
    fireEvent.click(screen.getByRole("button", { name: "Track positions" }));

    expect(await screen.findByText("Uniswap v4")).toBeInTheDocument();
    expect(
      await screen.findByText("Live update delayed · Retrying…"),
    ).toBeInTheDocument();
    expect(screen.getByText("Uniswap v3")).toBeInTheDocument();
    expect(
      screen.queryByText("Portfolio couldn’t be loaded"),
    ).not.toBeInTheDocument();

    await waitFor(() => expect(getPortfolio).toHaveBeenCalledTimes(2));
    getPortfolio.mockRestore();
  });
});

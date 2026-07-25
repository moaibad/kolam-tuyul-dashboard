import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { EmptyState } from "@/components/empty-state";
import { PositionTrackerDashboard } from "@/components/position-tracker-dashboard";
import { TooltipProvider } from "@/components/ui/tooltip";

const navigation = vi.hoisted(() => ({
  address: "",
  push: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: navigation.push }),
  usePathname: () => "/",
  useSearchParams: () => new URLSearchParams(navigation.address),
}));

vi.mock("@/lib/http-position-data-source", async () => {
  const { fixturePositionDataSource } = await import(
    "@/test/portfolio-fixture"
  );
  return { httpPositionDataSource: fixturePositionDataSource };
});

describe("dashboard states", () => {
  beforeEach(() => {
    navigation.address = "";
    navigation.push.mockReset();
  });

  it("renders the initial empty state", () => {
    render(<EmptyState />);
    expect(
      screen.getByRole("heading", { name: "Find your liquidity positions" }),
    ).toBeInTheDocument();
  });

  it("renders v3 and v4 live positions for a query address", async () => {
    navigation.address =
      "address=0x0000000000000000000000000000000000000001";
    render(
      <TooltipProvider>
        <PositionTrackerDashboard />
      </TooltipProvider>,
    );

    expect(await screen.findByText("Uniswap v4", {}, { timeout: 2_000 })).toBeInTheDocument();
    expect(screen.getByText("Uniswap v3")).toBeInTheDocument();
    expect(screen.getByText("IN RANGE")).toBeInTheDocument();
    expect(screen.getByText("OUT OF RANGE")).toBeInTheDocument();
    expect(screen.getByText("Live data")).toBeInTheDocument();
    expect(screen.getByText(/Last synced \d+s ago/)).toBeInTheDocument();
  });

  it("keeps positions visible and shows a global status while refreshing", async () => {
    navigation.address =
      "address=0x0000000000000000000000000000000000000001";
    const user = userEvent.setup();
    render(
      <TooltipProvider>
        <PositionTrackerDashboard />
      </TooltipProvider>,
    );

    await screen.findByText("Uniswap v4", {}, { timeout: 2_000 });
    await user.click(screen.getByRole("button", { name: "Refresh portfolio" }));

    expect(screen.getByText("Syncing all positions...")).toBeInTheDocument();
    expect(screen.getByText("Uniswap v4")).toBeInTheDocument();
    expect(
      await screen.findByText(/Last synced \d+s ago/, {}, { timeout: 2_000 }),
    ).toBeInTheDocument();
  });
});

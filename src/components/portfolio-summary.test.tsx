import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { PortfolioSummary } from "@/components/portfolio-summary";
import type { PortfolioSnapshot } from "@/lib/types";

function portfolio(
  totals: Partial<PortfolioSnapshot["totals"]> = {},
): PortfolioSnapshot {
  return {
    address: "0x0000000000000000000000000000000000000001",
    chainName: "All Krystal chains",
    updatedAtMs: Date.now(),
    positions: [
      { status: "in_range" },
      { status: "out_of_range" },
    ] as PortfolioSnapshot["positions"],
    totals: {
      depositedUsdg: 84.98,
      currentLpValueUsdg: 85.69,
      currentLiquidityUsdg: 82.81,
      claimedFeesUsdg: 1.08,
      unclaimedFeesUsdg: 1.8,
      totalResultUsdg: 85.69,
      profitLossUsdg: 0.71,
      profitLossPercent: 0.84,
      partial: false,
      ...totals,
    },
    warnings: [],
  };
}

describe("PortfolioSummary", () => {
  it("shows portfolio, fee, P&L, and range information in the main summary", () => {
    render(<PortfolioSummary portfolio={portfolio()} />);

    expect(screen.getByText("$85.69")).toBeInTheDocument();
    expect(screen.getByText("Across 2 open positions")).toBeInTheDocument();

    const valueDetails = screen.getByLabelText("Portfolio value details");
    expect(within(valueDetails).getByText("Deposited")).toBeInTheDocument();
    expect(within(valueDetails).getByText("$84.98")).toBeInTheDocument();
    expect(
      within(valueDetails).getByText("Current liquidity"),
    ).toBeInTheDocument();
    expect(within(valueDetails).getByText("$82.81")).toBeInTheDocument();

    const feeDetails = screen.getByLabelText("Fee details");
    expect(screen.getByText("Fees")).toBeInTheDocument();
    expect(screen.getByText("$2.88")).toBeInTheDocument();
    expect(within(feeDetails).getByText("Claimed")).toBeInTheDocument();
    expect(within(feeDetails).getByText("$1.08")).toBeInTheDocument();
    expect(within(feeDetails).getByText("Unclaimed")).toBeInTheDocument();
    expect(within(feeDetails).getByText("$1.80")).toBeInTheDocument();

    expect(screen.getByText("Profit / loss")).toBeInTheDocument();
    expect(screen.getByText("Range health")).toBeInTheDocument();
    expect(screen.queryByText("Accounting details")).not.toBeInTheDocument();
    expect(screen.queryByText("Position value")).not.toBeInTheDocument();
  });

  it("falls back to portfolio value when current liquidity is unavailable", () => {
    render(
      <PortfolioSummary
        portfolio={portfolio({ currentLiquidityUsdg: null })}
      />,
    );

    const valueDetails = screen.getByLabelText("Portfolio value details");
    expect(within(valueDetails).getByText("$85.69")).toBeInTheDocument();
  });

  it("shows unavailable values when accounting data is incomplete", () => {
    render(
      <PortfolioSummary
        portfolio={portfolio({
          depositedUsdg: null,
          claimedFeesUsdg: null,
          unclaimedFeesUsdg: null,
        })}
      />,
    );

    expect(
      within(screen.getByLabelText("Portfolio value details")).getByText(
        "Unavailable",
      ),
    ).toBeInTheDocument();
    expect(
      within(screen.getByLabelText("Fee details")).getAllByText("Unavailable"),
    ).toHaveLength(2);
  });
});

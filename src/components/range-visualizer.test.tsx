import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { RangeVisualizer } from "@/components/range-visualizer";
import { FixturePositionDataSource } from "@/test/portfolio-fixture";

const ADDRESS = "0x0000000000000000000000000000000000000001";

describe("RangeVisualizer", () => {
  it("renders and copies the pair-oriented ETH/USDG prices", async () => {
    const portfolio = await new FixturePositionDataSource(0).getPortfolio(
      ADDRESS,
    );
    const position = portfolio.positions.find(
      (candidate) => candidate.token0.symbol === "WETH",
    )!;
    const user = userEvent.setup();
    const writeText = vi
      .spyOn(navigator.clipboard, "writeText")
      .mockResolvedValue(undefined);

    render(<RangeVisualizer position={position} />);

    expect(screen.getByText("ETH/USDG")).toBeInTheDocument();
    expect(screen.getByText("Below liquidity range")).toBeInTheDocument();
    expect(
      screen.getByLabelText("Current price is below the range"),
    ).toBeInTheDocument();

    const lowerButton = screen.getByRole("button", {
      name: /^Copy lower price/,
    });
    const upperButton = screen.getByRole("button", {
      name: /^Copy upper price/,
    });
    expect(lowerButton).toHaveTextContent("0.000502 ETH/USDG");
    expect(upperButton).toHaveTextContent("0.000542 ETH/USDG");

    await user.click(lowerButton);
    expect(writeText).toHaveBeenCalledWith(String(1 / position.upperPrice));
  });
});

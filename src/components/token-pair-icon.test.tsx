import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { TokenPairIcon } from "@/components/token-pair-icon";
import type { TokenInfo } from "@/lib/types";

const WETH: TokenInfo = {
  address: "0x0000000000000000000000000000000000000001",
  symbol: "WETH",
  decimals: 18,
  logoUrl: "https://cdn.example/weth.png",
};

const USDG: TokenInfo = {
  address: "0x0000000000000000000000000000000000000002",
  symbol: "USDG",
  decimals: 18,
  logoUrl: "https://cdn.example/usdg.png",
};

describe("TokenPairIcon", () => {
  it("renders both token logos from Krystal", () => {
    render(<TokenPairIcon token0={WETH} token1={USDG} />);

    expect(screen.getByRole("img", { name: "WETH token logo" })).toHaveAttribute(
      "src",
      WETH.logoUrl,
    );
    expect(screen.getByRole("img", { name: "USDG token logo" })).toHaveAttribute(
      "src",
      USDG.logoUrl,
    );
  });

  it("uses initials when a logo is unavailable or fails to load", () => {
    render(
      <TokenPairIcon
        token0={WETH}
        token1={{ ...USDG, logoUrl: undefined }}
      />,
    );

    fireEvent.error(screen.getByRole("img", { name: "WETH token logo" }));

    expect(
      screen.queryByRole("img", { name: "WETH token logo" }),
    ).not.toBeInTheDocument();
    expect(screen.getByText("WE")).toBeInTheDocument();
    expect(screen.getByText("US")).toBeInTheDocument();
  });
});

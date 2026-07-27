import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  usePathname: () => "/",
}));

import { AppShell } from "@/components/app-shell";

describe("AppShell wallet navigation", () => {
  it("preserves the active wallet across primary navigation", () => {
    const address = "0x0000000000000000000000000000000000000001";
    render(<AppShell walletAddress={address}>Content</AppShell>);

    expect(screen.getByRole("link", { name: "KolamTuyul home" })).toHaveAttribute(
      "href",
      `/?address=${address}`,
    );
    expect(
      screen.getByRole("link", { name: "Position Tracker" }),
    ).toHaveAttribute("href", `/?address=${address}`);
    expect(
      screen.getByRole("link", { name: "Portfolio Calendar" }),
    ).toHaveAttribute("href", `/portfolio-calendar?address=${address}`);
  });
});

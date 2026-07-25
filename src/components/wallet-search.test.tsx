import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { WalletSearch } from "@/components/wallet-search";

describe("WalletSearch", () => {
  it("rejects an invalid address without searching", async () => {
    const search = vi.fn();
    const user = userEvent.setup();
    render(<WalletSearch initialValue="" onSearch={search} />);

    await user.type(screen.getByLabelText("Wallet address"), "0x1234");
    await user.click(screen.getByRole("button", { name: "Track positions" }));

    expect(screen.getByRole("alert")).toHaveTextContent(
      "Enter a valid 42-character EVM wallet address.",
    );
    expect(search).not.toHaveBeenCalled();
  });

  it("submits a valid trimmed address", async () => {
    const search = vi.fn();
    const user = userEvent.setup();
    const address = "0x0000000000000000000000000000000000000001";
    render(<WalletSearch initialValue="" onSearch={search} />);

    await user.type(screen.getByLabelText("Wallet address"), ` ${address} `);
    await user.click(screen.getByRole("button", { name: "Track positions" }));

    expect(search).toHaveBeenCalledWith(address);
  });
});

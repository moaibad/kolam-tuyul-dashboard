import { describe, expect, it } from "vitest";

import { buildWalletHref, normalizeWalletQuery } from "@/lib/wallet-url";

describe("wallet URL helpers", () => {
  it("normalizes a valid address to its checksum form", () => {
    expect(
      normalizeWalletQuery("0x52908400098527886e0f7030069857d2e4169ee7"),
    ).toBe("0x52908400098527886E0F7030069857D2E4169EE7");
  });

  it("rejects empty, invalid, and repeated query values", () => {
    expect(normalizeWalletQuery(undefined)).toBe("");
    expect(normalizeWalletQuery("not-a-wallet")).toBe("");
    expect(
      normalizeWalletQuery([
        "0x0000000000000000000000000000000000000001",
      ]),
    ).toBe("");
  });

  it("preserves a valid checksummed address in navigation URLs", () => {
    expect(
      buildWalletHref(
        "/portfolio-calendar",
        "0x52908400098527886e0f7030069857d2e4169ee7",
      ),
    ).toBe(
      "/portfolio-calendar?address=0x52908400098527886E0F7030069857D2E4169EE7",
    );
    expect(buildWalletHref("/", "invalid")).toBe("/");
  });
});

import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import {
  InvalidWalletAddressError,
  parseWalletAddress,
} from "@/server/portfolio-service";

const ADDRESS = "0x0000000000000000000000000000000000000001";

describe("portfolio service", () => {
  it("validates and normalizes EVM addresses", () => {
    expect(parseWalletAddress(` ${ADDRESS} `)).toBe(ADDRESS);
    expect(() => parseWalletAddress("not-an-address")).toThrow(
      InvalidWalletAddressError,
    );
  });
});

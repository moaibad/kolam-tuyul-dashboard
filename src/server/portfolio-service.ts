import "server-only";

import { getAddress, isAddress, type Address } from "viem";

import type { PortfolioSnapshot } from "@/lib/types";
import {
  fetchKrystalPositions,
  mapKrystalPortfolio,
} from "@/server/krystal-api";

export class InvalidWalletAddressError extends Error {}

export function parseWalletAddress(value: string | null): Address {
  const trimmed = value?.trim() ?? "";
  if (!isAddress(trimmed)) {
    throw new InvalidWalletAddressError("A valid EVM wallet address is required.");
  }
  return getAddress(trimmed);
}

export async function getLivePortfolio(
  walletAddressInput: string,
  refresh = false,
): Promise<PortfolioSnapshot> {
  const walletAddress = parseWalletAddress(walletAddressInput);
  const result = await fetchKrystalPositions({
    walletAddress,
    status: "open",
    refresh,
  });
  return mapKrystalPortfolio(walletAddress, result);
}

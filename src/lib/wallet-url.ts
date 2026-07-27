import { getAddress, isAddress } from "viem";

export function normalizeWalletQuery(
  value: string | string[] | undefined,
) {
  if (typeof value !== "string") return "";
  const trimmed = value.trim();
  return isAddress(trimmed) ? getAddress(trimmed) : "";
}

export function buildWalletHref(pathname: string, address: string) {
  if (!isAddress(address)) return pathname;
  const search = new URLSearchParams({ address: getAddress(address) });
  return `${pathname}?${search.toString()}`;
}

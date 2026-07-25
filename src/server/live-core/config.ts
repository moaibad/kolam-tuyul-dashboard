import type { Address } from "viem";

export interface AppConfig {
  walletAddress: Address;
  robinhoodRpcUrl: string;
  usdgAddress: Address;
  wethAddress: Address;
  pricePoolCacheMs: number;
  priceRouteIntermediateTokens: Address[];
}

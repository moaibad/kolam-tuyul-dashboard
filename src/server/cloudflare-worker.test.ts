import { afterEach, describe, expect, it, vi } from "vitest";

import worker from "../../cloudflare-worker.js";

const ADDRESS = "0x0000000000000000000000000000000000000001";

function requestUrl(chainIds?: string) {
  const url = new URL("https://proxy.example/user-positions");
  url.searchParams.set("addresses", ADDRESS);
  url.searchParams.set("walletAddress", ADDRESS);
  url.searchParams.set("quoteSymbols", "usd");
  url.searchParams.set("offset", "0");
  url.searchParams.set("limit", "500");
  url.searchParams.set("orderBy", "liquidity");
  url.searchParams.set("positionStatus", "open");
  url.searchParams.set("isIncludeSpamPosition", "false");
  url.searchParams.set("refreshAll", "false");
  if (chainIds) url.searchParams.set("chainIds", chainIds);
  return url;
}

describe("Krystal Cloudflare relay", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("forwards an all-chain request without adding chainIds", async () => {
    const upstream = vi.fn(async (input: RequestInfo | URL) => {
      void input;
      return Response.json({ positions: [] });
    });
    vi.stubGlobal("fetch", upstream);

    const response = await worker.fetch(new Request(requestUrl()));

    expect(response.status).toBe(200);
    const forwarded = new URL(String(upstream.mock.calls[0]![0]));
    expect(forwarded.origin).toBe("https://api.krystal.app");
    expect(forwarded.searchParams.has("chainIds")).toBe(false);
  });

  it("accepts a validated comma-separated chain filter", async () => {
    const upstream = vi.fn(async (input: RequestInfo | URL) => {
      void input;
      return Response.json({ positions: [] });
    });
    vi.stubGlobal("fetch", upstream);

    const response = await worker.fetch(
      new Request(requestUrl("1,56,42161")),
    );

    expect(response.status).toBe(200);
    const forwarded = new URL(String(upstream.mock.calls[0]![0]));
    expect(forwarded.searchParams.get("chainIds")).toBe("1,56,42161");
  });
});

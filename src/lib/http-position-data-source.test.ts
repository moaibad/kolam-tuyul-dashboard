import { afterEach, describe, expect, it, vi } from "vitest";

import { HttpPositionDataSource } from "@/lib/http-position-data-source";

const ADDRESS = "0x0000000000000000000000000000000000000001";

describe("HttpPositionDataSource", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("requests fresh data and forwards the abort signal", async () => {
    const controller = new AbortController();
    const fetcher = vi.fn().mockResolvedValue(
      Response.json({
        address: ADDRESS,
        positions: [],
      }),
    );
    vi.stubGlobal("fetch", fetcher);

    await new HttpPositionDataSource().getPortfolio(ADDRESS, {
      refresh: true,
      signal: controller.signal,
    });

    expect(fetcher).toHaveBeenCalledWith(
      expect.stringContaining("&refresh=1"),
      expect.objectContaining({ signal: controller.signal }),
    );
  });

  it("preserves AbortError so superseded wallet requests stay silent", async () => {
    const abortError = new DOMException("Aborted", "AbortError");
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(abortError));

    await expect(
      new HttpPositionDataSource().getPortfolio(ADDRESS),
    ).rejects.toBe(abortError);
  });
});

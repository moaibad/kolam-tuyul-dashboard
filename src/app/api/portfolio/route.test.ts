import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const service = vi.hoisted(() => ({
  getLivePortfolio: vi.fn(),
  getDemoPortfolio: vi.fn(),
}));

vi.mock("@/server/portfolio-service", async () => {
  const actual = await vi.importActual<
    typeof import("@/server/portfolio-service")
  >("@/server/portfolio-service");
  return {
    ...actual,
    getLivePortfolio: service.getLivePortfolio,
  };
});
vi.mock("@/server/demo-portfolio", () => ({
  getDemoPortfolio: service.getDemoPortfolio,
}));
vi.mock("server-only", () => ({}));

import { GET } from "@/app/api/portfolio/route";
import { InvalidWalletAddressError } from "@/server/portfolio-service";

describe("GET /api/portfolio", () => {
  beforeEach(() => {
    service.getLivePortfolio.mockReset();
    service.getDemoPortfolio.mockReset();
  });
  afterEach(() => vi.unstubAllEnvs());

  it("returns a live portfolio without caching", async () => {
    service.getLivePortfolio.mockResolvedValue({
      address: "0x0000000000000000000000000000000000000001",
      positions: [],
    });
    const response = await GET(
      new NextRequest(
        "http://localhost/api/portfolio?address=0x0000000000000000000000000000000000000001",
      ),
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(await response.json()).toMatchObject({ positions: [] });
  });

  it("returns 400 for an invalid wallet address", async () => {
    service.getLivePortfolio.mockImplementationOnce(() => {
      throw new InvalidWalletAddressError(
        "A valid EVM wallet address is required.",
      );
    });
    const response = await GET(
      new NextRequest("http://localhost/api/portfolio?address=invalid"),
    );

    expect(response.status).toBe(400);
  });

  it("returns 502 when upstream loading fails", async () => {
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);
    service.getLivePortfolio.mockImplementationOnce(() => {
      throw new Error("RPC unavailable");
    });
    const response = await GET(
      new NextRequest(
        "http://localhost/api/portfolio?address=0x0000000000000000000000000000000000000001",
      ),
    );

    expect(response.status).toBe(502);
    consoleError.mockRestore();
  });

  it("only loads dummy data when demo mode is enabled", async () => {
    vi.stubEnv("DEMO_MODE", "true");
    service.getDemoPortfolio.mockResolvedValue({
      address: "0x0000000000000000000000000000000000000001",
      positions: [{ id: "demo-v4-123456" }],
    });

    const response = await GET(
      new NextRequest(
        "http://localhost/api/portfolio?address=0x0000000000000000000000000000000000000001",
      ),
    );

    expect(response.status).toBe(200);
    expect(service.getDemoPortfolio).toHaveBeenCalledOnce();
    expect(service.getLivePortfolio).not.toHaveBeenCalled();
    expect(await response.json()).toMatchObject({
      positions: [{ id: "demo-v4-123456" }],
    });
  });
});

import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const service = vi.hoisted(() => ({
  getPortfolioCalendar: vi.fn(),
  backfillPortfolioCalendar: vi.fn(),
}));

vi.mock("@/server/portfolio-calendar-service", async () => {
  const actual = await vi.importActual<
    typeof import("@/server/portfolio-calendar-service")
  >("@/server/portfolio-calendar-service");
  return {
    ...actual,
    getPortfolioCalendar: service.getPortfolioCalendar,
    backfillPortfolioCalendar: service.backfillPortfolioCalendar,
  };
});
vi.mock("server-only", () => ({}));

import { GET, POST } from "@/app/api/portfolio-calendar/route";
import {
  InvalidCalendarMonthError,
} from "@/server/portfolio-calendar-service";

describe("/api/portfolio-calendar", () => {
  beforeEach(() => {
    service.getPortfolioCalendar.mockReset();
    service.backfillPortfolioCalendar.mockReset();
  });

  it("returns a no-store realized calendar response", async () => {
    service.getPortfolioCalendar.mockResolvedValue({
      address: "0x0000000000000000000000000000000000000001",
      timezone: "Asia/Bangkok",
      month: { month: "2026-07", days: [] },
      backfill: { state: "complete", completed: 1, total: 1 },
    });
    const response = await GET(
      new NextRequest(
        "http://localhost/api/portfolio-calendar?address=0x0000000000000000000000000000000000000001&month=2026-07",
      ),
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
  });

  it("rejects an invalid month", async () => {
    service.getPortfolioCalendar.mockRejectedValue(
      new InvalidCalendarMonthError("Month must use the YYYY-MM format."),
    );
    const response = await GET(
      new NextRequest(
        "http://localhost/api/portfolio-calendar?address=0x0000000000000000000000000000000000000001&month=July",
      ),
    );
    expect(response.status).toBe(400);
  });

  it("starts a wallet backfill", async () => {
    service.backfillPortfolioCalendar.mockResolvedValue({
      state: "running",
      completed: 0,
      total: 2,
      retryable: true,
    });
    const response = await POST(
      new NextRequest("http://localhost/api/portfolio-calendar", {
        method: "POST",
        body: JSON.stringify({
          address: "0x0000000000000000000000000000000000000001",
        }),
      }),
    );
    expect(response.status).toBe(200);
    expect(service.backfillPortfolioCalendar).toHaveBeenCalledOnce();
  });
});

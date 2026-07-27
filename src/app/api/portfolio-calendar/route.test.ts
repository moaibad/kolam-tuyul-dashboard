import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const service = vi.hoisted(() => ({
  getPortfolioCalendar: vi.fn(),
}));

vi.mock("@/server/portfolio-calendar-service", async () => {
  const actual = await vi.importActual<
    typeof import("@/server/portfolio-calendar-service")
  >("@/server/portfolio-calendar-service");
  return {
    ...actual,
    getPortfolioCalendar: service.getPortfolioCalendar,
  };
});
vi.mock("server-only", () => ({}));

import { GET } from "@/app/api/portfolio-calendar/route";
import {
  InvalidCalendarMonthError,
} from "@/server/portfolio-calendar-service";

describe("/api/portfolio-calendar", () => {
  beforeEach(() => {
    service.getPortfolioCalendar.mockReset();
  });

  it("returns a no-store realized calendar response", async () => {
    service.getPortfolioCalendar.mockResolvedValue({
      address: "0x0000000000000000000000000000000000000001",
      timezone: "Asia/Bangkok",
      months: [{ month: "2026-07", days: [] }],
      windowStart: "2025-07-28",
      updatedAtMs: 1,
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
});

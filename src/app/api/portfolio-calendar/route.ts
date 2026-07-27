import { NextRequest } from "next/server";

import {
  getPortfolioCalendar,
  InvalidCalendarMonthError,
} from "@/server/portfolio-calendar-service";
import { InvalidWalletAddressError } from "@/server/portfolio-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const response = await getPortfolioCalendar(
      request.nextUrl.searchParams.get("address") ?? "",
      request.nextUrl.searchParams.get("month") ?? "",
    );
    return Response.json(response, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    if (
      error instanceof InvalidWalletAddressError ||
      error instanceof InvalidCalendarMonthError
    ) {
      return Response.json(
        { error: error.message },
        { status: 400, headers: { "Cache-Control": "no-store" } },
      );
    }
    console.error("Portfolio calendar request failed", error);
    return Response.json(
      { error: "Realized PnL calendar could not be loaded. Please try again." },
      { status: 502, headers: { "Cache-Control": "no-store" } },
    );
  }
}

import { NextRequest } from "next/server";

import {
  backfillPortfolioCalendar,
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

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json().catch(() => null)) as {
      address?: string;
    } | null;
    const progress = await backfillPortfolioCalendar(body?.address ?? "");
    return Response.json(progress, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    if (error instanceof InvalidWalletAddressError) {
      return Response.json(
        { error: error.message },
        { status: 400, headers: { "Cache-Control": "no-store" } },
      );
    }
    console.error("Portfolio calendar backfill failed", error);
    return Response.json(
      { error: "Realized PnL history could not be synchronized." },
      { status: 502, headers: { "Cache-Control": "no-store" } },
    );
  }
}


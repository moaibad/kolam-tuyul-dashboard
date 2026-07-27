import { NextRequest } from "next/server";

import {
  getLivePortfolio,
  InvalidWalletAddressError,
} from "@/server/portfolio-service";
import { getDemoPortfolio } from "@/server/demo-portfolio";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const loadPortfolio =
      process.env.DEMO_MODE === "true" ? getDemoPortfolio : getLivePortfolio;
    const portfolio = await loadPortfolio(
      request.nextUrl.searchParams.get("address") ?? "",
      request.nextUrl.searchParams.get("refresh") === "1",
    );
    return Response.json(portfolio, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    if (error instanceof InvalidWalletAddressError) {
      return Response.json(
        { error: error.message },
        { status: 400, headers: { "Cache-Control": "no-store" } },
      );
    }

    console.error("Live portfolio request failed", error);
    return Response.json(
      {
        error:
          "Live portfolio data could not be loaded from Krystal. Please try again.",
      },
      { status: 502, headers: { "Cache-Control": "no-store" } },
    );
  }
}

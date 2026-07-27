import type {
  PortfolioSnapshot,
  PositionDataSource,
} from "@/lib/types";

export class PortfolioDataSourceError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

export class HttpPositionDataSource implements PositionDataSource {
  async getPortfolio(
    address: string,
    options?: { refresh?: boolean; signal?: AbortSignal },
  ): Promise<PortfolioSnapshot> {
    let response: Response;
    try {
      response = await fetch(
        `/api/portfolio?address=${encodeURIComponent(address)}${options?.refresh ? "&refresh=1" : ""}`,
        {
          cache: "no-store",
          headers: { Accept: "application/json" },
          signal: options?.signal,
        },
      );
    } catch (error) {
      if (isAbortError(error)) {
        throw error;
      }
      throw new PortfolioDataSourceError(
        "The portfolio service is unreachable. Check your connection and try again.",
        0,
      );
    }
    const body = (await response.json().catch(() => null)) as
      | PortfolioSnapshot
      | { error?: string }
      | null;

    if (!response.ok) {
      throw new PortfolioDataSourceError(
        body && "error" in body && body.error
          ? body.error
          : getFallbackErrorMessage(response.status),
        response.status,
      );
    }

    if (!body || !("address" in body)) {
      throw new PortfolioDataSourceError(
        "The portfolio service returned an invalid response. Please try again.",
        502,
      );
    }

    return body as PortfolioSnapshot;
  }
}

function isAbortError(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "name" in error &&
    error.name === "AbortError"
  );
}

function getFallbackErrorMessage(status: number) {
  if (status === 401) return "Your session expired. Reload the page and try again.";
  if (status === 403) return "You do not have permission to view this portfolio.";
  if (status === 404) return "No portfolio data was found for this wallet.";
  if (status === 429) return "Too many requests. Wait a moment, then try again.";
  if (status >= 500) {
    return "The portfolio service is temporarily unavailable. Please try again.";
  }
  return "Live portfolio data could not be loaded. Check the address and try again.";
}

export const httpPositionDataSource = new HttpPositionDataSource();

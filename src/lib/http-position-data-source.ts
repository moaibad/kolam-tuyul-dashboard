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
  async getPortfolio(address: string): Promise<PortfolioSnapshot> {
    const response = await fetch(
      `/api/portfolio?address=${encodeURIComponent(address)}`,
      {
        cache: "no-store",
        headers: { Accept: "application/json" },
      },
    );
    const body = (await response.json().catch(() => null)) as
      | PortfolioSnapshot
      | { error?: string }
      | null;

    if (!response.ok) {
      throw new PortfolioDataSourceError(
        body && "error" in body && body.error
          ? body.error
          : "Live portfolio data could not be loaded.",
        response.status,
      );
    }

    return body as PortfolioSnapshot;
  }
}

export const httpPositionDataSource = new HttpPositionDataSource();

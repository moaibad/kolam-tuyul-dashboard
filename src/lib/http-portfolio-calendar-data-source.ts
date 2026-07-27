import type { PortfolioCalendarResponse } from "@/lib/portfolio-calendar";

export class PortfolioCalendarDataSourceError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

export const httpPortfolioCalendarDataSource = {
  async get(address: string, month: string) {
    return request<PortfolioCalendarResponse>(
      `/api/portfolio-calendar?address=${encodeURIComponent(address)}&month=${encodeURIComponent(month)}`,
    );
  },
};

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(url, { ...init, cache: "no-store" });
  } catch {
    throw new PortfolioCalendarDataSourceError(
      "The calendar service is unreachable. Check your connection and try again.",
      0,
    );
  }
  const body = (await response.json().catch(() => null)) as
    | T
    | { error?: string }
    | null;
  if (!response.ok) {
    throw new PortfolioCalendarDataSourceError(
      body && typeof body === "object" && "error" in body && body.error
        ? body.error
        : "Realized PnL calendar could not be loaded.",
      response.status,
    );
  }
  return body as T;
}

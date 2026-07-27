import type { Metadata } from "next";

import { AppShell } from "@/components/app-shell";
import { DashboardPageHeader } from "@/components/dashboard-page-header";
import { PortfolioPnlCalendar } from "@/components/portfolio-pnl-calendar";
import { normalizeWalletQuery } from "@/lib/wallet-url";

export const metadata: Metadata = {
  title: "Portfolio Calendar | KolamTuyul",
  description: "Portfolio calendar for KolamTuyul.",
};

export default async function PortfolioCalendarPage({
  searchParams,
}: {
  searchParams: Promise<{
    address?: string | string[];
  }>;
}) {
  const initialAddress = normalizeWalletQuery(
    (await searchParams).address,
  );

  return (
    <AppShell walletAddress={initialAddress}>
      <main className="min-h-screen w-full">
        <DashboardPageHeader
          title="Portfolio Calendar"
          subtitle="Realized results from fully withdrawn LP positions"
        />
        <PortfolioPnlCalendar
          demoMode={process.env.DEMO_MODE === "true"}
          initialAddress={initialAddress}
        />
      </main>
    </AppShell>
  );
}

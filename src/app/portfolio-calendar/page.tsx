import type { Metadata } from "next";

import { AppShell } from "@/components/app-shell";
import { DashboardPageHeader } from "@/components/dashboard-page-header";
import { PortfolioPnlCalendar } from "@/components/portfolio-pnl-calendar";

export const metadata: Metadata = {
  title: "Portfolio Calendar | KolamTuyul",
  description: "Portfolio calendar for KolamTuyul.",
};

export default function PortfolioCalendarPage() {
  return (
    <AppShell>
      <main className="min-h-screen w-full">
        <DashboardPageHeader
          title="Portfolio Calendar"
          subtitle="Realized results from fully withdrawn LP positions"
        />
        <PortfolioPnlCalendar demoMode={process.env.DEMO_MODE === "true"} />
      </main>
    </AppShell>
  );
}

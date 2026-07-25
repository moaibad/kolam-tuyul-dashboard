import type { Metadata } from "next";

import { AppShell } from "@/components/app-shell";
import { PortfolioPnlCalendar } from "@/components/portfolio-pnl-calendar";
import { portfolioCalendarMock } from "@/lib/portfolio-calendar-mock";

export const metadata: Metadata = {
  title: "Portfolio Calendar | KolamTuyul",
  description: "Portfolio calendar for KolamTuyul.",
};

export default function PortfolioCalendarPage() {
  return (
    <AppShell>
      <main className="min-h-screen w-full">
        <header className="border-b border-white/[0.055] bg-[#11101e]/70 backdrop-blur-xl">
          <div className="mx-auto flex min-h-20 max-w-[1800px] items-center px-5 sm:px-7 xl:px-10">
            <div>
              <h1 className="text-lg font-semibold tracking-tight text-slate-50">
                Portfolio Calendar
              </h1>
              <p className="mt-1 text-xs text-slate-500">
                Daily PnL snapshots across every active LP position
              </p>
            </div>
          </div>
        </header>
        <PortfolioPnlCalendar months={portfolioCalendarMock} />
      </main>
    </AppShell>
  );
}

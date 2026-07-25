import { Suspense } from "react";

import { DashboardLoading } from "@/components/dashboard-loading";
import { PositionTrackerDashboard } from "@/components/position-tracker-dashboard";

export default function Home() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-background p-6">
          <DashboardLoading />
        </main>
      }
    >
      <PositionTrackerDashboard />
    </Suspense>
  );
}

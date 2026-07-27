import { PositionTrackerDashboard } from "@/components/position-tracker-dashboard";
import { normalizeWalletQuery } from "@/lib/wallet-url";

export default async function Home({
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
    <PositionTrackerDashboard
      demoMode={process.env.DEMO_MODE === "true"}
      initialAddress={initialAddress}
    />
  );
}

import { PositionTrackerDashboard } from "@/components/position-tracker-dashboard";

export default function Home() {
  return (
    <PositionTrackerDashboard demoMode={process.env.DEMO_MODE === "true"} />
  );
}

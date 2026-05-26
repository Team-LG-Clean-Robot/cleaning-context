import { DashboardHeader } from "@/components/DashboardHeader";
import { MethodologyCard } from "@/components/MethodologyCard";
import { Simulator } from "@/components/Simulator";

export default function Page() {
  return (
    <main className="max-w-[1440px] mx-auto px-8 py-8 space-y-6">
      <DashboardHeader />
      <MethodologyCard />
      <Simulator />
    </main>
  );
}

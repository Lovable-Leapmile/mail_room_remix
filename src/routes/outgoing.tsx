import { createFileRoute, Link } from "@tanstack/react-router";
import { useMailroom } from "@/lib/mailroom";
import { Page } from "@/components/mailroom/AppShell";
import { EmptyState } from "@/components/mailroom/ParcelCard";
import { OutgoingParcelCard } from "@/components/mailroom/OutgoingParcelCard";
import { PlusCircle } from "lucide-react";

export const Route = createFileRoute("/outgoing")({
  head: () => ({ meta: [{ title: "Outgoing · Leapmile" }] }),
  component: Outgoing,
});

function Outgoing() {
  const parcels = useMailroom((s) => s.parcels.filter((p) => p.direction === "outgoing"));
  return (
    <Page title="Outgoing" back right={<Link to="/book" className="haptic-tap w-9 h-9 rounded-full brand-gradient flex items-center justify-center"><PlusCircle className="w-4 h-4 text-white" /></Link>}>
      <div className="space-y-3 mt-2">
        {parcels.length === 0 ? <EmptyState title="No outgoing parcels" subtitle="Book a pickup to send a parcel." /> : parcels.map((p) => <OutgoingParcelCard key={p.id} p={p} />)}
      </div>
    </Page>
  );
}

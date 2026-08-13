import { createFileRoute } from "@tanstack/react-router";
import { useMailroom } from "@/lib/mailroom";
import { Page } from "@/components/mailroom/AppShell";
import { ParcelCard, EmptyState } from "@/components/mailroom/ParcelCard";

export const Route = createFileRoute("/incoming")({
  head: () => ({ meta: [{ title: "Incoming · Leapmile" }] }),
  component: Incoming,
});

function Incoming() {
  const parcels = useMailroom((s) => s.parcels.filter((p) => p.direction === "incoming"));
  return (
    <Page title="Incoming" back>
      <div className="space-y-3 mt-2">
        {parcels.length === 0 ? <EmptyState title="No incoming parcels" subtitle="You'll be notified as soon as a parcel arrives." /> : parcels.map((p) => <ParcelCard key={p.id} p={p} />)}
      </div>
    </Page>
  );
}

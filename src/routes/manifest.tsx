import { createFileRoute } from "@tanstack/react-router";
import { Page } from "@/components/mailroom/AppShell";
import { ParcelCard, EmptyState } from "@/components/mailroom/ParcelCard";
import { useMailroom } from "@/lib/mailroom";
import { Truck, CheckCircle2, MapPin, Package } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/manifest")({
  head: () => ({ meta: [{ title: "Pickup Manifest · Leapmile" }] }),
  component: Manifest,
});

function Manifest() {
  const parcels = useMailroom((s) => s.parcels);
  const [tab, setTab] = useState<"pickup" | "deposited">("pickup");

  const pickup = parcels.filter((p) => p.direction === "outgoing" && p.status === "Ready for Pickup");
  const deposited = parcels.filter((p) => p.direction === "incoming" && p.status === "Ready for Pickup");
  const list = tab === "pickup" ? pickup : deposited;

  return (
    <Page title="Manifest" back>
      {/* Summary card */}
      <div className="mt-4 rounded-[28px] p-5 brand-gradient text-white relative overflow-hidden shadow-[0_20px_60px_-20px_rgba(53,28,117,0.55)]">
        <div className="absolute -top-12 -right-12 w-48 h-48 rounded-full bg-white/10 blur-2xl" />
        <div className="relative flex items-center justify-between">
          <div>
            <p className="text-[11px] text-white/70">Today</p>
            <p className="text-lg font-semibold mt-0.5">Bengaluru — South Loop</p>
            <div className="mt-2 flex items-center gap-3 text-[11px] text-white/80">
              <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> Leapmile HQ</span>
            </div>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-white/15 backdrop-blur flex items-center justify-center">
            <Truck className="w-6 h-6" />
          </div>
        </div>

        <div className="relative mt-4 grid grid-cols-2 gap-2">
          <MiniStat label="To Pick Up" value={pickup.length} />
          <MiniStat label="Deposited" value={deposited.length} />
        </div>
      </div>

      {/* Tabs */}
      <div className="mt-5 p-1 rounded-2xl bg-[color:var(--primary-soft)] grid grid-cols-2 gap-1">
        {(["pickup", "deposited"] as const).map((k) => (
          <button
            key={k}
            onClick={() => setTab(k)}
            className={cn(
              "haptic-tap py-2.5 rounded-xl text-sm font-semibold transition-all capitalize",
              tab === k ? "bg-white text-primary shadow-sm" : "text-primary/60"
            )}
          >
            {k === "pickup" ? `To Pick Up (${pickup.length})` : `Deposited (${deposited.length})`}
          </button>
        ))}
      </div>

      <p className="text-[11px] text-muted-foreground px-1 mt-3">
        {tab === "pickup"
          ? "Parcels employees left in a locker or cube — open with the OTP or QR shown on each parcel."
          : "Parcels you dropped for employees to pick up."}
      </p>

      {/* List */}
      <div className="mt-3 space-y-3">
        {list.length === 0 ? (
          <EmptyState icon={tab === "pickup" ? CheckCircle2 : Package} title={tab === "pickup" ? "Nothing to pick up" : "No deposits yet"} subtitle={tab === "pickup" ? "You're all caught up." : "Deposits you make will appear here."} />
        ) : (
          list.map((p) => <ParcelCard key={p.id} p={p} arrow={tab === "pickup" ? "incoming" : "outgoing"} />)
        )}
      </div>

    </Page>
  );
}

function MiniStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl bg-white/15 backdrop-blur-md px-3 py-2.5">
      <p className="text-2xl font-semibold">{value}</p>
      <p className="text-[11px] text-white/75">{label}</p>
    </div>
  );
}

import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { Search, SlidersHorizontal, PackageCheck, ArrowUpRight } from "lucide-react";
import { useMailroom } from "@/lib/mailroom";
import { Page } from "@/components/mailroom/AppShell";
import { ParcelCard, EmptyState } from "@/components/mailroom/ParcelCard";
import { OutgoingParcelCard } from "@/components/mailroom/OutgoingParcelCard";

export const Route = createFileRoute("/parcels/")({
  head: () => ({ meta: [{ title: "My Parcels · Leapmile" }] }),
  component: Parcels,
});

type Tab = "Incoming" | "Outgoing" | "Completed" | "All";

function Parcels() {
  const parcels = useMailroom((s) => s.parcels);
  const user = useMailroom((s) => s.user);
  const isCourier = user?.role === "Courier";
  const courierCompany = user?.org?.split("·")[0]?.trim() ?? "";

  const tabs: Tab[] = isCourier ? ["Outgoing", "Incoming", "Completed", "All"] : ["Incoming", "Outgoing", "Completed", "All"];
  const [tab, setTab] = useState<Tab>(isCourier ? "Outgoing" : "Incoming");

  const tabLabels: Record<Tab, string> = isCourier
    ? { Outgoing: "My Drops", Incoming: "Received Couriers", Completed: "Completed", All: "All" }
    : { Incoming: "My Pickups", Outgoing: "Sent Couriers", Completed: "Completed", All: "All" };
  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    let arr = [...parcels];
    if (isCourier) arr = arr.filter((p) => p.courier === courierCompany);

    const isCompleted = (s: string) => ["Collected", "Delivered", "Dropped"].includes(s);

    if (isCourier) {
      // Courier: Outgoing = to drop, Incoming = to pick up from employees
      if (tab === "Outgoing") arr = arr.filter((p) => p.status === "Pending Drop");
      else if (tab === "Incoming") arr = arr.filter((p) => p.direction === "outgoing" && p.status === "Ready for Pickup");
      else if (tab === "Completed") arr = arr.filter((p) => isCompleted(p.status));
    } else {
      // Employee: Incoming = parcels arriving for them, Outgoing = parcels they sent
      if (tab === "Incoming") arr = arr.filter((p) => p.direction === "incoming" && p.status !== "Pending Drop" && !isCompleted(p.status));
      else if (tab === "Outgoing") arr = arr.filter((p) => p.direction === "outgoing" && !isCompleted(p.status));
      else if (tab === "Completed") arr = arr.filter((p) => isCompleted(p.status));
    }
    // "All" shows everything without status filtering
    if (q) arr = arr.filter((p) => (p.sender + p.receiver + p.trackingId + p.courier).toLowerCase().includes(q.toLowerCase()));
    return arr.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }, [parcels, tab, q, isCourier, courierCompany]);




  return (
    <Page title="My Parcels" back flatHeader right={<button className="w-9 h-9 rounded-full bg-[color:var(--primary-soft)] flex items-center justify-center"><SlidersHorizontal className="w-4 h-4 text-primary" /></button>}>
      <div className="mt-2 relative">
        <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search sender, tracking, courier…" className="w-full pl-10 pr-4 py-3 rounded-2xl bg-white border border-border text-sm outline-none focus:border-primary" />
      </div>

      <div className="mt-4 flex gap-2 overflow-x-auto hide-scrollbar -mx-4 px-4">
        {tabs.map((t) => (
          <button key={t} onClick={() => setTab(t)} className={`haptic-tap shrink-0 px-4 py-2 rounded-full text-xs font-semibold border transition ${tab === t ? "brand-gradient text-white border-transparent" : "bg-white border-border text-foreground"}`}>{tabLabels[t]}</button>
        ))}
      </div>

      <div className="mt-4 space-y-3">
        {filtered.length === 0 ? <EmptyState title="No parcels found" subtitle="Try changing filters or search terms." /> : filtered.map((p) => {
          const courierArrow: "incoming" | "outgoing" | undefined = isCourier
            ? (p.status === "Pending Drop" || p.status === "Dropped" ? "outgoing" : "incoming")
            : undefined;
          return isCourier && p.status === "Pending Drop" ? (
            <Link key={p.id} to="/drop" search={{ parcelId: p.id }} className="haptic-tap block ios-card p-4 flex gap-3">
              <div className="w-12 h-12 rounded-2xl bg-[color:var(--primary-soft)] flex items-center justify-center shrink-0">
                <PackageCheck className="w-6 h-6 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-semibold text-sm truncate">{p.receiver}</p>
                  <ArrowUpRight className="w-4 h-4 text-primary shrink-0" />
                </div>
                <p className="text-xs text-muted-foreground truncate">{p.sender} · {p.trackingId}</p>
                <div className="flex items-center justify-between mt-2">
                  <span className="text-[11px] font-semibold px-2 py-1 rounded-full bg-amber-50 text-amber-700 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500" /> Tap to Drop
                  </span>
                  <span className="text-[11px] text-muted-foreground">{p.size} · {p.weight}</span>
                </div>
              </div>
            </Link>
          ) : (!isCourier && p.direction === "outgoing") ? (
            <OutgoingParcelCard key={p.id} p={p} />
          ) : <ParcelCard key={p.id} p={p} arrow={courierArrow} />;
        })}
      </div>
    </Page>
  );
}

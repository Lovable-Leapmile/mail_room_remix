import { createFileRoute } from "@tanstack/react-router";
import { Page } from "@/components/mailroom/AppShell";
import { useMailroom } from "@/lib/mailroom";
import { Search as SearchIcon } from "lucide-react";
import { useState } from "react";
import { ParcelCard, EmptyState } from "@/components/mailroom/ParcelCard";

export const Route = createFileRoute("/search")({
  head: () => ({ meta: [{ title: "Search · Leapmile" }] }),
  component: Search,
});

function Search() {
  const parcels = useMailroom((s) => s.parcels);
  const [q, setQ] = useState("");
  const results = q ? parcels.filter((p) => (p.sender + p.receiver + p.trackingId + p.courier + p.storageId).toLowerCase().includes(q.toLowerCase())) : [];

  const recent = ["BlueDart", "CUBE ROBOT - 1", "Apple Store", "Ready for Pickup"];
  return (
    <Page title="Search" back>
      <div className="mt-2 relative">
        <SearchIcon className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search parcels, couriers, lockers…" className="w-full pl-10 pr-4 py-3.5 rounded-2xl bg-white border border-border text-sm outline-none focus:border-primary" />
      </div>

      {!q && (
        <div className="mt-6">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1">Recent</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {recent.map((r) => <button key={r} onClick={() => setQ(r)} className="px-3 py-1.5 rounded-full bg-white border border-border text-xs font-medium">{r}</button>)}
          </div>
        </div>
      )}

      <div className="mt-4 space-y-3">
        {q && (results.length === 0 ? <EmptyState title="No results" subtitle={`Nothing matched "${q}"`} /> : results.map((p) => <ParcelCard key={p.id} p={p} />))}
      </div>
    </Page>
  );
}

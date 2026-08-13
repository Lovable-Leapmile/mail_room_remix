import { createFileRoute } from "@tanstack/react-router";
import { Page } from "@/components/mailroom/AppShell";
import { formatWhen } from "@/lib/mailroom";
import { usePickupHistory } from "@/lib/pickup-history";
import { CheckCircle2, Package } from "lucide-react";
import { EmptyState } from "@/components/mailroom/ParcelCard";

export const Route = createFileRoute("/history")({
  head: () => ({ meta: [{ title: "History · Leapmile" }] }),
  component: History,
});

function History() {
  const { items, loading } = usePickupHistory();
  return (
    <Page title="Pickup History" back>
      <div className="mt-2 space-y-3">
        {loading ? (
          <div className="ios-card p-6 text-center text-xs text-muted-foreground">Loading…</div>
        ) : items.length === 0 ? (
          <EmptyState title="No history yet" subtitle="Completed pickups will appear here." />
        ) : (
          items.map((n) => (
            <div key={n.id} className="ios-card p-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-2xl bg-[color:var(--primary-soft)] flex items-center justify-center shrink-0">
                  <Package className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-semibold text-sm truncate">
                      {n.reservation_type} · {n.pod_name}
                    </p>
                    <span className="text-[11px] text-muted-foreground shrink-0">
                      {formatWhen(n.updated_at)}
                    </span>
                  </div>
                  {(n.pickupby_name || n.courier_name || n.awb_number) && (
                    <p className="text-xs text-muted-foreground mt-0.5 truncate">
                      {[n.pickupby_name, n.courier_name, n.awb_number].filter(Boolean).join(" · ")}
                    </p>
                  )}
                  <div className="mt-2 flex items-center gap-2 text-[11px]">
                    <span className="px-2 py-1 rounded-full bg-green-50 text-green-700 font-semibold flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> Pickup Completed
                    </span>
                    {n.pickup_otp && (
                      <span className="text-muted-foreground">OTP {n.pickup_otp}</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </Page>
  );
}

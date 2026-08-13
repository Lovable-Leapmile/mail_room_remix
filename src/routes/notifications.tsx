import { createFileRoute, Link } from "@tanstack/react-router";
import { Page } from "@/components/mailroom/AppShell";
import { markAllRead, formatWhen } from "@/lib/mailroom";
import { usePickupNotifications, formatPickupBody } from "@/lib/pickup-notifications";
import { Bell, Package, CheckCheck } from "lucide-react";
import { EmptyState } from "@/components/mailroom/ParcelCard";

export const Route = createFileRoute("/notifications")({
  head: () => ({ meta: [{ title: "Notifications · Leapmile" }] }),
  component: Notifs,
});

function Notifs() {
  const pickups = usePickupNotifications();
  return (
    <Page
      title="Notifications"
      right={
        <button onClick={markAllRead} className="text-xs font-semibold text-primary flex items-center gap-1">
          <CheckCheck className="w-4 h-4" />Mark all
        </button>
      }
    >
      <div className="mt-2 space-y-2">
        {pickups.length === 0 ? (
          <EmptyState icon={Bell} title="You're all caught up" subtitle="No parcels ready for pickup right now." />
        ) : (
          pickups.map((n) => (
            <Link
              key={n.id}
              to="/parcels/$id"
              params={{ id: String(n.id) }}
              className="haptic-tap block"
            >
              <div className="ios-card p-4 flex gap-3 border-primary/30 bg-[color:var(--primary-soft)]/40">
                <div className="w-10 h-10 rounded-2xl bg-white flex items-center justify-center shrink-0">
                  <Package className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-semibold text-sm truncate">Parcel ready for pickup</p>
                    <span className="w-2 h-2 rounded-full bg-primary shrink-0" />
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">{formatPickupBody(n)}</p>
                  <p className="text-[11px] text-muted-foreground mt-1">{formatWhen(n.updated_at)}</p>
                </div>
              </div>
            </Link>
          ))
        )}
      </div>
    </Page>
  );
}

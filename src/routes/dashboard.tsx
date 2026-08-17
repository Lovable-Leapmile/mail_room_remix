import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useHydrated } from "@/hooks/use-hydrated";
import { ArrowUpRight, Sparkles, Truck, History as HistoryIcon, User, ClipboardList } from "lucide-react";
import { useMailroom, type Parcel } from "@/lib/mailroom";
import { cn } from "@/lib/utils";
import { Page, ProfileSheet } from "@/components/mailroom/AppShell";
import { OutgoingParcelCard } from "@/components/mailroom/OutgoingParcelCard";
import { StorageIcon } from "@/components/mailroom/StorageIcon";
import { DropParcelSheet } from "@/components/mailroom/DropParcelSheet";
import { useUserLocation, formatLocation } from "@/lib/locations";
import { LocationSwitcher } from "@/components/mailroom/LocationSwitcher";
import { usePickupHistory } from "@/lib/pickup-history";
import { useUserLocations } from "@/lib/user-locations";
import { PODCORE_BASE, apiHeaders } from "@/lib/api-config";
import { useRefreshTick } from "@/lib/refresh";
import logoAsset from "@/assets/leapmile_logo.png.asset.json";

export const Route = createFileRoute("/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard · Leapmile Mailroom" }] }),
  component: Dashboard,
});

interface ApiPickup {
  id: number;
  reservation_type: string;
  location_name: string;
  pod_name: string;
  created_by_name: string;
  pick_up_by_name?: string;
  updated_at: string;
}

function Dashboard() {
  const user = useMailroom((s) => s.user);
  const parcels = useMailroom((s) => s.parcels);
  const isCourier = user?.role === "Courier";
  const hydrated = useHydrated();

  const [apiPickups, setApiPickups] = useState<ApiPickup[]>([]);
  const refreshTick = useRefreshTick();

  useEffect(() => {
    if (!user?.regNo || isCourier) return;
    const url = `${PODCORE_BASE}/reservations/?status=active&reservation_status=PickupPending&pickupby_phone=${encodeURIComponent(user.regNo)}&order_by_field=updated_at&order_by_type=DESC`;
    fetch(url, { headers: apiHeaders })
      .then((r) => r.json())
      .then((d) => setApiPickups(Array.isArray(d?.records) ? d.records : []))
      .catch(() => setApiPickups([]));
  }, [user?.regNo, isCourier, refreshTick]);

  if (hydrated && isCourier) return <CourierDashboard />;

  const toSend = parcels.filter((p) => p.direction === "outgoing" && p.status === "Ready for Pickup");
  const { items: historyItems, loading: historyLoading } = usePickupHistory(undefined, refreshTick);

  const [showPendingShipments, setShowPendingShipments] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [openProfile, setOpenProfile] = useState(false);

  const userLoc = useUserLocation(user?.regNo);
  const locText = formatLocation(userLoc) || user?.org || "";

  const header = (
    <header className="flex items-center justify-between">
      <div className="min-w-0">
        <img src={logoAsset.url} alt="Leapmile" className="h-6 w-auto object-contain" />
        <LocationSwitcher phone={user?.regNo} fallback={locText} />
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <button
          onClick={() => setOpenProfile(true)}
          className="haptic-tap w-10 h-10 rounded-full brand-gradient flex items-center justify-center text-white text-sm font-semibold"
          aria-label="Profile"
        >
          {user?.avatar}
        </button>
      </div>
    </header>
  );

  return (
    <Page fixedHeader={header}>
      {/* Intelligent feed */}
      <section className="mt-6">
        <div className="flex items-center justify-between px-1 mb-3">
          <p className="text-sm font-semibold">Pending Pickups ({apiPickups.length})</p>
        </div>
        <div className="space-y-3">
          {apiPickups.length === 0 ? (
            <EmptySmall text="No parcels waiting for pickup" />
          ) : (
            apiPickups.map((r) => <ApiPickupCard key={r.id} r={r} />)
          )}
        </div>
      </section>

      <div className="my-6 h-px bg-gradient-to-r from-transparent via-border to-transparent" />

      <section>
        <button
          onClick={() => setShowPendingShipments((v) => !v)}
          className="haptic-tap w-full bg-white/60 rounded-2xl p-4 flex items-center justify-between shadow-[0_8px_24px_-12px_rgba(53,28,117,0.06)]"
        >
          <p className="text-sm font-semibold text-muted-foreground flex items-center gap-1.5">
            <Truck className="w-3.5 h-3.5" /> Send Courier Shipment
          </p>
          <span className="text-[11px] text-muted-foreground">{toSend.length}</span>
        </button>

        {showPendingShipments && (
          <div className="mt-3">
            {toSend.length === 0 ? (
              <div className="ios-card p-6 text-center text-xs text-muted-foreground">
                No shipments awaiting courier
              </div>
            ) : (
              <div className="bg-white/60 rounded-2xl overflow-hidden shadow-[0_8px_24px_-12px_rgba(53,28,117,0.06)]">
                {toSend.map((p, i) => (
                  <div
                    key={p.id}
                    className={cn("p-0", i !== toSend.length - 1 && "border-b border-[oklch(0.94_0.012_285)]")}
                  >
                    <OutgoingParcelCard p={p} plain />
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </section>

      <div className="my-6 h-px bg-gradient-to-r from-transparent via-border to-transparent" />

      <section>
        <button
          onClick={() => setShowHistory((v) => !v)}
          className="haptic-tap w-full bg-white/60 rounded-2xl p-4 flex items-center justify-between shadow-[0_8px_24px_-12px_rgba(53,28,117,0.06)]"
        >
          <p className="text-sm font-semibold text-muted-foreground flex items-center gap-1.5">
            <HistoryIcon className="w-3.5 h-3.5" /> Show All History
          </p>
          <span className="text-[11px] text-muted-foreground">{historyItems.length}</span>
        </button>

        {showHistory && (
          <div className="mt-3">
            {historyLoading ? (
              <div className="ios-card p-6 text-center text-xs text-muted-foreground">Loading history…</div>
            ) : historyItems.length === 0 ? (
              <div className="ios-card p-6 text-center text-xs text-muted-foreground">No completed pickups yet</div>
            ) : (
              <div className="bg-white/60 rounded-2xl overflow-hidden shadow-[0_8px_24px_-12px_rgba(53,28,117,0.06)]">
                {historyItems.map((h, i) => (
                  <div
                    key={h.id}
                    className={cn(
                      "p-4 flex items-start gap-3",
                      i !== historyItems.length - 1 && "border-b border-[oklch(0.94_0.012_285)]",
                    )}
                  >
                    <div className="w-10 h-10 rounded-xl bg-green-50 flex items-center justify-center shrink-0">
                      <Sparkles className="w-4 h-4 text-green-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-semibold text-sm truncate">
                          {h.reservation_type} · {h.pod_name}
                        </p>
                        <span className="text-[10px] text-muted-foreground shrink-0">
                          {new Date(h.updated_at).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="text-[11px] text-muted-foreground truncate">
                        {[h.pickupby_name, h.courier_name, h.awb_number].filter(Boolean).join(" · ") || "—"}
                      </p>
                      <span className="mt-1.5 inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-green-50 text-green-700">
                        Pickup Completed
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </section>

      <ProfileSheet open={openProfile} onClose={() => setOpenProfile(false)} />
    </Page>
  );
}

function CourierDashboard() {
  const user = useMailroom((s) => s.user);
  const [openProfile, setOpenProfile] = useState(false);
  const [dropTarget, setDropTarget] = useState<Parcel | null>(null);
  const [showPickups, setShowPickups] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showDrops, setShowDrops] = useState(false);

  const [apiPickupPickups, setApiPickupPickups] = useState<ApiPickup[]>([]);
  const { selectedId: dropLocationId } = useUserLocations(user?.regNo);
  const [apiDrops, setApiDrops] = useState<ApiPickup[]>([]);
  const refreshTick = useRefreshTick();

  useEffect(() => {
    if (!user?.regNo) return;
    const url = `${PODCORE_BASE}/reservations/?reservation_status=PickupPending&pickupby_phone=${encodeURIComponent(user.regNo)}&order_by_field=updated_at&order_by_type=DESC`;
    fetch(url, { headers: apiHeaders })
      .then((r) => r.json())
      .then((d) => setApiPickupPickups(Array.isArray(d?.records) ? d.records : []))
      .catch(() => setApiPickupPickups([]));
  }, [user?.regNo, refreshTick]);

  useEffect(() => {
    if (!user?.regNo || !dropLocationId) return;
    const url = `${PODCORE_BASE}/reservations/?location_id=${dropLocationId}&status=active&reservation_status=DropPending&dropby_phone=${encodeURIComponent(user.regNo)}&order_by_field=updated_at&order_by_type=DESC`;
    fetch(url, { headers: apiHeaders })
      .then((r) => r.json())
      .then((d) => setApiDrops(Array.isArray(d?.records) ? d.records : []))
      .catch(() => setApiDrops([]));
  }, [user?.regNo, dropLocationId, refreshTick]);

  const courierLoc = useUserLocation(user?.regNo);
  const courierLocText = formatLocation(courierLoc) || user?.org || "";

  const { items: courierHistory, loading: courierHistoryLoading } = usePickupHistory(
    user?.regNo,
    refreshTick,
    "dropby_phone",
  );

  const header = (
    <header className="flex items-center justify-between">
      <div className="min-w-0">
        <img src={logoAsset.url} alt="Leapmile" className="h-6 w-auto object-contain" />
        <LocationSwitcher phone={user?.regNo} fallback={courierLocText} />
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <button
          onClick={() => setOpenProfile(true)}
          className="haptic-tap w-10 h-10 rounded-full brand-gradient flex items-center justify-center text-white text-sm font-semibold"
          aria-label="Profile"
        >
          {user?.avatar}
        </button>
      </div>
    </header>
  );

  return (
    <Page fixedHeader={header}>
      {/* Pickup pendings — first */}
      <section className="mt-6">
        <button
          onClick={() => setShowPickups((v) => !v)}
          className="haptic-tap w-full bg-white/60 rounded-2xl p-4 flex items-center justify-between shadow-[0_8px_24px_-12px_rgba(53,28,117,0.06)]"
        >
          <p className="text-sm font-semibold flex items-center gap-1.5">
            <Truck className="w-3.5 h-3.5 text-primary" /> Pickup Pending
          </p>
          <span className="text-[11px] text-muted-foreground">{apiPickupPickups.length}</span>
        </button>
        {showPickups && (
          <div className="mt-3 space-y-3">
            {apiPickupPickups.length === 0 ? (
              <EmptySmall text="No pickups waiting" />
            ) : (
              apiPickupPickups.map((r) => <ApiPickupCard key={r.id} r={r} />)
            )}
          </div>
        )}
      </section>

      <div className="my-6 h-px bg-gradient-to-r from-transparent via-border to-transparent" />

      {/* Drop pendings — second */}
      <section>
        <button
          onClick={() => setShowDrops((v) => !v)}
          className="haptic-tap w-full bg-white/60 rounded-2xl p-4 flex items-center justify-between shadow-[0_8px_24px_-12px_rgba(53,28,117,0.06)]"
        >
          <p className="text-sm font-semibold text-muted-foreground flex items-center gap-1.5">
            <ClipboardList className="w-3.5 h-3.5" /> Drop Pending
          </p>
          <span className="text-[11px] text-muted-foreground">{apiDrops.length}</span>
        </button>
        {showDrops && (
          <div className="mt-3 space-y-3">
            {apiDrops.length === 0 ? (
              <EmptySmall text="No parcels waiting to drop" />
            ) : (
              apiDrops.map((r) => <ApiDropCard key={r.id} r={r} />)
            )}
          </div>
        )}
      </section>

      <div className="my-6 h-px bg-gradient-to-r from-transparent via-border to-transparent" />

      {/* History — lowest priority, collapsed */}
      <section>
        <button
          onClick={() => setShowHistory((v) => !v)}
          className="haptic-tap w-full bg-white/60 rounded-2xl p-4 flex items-center justify-between shadow-[0_8px_24px_-12px_rgba(53,28,117,0.06)]"
        >
          <p className="text-sm font-semibold text-muted-foreground flex items-center gap-1.5">
            <HistoryIcon className="w-3.5 h-3.5" /> History
          </p>
          <span className="text-[11px] text-muted-foreground">{courierHistory.length}</span>
        </button>
        {showHistory && (
          <div className="mt-3">
            {courierHistoryLoading ? (
              <div className="ios-card p-6 text-center text-xs text-muted-foreground">Loading history…</div>
            ) : courierHistory.length === 0 ? (
              <div className="ios-card p-6 text-center text-xs text-muted-foreground">No completed activity yet</div>
            ) : (
              <div className="bg-white/60 rounded-2xl overflow-hidden shadow-[0_8px_24px_-12px_rgba(53,28,117,0.06)]">
                {courierHistory.map((h, i) => (
                  <div
                    key={h.id}
                    className={cn(
                      "p-4 flex items-start gap-3",
                      i !== courierHistory.length - 1 && "border-b border-[oklch(0.94_0.012_285)]",
                    )}
                  >
                    <div className="w-10 h-10 rounded-xl bg-green-50 flex items-center justify-center shrink-0">
                      <Sparkles className="w-4 h-4 text-green-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-semibold text-sm truncate">
                          {h.reservation_type} · {h.pod_name}
                        </p>
                        <span className="text-[10px] text-muted-foreground shrink-0">
                          {new Date(h.updated_at).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="text-[11px] text-muted-foreground truncate">
                        {[h.pickupby_name, h.courier_name, h.awb_number].filter(Boolean).join(" · ") || "—"}
                      </p>
                      <span className="mt-1.5 inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-green-50 text-green-700">
                        Pickup Completed
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </section>

      <ProfileSheet open={openProfile} onClose={() => setOpenProfile(false)} />
      <DropParcelSheet parcel={dropTarget} open={!!dropTarget} onClose={() => setDropTarget(null)} />
    </Page>
  );
}

function EmptySmall({ text }: { text: string }) {
  return <div className="ios-card p-6 text-center text-sm text-muted-foreground">{text}</div>;
}

function ApiPickupCard({ r }: { r: ApiPickup }) {
  const isRobot = /robot/i.test(r.pod_name || "");
  return (
    <Link to="/parcels/$id" params={{ id: String(r.id) }} className="haptic-tap block">
      <div className="ios-card p-3 flex gap-3">
        <StorageIcon type={isRobot ? "robot" : "locker"} className="w-10 h-10" imgClassName="w-8 h-8" />
        <div className="flex-1 min-w-0">
          <div className="mt-0.5">
            <p className="font-semibold text-sm truncate">{r.reservation_type}</p>
          </div>
          <p className="text-xs text-muted-foreground truncate">
            {r.location_name} · {r.pod_name}
          </p>
        </div>
        <span className="text-[11px] text-muted-foreground shrink-0 self-start pt-1">
          {new Date(r.updated_at).toLocaleDateString()}
        </span>
      </div>
    </Link>
  );
}

function ApiDropCard({ r }: { r: ApiPickup }) {
  const isRobot = /robot/i.test(r.pod_name || "");
  return (
    <Link to="/drop-parcel/$id" params={{ id: String(r.id) }} className="haptic-tap block">
      <div className="ios-card p-4 flex gap-3">
        <StorageIcon type={isRobot ? "robot" : "locker"} className="w-12 h-12" imgClassName="w-10 h-10" />
        <div className="flex-1 min-w-0">
          <p className="text-[11px] text-muted-foreground flex items-center gap-1 truncate">
            <User className="w-3 h-3" /> Pickup by {r.pick_up_by_name || "—"}
          </p>
          <div className="flex items-center justify-between gap-2 mt-0.5">
            <p className="font-semibold text-sm truncate">{r.reservation_type}</p>
            <ArrowUpRight className="w-4 h-4 text-primary shrink-0" />
          </div>
          <p className="text-xs text-muted-foreground truncate">
            {r.location_name} · {r.pod_name}
          </p>
          <div className="flex items-center justify-between mt-2">
            <span className="text-[11px] font-semibold px-2 py-1 rounded-full flex items-center gap-1.5 bg-amber-50 text-amber-700">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
              Ready to Drop
            </span>
            <span className="text-[11px] text-muted-foreground">{new Date(r.updated_at).toLocaleDateString()}</span>
          </div>
        </div>
      </div>
    </Link>
  );
}

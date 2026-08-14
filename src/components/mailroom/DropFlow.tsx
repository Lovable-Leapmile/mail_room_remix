import { useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { MapPin, ChevronDown, ChevronRight, User, Phone, Package, CheckCircle2, Loader2, ScanLine } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Page } from "@/components/mailroom/AppShell";
import { StorageIcon } from "@/components/mailroom/StorageIcon";
import { QRScanStage } from "@/components/mailroom/QRScanStage";
import { DropHardware } from "@/components/mailroom/DropHardware";
import { useMailroom, createReservation } from "@/lib/mailroom";
import { useUserLocations, formatUserLocation } from "@/lib/user-locations";
import { PODCORE_BASE, apiHeaders } from "@/lib/api-config";
import {
  useLocationUsers,
  createReservationApi,
  RESERVATION_TYPES,
  type LocationUser,
} from "@/lib/reservations-create";
import { triggerRefresh } from "@/lib/refresh";

type Step = "locate" | "scan" | "reserve" | "retrieve" | "drop" | "done";

type ScannedPod = { pod_id: number; pod_name: string; isRobot: boolean };

type DropTarget = { podId: number; doorNumber?: number; isRobot: boolean };

const STEPS: { key: Step; short: string }[] = [
  { key: "locate", short: "Locate" },
  { key: "scan", short: "Scan" },
  { key: "reserve", short: "Reserve" },
  { key: "retrieve", short: "Retrieve" },
  { key: "drop", short: "Drop" },
  { key: "done", short: "Done" },
];

export function DropFlow({ title = "Drop Parcel" }: { title?: string }) {
  const nav = useNavigate();
  const user = useMailroom((s) => s.user);
  const courierPhone = user?.regNo ?? "";
  const courierCompany = user?.org?.split("·")[0]?.trim() ?? "Courier";
  const { selected } = useUserLocations(courierPhone);
  const { users, loading: loadingUsers } = useLocationUsers(selected?.location_id ?? null);

  const [step, setStep] = useState<Step>("locate");
  const [pod, setPod] = useState<ScannedPod | null>(null);
  const [awb, setAwb] = useState("");
  const [picked, setPicked] = useState<LocationUser | null>(null);
  const [userOpen, setUserOpen] = useState(false);
  const [resType, setResType] = useState("");
  const [typeOpen, setTypeOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [target, setTarget] = useState<DropTarget | null>(null);

  const idx = STEPS.findIndex((s) => s.key === step);

  const stripRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = stripRef.current?.querySelector<HTMLElement>(`[data-step="${idx}"]`);
    el?.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
  }, [idx]);

  const verifyPodScan = async (raw: string): Promise<boolean> => {
    const value = (raw || "").trim();
    if (!value) return false;
    let podName = value;
    try {
      const url = new URL(value);
      podName =
        url.searchParams.get("pod_name") ||
        url.searchParams.get("id") ||
        url.pathname.split("/").filter(Boolean).pop() ||
        value;
    } catch {
      // Not a URL — use the raw QR text as the pod name.
    }
    try {
      const res = await fetch(
        `${PODCORE_BASE}/pods/?pod_name=${encodeURIComponent(podName)}&order_by_field=updated_at&order_by_type=DESC`,
        { headers: apiHeaders },
      );
      const data = await res.json();
      const records: any[] = Array.isArray(data?.records) ? data.records : Array.isArray(data) ? data : [];
      const rec = records[0];
      if (!rec?.id) {
        toast.error("Pod not found for scanned QR.");
        return false;
      }
      const name = rec.pod_name ?? podName;
      setPod({ pod_id: rec.id, pod_name: name, isRobot: /robot/i.test(String(name)) });
      return true;
    } catch {
      toast.error("Could not verify the scanned QR.");
      return false;
    }
  };

  const submit = async () => {
    if (!pod || !awb || !picked || !resType) {
      toast.error("Scan an AWB, pick an employee and a reservation type.");
      return;
    }
    setSubmitting(true);
    await createReservationApi({
      courierPhone,
      pickupPhone: picked.user_phone,
      awb,
      reservationType: resType,
      podId: String(pod.pod_id),
    });
    createReservation({
      awb,
      receiverName: picked.user_name,
      receiverPhone: picked.user_phone,
      courier: courierCompany,
    });
    triggerRefresh();

    // Look up the freshly created reservation to get the assigned door.
    // Keep polling until the backend has allotted a door_number — the
    // hardware (robot tray retrieve / locker open) needs it.
    let rec: any = null;
    for (let attempt = 0; attempt < 10; attempt++) {
      try {
        const lookup = await fetch(
          `${PODCORE_BASE}/reservations/?reservation_awbno=${encodeURIComponent(awb)}&status=active&reservation_status=DropPending&dropby_phone=${encodeURIComponent(courierPhone)}&order_by_field=updated_at&order_by_type=DESC`,
          { headers: apiHeaders },
        );
        const d = await lookup.json();
        const found = Array.isArray(d?.records) ? d.records[0] : Array.isArray(d) ? d[0] : null;
        if (found) rec = found;
        if (found?.door_number != null) break;
      } catch {
        // Retry below.
      }
      await new Promise((r) => setTimeout(r, 1000));
    }
    setSubmitting(false);

    if (rec?.door_number == null) {
      toast.error("Could not get the allotted door for this reservation.");
      return;
    }
    toast.success("Reservation created");

    setTarget({
      podId: rec.pod_id ?? pod.pod_id,
      doorNumber: rec.door_number,
      isRobot: rec?.pod_name ? /robot/i.test(String(rec.pod_name)) : pod.isRobot,
    });
    setStep("retrieve");
  };

  const handleRetrieved = useCallback(() => setStep("drop"), []);

  const finishDrop = useCallback(() => {
    setStep("done");
    triggerRefresh();
    toast.success("Parcel dropped successfully");
    setTimeout(() => nav({ to: "/dashboard" }), 2000);
  }, [nav]);

  return (
    <Page title={title} back hideNav flatHeader>
      {/* Step strip */}
      <div className="mt-2 ios-card p-4">
        <div ref={stripRef} className="flex items-center gap-1 overflow-x-auto hide-scrollbar pb-1">
          {STEPS.map((s, i) => {
            const done = i < idx;
            const active = i === idx;
            return (
              <div key={s.key} data-step={i} className="flex items-center gap-1 shrink-0">
                <div
                  className={cn(
                    "flex items-center gap-2 px-3 py-2 rounded-full transition-all",
                    done && "bg-green-50 text-green-700",
                    active && "brand-gradient text-white shadow-sm",
                    !done && !active && "bg-muted text-muted-foreground",
                  )}
                >
                  <div
                    className={cn(
                      "w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold",
                      done && "bg-green-500 text-white",
                      active && "bg-white/25 text-white",
                      !done && !active && "bg-white text-muted-foreground",
                    )}
                  >
                    {done ? <CheckCircle2 className="w-3 h-3" /> : i + 1}
                  </div>
                  <span className="text-[11px] font-semibold whitespace-nowrap">{s.short}</span>
                </div>
                {i < STEPS.length - 1 && <div className={cn("w-3 h-px", done ? "bg-green-400" : "bg-border")} />}
              </div>
            );
          })}
        </div>

        <div className="mt-4">
          {step === "locate" && (
            <div>
              <div className="rounded-2xl bg-[color:var(--primary-soft)]/50 p-5 text-center">
                <div className="w-14 h-14 rounded-2xl bg-white mx-auto flex items-center justify-center">
                  <MapPin className="w-7 h-7 text-primary" />
                </div>
                <p className="mt-3 font-semibold text-sm">Locate the device</p>
                <p className="mt-1 text-xs text-muted-foreground max-w-[280px] mx-auto">
                  Walk to the Robot at your location. You can reserve the parcel only once you're at the device.
                </p>
                <div className="mt-4 rounded-2xl bg-white px-4 py-3 text-left flex items-center gap-3">
                  <MapPin className="w-4 h-4 text-primary shrink-0" />
                  <div className="min-w-0">
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Location</p>
                    <p className="mt-0.5 text-sm font-semibold truncate">{formatUserLocation(selected) || "—"}</p>
                  </div>
                </div>
              </div>
              <button
                onClick={() => setStep("scan")}
                className="haptic-tap mt-4 w-full py-4 rounded-2xl brand-gradient text-white text-sm font-semibold flex items-center justify-center gap-2"
              >
                Continue <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}

          {step === "scan" && (
            <QRScanStage
              instruction="Scan the QR code on the Smart Locker or Cube Robot"
              verifyScan={verifyPodScan}
              onScanned={() => setStep("reserve")}
            />
          )}

          {step === "reserve" && (
            <div className="space-y-4">
              <div className="rounded-2xl bg-[color:var(--primary-soft)]/40 px-4 py-3 flex items-center gap-3">
                <StorageIcon type={pod?.isRobot ? "robot" : "locker"} className="w-11 h-11" imgClassName="w-9 h-9" />
                <div className="min-w-0">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
                    {pod?.isRobot ? "Cube Robot" : "Smart Locker"}
                  </p>
                  <p className="mt-0.5 text-sm font-semibold truncate">{pod?.pod_name ?? "—"}</p>
                </div>
              </div>

              {/* AWB */}
              <div className="rounded-2xl border border-border bg-white px-4 py-3 flex items-center gap-3 focus-within:border-primary">
                <ScanLine className="w-4 h-4 text-primary shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">AWB Number</p>
                  <input
                    value={awb}
                    onChange={(e) => setAwb(e.target.value)}
                    placeholder="Scan or enter AWB number"
                    className="mt-0.5 w-full bg-transparent outline-none text-sm font-semibold"
                  />
                </div>
              </div>
              <AwbScanner onScanned={setAwb} />

              {/* Employee */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => {
                    setUserOpen((v) => !v);
                    setTypeOpen(false);
                  }}
                  className="haptic-tap w-full rounded-2xl border border-border bg-white px-4 py-3 flex items-center gap-3 text-left"
                >
                  <User className="w-4 h-4 text-primary shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Employee</p>
                    <p className="mt-0.5 text-sm font-semibold truncate">
                      {picked ? picked.user_name : loadingUsers ? "Loading employees…" : "Select employee"}
                    </p>
                  </div>
                  <ChevronDown className={cn("w-4 h-4 text-primary transition-transform", userOpen && "rotate-180")} />
                </button>
                {userOpen && (
                  <div className="absolute left-0 right-0 top-full mt-2 z-50 max-h-56 overflow-y-auto hide-scrollbar rounded-2xl bg-white border border-border shadow-[0_18px_44px_-18px_rgba(53,28,117,0.4)]">
                    {users.length === 0 && (
                      <p className="px-4 py-3 text-xs text-muted-foreground">
                        {loadingUsers ? "Loading…" : "No employees at this location"}
                      </p>
                    )}
                    {users.map((u) => (
                      <button
                        key={u.user_phone}
                        onClick={() => {
                          setPicked(u);
                          setUserOpen(false);
                        }}
                        className={cn(
                          "w-full text-left px-4 py-3 haptic-tap flex items-center justify-between gap-2",
                          picked?.user_phone === u.user_phone && "bg-[color:var(--primary-soft)]",
                        )}
                      >
                        <span className="min-w-0">
                          <span className="block text-xs font-semibold truncate">{u.user_name}</span>
                          <span className="block text-[11px] text-muted-foreground">{u.user_phone}</span>
                        </span>
                        {picked?.user_phone === u.user_phone && (
                          <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {picked && (
                <div className="rounded-2xl bg-[color:var(--primary-soft)]/40 px-4 py-3 flex items-center gap-3">
                  <Phone className="w-4 h-4 text-primary shrink-0" />
                  <div className="min-w-0">
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
                      Mobile Number
                    </p>
                    <p className="mt-0.5 text-sm font-semibold truncate">{picked.user_phone}</p>
                  </div>
                </div>
              )}

              {/* Reservation type */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => {
                    setTypeOpen((v) => !v);
                    setUserOpen(false);
                  }}
                  className="haptic-tap w-full rounded-2xl border border-border bg-white px-4 py-3 flex items-center gap-3 text-left"
                >
                  <Package className="w-4 h-4 text-primary shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
                      Reservation Type
                    </p>
                    <p className="mt-0.5 text-sm font-semibold truncate">{resType || "Select type"}</p>
                  </div>
                  <ChevronDown className={cn("w-4 h-4 text-primary transition-transform", typeOpen && "rotate-180")} />
                </button>
                {typeOpen && (
                  <div className="absolute left-0 right-0 top-full mt-2 z-50 max-h-56 overflow-y-auto hide-scrollbar rounded-2xl bg-white border border-border shadow-[0_18px_44px_-18px_rgba(53,28,117,0.4)]">
                    {RESERVATION_TYPES.map((t) => (
                      <button
                        key={t}
                        onClick={() => {
                          setResType(t);
                          setTypeOpen(false);
                        }}
                        className={cn(
                          "w-full text-left px-4 py-3 text-xs font-semibold haptic-tap flex items-center justify-between",
                          resType === t && "bg-[color:var(--primary-soft)]",
                        )}
                      >
                        {t}
                        {resType === t && <CheckCircle2 className="w-4 h-4 text-primary" />}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <button
                onClick={submit}
                disabled={submitting || !awb || !picked || !resType}
                className="haptic-tap w-full py-4 rounded-2xl brand-gradient text-white text-sm font-semibold disabled:opacity-40 flex items-center justify-center gap-2"
              >
                {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <ChevronRight className="w-5 h-5" />}
                Continue
              </button>
            </div>
          )}

          {(step === "retrieve" || step === "drop") && target && (
            <DropHardware
              isRobot={target.isRobot}
              podId={target.podId}
              doorNumber={target.doorNumber}
              onDone={finishDrop}
              onRetrieved={handleRetrieved}
            />
          )}

          {step === "done" && (
            <div className="w-full py-8 rounded-2xl bg-green-50 text-green-700 flex flex-col items-center gap-2 animate-pop-in min-h-[240px] justify-center">
              <CheckCircle2 className="w-10 h-10" />
              <p className="font-semibold text-sm">Parcel dropped successfully</p>
              <p className="text-[11px] text-green-700/70">Returning to dashboard...</p>
            </div>
          )}
        </div>
      </div>
    </Page>
  );
}

function AwbScanner({ onScanned }: { onScanned: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="haptic-tap w-full py-3 rounded-2xl bg-white border border-border text-sm font-semibold text-primary flex items-center justify-center gap-2"
      >
        <ScanLine className="w-4 h-4" /> Scan AWB barcode
      </button>
    );
  }
  return (
    <div>
      <QRScanStage
        instruction="Point the camera at the AWB barcode"
        verifyScan={async (v) => {
          const value = (v || "").trim();
          if (!value) return false;
          onScanned(value);
          return true;
        }}
        onScanned={() => setOpen(false)}
      />
      <button
        onClick={() => setOpen(false)}
        className="haptic-tap mt-3 w-full py-3 rounded-2xl bg-white border border-border text-sm font-semibold text-primary"
      >
        Enter AWB manually
      </button>
    </div>
  );
}

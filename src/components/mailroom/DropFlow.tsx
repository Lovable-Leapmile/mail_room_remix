import { useNavigate } from "@tanstack/react-router";
import { useCallback, useState } from "react";
import { MapPin, ChevronRight, User, Package, CheckCircle2, Loader2, ScanLine, ArrowLeft, X } from "lucide-react";
import logoAsset from "@/assets/leapmile_logo.png.asset.json";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Page } from "@/components/mailroom/AppShell";
import { StorageIcon } from "@/components/mailroom/StorageIcon";
import { QRScanStage } from "@/components/mailroom/QRScanStage";
import { StepTimeline } from "@/components/mailroom/StepTimeline";
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

type Step = "scan" | "reserve" | "retrieve" | "drop" | "done";

type ScannedPod = { pod_id: number; pod_name: string; isRobot: boolean };

type DropTarget = { podId: number; doorNumber?: number; isRobot: boolean };

const STEPS: { key: Step; short: string }[] = [
  { key: "scan", short: "Scan" },
  { key: "reserve", short: "Parcel Details" },
  { key: "retrieve", short: "Opening" },
  { key: "drop", short: "Drop" },
  { key: "done", short: "Done" },
];

export function DropFlow({ title = "Drop Parcel" }: { title?: string }) {
  const nav = useNavigate();
  const user = useMailroom((s) => s.user);
  const courierPhone = user?.regNo ?? "";
  const courierCompany = user?.org?.split("·")[0]?.trim() ?? "Courier";
  const { selected } = useUserLocations(courierPhone);
  const isEmployeeFlow = title === "Send Parcel";
  const userType = isEmployeeFlow ? "delivery" : "customer";
  const userLabel = isEmployeeFlow ? "Courier" : "Employee";
  const userLabelLower = isEmployeeFlow ? "courier" : "employee";
  const { users, loading: loadingUsers } = useLocationUsers(selected?.location_id ?? null, userType);

  const [step, setStep] = useState<Step>("scan");
  const [pod, setPod] = useState<ScannedPod | null>(null);
  const [awb, setAwb] = useState("");
  const [picked, setPicked] = useState<LocationUser | null>(null);
  const [resType, setResType] = useState("");
  const [modal, setModal] = useState<null | "awb" | "user" | "type">(null);
  const [submitting, setSubmitting] = useState(false);
  const [target, setTarget] = useState<DropTarget | null>(null);

  const idx = STEPS.findIndex((s) => s.key === step);

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

  const stepBody = (key: Step) => {
    const step = key;
    return (
      <>

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

              <FieldButton
                icon={<ScanLine className="w-4 h-4 text-primary shrink-0" />}
                value={awb || "Enter AWB Number"}
                filled={!!awb}
                onClick={() => setModal("awb")}
              />

              <FieldButton
                icon={<User className="w-4 h-4 text-primary shrink-0" />}
                value={picked ? picked.user_name : loadingUsers ? `Loading ${userLabelLower}s…` : `Select ${userLabel}`}
                filled={!!picked}
                onClick={() => setModal("user")}
              />

              <FieldButton
                icon={<Package className="w-4 h-4 text-primary shrink-0" />}
                value={resType || "Select Reservation Type"}
                filled={!!resType}
                onClick={() => setModal("type")}
              />

              {modal === "awb" && (
                <AwbModal
                  initial={awb}
                  onClose={() => setModal(null)}
                  onConfirm={(v) => {
                    setAwb(v);
                    setModal(null);
                  }}
                />
              )}
              {modal === "user" && (
                <UserModal
                  users={users}
                  loading={loadingUsers}
                  label={userLabel}
                  labelLower={userLabelLower}
                  onClose={() => setModal(null)}
                  onPick={(u) => {
                    setPicked(u);
                    setModal(null);
                  }}
                />
              )}
              {modal === "type" && (
                <TypeModal
                  selected={resType}
                  onClose={() => setModal(null)}
                  onPick={(t) => {
                    setResType(t);
                    setModal(null);
                  }}
                />
              )}

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
      </>
    );
  };

  return (
    <Page hideNav>
      <div className="-mx-4 -mt-4 sticky top-0 z-30 bg-[color:var(--glass)] border-b border-[color:var(--border)] backdrop-blur-xl">
        <div className="relative flex items-center justify-center px-3 py-2.5">
          <button
            onClick={() => window.history.back()}
            aria-label="Back"
            className="haptic-tap absolute left-3 w-7 h-7 rounded-full bg-[color:var(--primary-soft)] flex items-center justify-center"
          >
            <ArrowLeft className="w-3.5 h-3.5 text-primary" />
          </button>
          <img src={logoAsset.url} alt="Leapmile" className="h-6 w-auto object-contain" />
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between gap-3">
        <h1 className="text-[22px] font-bold tracking-tight">{title}</h1>
        <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
          <MapPin className="w-3 h-3 text-primary shrink-0" />
          <span className="truncate max-w-[140px]">{formatUserLocation(selected) || "—"}</span>
        </div>
      </div>

      <StepTimeline className="mt-4" steps={STEPS} activeIndex={idx} renderBody={(k) => stepBody(k as Step)} />
    </Page>
  );
}

function FieldButton({
  icon,
  value,
  filled,
  onClick,
}: {
  icon: React.ReactNode;
  value: string;
  filled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "haptic-tap w-full rounded-2xl border bg-white px-4 py-3 flex items-center gap-3 text-left",
        filled ? "border-primary" : "border-border",
      )}
    >
      {icon}
      <div className="flex-1 min-w-0">
        <p className={cn("text-sm font-semibold truncate", !filled && "text-muted-foreground")}>{value}</p>
      </div>
      {filled ? <CheckCircle2 className="w-4 h-4 text-primary shrink-0" /> : <ChevronRight className="w-4 h-4 text-primary shrink-0" />}
    </button>
  );
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-[60] bg-black/40 flex items-end animate-fade-in" onClick={onClose}>
      <div
        className="w-full bg-white rounded-t-3xl p-5 max-h-[85vh] overflow-y-auto hide-scrollbar"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <p className="font-semibold text-base">{title}</p>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="mt-4">{children}</div>
      </div>
    </div>
  );
}

function AwbModal({
  initial,
  onClose,
  onConfirm,
}: {
  initial: string;
  onClose: () => void;
  onConfirm: (v: string) => void;
}) {
  const [value, setValue] = useState(initial);
  return (
    <Modal title="Scan AWB" onClose={onClose}>
      <div className="max-w-[220px] mx-auto">
        <QRScanStage
          instruction="Point the camera at the AWB barcode"
          verifyScan={async (v) => {
            const raw = (v || "").trim();
            if (!raw) return false;
            setValue(raw);
            return true;
          }}
          onScanned={() => {}}
        />
      </div>
      <div className="mt-4 rounded-2xl border border-border bg-white px-4 py-3 flex items-center gap-3 focus-within:border-primary">
        <ScanLine className="w-4 h-4 text-primary shrink-0" />
        <div className="flex-1 min-w-0">
          <input
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="Enter AWB Number"
            className="w-full bg-transparent outline-none text-sm font-semibold"
          />
        </div>
      </div>
      <button
        onClick={() => onConfirm(value.trim())}
        disabled={!value.trim()}
        className="haptic-tap mt-4 w-full py-3.5 rounded-2xl brand-gradient text-white text-sm font-semibold disabled:opacity-40"
      >
        OK
      </button>
    </Modal>
  );
}

function UserModal({
  users,
  loading,
  onClose,
  onPick,
}: {
  users: LocationUser[];
  loading: boolean;
  onClose: () => void;
  onPick: (u: LocationUser) => void;
}) {
  const [digits, setDigits] = useState("");
  const matches = digits.length === 4 ? users.filter((u) => u.user_phone.replace(/\D/g, "").endsWith(digits)) : [];
  return (
    <Modal title="Select Employee" onClose={onClose}>
      <div className="rounded-2xl border border-border bg-white px-4 py-3">
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
          Last 4 digits of mobile number
        </p>
        <input
          value={digits}
          onChange={(e) => setDigits(e.target.value.replace(/\D/g, "").slice(0, 4))}
          inputMode="numeric"
          placeholder="0000"
          autoFocus
          className="mt-1 w-full bg-transparent outline-none text-lg font-bold tracking-[0.4em]"
        />
      </div>

      <div className="mt-4 space-y-2">
        {loading && <p className="text-xs text-muted-foreground">Loading employees…</p>}
        {!loading && digits.length < 4 && (
          <p className="text-xs text-muted-foreground">Enter the last 4 digits to find the employee.</p>
        )}
        {!loading && digits.length === 4 && matches.length === 0 && (
          <p className="text-xs text-muted-foreground">No employee found with those digits.</p>
        )}
        {matches.map((u) => (
          <button
            key={u.user_phone}
            onClick={() => onPick(u)}
            className="haptic-tap w-full text-left px-4 py-3 rounded-2xl border border-border bg-white"
          >
            <span className="block text-sm font-semibold truncate">{u.user_name}</span>
          </button>
        ))}
      </div>
    </Modal>
  );
}

function TypeModal({
  selected,
  onClose,
  onPick,
}: {
  selected: string;
  onClose: () => void;
  onPick: (t: string) => void;
}) {
  return (
    <Modal title="Reservation Type" onClose={onClose}>
      <div className="space-y-2">
        {RESERVATION_TYPES.map((t) => (
          <button
            key={t}
            onClick={() => onPick(t)}
            className={cn(
              "haptic-tap w-full text-left px-4 py-3 rounded-2xl border text-sm font-semibold flex items-center justify-between",
              selected === t ? "border-primary bg-[color:var(--primary-soft)] text-primary" : "border-border bg-white",
            )}
          >
            {t}
            {selected === t && <CheckCircle2 className="w-4 h-4 text-primary" />}
          </button>
        ))}
      </div>
    </Modal>
  );
}

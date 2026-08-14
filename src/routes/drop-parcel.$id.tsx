import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { MapPin, CheckCircle2, Loader2, Check } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useMailroom } from "@/lib/mailroom";
import { usePodLocation, formatLocation } from "@/lib/locations";
import { PODCORE_BASE, PUBSUB_BASE, apiHeaders } from "@/lib/api-config";
import { fetchDoorState, retrieveTray, isTrayReady, releaseTray, patchDoorStatus } from "@/lib/robot";
import { Page } from "@/components/mailroom/AppShell";
import { StorageIcon } from "@/components/mailroom/StorageIcon";
import { QRScanStage } from "@/components/mailroom/QRScanStage";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/drop-parcel/$id")({
  head: () => ({
    meta: [
      { title: "Drop Parcel · Leapmile" },
      { name: "description", content: "Guided drop journey for courier parcels into a Smart Locker or Cube Robot." },
      { property: "og:title", content: "Drop Parcel · Leapmile" },
      {
        property: "og:description",
        content: "Guided drop journey for courier parcels into a Smart Locker or Cube Robot.",
      },
    ],
  }),
  component: DropParcelPage,
});

type DropParcel = {
  id: string;
  trackingId: string;
  pickupBy: string;
  reservationType: string;
  storageType: "locker" | "robot";
  storageId: string;
  podId?: number;
  doorNumber?: number;
  locationName?: string;
};

function DropParcelPage() {
  const { id } = Route.useParams();
  const user = useMailroom((s) => s.user);
  const nav = useNavigate();

  const [parcel, setParcel] = useState<DropParcel | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    setLoading(true);
    const phone = user?.regNo ?? "";
    const url = `${PODCORE_BASE}/reservations/?record_id=${encodeURIComponent(id)}&status=active&reservation_status=DropPending&dropby_phone=${encodeURIComponent(phone)}&order_by_field=updated_at&order_by_type=DESC`;
    fetch(url, { headers: apiHeaders })
      .then((r) => r.json())
      .then((d) => {
        const rec: any = Array.isArray(d?.records) ? d.records[0] : Array.isArray(d) ? d[0] : undefined;
        if (!rec) {
          setNotFound(true);
          return;
        }
        const isRobot = /robot/i.test(rec.pod_name || "");
        setParcel({
          id: String(rec.id),
          trackingId: rec.reservation_awbno,
          pickupBy: rec.pick_up_by_name || rec.pickup_by_name || "—",
          reservationType: rec.reservation_type,
          storageType: isRobot ? "robot" : "locker",
          storageId: rec.pod_name,
          podId: rec.pod_id,
          doorNumber: rec.door_number,
          locationName: rec.location_name,
        });
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [id, user?.regNo]);

  if (!parcel) {
    return (
      <Page title="Drop Parcel" back flatHeader>
        <div className="py-20 text-center text-muted-foreground text-sm">
          {loading ? "Loading parcel…" : notFound ? "Drop reservation not found." : "Loading parcel…"}
        </div>
      </Page>
    );
  }

  return (
    <Page title="Drop Parcel" back hideNav flatHeader>
      <LocationCard parcel={parcel} />

      <DropJourney
        isRobot={parcel.storageType === "robot"}
        podId={parcel.podId}
        doorNumber={parcel.doorNumber}
        storageId={parcel.storageId}
        onComplete={() => {
          toast.success("Parcel dropped successfully");
          setTimeout(() => nav({ to: "/dashboard" }), 2000);
        }}
      />

      <SummaryCard parcel={parcel} />
    </Page>
  );
}

function LocationCard({ parcel }: { parcel: DropParcel }) {
  const isRobot = parcel.storageType === "robot";
  const loc = usePodLocation(parcel.podId);
  const detailed = formatLocation(loc) || parcel.locationName;
  return (
    <div className="mt-2 ios-card overflow-hidden">
      <div className="brand-gradient p-5 text-white">
        <div className="flex items-center gap-3">
          <div className="w-14 h-14 rounded-2xl bg-white flex items-center justify-center overflow-hidden shrink-0">
            <StorageIcon type={parcel.storageType} className="w-14 h-14 bg-white" imgClassName="w-12 h-12" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[11px] uppercase tracking-wider text-white/70">
              {isRobot ? "Cube Robot" : "Smart Locker"}
            </p>
            <p className="text-lg font-semibold truncate">{parcel.storageId}</p>
          </div>
        </div>
      </div>
      <div className="p-4">
        <div className="rounded-2xl bg-[color:var(--primary-soft)]/50 p-4">
          <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground uppercase tracking-wider">
            <MapPin className="w-3 h-3" /> Location
          </div>
          <p className="text-sm font-semibold mt-1 leading-snug">{detailed || "Loading location…"}</p>
        </div>
      </div>
    </div>
  );
}

type JourneyStep = { key: string; title: string; short: string; hidden?: boolean };

function DropJourney({
  isRobot,
  podId,
  doorNumber,
  storageId,
  onComplete,
}: {
  isRobot: boolean;
  podId?: number;
  doorNumber?: number;
  storageId?: string;
  onComplete: () => void;
}) {
  const steps: JourneyStep[] = useMemo(
    () =>
      isRobot
        ? [
            { key: "goto", title: "Go to Cube Robot", short: "Locate" },
            { key: "scan", title: "Scan Cube Robot QR", short: "Scan" },
            { key: "retrieving", title: "Retrieving drop tray", short: "Retrieve", hidden: true },
            { key: "open", title: "Door open — drop the parcel", short: "Drop" },
            { key: "done", title: "Dropped", short: "Done" },
          ]
        : [
            { key: "goto", title: "Go to Smart Locker", short: "Locate" },
            { key: "scan", title: "Scan Locker QR", short: "Scan" },
            { key: "open", title: "Door open — drop the parcel", short: "Drop" },
            { key: "done", title: "Dropped", short: "Done" },
          ],
    [isRobot],
  );

  const [idx, setIdx] = useState(0);
  const [pollPhase, setPollPhase] = useState<"idle" | "waiting-open" | "waiting-close" | "stopped">("idle");
  const [trayId, setTrayId] = useState<string | null>(null);
  const [robotPhase, setRobotPhase] = useState<"idle" | "retrieving" | "ready">("idle");
  const completedRef = useRef(false);
  const step = steps[idx];
  const next = () => setIdx((i) => Math.min(i + 1, steps.length - 1));

  // Robot pods: door_state holds the tray id used by the robot manager.
  useEffect(() => {
    if (!isRobot || !podId || !doorNumber) return;
    let cancelled = false;
    fetchDoorState(podId, doorNumber).then((state) => {
      if (!cancelled) setTrayId(state);
    });
    return () => {
      cancelled = true;
    };
  }, [isRobot, podId, doorNumber]);

  // Robot pods: retrieve the drop tray, poll until ready, then mark the door OPEN.
  useEffect(() => {
    if (robotPhase !== "retrieving" || !trayId || !podId || !doorNumber) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const poll = async () => {
      const ready = await isTrayReady(trayId);
      if (cancelled) return;
      if (ready) {
        await patchDoorStatus(podId, doorNumber, "OPEN");
        if (cancelled) return;
        setRobotPhase("ready");
        const target = steps.findIndex((s) => s.key === "open");
        if (target >= 0) setIdx((cur) => (target > cur ? target : cur));
        return;
      }
      timer = setTimeout(poll, 2000);
    };

    retrieveTray(trayId).then(() => {
      if (!cancelled) poll();
    });

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [robotPhase, trayId, podId, doorNumber, steps]);

  const confirmDropped = async () => {
    if (isRobot && podId && doorNumber) {
      if (trayId) await releaseTray(trayId);
      await patchDoorStatus(podId, doorNumber, "CLOSED");
    }
    const target = steps.findIndex((s) => s.key === "done");
    if (target >= 0) setIdx((cur) => (target > cur ? target : cur));
  };

  // Poll PubSub subscribe every 1s: "opened" → PATCH OPEN → "closed" → PATCH CLOSED (lockers only).
  useEffect(() => {
    if (isRobot) return;
    if (!podId || !doorNumber) return;
    if (pollPhase !== "waiting-open" && pollPhase !== "waiting-close") return;

    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const patchStatus = async (status: "OPEN" | "CLOSED") => {
      try {
        await fetch(
          `${PODCORE_BASE}/doors/update_door_status/?door_number=${doorNumber}&pod_id=${podId}&status=${status}`,
          { method: "PATCH", headers: apiHeaders },
        );
      } catch {
        // Non-fatal.
      }
    };

    const poll = async () => {
      try {
        const res = await fetch(`${PUBSUB_BASE}/subscribe?topic=${podId}&num_records=1`, {
          headers: apiHeaders,
        });
        const data = await res.json();
        if (cancelled) return;
        const records: unknown[] = Array.isArray(data)
          ? data
          : Array.isArray(data?.records)
            ? data.records
            : Array.isArray(data?.data)
              ? data.data
              : [];
        const payload = JSON.stringify(records).toLowerCase();

        if (pollPhase === "waiting-open" && payload.includes("opened")) {
          await patchStatus("OPEN");
          if (cancelled) return;
          const target = steps.findIndex((s) => s.key === "open");
          if (target >= 0) setIdx((cur) => (target > cur ? target : cur));
          setPollPhase("waiting-close");
          return;
        }

        if (pollPhase === "waiting-close" && payload.includes("closed")) {
          await patchStatus("CLOSED");
          if (cancelled) return;
          const target = steps.findIndex((s) => s.key === "done");
          if (target >= 0) setIdx((cur) => (target > cur ? target : cur));
          setPollPhase("stopped");
          return;
        }
      } catch {
        // Ignore transient errors; keep polling.
      }
      if (!cancelled) timer = setTimeout(poll, 1000);
    };
    poll();
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [podId, doorNumber, steps, pollPhase]);

  useEffect(() => {
    if (step.key === "done" && !completedRef.current) {
      completedRef.current = true;
      onComplete();
    }
  }, [step.key, onComplete]);

  const stripRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = stripRef.current?.querySelector<HTMLElement>(`[data-step="${idx}"]`);
    el?.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
  }, [idx]);

  const verifyAndSubscribe = async (qrValue: string): Promise<boolean> => {
    try {
      const raw = (qrValue || "").trim();
      if (!raw) return false;
      let scannedPodName = raw;
      try {
        const url = new URL(raw);
        scannedPodName =
          url.searchParams.get("pod_name") ||
          url.searchParams.get("id") ||
          url.pathname.split("/").filter(Boolean).pop() ||
          raw;
      } catch {
        // Not a URL — use raw QR text as pod_name.
      }
      if (!scannedPodName) return false;
      const podsRes = await fetch(
        `${PODCORE_BASE}/pods/?pod_name=${encodeURIComponent(scannedPodName)}&order_by_field=updated_at&order_by_type=DESC`,
        { headers: apiHeaders },
      );
      const podsData = await podsRes.json();
      const records: any[] = Array.isArray(podsData?.records)
        ? podsData.records
        : Array.isArray(podsData)
          ? podsData
          : [];
      const podRec = records[0];
      if (!podRec?.id) {
        toast.error("Pod not found for scanned QR.");
        return false;
      }
      if (podId && podRec.id !== podId) {
        toast.error("Scanned QR does not match this parcel's storage.");
        return false;
      }

      if (podId && doorNumber) {
        if (isRobot) {
          let tray = trayId;
          if (!tray) {
            tray = await fetchDoorState(podId, doorNumber);
            setTrayId(tray);
          }
          if (!tray) {
            toast.error("Could not read the drop tray for this pod.");
            return false;
          }
          setRobotPhase("retrieving");
        } else {
          try {
            await fetch(`${PUBSUB_BASE}/publish?topic=${podId}`, {
              method: "POST",
              headers: { ...apiHeaders, "Content-Type": "application/json" },
              body: JSON.stringify({ action: "open", door: doorNumber }),
            });
          } catch {
            // Non-fatal — polling will still run.
          }
          setPollPhase("waiting-open");
        }
      }
      return true;
    } catch {
      return false;
    }
  };

  return (
    <div className="mt-4 ios-card p-4">
      <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-3 px-1">Drop Journey</p>

      <div ref={stripRef} className="flex items-center gap-1 overflow-x-auto hide-scrollbar pb-1">
        {steps
          .map((s, i) => ({ s, i }))
          .filter((x) => !x.s.hidden)
          .map(({ s, i }, n, arr) => {
            const done = i < idx;
            const active = i === idx || (s.key === "open" && steps[idx]?.key === "retrieving");
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
                    {done ? <Check className="w-3 h-3" /> : n + 1}
                  </div>
                  <span className="text-[11px] font-semibold whitespace-nowrap">{s.short}</span>
                </div>
                {n < arr.length - 1 && <div className={cn("w-3 h-px", done ? "bg-green-400" : "bg-border")} />}
              </div>
            );
          })}
      </div>

      <div className="relative mt-4 overflow-hidden">
        <div key={step.key} className="animate-slide-in-right">
          {step.key === "goto" && (
            <InfoStage
              title={isRobot ? "Walk to the Cube Robot" : "Walk to the Smart Locker"}
              desc="Head to the location shown above. The QR scanner will open automatically when you arrive."
              hint="Ready when you are"
              autoAdvanceMs={2500}
              onAuto={next}
            />
          )}
          {step.key === "scan" && (
            <QRScanStage
              instruction={`Scan the QR code on ${storageId ?? (isRobot ? "the Cube Robot" : "the Smart Locker")}`}
              verifyScan={verifyAndSubscribe}
              onScanned={next}
            />
          )}
          {step.key === "retrieving" && (
            <LoaderStage
              title="Please wait, your drop tray is retrieving"
              desc="The Cube Robot is bringing the drop tray to the station."
            />
          )}
          {step.key === "open" &&
            (isRobot ? (
              <ActionStage
                title="Door open — drop the parcel"
                desc="Place the parcel inside the tray, then confirm below."
                buttonLabel="I've Dropped the Parcel"
                onAction={confirmDropped}
              />
            ) : (
              <StatusStage
                title="Door open — drop the parcel"
                desc="Place the parcel inside and close the door. We'll confirm automatically once it's closed."
              />
            ))}

          {step.key === "done" && <SuccessBanner />}
        </div>
      </div>
    </div>
  );
}

function InfoStage({
  title,
  desc,
  hint,
  autoAdvanceMs,
  onAuto,
}: {
  title: string;
  desc: string;
  hint: string;
  autoAdvanceMs?: number;
  onAuto?: () => void;
}) {
  useEffect(() => {
    if (!autoAdvanceMs || !onAuto) return;
    const t = setTimeout(onAuto, autoAdvanceMs);
    return () => clearTimeout(t);
  }, [autoAdvanceMs, onAuto]);
  return (
    <div className="rounded-2xl bg-[color:var(--primary-soft)]/50 p-5 min-h-[240px] flex flex-col items-center justify-center text-center">
      <div className="w-14 h-14 rounded-2xl bg-white flex items-center justify-center">
        <MapPin className="w-7 h-7 text-primary" />
      </div>
      <p className="mt-3 font-semibold text-sm">{title}</p>
      <p className="mt-1 text-xs text-muted-foreground max-w-[260px]">{desc}</p>
      <div className="mt-4 inline-flex items-center gap-2 text-[11px] text-primary font-semibold">
        <Loader2 className="w-3.5 h-3.5 animate-spin" /> {hint}
      </div>
    </div>
  );
}

function StatusStage({ title, desc }: { title: string; desc: string }) {
  return (
    <div className="rounded-2xl bg-green-50 p-5 min-h-[240px] flex flex-col items-center justify-center text-center">
      <div className="w-14 h-14 rounded-full bg-white flex items-center justify-center">
        <CheckCircle2 className="w-8 h-8 text-green-600" />
      </div>
      <p className="mt-3 font-semibold text-sm text-green-700">{title}</p>
      <p className="mt-1 text-xs text-muted-foreground max-w-[280px]">{desc}</p>
    </div>
  );
}

function LoaderStage({ title, desc }: { title: string; desc: string }) {
  return (
    <div className="rounded-2xl bg-[color:var(--primary-soft)]/50 p-5 min-h-[240px] flex flex-col items-center justify-center text-center">
      <div className="relative w-16 h-16 flex items-center justify-center">
        <div className="absolute inset-0 rounded-full border-4 border-primary/20" />
        <div className="absolute inset-0 rounded-full border-4 border-primary border-t-transparent animate-spin" />
      </div>
      <p className="mt-4 font-semibold text-sm">{title}</p>
      <p className="mt-1 text-xs text-muted-foreground max-w-[280px]">{desc}</p>
    </div>
  );
}

function ActionStage({
  title,
  desc,
  buttonLabel,
  onAction,
}: {
  title: string;
  desc: string;
  buttonLabel: string;
  onAction: () => void;
}) {
  return (
    <div className="rounded-2xl bg-green-50 p-5 min-h-[240px] flex flex-col items-center justify-center text-center">
      <div className="w-14 h-14 rounded-full bg-white flex items-center justify-center">
        <CheckCircle2 className="w-8 h-8 text-green-600" />
      </div>
      <p className="mt-3 font-semibold text-sm text-green-700">{title}</p>
      <p className="mt-1 text-xs text-muted-foreground max-w-[280px]">{desc}</p>
      <button
        onClick={onAction}
        className="mt-4 px-5 py-2.5 rounded-full brand-gradient text-white text-xs font-semibold"
      >
        {buttonLabel}
      </button>
    </div>
  );
}

function SuccessBanner() {
  return (
    <div className="w-full py-8 rounded-2xl bg-green-50 text-green-700 flex flex-col items-center gap-2 animate-pop-in min-h-[240px] justify-center">
      <CheckCircle2 className="w-10 h-10" />
      <p className="font-semibold text-sm">Parcel dropped successfully</p>
      <p className="text-[11px] text-green-700/70">Returning to dashboard...</p>
    </div>
  );
}

function SummaryCard({ parcel }: { parcel: DropParcel }) {
  const rows = [
    { label: "Pickup by", value: parcel.pickupBy },
    { label: "Type", value: parcel.reservationType },
    { label: "AWB", value: parcel.trackingId },
    { label: "Storage", value: parcel.storageId },
    ...(parcel.doorNumber != null ? [{ label: "Door Number", value: String(parcel.doorNumber) }] : []),
  ];
  return (
    <div className="mt-4 ios-card p-5">
      <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-3">Parcel Summary</p>
      <div className="divide-y divide-border/60">
        {rows.map((r) => (
          <div key={r.label} className="flex justify-between py-2.5">
            <span className="text-xs text-muted-foreground">{r.label}</span>
            <span className="text-xs font-semibold text-foreground text-right ml-3 truncate">{r.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

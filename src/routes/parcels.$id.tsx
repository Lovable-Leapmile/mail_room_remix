import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { MapPin, CheckCircle2, Loader2, HelpCircle, X, Check, QrCode, Camera, ArrowLeft } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import jsQR from "jsqr";
import logoAsset from "@/assets/leapmile_logo.png.asset.json";
import { useMailroom, updateParcel } from "@/lib/mailroom";
import { usePodLocation, formatLocation } from "@/lib/locations";
import { PODCORE_BASE, PUBSUB_BASE, apiHeaders } from "@/lib/api-config";
import { fetchDoorState, retrieveTray, isTrayReady, releaseTray, patchDoorStatus } from "@/lib/robot";
import { Page } from "@/components/mailroom/AppShell";
import { StepTimeline } from "@/components/mailroom/StepTimeline";
import { StorageIcon } from "@/components/mailroom/StorageIcon";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/parcels/$id")({
  head: () => ({ meta: [{ title: "Pickup · Leapmile" }] }),
  component: ParcelDetail,
});

interface ApiReservation {
  id: number;
  reservation_type: string;
  reservation_awbno: string;
  reservation_status: string;
  location_name: string;
  pod_name: string;
  pod_id: number;
  door_number: number;
  created_by_name: string;
  drop_by_name: string;
  pickup_otp: string;
  drop_time: string;
  updated_at: string;
  pick_expiry_at: string;
}

type DisplayParcel = {
  id: string;
  trackingId: string;
  sender: string;
  receiver: string;
  courier: string;
  storageType: "locker" | "robot";
  storageId: string;
  status: string;
  otp: string;
  size: string;
  weight: string;
  source: "local" | "api";
  podId?: number;
  doorNumber?: number;
};

function ParcelDetail() {
  const { id } = Route.useParams();
  const user = useMailroom((s) => s.user);
  const localParcel = useMailroom((s) => s.parcels.find((p) => p.id === id));
  const nav = useNavigate();

  const [apiParcel, setApiParcel] = useState<DisplayParcel | null>(null);
  const [loading, setLoading] = useState(false);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (localParcel) return;
    setLoading(true);
    const phone = user?.regNo ?? "";
    const url = `${PODCORE_BASE}/reservations/?record_id=${encodeURIComponent(id)}&status=active&reservation_status=PickupPending&pickupby_phone=${encodeURIComponent(phone)}&order_by_field=updated_at&order_by_type=DESC`;
    fetch(url, { headers: apiHeaders })
      .then((r) => r.json())
      .then((d) => {
        const rec: ApiReservation | undefined = Array.isArray(d?.records) ? d.records[0] : undefined;
        if (!rec) {
          setNotFound(true);
          return;
        }
        const isRobot = /robot/i.test(rec.pod_name || "");
        setApiParcel({
          id: String(rec.id),
          trackingId: rec.reservation_awbno,
          sender: rec.created_by_name || rec.drop_by_name || "—",
          receiver: user?.name ?? "You",
          courier: rec.reservation_type,
          storageType: isRobot ? "robot" : "locker",
          storageId: rec.pod_name,
          status: "Ready for Pickup",
          otp: rec.pickup_otp,
          size: "Medium",
          weight: "—",
          source: "api",
          podId: rec.pod_id,
          doorNumber: rec.door_number,
        });
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [id, localParcel, user?.regNo, user?.name]);

  const parcel: DisplayParcel | null = localParcel
    ? {
        id: localParcel.id,
        trackingId: localParcel.trackingId,
        sender: localParcel.sender,
        receiver: localParcel.receiver,
        courier: localParcel.courier,
        storageType: localParcel.storageType,
        storageId: localParcel.storageId,
        status: localParcel.status,
        otp: localParcel.otp,
        size: localParcel.size,
        weight: localParcel.weight,
        source: "local",
      }
    : apiParcel;

  if (!parcel) {
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
        <h1 className="mt-4 text-[22px] font-bold tracking-tight">Parcel Pickup</h1>
        <div className="py-20 text-center text-muted-foreground text-sm">
          {loading ? "Loading parcel…" : notFound ? "Parcel not found." : "Loading parcel…"}
        </div>
      </Page>
    );
  }

  const isRobot = parcel.storageType === "robot";
  const canPickup =
    parcel.status === "Ready for Pickup" ||
    parcel.status === "Stored in Smart Locker" ||
    parcel.status === "Stored in Cube Robot";

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

      <h1 className="mt-4 text-[22px] font-bold tracking-tight">Parcel Pickup</h1>

      <LocationCard parcel={parcel} />

      {canPickup ? (
        <PickupJourney
          isRobot={isRobot}
          podId={parcel.podId}
          doorNumber={parcel.doorNumber}
          storageId={parcel.storageId}
          onComplete={() => {
            if (parcel.source === "local") {
              updateParcel(parcel.id, { status: "Collected" }, "You");
            }
            toast.success("Parcel collected successfully");
            setTimeout(() => nav({ to: "/dashboard" }), 2000);
          }}
        />
      ) : (
        <div className="mt-4 ios-card p-5 text-center">
          <CheckCircle2 className="w-8 h-8 text-green-600 mx-auto" />
          <p className="mt-2 font-semibold text-sm">This parcel is {parcel.status.toLowerCase()}.</p>
        </div>
      )}

      <SummaryCard parcel={parcel} />

      {canPickup && <NeedHelpCard storageType={parcel.storageType} />}
    </Page>
  );
}

function LocationCard({ parcel }: { parcel: DisplayParcel }) {
  const isRobot = parcel.storageType === "robot";
  const loc = usePodLocation(parcel.podId);
  const detailed = formatLocation(loc);
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

type JourneyStep = { key: string; title: string; short: string };

function PickupJourney({
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
            { key: "retrieving", title: "Retrieving parcel", short: "Retrieve" },
            { key: "arrived", title: "Parcel at Bay Door", short: "Collect" },
            { key: "done", title: "Collected", short: "Done" },
          ]
        : [
            { key: "goto", title: "Go to Smart Locker", short: "Locate" },
            { key: "scan", title: "Scan Locker QR", short: "Scan" },
            { key: "open", title: "Locker unlocked — collect & close door", short: "Open" },
            { key: "done", title: "Collected", short: "Done" },
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

  // Robot pods: read the door_state up-front — it is the tray id used by the robot manager.
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

  // Robot pods: after the QR scan, retrieve the tray and poll until it reaches the station.
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
        const target = steps.findIndex((s) => s.key === "arrived");
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

  // Poll PubSub subscribe API every 1s once the publish has been issued (lockers only).
  // Waits for "opened" → PATCH status=OPEN → wait for "closed" → PATCH status=CLOSED.
  // Cleans up on unmount, cancel, or phase change.
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
        const res = await fetch(`${PUBSUB_BASE}/subscribe?topic=${podId}&num_records=1`, { headers: apiHeaders });
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
          const targetKey = isRobot ? "arrived" : "open";
          const target = steps.findIndex((s) => s.key === targetKey);
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
  }, [podId, doorNumber, isRobot, steps, pollPhase]);

  // Auto-progressions
  useEffect(() => {
    if (step.key === "done" && !completedRef.current) {
      completedRef.current = true;
      onComplete();
    }
  }, [step.key, isRobot, onComplete]);

  const confirmCollected = async () => {
    if (isRobot && podId && doorNumber) {
      if (trayId) await releaseTray(trayId);
      await patchDoorStatus(podId, doorNumber, "CLOSED");
    }
    next();
  };

  // Verify scanned QR against reservation pod, publish door-open command,
  // then start subscribe polling for door status.
  const verifyAndSubscribe = async (qrValue: string): Promise<boolean> => {
    try {
      const raw = (qrValue || "").trim();
      if (!raw) return false;
      // QR may be a raw pod_name, or a URL/string containing it.
      let scannedPodName = raw;
      try {
        const url = new URL(raw);
        scannedPodName =
          url.searchParams.get("pod_name") ||
          url.searchParams.get("id") ||
          url.pathname.split("/").filter(Boolean).pop() ||
          raw;
      } catch {
        // Not a URL — use the raw QR text as pod_name.
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
          // Robot pods use the robot manager, not PubSub.
          let tray = trayId;
          if (!tray) {
            tray = await fetchDoorState(podId, doorNumber);
            setTrayId(tray);
          }
          if (!tray) {
            toast.error("Could not read the tray for this parcel.");
            return false;
          }
          setRobotPhase("retrieving");
        } else {
          try {
            await fetch(`${PUBSUB_BASE}/publish?topic=${podId}`, {
              method: "POST",
              headers: { ...apiHeaders, "Content-Type": "application/json" },
              body: JSON.stringify({ action: "drop", door: doorNumber }),
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
      <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-3 px-1">
        Pickup Journey
      </p>

      <StepTimeline
        steps={steps}
        activeIndex={idx}
        renderBody={(key) => {
          const s = steps.find((x) => x.key === key);
          if (!s) return null;
          return (
            <StagePanel
              step={s}
              isRobot={isRobot}
              storageId={storageId}
              verifyScan={verifyAndSubscribe}
              onScanned={next}
              onConfirmCollected={confirmCollected}
            />
          );
        }}
      />

    </div>
  );
}

function StagePanel({
  step,
  isRobot,
  storageId,
  verifyScan,
  onScanned,
  onConfirmCollected,
}: {
  step: JourneyStep;
  isRobot: boolean;
  storageId?: string;
  verifyScan?: (v: string) => Promise<boolean>;
  onScanned: () => void;
  onConfirmCollected: () => void;
}) {
  switch (step.key) {
    case "goto":
      return (
        <InfoStage
          title={isRobot ? "Walk to the Cube Robot" : "Walk to the Smart Locker"}
          desc="Head to the location shown above. The QR scanner will open automatically when you arrive."
          hint="Ready when you are"
          autoAdvanceMs={2500}
          onAuto={onScanned}
        />
      );
    case "scan":
      return (
        <QRScanStage
          instruction={
            isRobot
              ? `Scan the QR code on ${storageId ?? "the Cube Robot"}`
              : `Scan the QR code on ${storageId ?? "the Smart Locker"}`
          }
          verifyScan={verifyScan}
          onScanned={onScanned}
        />
      );

    case "retrieving":
      return (
        <LoaderStage
          title="Please wait, your parcel tray is retrieving"
          desc="The Cube Robot is bringing your tray to the station. This may take a moment."
        />
      );
    case "arrived":
      return (
        <ActionStage
          tone="success"
          title="Your parcel has arrived"
          desc="Please collect your parcel from the Bay Door."
          buttonLabel="I've Collected My Parcel"
          onAction={onConfirmCollected}
        />
      );
    case "open":
      return (
        <StatusStage
          tone="success"
          title="Locker verified successfully"
          desc="Locker unlocked. Please collect your parcel."
        />
      );
    case "closing":
      return (
        <LoaderStage
          title="Please close the locker door"
          desc="Waiting for the locker system to confirm the door is closed."
        />
      );
    case "done":
      return <SuccessBanner />;
    default:
      return null;
  }
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

function StatusStage({ tone, title, desc }: { tone: "success"; title: string; desc: string }) {
  return (
    <div
      className={cn(
        "rounded-2xl p-5 min-h-[240px] flex flex-col items-center justify-center text-center",
        tone === "success" ? "bg-green-50" : "bg-[color:var(--primary-soft)]/50",
      )}
    >
      <div className="w-14 h-14 rounded-full bg-white flex items-center justify-center">
        <CheckCircle2 className="w-8 h-8 text-green-600" />
      </div>
      <p className={cn("mt-3 font-semibold text-sm", tone === "success" && "text-green-700")}>{title}</p>
      <p className="mt-1 text-xs text-muted-foreground max-w-[280px]">{desc}</p>
    </div>
  );
}

function ActionStage({
  tone,
  title,
  desc,
  buttonLabel,
  onAction,
}: {
  tone: "success";
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
        className="haptic-tap mt-5 w-full py-3.5 rounded-2xl brand-gradient text-white text-sm font-semibold flex items-center justify-center gap-2"
      >
        <CheckCircle2 className="w-5 h-5" /> {buttonLabel}
      </button>
    </div>
  );
}

function QRScanStage({
  instruction,
  verifyScan,
  onScanned,
}: {
  instruction: string;
  verifyScan?: (v: string) => Promise<boolean>;
  onScanned: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scannedRef = useRef(false);
  const [status, setStatus] = useState<"starting" | "scanning" | "denied" | "verifying" | "success" | "invalid">(
    "starting",
  );
  const [attempt, setAttempt] = useState(0);
  const retry = () => {
    scannedRef.current = false;
    setStatus("starting");
    setAttempt((a) => a + 1);
  };

  useEffect(() => {
    let cancelled = false;

    const stop = () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    };

    const tick = () => {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (!video || !canvas || video.readyState !== 4) {
        rafRef.current = requestAnimationFrame(tick);
        return;
      }
      const w = video.videoWidth;
      const h = video.videoHeight;
      if (!w || !h) {
        rafRef.current = requestAnimationFrame(tick);
        return;
      }
      const scale = Math.min(1, 480 / Math.max(w, h));
      canvas.width = Math.floor(w * scale);
      canvas.height = Math.floor(h * scale);
      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      if (!ctx) return;
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const code = jsQR(img.data, canvas.width, canvas.height, { inversionAttempts: "attemptBoth" });
      if (code && !scannedRef.current) {
        scannedRef.current = true;
        stop();
        (async () => {
          if (verifyScan) {
            setStatus("verifying");
            const ok = await verifyScan(code.data);
            if (!ok) {
              setStatus("invalid");
              scannedRef.current = false;
              return;
            }
          }
          setStatus("success");
          setTimeout(onScanned, 600);
        })();
        return;
      }
      rafRef.current = requestAnimationFrame(tick);
    };

    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: "environment" } },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        const video = videoRef.current;
        if (video) {
          video.srcObject = stream;
          video.setAttribute("playsinline", "true");
          await video.play().catch(() => {});
        }
        setStatus("scanning");
        rafRef.current = requestAnimationFrame(tick);
      } catch {
        setStatus("denied");
      }
    })();

    return () => {
      cancelled = true;
      stop();
    };
  }, [onScanned, verifyScan, attempt]);

  return (
    <div className="rounded-2xl overflow-hidden bg-black relative aspect-[3/4] w-full max-w-[340px] mx-auto">
      <video ref={videoRef} className="absolute inset-0 w-full h-full object-cover object-center" muted playsInline />
      <canvas ref={canvasRef} className="hidden" />

      {/* Overlay dim */}
      <div className="absolute inset-0 bg-black/30" />

      {/* Scan frame */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="relative w-[70%] aspect-square">
          {/* Corners */}
          <Corner className="top-0 left-0 border-t-2 border-l-2 rounded-tl-2xl" />
          <Corner className="top-0 right-0 border-t-2 border-r-2 rounded-tr-2xl" />
          <Corner className="bottom-0 left-0 border-b-2 border-l-2 rounded-bl-2xl" />
          <Corner className="bottom-0 right-0 border-b-2 border-r-2 rounded-br-2xl" />
          {/* Scan line */}
          {status === "scanning" && (
            <div className="absolute inset-x-4 top-0 h-0.5 bg-white/90 shadow-[0_0_12px_rgba(255,255,255,0.9)] animate-scan" />
          )}
          {status === "success" && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-16 h-16 rounded-full bg-green-500 flex items-center justify-center animate-pop-in">
                <Check className="w-8 h-8 text-white" />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Top helper */}
      <div className="absolute top-3 left-3 right-3">
        <div className="backdrop-blur-xl bg-white/15 border border-white/20 rounded-2xl px-3 py-2 flex items-center justify-center gap-2">
          <QrCode className="w-4 h-4 text-white shrink-0" />
          <p className="text-[11px] font-semibold text-white leading-tight text-center">{instruction}</p>
        </div>
      </div>

      {/* Bottom status */}
      <div className="absolute bottom-3 left-3 right-3">
        <div className="backdrop-blur-xl bg-white/15 border border-white/20 rounded-2xl px-3 py-2 flex items-center justify-center gap-2">
          {status === "starting" && (
            <>
              <Loader2 className="w-3.5 h-3.5 text-white animate-spin" />
              <p className="text-[11px] font-semibold text-white">Opening camera…</p>
            </>
          )}
          {status === "scanning" && (
            <>
              <Camera className="w-3.5 h-3.5 text-white" />
              <p className="text-[11px] font-semibold text-white">Align the QR within the frame</p>
            </>
          )}
          {status === "verifying" && (
            <>
              <Loader2 className="w-3.5 h-3.5 text-white animate-spin" />
              <p className="text-[11px] font-semibold text-white">Verifying QR…</p>
            </>
          )}
          {status === "success" && (
            <>
              <CheckCircle2 className="w-3.5 h-3.5 text-white" />
              <p className="text-[11px] font-semibold text-white">QR verified</p>
            </>
          )}
          {status === "invalid" && (
            <button onClick={retry} className="text-[11px] font-semibold text-white underline">
              Invalid QR · tap to try again
            </button>
          )}
          {status === "denied" && (
            <button onClick={onScanned} className="text-[11px] font-semibold text-white underline">
              Camera unavailable · tap to continue
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function Corner({ className }: { className?: string }) {
  return <div className={cn("absolute w-7 h-7 border-white", className)} />;
}

function SuccessBanner() {
  return (
    <div className="w-full py-8 rounded-2xl bg-green-50 text-green-700 flex flex-col items-center gap-2 animate-pop-in min-h-[240px] justify-center">
      <CheckCircle2 className="w-10 h-10" />
      <p className="font-semibold text-sm">Parcel collected successfully</p>
      <p className="text-[11px] text-green-700/70">Returning to dashboard...</p>
    </div>
  );
}

function SummaryCard({ parcel }: { parcel: any }) {
  const rows = useMemo(
    () => [
      { label: "Sender", value: parcel.sender },
      { label: "Courier", value: parcel.courier },
      { label: "Parcel ID", value: parcel.trackingId },
      { label: "Size", value: parcel.size },
      { label: "Weight", value: parcel.weight },
      { label: "Storage", value: parcel.storageId },
      ...(parcel.doorNumber != null ? [{ label: "Door Number", value: String(parcel.doorNumber) }] : []),
    ],

    [parcel],
  );
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

function NeedHelpCard({ storageType }: { storageType: "locker" | "robot" }) {
  const [open, setOpen] = useState(false);
  const [issue, setIssue] = useState<string | null>(null);
  const [comment, setComment] = useState("");

  const options =
    storageType === "robot"
      ? [
          "Parcel not delivered to Bay Door",
          "Robot is not responding",
          "Bay Door is blocked",
          "Robot stopped midway",
          "Retrieved wrong parcel",
          "Other",
        ]
      : [
          "Locker door did not open",
          "Entered correct OTP but nothing happened",
          "Locker door is jammed",
          "Locker already open",
          "Wrong locker displayed",
          "Other",
        ];

  const submit = () => {
    toast.success("Issue reported. Support will reach out shortly.");
    setOpen(false);
    setIssue(null);
    setComment("");
  };

  return (
    <>
      <div className="mt-4 ios-card p-4 flex items-center gap-3">
        <div className="w-10 h-10 rounded-2xl bg-[color:var(--primary-soft)] flex items-center justify-center shrink-0">
          <HelpCircle className="w-5 h-5 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold">Need Help?</p>
          <p className="text-[11px] text-muted-foreground">Having trouble collecting your parcel?</p>
        </div>
        <button
          onClick={() => setOpen(true)}
          className="haptic-tap text-xs font-semibold text-primary px-3 py-2 rounded-xl bg-[color:var(--primary-soft)]"
        >
          Report
        </button>
      </div>

      {open && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-end animate-fade-in" onClick={() => setOpen(false)}>
          <div
            className="w-full bg-white rounded-t-3xl p-5 max-h-[85vh] overflow-y-auto animate-slide-in-right"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <p className="font-semibold text-base">Report an Issue</p>
              <button
                onClick={() => setOpen(false)}
                className="w-8 h-8 rounded-full bg-muted flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-muted-foreground mt-1">Select what went wrong.</p>

            <div className="mt-4 space-y-2">
              {options.map((o) => (
                <button
                  key={o}
                  onClick={() => setIssue(o)}
                  className={cn(
                    "haptic-tap w-full text-left px-4 py-3 rounded-2xl border text-sm font-medium transition",
                    issue === o
                      ? "border-primary bg-[color:var(--primary-soft)] text-primary"
                      : "border-border bg-white",
                  )}
                >
                  {o}
                </button>
              ))}
            </div>

            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Add a comment (optional)"
              rows={3}
              className="mt-4 w-full px-4 py-3 rounded-2xl border border-border bg-white text-sm outline-none focus:border-primary resize-none"
            />

            <button
              onClick={submit}
              disabled={!issue}
              className="haptic-tap mt-4 w-full py-4 rounded-2xl brand-gradient text-white text-sm font-semibold disabled:opacity-40"
            >
              Submit Report
            </button>
          </div>
        </div>
      )}
    </>
  );
}

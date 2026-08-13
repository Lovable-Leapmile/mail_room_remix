import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { X, CheckCircle2, Loader2, PackageCheck, Check, QrCode, Camera } from "lucide-react";
import jsQR from "jsqr";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { StorageIcon } from "@/components/mailroom/StorageIcon";
import { completeDrop, type Parcel } from "@/lib/mailroom";

type View = "summary" | "journey";

export function DropParcelSheet({ parcel, open, onClose }: { parcel: Parcel | null; open: boolean; onClose: () => void }) {
  const [view, setView] = useState<View>("summary");

  useEffect(() => {
    if (!open) return;
    setView("summary");
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  if (typeof document === "undefined" || !parcel) return null;
  const isRobot = parcel.storageType === "robot";

  return createPortal(
    <div
      className={cn(
        "fixed inset-0 z-[70] transition-opacity duration-300",
        open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none",
      )}
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" />
      <div
        className={cn(
          "absolute bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[480px] transition-transform duration-300 ease-[cubic-bezier(0.2,0.8,0.2,1)]",
          open ? "translate-y-0" : "translate-y-full",
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="bg-white rounded-t-[28px] shadow-[0_-24px_60px_-20px_rgba(53,28,117,0.35)] overflow-hidden">
          <div className="mx-auto mt-2 h-1 w-10 rounded-full bg-black/10" />
          <div className="flex items-center justify-between px-5 pt-3 pb-2">
            <div>
              <h2 className="text-lg font-semibold tracking-tight">
                {view === "summary" ? "Drop Parcel" : `Drop into ${isRobot ? "Cube Robot" : "Smart Locker"}`}
              </h2>
              <p className="text-[11px] text-muted-foreground truncate">{parcel.receiver} · {parcel.trackingId}</p>
            </div>
            <button
              onClick={onClose}
              className="haptic-tap w-9 h-9 rounded-full bg-[color:var(--primary-soft)] flex items-center justify-center"
              aria-label="Close"
            >
              <X className="w-4 h-4 text-primary" />
            </button>
          </div>

          <div className="px-4 pb-6 max-h-[80vh] overflow-y-auto hide-scrollbar">
            {view === "summary" ? (
              <ParcelSummary parcel={parcel} onStart={() => setView("journey")} />
            ) : (
              <DropJourney parcel={parcel} onComplete={onClose} />
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}

function ParcelSummary({ parcel, onStart }: { parcel: Parcel; onStart: () => void }) {
  const isRobot = parcel.storageType === "robot";
  const rows = [
    { label: "Employee", value: parcel.receiver },
    { label: "AWB", value: parcel.trackingId },
    { label: "Storage Type", value: isRobot ? "Cube Robot" : "Smart Locker" },
    { label: "Assigned", value: parcel.storageId },
    { label: "Location", value: "Leapmile HQ · Ground floor" },
  ];
  return (
    <>
      <div className="mt-2 rounded-2xl overflow-hidden ios-card">
        <div className="brand-gradient p-4 flex items-center gap-3 text-white">
          <div className="w-14 h-14 rounded-2xl bg-white flex items-center justify-center overflow-hidden shrink-0">
            <StorageIcon type={parcel.storageType} className="w-14 h-14 bg-white" imgClassName="w-12 h-12" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] uppercase tracking-wider text-white/70">{isRobot ? "Cube Robot" : "Smart Locker"}</p>
            <p className="text-lg font-semibold truncate">{parcel.storageId}</p>
          </div>
        </div>
        <div className="p-4 divide-y divide-border/60">
          {rows.map((r) => (
            <div key={r.label} className="flex justify-between py-2.5">
              <span className="text-xs text-muted-foreground">{r.label}</span>
              <span className="text-xs font-semibold text-right ml-3 truncate">{r.value}</span>
            </div>
          ))}
        </div>
      </div>
      <button
        onClick={onStart}
        className="haptic-tap mt-5 w-full py-4 rounded-2xl brand-gradient text-white text-sm font-semibold flex items-center justify-center gap-2"
      >
        <PackageCheck className="w-5 h-5" /> Drop Parcel
      </button>
    </>
  );
}

type JourneyStep = { key: string; short: string };

function DropJourney({ parcel, onComplete }: { parcel: Parcel; onComplete: () => void }) {
  const isRobot = parcel.storageType === "robot";
  const steps: JourneyStep[] = useMemo(
    () =>
      isRobot
        ? [
            { key: "scan", short: "Scan" },
            { key: "processing", short: "Prepare" },
            { key: "place", short: "Place" },
            { key: "storing", short: "Store" },
            { key: "done", short: "Done" },
          ]
        : [
            { key: "scan", short: "Scan" },
            { key: "open", short: "Open" },
            { key: "closing", short: "Close" },
            { key: "done", short: "Done" },
          ],
    [isRobot],
  );
  const [idx, setIdx] = useState(0);
  const completedRef = useRef(false);
  const step = steps[idx];
  const next = () => setIdx((i) => Math.min(i + 1, steps.length - 1));

  const stripRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = stripRef.current?.querySelector<HTMLElement>(`[data-step="${idx}"]`);
    el?.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
  }, [idx]);

  // Auto-progressions
  useEffect(() => {
    if (step.key === "processing") {
      const t = setTimeout(next, 2200);
      return () => clearTimeout(t);
    }
    if (step.key === "storing") {
      const t = setTimeout(next, 2200);
      return () => clearTimeout(t);
    }
    if (step.key === "closing") {
      const t = setTimeout(next, 2600);
      return () => clearTimeout(t);
    }
    if (step.key === "done" && !completedRef.current) {
      completedRef.current = true;
      completeDrop(parcel.id, parcel.storageType, "Courier");
      toast.success("Parcel stored successfully");
      const t = setTimeout(onComplete, 1600);
      return () => clearTimeout(t);
    }
  }, [step.key, parcel.id, parcel.storageType, onComplete]);

  return (
    <div className="mt-3">
      <div ref={stripRef} className="flex items-center gap-1 overflow-x-auto hide-scrollbar pb-1">
        {steps.map((s, i) => {
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
                  {done ? <Check className="w-3 h-3" /> : i + 1}
                </div>
                <span className="text-[11px] font-semibold whitespace-nowrap">{s.short}</span>
              </div>
              {i < steps.length - 1 && <div className={cn("w-3 h-px", done ? "bg-green-400" : "bg-border")} />}
            </div>
          );
        })}
      </div>

      <div className="relative mt-4 overflow-hidden">
        <div key={step.key} className="animate-slide-in-right">
          <Stage stepKey={step.key} isRobot={isRobot} parcel={parcel} onScanned={next} />
        </div>
      </div>
    </div>
  );
}

function Stage({
  stepKey,
  isRobot,
  parcel,
  onScanned,
}: {
  stepKey: string;
  isRobot: boolean;
  parcel: Parcel;
  onScanned: () => void;
}) {
  switch (stepKey) {
    case "scan":
      return (
        <QRScanStage
          instruction={`Scan the QR on ${parcel.storageId}`}
          onScanned={onScanned}
        />
      );
    case "processing":
      return (
        <Loader
          title="Processing…"
          desc="Please wait while the Cube Robot prepares to receive your parcel."
        />
      );
    case "place":
      return (
        <Action
          tone="primary"
          title="Place parcel in Bay Door"
          desc="Please place the parcel inside the Bay Door, then tap Done."
          buttonLabel="Parcel Placed"
          onAction={onScanned}
        />
      );
    case "storing":
      return <Loader title="Storing parcel…" desc="The Cube Robot is securing your parcel inside." />;
    case "open":
      return (
        <Status
          title="Locker door opened"
          desc={`Place the parcel inside ${parcel.storageId} for ${parcel.receiver}.`}
        />
      );
    case "closing":
      return (
        <Loader
          title="Please close the locker door"
          desc="Waiting for the locker system to confirm the door is closed."
        />
      );
    case "done":
      return (
        <div className="rounded-2xl bg-green-50 min-h-[220px] flex flex-col items-center justify-center text-center px-6 py-8 animate-pop-in">
          <CheckCircle2 className="w-12 h-12 text-green-600" />
          <p className="mt-3 font-semibold text-sm text-green-700">Parcel stored successfully</p>
          <p className="text-[11px] text-green-700/70 mt-1">Moving reservation to history…</p>
        </div>
      );
    default:
      return null;
  }
  void isRobot;
}

function Loader({ title, desc }: { title: string; desc: string }) {
  return (
    <div className="rounded-2xl bg-[color:var(--primary-soft)]/50 p-5 min-h-[220px] flex flex-col items-center justify-center text-center">
      <div className="relative w-16 h-16 flex items-center justify-center">
        <div className="absolute inset-0 rounded-full border-4 border-primary/20" />
        <div className="absolute inset-0 rounded-full border-4 border-primary border-t-transparent animate-spin" />
      </div>
      <p className="mt-4 font-semibold text-sm">{title}</p>
      <p className="mt-1 text-xs text-muted-foreground max-w-[280px]">{desc}</p>
    </div>
  );
}

function Status({ title, desc }: { title: string; desc: string }) {
  return (
    <div className="rounded-2xl bg-green-50 p-5 min-h-[220px] flex flex-col items-center justify-center text-center">
      <div className="w-14 h-14 rounded-full bg-white flex items-center justify-center">
        <CheckCircle2 className="w-8 h-8 text-green-600" />
      </div>
      <p className="mt-3 font-semibold text-sm text-green-700">{title}</p>
      <p className="mt-1 text-xs text-muted-foreground max-w-[280px]">{desc}</p>
    </div>
  );
}

function Action({
  title,
  desc,
  buttonLabel,
  onAction,
}: {
  tone: "primary";
  title: string;
  desc: string;
  buttonLabel: string;
  onAction: () => void;
}) {
  return (
    <div className="rounded-2xl bg-[color:var(--primary-soft)]/60 p-5 min-h-[220px] flex flex-col items-center justify-center text-center">
      <div className="w-14 h-14 rounded-2xl bg-white flex items-center justify-center">
        <PackageCheck className="w-7 h-7 text-primary" />
      </div>
      <p className="mt-3 font-semibold text-sm">{title}</p>
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

function QRScanStage({ instruction, onScanned }: { instruction: string; onScanned: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scannedRef = useRef(false);
  const [status, setStatus] = useState<"starting" | "scanning" | "denied" | "success">("starting");

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
      const w = video.videoWidth, h = video.videoHeight;
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
        setStatus("success");
        setTimeout(onScanned, 600);
        return;
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: "environment" } }, audio: false,
        });
        if (cancelled) { stream.getTracks().forEach((t) => t.stop()); return; }
        streamRef.current = stream;
        const v = videoRef.current;
        if (v) {
          v.srcObject = stream;
          v.setAttribute("playsinline", "true");
          await v.play().catch(() => {});
        }
        setStatus("scanning");
        rafRef.current = requestAnimationFrame(tick);
      } catch { setStatus("denied"); }
    })();
    return () => { cancelled = true; stop(); };
  }, [onScanned]);

  return (
    <div className="rounded-2xl overflow-hidden bg-black relative aspect-[3/4] w-full max-w-[340px] mx-auto">
      <video ref={videoRef} className="absolute inset-0 w-full h-full object-cover object-center" muted playsInline />
      <canvas ref={canvasRef} className="hidden" />
      <div className="absolute inset-0 bg-black/30" />
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="relative w-[70%] aspect-square">
          <div className="absolute w-7 h-7 border-white top-0 left-0 border-t-2 border-l-2 rounded-tl-2xl" />
          <div className="absolute w-7 h-7 border-white top-0 right-0 border-t-2 border-r-2 rounded-tr-2xl" />
          <div className="absolute w-7 h-7 border-white bottom-0 left-0 border-b-2 border-l-2 rounded-bl-2xl" />
          <div className="absolute w-7 h-7 border-white bottom-0 right-0 border-b-2 border-r-2 rounded-br-2xl" />
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
      <div className="absolute top-3 left-3 right-3">
        <div className="backdrop-blur-xl bg-white/15 border border-white/20 rounded-2xl px-3 py-2 flex items-center gap-2">
          <QrCode className="w-4 h-4 text-white" />
          <p className="text-[11px] font-semibold text-white leading-tight">{instruction}</p>
        </div>
      </div>
      <div className="absolute bottom-3 left-3 right-3">
        <div className="backdrop-blur-xl bg-white/15 border border-white/20 rounded-2xl px-3 py-2 flex items-center justify-center gap-2">
          {status === "starting" && (<><Loader2 className="w-3.5 h-3.5 text-white animate-spin" /><p className="text-[11px] font-semibold text-white">Opening camera…</p></>)}
          {status === "scanning" && (<><Camera className="w-3.5 h-3.5 text-white" /><p className="text-[11px] font-semibold text-white">Align the QR within the frame</p></>)}
          {status === "success" && (<><CheckCircle2 className="w-3.5 h-3.5 text-white" /><p className="text-[11px] font-semibold text-white">QR verified</p></>)}
          {status === "denied" && (
            <button onClick={onScanned} className="text-[11px] font-semibold text-white underline">Camera unavailable · tap to continue</button>
          )}
        </div>
      </div>
    </div>
  );
}

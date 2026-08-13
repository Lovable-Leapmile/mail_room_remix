import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { X, Camera, Loader2, CheckCircle2, ScanLine, User, Phone, MapPin, ChevronDown, Package, Boxes } from "lucide-react";
import jsQR from "jsqr";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { createReservation, useMailroom } from "@/lib/mailroom";
import { useUserLocations, formatUserLocation } from "@/lib/user-locations";
import { useLocationUsers, useLocationPods, createReservationApi, RESERVATION_TYPES, type LocationUser, type LocationPod } from "@/lib/reservations-create";
import { triggerRefresh } from "@/lib/refresh";

type Step = "pod" | "scan" | "details";

export function CreateReservationSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const user = useMailroom((s) => s.user);
  const courierPhone = user?.regNo ?? "";
  const courierCompany = user?.org?.split("·")[0]?.trim() ?? "Courier";
  const { selected } = useUserLocations(courierPhone);
  const { users, loading: loadingUsers } = useLocationUsers(selected?.location_id ?? null);
  const { pods, loading: loadingPods } = useLocationPods(selected?.location_id ?? null);
  const [step, setStep] = useState<Step>("pod");
  const [pod, setPod] = useState<LocationPod | null>(null);
  const [awb, setAwb] = useState("");
  const [picked, setPicked] = useState<LocationUser | null>(null);
  const [userOpen, setUserOpen] = useState(false);
  const [resType, setResType] = useState("");
  const [typeOpen, setTypeOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    setStep("pod");
    setPod(null);
    setAwb("");
    setPicked(null);
    setUserOpen(false);
    setResType("");
    setTypeOpen(false);
    setSubmitting(false);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  const handleScanned = (value: string) => {
    setAwb(value.trim());
    setStep("details");
  };


  const submit = async () => {
    if (!awb || !picked || !resType || !pod) {
      toast.error("Select a pod, scan AWB, pick an employee and a reservation type.");
      return;
    }
    setSubmitting(true);
    const res = await createReservationApi({
      courierPhone,
      pickupPhone: picked.user_phone,
      awb,
      reservationType: resType,
      podId: String(pod.pod_id),
    });

    setSubmitting(false);
    if (!res.ok) {
      toast.error(res.message || "Could not create reservation");
      return;
    }
    createReservation({ awb, receiverName: picked.user_name, receiverPhone: picked.user_phone, courier: courierCompany });
    toast.success("Reservation created");
    triggerRefresh();
    onClose();
  };


  if (typeof document === "undefined") return null;
  return createPortal(
    <div
      className={cn(
        "fixed inset-0 z-[70] transition-opacity duration-300",
        open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none",
      )}
      onClick={onClose}
      aria-hidden={!open}
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
              <h2 className="text-lg font-semibold tracking-tight">New Parcel Reservation</h2>
              <p className="text-[11px] text-muted-foreground">
                {step === "pod"
                  ? "Step 1 of 3 · Select pod"
                  : step === "scan"
                    ? "Step 2 of 3 · Scan parcel barcode"
                    : "Step 3 of 3 · Confirm recipient"}
              </p>

            </div>
            <button
              onClick={onClose}
              className="haptic-tap w-9 h-9 rounded-full bg-[color:var(--primary-soft)] flex items-center justify-center"
              aria-label="Close"
            >
              <X className="w-4 h-4 text-primary" />
            </button>
          </div>

          {step === "pod" ? (
            <div className="px-5 pb-6 pt-2 space-y-3 max-h-[75vh] overflow-y-auto hide-scrollbar">
              <div className="rounded-2xl bg-[color:var(--primary-soft)]/40 px-4 py-3 flex items-center gap-3">
                <MapPin className="w-4 h-4 text-primary shrink-0" />
                <div className="min-w-0">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Location</p>
                  <p className="mt-0.5 text-sm font-semibold truncate">{formatUserLocation(selected) || "—"}</p>
                </div>
              </div>
              <p className="text-[11px] text-muted-foreground px-1">Choose the pod where you'll drop this parcel.</p>
              <div className="rounded-2xl bg-white border border-border overflow-hidden divide-y divide-border">
                {loadingPods && <p className="px-4 py-3 text-xs text-muted-foreground">Loading pods…</p>}
                {!loadingPods && pods.length === 0 && (
                  <p className="px-4 py-3 text-xs text-muted-foreground">No active pods at this location</p>
                )}
                {pods.map((p) => (
                  <button
                    key={p.pod_id}
                    onClick={() => {
                      setPod(p);
                      setStep("scan");
                    }}
                    className="haptic-tap w-full text-left px-4 py-3 flex items-center gap-3"
                  >
                    <Boxes className="w-4 h-4 text-primary shrink-0" />
                    <span className="flex-1 min-w-0 text-sm font-semibold truncate">{p.pod_name}</span>
                    <ChevronDown className="w-4 h-4 text-primary -rotate-90" />
                  </button>
                ))}
              </div>
            </div>
          ) : step === "scan" ? (
            <div className="px-4 pb-5">
              <BarcodeScanner onDetected={handleScanned} active={open && step === "scan"} />
              <button
                onClick={() => handleScanned(`AWB${Math.floor(Math.random() * 1e9)}`)}
                className="haptic-tap mt-3 w-full py-3 rounded-2xl bg-white border border-border text-sm font-semibold text-primary"
              >
                Enter AWB manually
              </button>
            </div>
          ) : (
            <div className="px-5 pb-6 pt-2 space-y-4 max-h-[75vh] overflow-y-auto hide-scrollbar">
              <FieldReadonly label="AWB Number" value={awb} />
              <FieldReadonly label="Pod" value={pod?.pod_name ?? ""} />


              <div className="rounded-2xl bg-[color:var(--primary-soft)]/40 px-4 py-3 flex items-center gap-3">
                <MapPin className="w-4 h-4 text-primary shrink-0" />
                <div className="min-w-0">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Location</p>
                  <p className="mt-0.5 text-sm font-semibold truncate">
                    {formatUserLocation(selected) || "—"}
                  </p>
                </div>
              </div>

              {/* Employee picker */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => { setUserOpen((v) => !v); setTypeOpen(false); }}
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
                        onClick={() => { setPicked(u); setUserOpen(false); }}
                        className={cn(
                          "w-full text-left px-4 py-3 haptic-tap flex items-center justify-between gap-2",
                          picked?.user_phone === u.user_phone && "bg-[color:var(--primary-soft)]",
                        )}
                      >
                        <span className="min-w-0">
                          <span className="block text-xs font-semibold truncate">{u.user_name}</span>
                          <span className="block text-[11px] text-muted-foreground">{u.user_phone}</span>
                        </span>
                        {picked?.user_phone === u.user_phone && <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {picked && (
                <div className="rounded-2xl bg-[color:var(--primary-soft)]/40 px-4 py-3 flex items-center gap-3">
                  <Phone className="w-4 h-4 text-primary shrink-0" />
                  <div className="min-w-0">
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Mobile Number</p>
                    <p className="mt-0.5 text-sm font-semibold truncate">{picked.user_phone}</p>
                  </div>
                </div>
              )}

              {/* Reservation type picker */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => { setTypeOpen((v) => !v); setUserOpen(false); }}
                  className="haptic-tap w-full rounded-2xl border border-border bg-white px-4 py-3 flex items-center gap-3 text-left"
                >
                  <Package className="w-4 h-4 text-primary shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Reservation Type</p>
                    <p className="mt-0.5 text-sm font-semibold truncate">{resType || "Select type"}</p>
                  </div>
                  <ChevronDown className={cn("w-4 h-4 text-primary transition-transform", typeOpen && "rotate-180")} />
                </button>
                {typeOpen && (
                  <div className="absolute left-0 right-0 top-full mt-2 z-50 max-h-56 overflow-y-auto hide-scrollbar rounded-2xl bg-white border border-border shadow-[0_18px_44px_-18px_rgba(53,28,117,0.4)]">
                    {RESERVATION_TYPES.map((t) => (
                      <button
                        key={t}
                        onClick={() => { setResType(t); setTypeOpen(false); }}
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
                {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle2 className="w-5 h-5" />}
                Confirm Parcel Reservation
              </button>

            </div>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}

function FieldReadonly({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-[color:var(--primary-soft)]/40 px-4 py-3">
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">{label}</p>
      <p className="mt-1 text-sm font-semibold truncate">{value || "—"}</p>
    </div>
  );
}

function FieldInput({
  icon: Icon,
  label,
  value,
  onChange,
  placeholder,
  readOnly,
  inputMode,
}: {
  icon: typeof User;
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  readOnly?: boolean;
  inputMode?: "numeric" | "text";
}) {
  return (
    <div className={cn("rounded-2xl border px-4 py-3 flex items-center gap-3", readOnly ? "bg-[color:var(--primary-soft)]/40 border-transparent" : "bg-white border-border focus-within:border-primary")}>
      <Icon className="w-4 h-4 text-primary shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">{label}</p>
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          readOnly={readOnly}
          inputMode={inputMode}
          className="mt-0.5 w-full bg-transparent outline-none text-sm font-semibold"
        />
      </div>
    </div>
  );
}

function BarcodeScanner({ onDetected, active }: { onDetected: (v: string) => void; active: boolean }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const doneRef = useRef(false);
  const [status, setStatus] = useState<"starting" | "scanning" | "denied">("starting");

  useEffect(() => {
    if (!active) return;
    let cancelled = false;
    doneRef.current = false;

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
      if (code && !doneRef.current) {
        doneRef.current = true;
        stop();
        onDetected(code.data);
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
        const v = videoRef.current;
        if (v) {
          v.srcObject = stream;
          v.setAttribute("playsinline", "true");
          await v.play().catch(() => {});
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
  }, [active, onDetected]);

  return (
    <div className="rounded-2xl overflow-hidden bg-black relative aspect-[4/3] w-full max-w-[340px] mx-auto">
      <video ref={videoRef} className="absolute inset-0 w-full h-full object-cover object-center" muted playsInline />
      <canvas ref={canvasRef} className="hidden" />
      <div className="absolute inset-0 bg-black/25" />
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="relative w-[80%] h-[45%]">
          <Corner className="top-0 left-0 border-t-2 border-l-2 rounded-tl-2xl" />
          <Corner className="top-0 right-0 border-t-2 border-r-2 rounded-tr-2xl" />
          <Corner className="bottom-0 left-0 border-b-2 border-l-2 rounded-bl-2xl" />
          <Corner className="bottom-0 right-0 border-b-2 border-r-2 rounded-br-2xl" />
          {status === "scanning" && (
            <div className="absolute inset-x-4 top-0 h-0.5 bg-white/90 shadow-[0_0_12px_rgba(255,255,255,0.9)] animate-scan" />
          )}
        </div>
      </div>
      <div className="absolute top-3 left-3 right-3">
        <div className="backdrop-blur-xl bg-white/15 border border-white/20 rounded-2xl px-3 py-2 flex items-center gap-2">
          <ScanLine className="w-4 h-4 text-white" />
          <p className="text-[11px] font-semibold text-white">Point camera at the AWB barcode</p>
        </div>
      </div>
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
              <p className="text-[11px] font-semibold text-white">Scanning…</p>
            </>
          )}
          {status === "denied" && (
            <p className="text-[11px] font-semibold text-white">Camera unavailable · use manual entry</p>
          )}
        </div>
      </div>
    </div>
  );
}

function Corner({ className }: { className?: string }) {
  return <div className={cn("absolute w-7 h-7 border-white", className)} />;
}

import { useEffect, useRef, useState } from "react";
import jsQR from "jsqr";
import { CheckCircle2, Loader2, QrCode, Camera, Check } from "lucide-react";
import { cn } from "@/lib/utils";

export function QRScanStage({
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
  const [status, setStatus] = useState<"starting" | "scanning" | "denied" | "verifying" | "success" | "invalid">("starting");
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
    <div className="rounded-2xl overflow-hidden bg-black relative aspect-[3/4] w-full max-w-[280px] mx-auto">
      <video ref={videoRef} className="absolute inset-0 w-full h-full object-cover object-center" muted playsInline />
      <canvas ref={canvasRef} className="hidden" />
      <div className="absolute inset-0 bg-black/30" />
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="relative w-[70%] aspect-square">
          <Corner className="top-0 left-0 border-t-2 border-l-2 rounded-tl-2xl" />
          <Corner className="top-0 right-0 border-t-2 border-r-2 rounded-tr-2xl" />
          <Corner className="bottom-0 left-0 border-b-2 border-l-2 rounded-bl-2xl" />
          <Corner className="bottom-0 right-0 border-b-2 border-r-2 rounded-br-2xl" />
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
        <div className="backdrop-blur-xl bg-white/15 border border-white/20 rounded-2xl px-3 py-2 flex items-center justify-center gap-2">
          <QrCode className="w-4 h-4 text-white shrink-0" />
          <p className="text-[11px] font-semibold text-white leading-tight text-center">{instruction}</p>
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

export function Corner({ className }: { className?: string }) {
  return <div className={cn("absolute w-7 h-7 border-white", className)} />;
}


import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Page } from "@/components/mailroom/AppShell";
import { COURIER_LIST, addParcel, allocateStorage, type StorageType } from "@/lib/mailroom";
import { Check, Truck, Package } from "lucide-react";
import { StorageIcon } from "@/components/mailroom/StorageIcon";
import { toast } from "sonner";
import { QRCodeSVG } from "qrcode.react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/book")({
  head: () => ({ meta: [{ title: "Book Pickup · Leapmile" }] }),
  component: Book,
});

function Book() {
  const nav = useNavigate();
  const [step, setStep] = useState(0);
  const [courier, setCourier] = useState("");
  const [type, setType] = useState<StorageType>("locker");
  const [size, setSize] = useState<"Small" | "Medium" | "Large">("Small");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState<{ storageId: string; otp: string; type: StorageType; trackingId: string } | null>(null);

  const next = () => {
    if (step === 0 && !courier) return toast.error("Select a courier");
    if (step === 1) return confirm();
    setStep(step + 1);
  };

  const confirm = () => {
    setLoading(true);
    setTimeout(() => {
      const storageId = allocateStorage(type);
      const parcel = addParcel({
        trackingId: "LMP" + Math.floor(Math.random() * 1e9),
        sender: "You", receiver: "Courier Pickup", courier, storageType: type, storageId,
        status: "Ready for Pickup", pickupDeadline: new Date(Date.now() + 24 * 3600_000).toISOString(),
        direction: "outgoing", size, weight: size === "Small" ? "0.5 kg" : size === "Medium" ? "1.5 kg" : "3.0 kg",
      });
      setLoading(false);
      setDone({ storageId, otp: parcel.otp, type, trackingId: parcel.trackingId });
    }, 1400);
  };


  if (done) {
    return (
      <Page title="Booking Confirmed" back hideNav>
        <div className="mt-6 ios-card p-6 text-center animate-pop-in">
          <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto">
            <Check className="w-8 h-8 text-green-600" />
          </div>
          <h2 className="mt-4 text-lg font-semibold">Storage reserved</h2>
          <p className="text-sm text-muted-foreground mt-1">Deposit your parcel to the location below.</p>
          <div className="mt-5 rounded-2xl bg-[color:var(--primary-soft)] p-4">
            <p className="text-xs text-muted-foreground">Location</p>
            <p className="text-lg font-semibold text-primary">{done.storageId}</p>
          </div>
          {done.type === "robot" ? (
            <div className="mt-4">
              <p className="text-xs text-muted-foreground mb-2">Show this QR to the Cube Robot</p>
              <div className="inline-flex p-3 rounded-2xl bg-white border border-border">
                <QRCodeSVG value={`LMP:${done.trackingId}:${done.otp}`} size={160} fgColor="#351C75" />
              </div>
            </div>
          ) : (
            <div className="mt-3 flex justify-center gap-2">
              {done.otp.split("").map((d, i) => <div key={i} className="w-10 h-12 rounded-xl bg-white border border-border flex items-center justify-center font-semibold">{d}</div>)}
            </div>
          )}
          <button onClick={() => nav({ to: "/parcels" })} className="haptic-tap mt-6 w-full py-4 rounded-2xl brand-gradient text-white font-semibold">View my parcels</button>
        </div>
      </Page>
    );
  }

  return (
    <Page title="Book Pickup" back hideNav>
      <div className="mt-2 flex items-center gap-2">
        {[0, 1].map((n) => <div key={n} className={`flex-1 h-1.5 rounded-full ${step >= n ? "brand-gradient" : "bg-muted"}`} />)}
      </div>

      {step === 0 && (
        <div className="mt-6 animate-slide-up">
          <p className="text-sm font-semibold mb-3 flex items-center gap-2"><Truck className="w-4 h-4 text-primary" /> Select courier</p>
          <div className="grid grid-cols-2 gap-2">
            {COURIER_LIST.map((c) => (
              <button key={c} onClick={() => setCourier(c)} className={cn("p-4 rounded-2xl bg-white border text-sm font-medium", courier === c ? "border-primary bg-[color:var(--primary-soft)] text-primary" : "border-border")}>{c}</button>
            ))}
          </div>
          <p className="text-sm font-semibold mt-6 mb-3 flex items-center gap-2"><Package className="w-4 h-4 text-primary" /> Parcel size</p>
          <div className="grid grid-cols-3 gap-2">
            {(["Small", "Medium", "Large"] as const).map((s) => (
              <button key={s} onClick={() => setSize(s)} className={cn("py-3 rounded-2xl text-sm font-medium border", size === s ? "border-primary bg-[color:var(--primary-soft)] text-primary" : "bg-white border-border")}>{s}</button>
            ))}
          </div>
        </div>
      )}

      {step === 1 && (
        <div className="mt-6 animate-slide-up">
          <p className="text-sm font-semibold mb-3">Storage type</p>
          <div className="grid grid-cols-2 gap-3">
            <button onClick={() => setType("locker")} className={cn("p-5 rounded-2xl border text-left", type === "locker" ? "border-primary bg-[color:var(--primary-soft)]" : "bg-white border-border")}>
              <StorageIcon type="locker" className="w-12 h-12" imgClassName="w-10 h-10" />
              <p className="mt-3 font-semibold text-sm">Smart Locker</p>
              <p className="text-[11px] text-muted-foreground">Instant, contactless</p>
            </button>
            <button onClick={() => setType("robot")} className={cn("p-5 rounded-2xl border text-left", type === "robot" ? "border-primary bg-[color:var(--primary-soft)]" : "bg-white border-border")}>
              <StorageIcon type="robot" className="w-12 h-12" imgClassName="w-10 h-10" />
              <p className="mt-3 font-semibold text-sm">Cube Robot</p>
              <p className="text-[11px] text-muted-foreground">Automated retrieval</p>
            </button>
          </div>
          <div className="mt-6 ios-card p-4">
            <p className="text-xs text-muted-foreground">Summary</p>
            <div className="mt-2 text-sm space-y-1">
              <div className="flex justify-between"><span className="text-muted-foreground">Courier</span><span className="font-medium">{courier}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Size</span><span className="font-medium">{size}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Storage</span><span className="font-medium">{type === "robot" ? "Cube Robot" : "Smart Locker"}</span></div>
            </div>
          </div>
        </div>
      )}

      <button onClick={next} disabled={loading} className="haptic-tap mt-8 w-full py-4 rounded-2xl brand-gradient text-white font-semibold shadow-[0_18px_40px_-12px_rgba(53,28,117,0.55)] disabled:opacity-70">
        {loading ? "Allocating storage…" : step === 1 ? "Confirm booking" : "Continue"}
      </button>
    </Page>
  );
}

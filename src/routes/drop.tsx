import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Page } from "@/components/mailroom/AppShell";
import { EmptyState } from "@/components/mailroom/ParcelCard";
import { useMailroom, completeDrop, allocateStorage, type StorageType, type Parcel } from "@/lib/mailroom";
import { Bot, Boxes, CheckCircle2, PackageCheck, ChevronRight, Copy, ShieldCheck, ChevronLeft } from "lucide-react";
import { StorageIcon } from "@/components/mailroom/StorageIcon";
import { QRCodeSVG } from "qrcode.react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/drop")({
  head: () => ({ meta: [{ title: "Drop Parcels · Leapmile" }] }),
  validateSearch: (s: Record<string, unknown>) => ({ parcelId: typeof s.parcelId === "string" ? s.parcelId : undefined }),
  component: DropFlow,
});

type Step = "select" | "method" | "cube-qr" | "cube-confirm" | "locker-otp" | "locker-open" | "done";

function DropFlow() {
  const nav = useNavigate();
  const { parcelId: initialParcelId } = Route.useSearch();
  const user = useMailroom((s) => s.user);
  const parcels = useMailroom((s) => s.parcels);
  const courierCompany = user?.org?.split("·")[0]?.trim() ?? "";
  const pending = parcels.filter(
    (p) => p.status === "Pending Drop" && (user?.role !== "Courier" || p.courier === courierCompany),
  );

  const preselected = initialParcelId ? pending.find((p) => p.id === initialParcelId) ?? null : null;
  const [step, setStep] = useState<Step>(preselected ? "method" : "select");
  const [parcelId, setParcelId] = useState<string | null>(preselected?.id ?? null);
  const [method, setMethod] = useState<StorageType>(preselected?.storageType === "robot" ? "robot" : "locker");
  const [dropped, setDropped] = useState<{ parcel: Parcel; storageId: string; otp: string } | null>(null);
  const [sessionOtp, setSessionOtp] = useState<string>("");
  const [sessionLocker, setSessionLocker] = useState<string>("");
  const [otpInput, setOtpInput] = useState<string>("");

  const selectedParcel = pending.find((p) => p.id === parcelId) ?? null;

  const finalizeDrop = () => {
    if (!selectedParcel) return;
    const res = completeDrop(selectedParcel.id, method, `Courier · ${user?.name ?? "You"}`);
    setDropped({ parcel: selectedParcel, ...res });
    setStep("done");
    toast.success("Parcel dropped");
  };

  // Step: SELECT
  if (step === "select") {
    return (
      <Page title="Ready to Drop" back>
        <p className="text-xs text-muted-foreground px-1 mt-2">Tap a parcel to drop it. Each parcel is dropped individually for its receiver.</p>
        <div className="mt-3 space-y-2">
          {pending.length === 0 ? (
            <EmptyState icon={PackageCheck} title="No pending drops" subtitle="All caught up — no parcels waiting to be dropped." />
          ) : (
            pending.map((p) => (
              <button
                key={p.id}
                onClick={() => {
                  setParcelId(p.id);
                  setMethod(p.storageType === "robot" ? "robot" : "locker");
                  setStep("method");
                }}
                className="haptic-tap w-full text-left ios-card p-4 flex gap-3 items-center transition"
              >
                <div className="w-11 h-11 rounded-2xl bg-[color:var(--primary-soft)] flex items-center justify-center shrink-0">
                  <PackageCheck className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm truncate">{p.receiver}</p>
                  <p className="text-xs text-muted-foreground truncate">{p.sender} · {p.trackingId}</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">{p.size} · {p.weight}</p>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
              </button>
            ))
          )}
        </div>
      </Page>
    );
  }

  if (!selectedParcel) {
    return (
      <Page title="Drop" back>
        <EmptyState icon={PackageCheck} title="Parcel not found" subtitle="Please pick another parcel to drop." />
        <button onClick={() => setStep("select")} className="haptic-tap mt-6 w-full py-4 rounded-2xl brand-gradient text-white font-semibold">Back to list</button>
      </Page>
    );
  }

  // Step: METHOD
  if (step === "method") {
    return (
      <Page title="Choose Destination" back hideNav>
        <button onClick={() => setStep("select")} className="haptic-tap mt-2 text-xs text-primary flex items-center gap-1"><ChevronLeft className="w-3 h-3" /> Change parcel</button>
        <div className="mt-3 ios-card p-4">
          <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Dropping for</p>
          <p className="mt-1 font-semibold text-sm">{selectedParcel.receiver}</p>
          <p className="text-xs text-muted-foreground">{selectedParcel.sender} · {selectedParcel.trackingId}</p>
        </div>
        <p className="text-xs text-muted-foreground px-1 mt-4">Where do you want to drop this parcel?</p>
        <div className="mt-3 space-y-3">
          <MethodCard active={method === "robot"} onClick={() => setMethod("robot")} type="robot" title="Cube Robot" desc="Scan a QR at the bay. The robot stores the parcel automatically." />
          <MethodCard active={method === "locker"} onClick={() => setMethod("locker")} type="locker" title="Smart Locker" desc="Enter an OTP on the locker keypad. Door opens for placement." />
        </div>

        <button
          onClick={() => {
            if (method === "robot") setStep("cube-qr");
            else {
              const o = Math.floor(100000 + Math.random() * 900000).toString();
              setSessionOtp(o);
              setSessionLocker(allocateStorage("locker"));
              setOtpInput("");
              setStep("locker-otp");
            }
          }}
          className="haptic-tap mt-6 w-full py-4 rounded-2xl brand-gradient text-white font-semibold flex items-center justify-center gap-2"
        >
          Continue <ChevronRight className="w-4 h-4" />
        </button>
      </Page>
    );
  }

  // Step: CUBE QR
  if (step === "cube-qr") {
    const payload = `LMP-DROP:${selectedParcel.trackingId}`;
    return (
      <Page title="Cube Drop" back hideNav>
        <div className="mt-4 text-center">
          <h2 className="text-xl font-semibold">Show QR at Cube Bay</h2>
          <p className="text-sm text-muted-foreground mt-1">For {selectedParcel.receiver} · Cube Robot</p>
          <div className="mt-6 inline-flex p-4 rounded-3xl bg-white border border-border shadow-sm">
            <QRCodeSVG value={payload} size={220} fgColor="#351C75" />
          </div>
          <p className="text-xs text-muted-foreground mt-4 max-w-xs mx-auto leading-relaxed">
            Hold the QR steady in front of the Cube Robot scanner. Once verified, the bay door will open and the tray will extend for you to place the parcel.
          </p>
          <button onClick={() => setStep("cube-confirm")} className="haptic-tap mt-8 w-full py-4 rounded-2xl brand-gradient text-white font-semibold">
            Simulate Scan at Bay
          </button>
        </div>
      </Page>
    );
  }

  // Step: CUBE CONFIRM
  if (step === "cube-confirm") {
    return (
      <Page title="Place Parcel" back hideNav>
        <div className="mt-6 text-center">
          <div className="w-28 h-28 rounded-full bg-[color:var(--primary-soft)] mx-auto flex items-center justify-center animate-pop-in">
            <Bot className="w-14 h-14 text-primary animate-float" />
          </div>
          <h2 className="mt-6 text-xl font-semibold">Bay door open · Tray extended</h2>
          <p className="text-sm text-muted-foreground mt-2 max-w-xs mx-auto leading-relaxed">
            Place the parcel for <span className="font-semibold text-foreground">{selectedParcel.receiver}</span> on the tray, then tap Confirm Drop. The tray will retract and the robot will store it automatically.
          </p>
          <button onClick={finalizeDrop} className="haptic-tap mt-10 w-full py-4 rounded-2xl brand-gradient text-white font-semibold flex items-center justify-center gap-2">
            <CheckCircle2 className="w-5 h-5" /> Confirm Drop
          </button>
        </div>
      </Page>
    );
  }

  // Step: LOCKER OTP
  if (step === "locker-otp") {
    const verify = () => {
      if (otpInput === sessionOtp) setStep("locker-open");
      else { toast.error("Incorrect OTP"); setOtpInput(""); }
    };
    return (
      <Page title="Locker Drop" back hideNav>
        <div className="mt-4 text-center">
          <div className="w-16 h-16 rounded-3xl brand-gradient mx-auto flex items-center justify-center text-white">
            <ShieldCheck className="w-8 h-8" />
          </div>
          <h2 className="mt-5 text-xl font-semibold">OTP sent to your mobile</h2>
          <p className="text-sm text-muted-foreground mt-1">Go to locker <span className="font-semibold text-foreground">{sessionLocker}</span> and enter the OTP on the keypad.</p>
          <p className="text-xs text-muted-foreground mt-1">For {selectedParcel.receiver} · {selectedParcel.trackingId}</p>

          <div className="mt-6 ios-card p-5">
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Your one-time password</p>
            <div className="mt-3 flex items-center justify-center gap-2">
              {sessionOtp.split("").map((d, i) => (
                <div key={i} className="w-10 h-12 rounded-xl bg-[color:var(--primary-soft)] flex items-center justify-center font-semibold text-lg text-primary">{d}</div>
              ))}
              <button onClick={() => { navigator.clipboard?.writeText(sessionOtp); toast.success("OTP copied"); }} className="haptic-tap ml-2 w-10 h-10 rounded-full bg-white border border-border flex items-center justify-center">
                <Copy className="w-4 h-4" />
              </button>
            </div>
            <p className="text-[11px] text-muted-foreground mt-3">Also sent via SMS to your registered number.</p>
          </div>

          <div className="mt-6 text-left">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1">Simulate keypad entry</p>
            <input
              value={otpInput}
              onChange={(e) => setOtpInput(e.target.value.replace(/\D/g, "").slice(0, 6))}
              inputMode="numeric"
              maxLength={6}
              placeholder="Enter 6-digit OTP"
              className="mt-2 w-full px-4 py-3 rounded-2xl bg-white border border-border text-center tracking-[0.5em] font-semibold outline-none focus:border-primary"
            />
            <button onClick={verify} disabled={otpInput.length !== 6} className="haptic-tap mt-4 w-full py-4 rounded-2xl brand-gradient text-white font-semibold disabled:opacity-40">
              Verify at Locker
            </button>
          </div>
        </div>
      </Page>
    );
  }

  // Step: LOCKER OPEN
  if (step === "locker-open") {
    return (
      <Page title="Locker Open" back hideNav>
        <div className="mt-6 text-center">
          <div className="w-28 h-28 rounded-full bg-[color:var(--primary-soft)] mx-auto flex items-center justify-center animate-pop-in">
            <Boxes className="w-14 h-14 text-primary animate-float" />
          </div>
          <h2 className="mt-6 text-xl font-semibold">Door unlocked — {sessionLocker}</h2>
          <p className="text-sm text-muted-foreground mt-2 max-w-xs mx-auto leading-relaxed">
            Place the parcel for <span className="font-semibold text-foreground">{selectedParcel.receiver}</span> inside and close the door. Once the locker detects the door is securely closed, the drop will complete automatically.
          </p>
          <button onClick={finalizeDrop} className="haptic-tap mt-10 w-full py-4 rounded-2xl brand-gradient text-white font-semibold flex items-center justify-center gap-2">
            <CheckCircle2 className="w-5 h-5" /> I've closed the door
          </button>
        </div>
      </Page>
    );
  }

  // Step: DONE
  return (
    <Page title="Drop Complete" back hideNav>
      <div className="mt-6 text-center">
        <div className="w-28 h-28 rounded-full bg-green-100 mx-auto flex items-center justify-center animate-pop-in">
          <CheckCircle2 className="w-14 h-14 text-green-600" />
        </div>
        <h2 className="mt-6 text-xl font-semibold">Drop successful</h2>
        <p className="text-sm text-muted-foreground mt-1">Stored in {method === "robot" ? "Cube Robot" : "Smart Locker"} for {dropped?.parcel.receiver}.</p>

        {dropped && (
          <div className="mt-6 ios-card p-4 text-left">
            <div className="flex justify-between text-sm">
              <div className="min-w-0">
                <p className="truncate font-medium">{dropped.parcel.receiver}</p>
                <p className="text-xs text-muted-foreground truncate">{dropped.parcel.trackingId}</p>
              </div>
              <span className="text-xs text-primary font-semibold shrink-0 ml-2">{dropped.storageId}</span>
            </div>
          </div>
        )}

        <div className="mt-6 grid grid-cols-2 gap-3">
          <button
            onClick={() => {
              setDropped(null);
              setParcelId(null);
              setOtpInput("");
              setStep("select");
            }}
            className="haptic-tap py-3.5 rounded-2xl bg-white border border-border text-sm font-semibold"
          >
            Drop Another
          </button>
          <button onClick={() => nav({ to: "/dashboard" })} className="haptic-tap py-3.5 rounded-2xl brand-gradient text-white text-sm font-semibold">Done</button>
        </div>
      </div>
    </Page>
  );
}

function MethodCard({ active, onClick, type, title, desc }: { active: boolean; onClick: () => void; type: "robot" | "locker"; title: string; desc: string }) {
  return (
    <button onClick={onClick} className={cn("haptic-tap w-full text-left ios-card p-4 flex gap-3 items-start transition", active && "ring-2 ring-primary")}>
      <StorageIcon type={type} className="w-12 h-12" imgClassName="w-10 h-10" />
      <div className="flex-1">
        <p className="font-semibold text-sm">{title}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>
      </div>
      <div className={cn("w-5 h-5 rounded-full border-2 mt-1", active ? "bg-primary border-primary" : "border-muted-foreground/40")} />
    </button>
  );
}

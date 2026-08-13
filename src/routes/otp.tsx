import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Page } from "@/components/mailroom/AppShell";
import { useMailroom, updateParcel } from "@/lib/mailroom";
import { CheckCircle2, Bot, Boxes } from "lucide-react";
import { StorageIcon } from "@/components/mailroom/StorageIcon";
import { toast } from "sonner";
import { z } from "zod";
import { QRCodeSVG } from "qrcode.react";

const search = z.object({ id: z.string().optional() });

export const Route = createFileRoute("/otp")({
  validateSearch: search,
  head: () => ({ meta: [{ title: "Verify OTP · Leapmile" }] }),
  component: Otp,
});

function Otp() {
  const { id } = Route.useSearch();
  const nav = useNavigate();
  const parcel = useMailroom((s) => s.parcels.find((p) => p.id === id) ?? s.parcels[0]);
  const [digits, setDigits] = useState<string[]>(["", "", "", "", "", ""]);
  const [state, setState] = useState<"input" | "verifying" | "opening" | "done">("input");
  const refs = useRef<(HTMLInputElement | null)[]>([]);

  const value = digits.join("");
  useEffect(() => {
    if (value.length === 6 && state === "input") verify();
  }, [value]); // eslint-disable-line

  const set = (i: number, v: string) => {
    if (!/^\d?$/.test(v)) return;
    const nx = [...digits];
    nx[i] = v;
    setDigits(nx);
    if (v && i < 5) refs.current[i + 1]?.focus();
  };

  const verify = () => {
    setState("verifying");
    setTimeout(() => {
      if (parcel && value === parcel.otp) {
        setState("opening");
        setTimeout(() => {
          if (parcel) updateParcel(parcel.id, { status: parcel.direction === "incoming" ? "Collected" : "Delivered" }, "You");
          setState("done");
          setTimeout(() => nav({ to: "/parcels" }), 1600);
        }, 1800);
      } else {
        toast.error("Incorrect OTP");
        setDigits(["", "", "", "", "", ""]);
        setState("input");
        refs.current[0]?.focus();
      }
    }, 900);
  };

  if (!parcel) return <Page title="Verify" back><div className="py-20 text-center text-muted-foreground">No parcel selected.</div></Page>;

  if (state === "opening" || state === "done") {
    return (
      <Page title="Verifying" back hideNav>
        <div className="flex flex-col items-center pt-16 text-center">
          {state === "opening" ? (
            <>
              <div className="animate-pop-in animate-float">
                <StorageIcon type={parcel.storageType} className="w-28 h-28" imgClassName="w-24 h-24" />
              </div>
              <h2 className="mt-6 text-xl font-semibold">{parcel.storageType === "robot" ? "Robot retrieving your parcel" : "Opening locker"}</h2>
              <p className="text-sm text-muted-foreground mt-1">{parcel.storageId}</p>
              <div className="mt-8 flex gap-1.5">
                {[0, 1, 2].map((i) => <div key={i} className="w-2 h-2 rounded-full bg-primary animate-pulse" style={{ animationDelay: `${i * 200}ms` }} />)}
              </div>
            </>
          ) : (
            <>
              <div className="w-28 h-28 rounded-full bg-green-100 flex items-center justify-center animate-pop-in">
                <CheckCircle2 className="w-14 h-14 text-green-600" />
              </div>
              <h2 className="mt-6 text-xl font-semibold">Parcel collected</h2>
              <p className="text-sm text-muted-foreground mt-1">Thank you. Have a great day!</p>
            </>
          )}
        </div>
      </Page>
    );
  }

  if (parcel.storageType === "robot") {
    const simulate = () => {
      setState("opening");
      setTimeout(() => {
        updateParcel(parcel.id, { status: parcel.direction === "incoming" ? "Collected" : "Delivered" }, "You");
        setState("done");
        setTimeout(() => nav({ to: "/parcels" }), 1600);
      }, 1800);
    };
    return (
      <Page title="Cube QR Access" back hideNav>
        <div className="mt-6 text-center">
          <h2 className="text-xl font-semibold">Show QR to Cube Robot</h2>
          <p className="text-sm text-muted-foreground mt-1">Parcel <span className="text-primary font-medium">{parcel.trackingId}</span></p>
          <div className="mt-6 inline-flex p-4 rounded-3xl bg-white border border-border shadow-sm">
            <QRCodeSVG value={`LMP:${parcel.trackingId}:${parcel.otp}`} size={220} fgColor="#351C75" />
          </div>
          <p className="text-xs text-muted-foreground mt-4">Hold the QR steady in front of the Cube scanner</p>
          <button onClick={simulate} className="haptic-tap mt-8 w-full py-4 rounded-2xl brand-gradient text-white font-semibold">
            Simulate Cube Scan
          </button>
        </div>
      </Page>
    );
  }

  return (
    <Page title="Verify OTP" back hideNav>
      <div className="mt-6 text-center">
        <div className="w-16 h-16 rounded-3xl brand-gradient mx-auto flex items-center justify-center text-white font-bold text-xl">6</div>
        <h2 className="mt-6 text-xl font-semibold">Enter 6-digit OTP</h2>
        <p className="text-sm text-muted-foreground mt-1">Sent for parcel <span className="text-primary font-medium">{parcel.trackingId}</span></p>

        <div className="mt-8 flex gap-2 justify-center">
          {digits.map((d, i) => (
            <input
              key={i}
              ref={(el) => { refs.current[i] = el; }}
              value={d}
              onChange={(e) => set(i, e.target.value)}
              onKeyDown={(e) => { if (e.key === "Backspace" && !d && i > 0) refs.current[i - 1]?.focus(); }}
              inputMode="numeric"
              maxLength={1}
              className="w-11 h-14 text-center text-xl font-semibold rounded-2xl bg-white border border-border focus:border-primary focus:ring-2 focus:ring-[color:var(--primary-soft)] outline-none"
            />
          ))}
        </div>

        <p className="text-xs text-muted-foreground mt-6">Hint: {parcel.otp}</p>
        <div className="mt-3 text-xs text-muted-foreground">{state === "verifying" ? "Verifying…" : "OTP auto-verifies on entry"}</div>
      </div>
    </Page>
  );
}

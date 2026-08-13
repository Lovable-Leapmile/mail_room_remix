import { useState } from "react";
import { Bot, Boxes, ArrowUpRight, Clock, Package, ShieldCheck, MapPin } from "lucide-react";
import { statusColor, formatWhen, type Parcel } from "@/lib/mailroom";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { StorageIcon } from "./StorageIcon";

export function employeeOutgoingLabel(status: Parcel["status"]): string {
  if (status === "Ready for Pickup" || status === "Stored in Smart Locker" || status === "Stored in Cube Robot") {
    return "Pickup pending by courier";
  }
  if (status === "Collected" || status === "Delivered" || status === "Dropped") {
    return "Picked by courier";
  }
  return status;
}

export function OutgoingParcelCard({ p, plain }: { p: Parcel; plain?: boolean }) {
  const [open, setOpen] = useState(false);
  const c = statusColor(p.status);
  const label = employeeOutgoingLabel(p.status);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="haptic-tap block w-full text-left"
      >
        <div className={cn("p-4 flex gap-3", !plain && "ios-card")}>
          <StorageIcon type={p.storageType} className="w-12 h-12" imgClassName="w-10 h-10" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <p className="font-semibold text-sm truncate">{p.receiver}</p>
              <ArrowUpRight className="w-4 h-4 text-secondary shrink-0" />
            </div>
            <p className="text-xs text-muted-foreground truncate">{p.courier} · {p.storageId}</p>
            <div className="flex items-center justify-between mt-2">
              <span className={cn("text-[11px] font-semibold px-2 py-1 rounded-full flex items-center gap-1.5", c.bg, c.fg)}>
                <span className={cn("w-1.5 h-1.5 rounded-full", c.dot)} />
                {label}
              </span>
              <span className="text-[11px] text-muted-foreground">{formatWhen(p.updatedAt)}</span>
            </div>
          </div>
        </div>
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="rounded-3xl p-0 overflow-hidden max-w-sm">
          <div className="brand-gradient p-5 text-white">
            <DialogHeader>
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-white/20">{label}</span>
                <span className="text-[11px] text-white/80">Outgoing</span>
              </div>
              <DialogTitle className="text-left mt-4 text-white text-xl font-semibold">{p.receiver}</DialogTitle>
              <DialogDescription className="text-left text-white/80 text-xs">
                {p.courier} · {p.trackingId}
              </DialogDescription>
            </DialogHeader>
          </div>

          <div className="p-5 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Info label="Storage" value={p.storageId} icon={p.storageType === "robot" ? Bot : Boxes} />
              <Info label="Size" value={`${p.size} · ${p.weight}`} icon={Package} />
              <Info label="Booked" value={formatWhen(p.createdAt)} icon={Clock} />
              <Info label="Deadline" value={formatWhen(p.pickupDeadline)} icon={ShieldCheck} />
            </div>

            <div className="rounded-2xl bg-[color:var(--primary-soft)] p-4 flex items-center gap-3">
              <MapPin className="w-5 h-5 text-primary shrink-0" />
              <p className="text-xs text-muted-foreground leading-relaxed">
                {p.status === "Collected" || p.status === "Delivered" || p.status === "Dropped"
                  ? "The courier has picked up this parcel. No further action needed."
                  : "Your parcel is placed and waiting. The courier will collect it — no action required from you."}
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

function Info({ label, value, icon: Icon }: { label: string; value: string; icon: typeof Bot }) {
  return (
    <div>
      <div className="flex items-center gap-1.5 text-muted-foreground text-[11px]">
        <Icon className="w-3.5 h-3.5" /> {label}
      </div>
      <p className="text-sm font-semibold mt-0.5">{value}</p>
    </div>
  );
}

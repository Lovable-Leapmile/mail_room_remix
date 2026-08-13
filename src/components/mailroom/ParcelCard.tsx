import { Link } from "@tanstack/react-router";
import { Package, ArrowUpRight, ArrowDownLeft } from "lucide-react";
import { statusColor, formatWhen, type Parcel } from "@/lib/mailroom";
import { cn } from "@/lib/utils";
import { StorageIcon } from "./StorageIcon";

export function ParcelCard({ p, statusLabel, primary, secondary, arrow, plain }: { p: Parcel; statusLabel?: string; primary?: string; secondary?: string; arrow?: "incoming" | "outgoing"; plain?: boolean }) {
  const c = statusColor(p.status);
  const name = primary ?? (p.direction === "incoming" ? p.sender : p.receiver);
  const sub = secondary ?? `${p.courier} · ${p.storageId}`;
  const direction = arrow ?? p.direction;
  return (
    <Link to="/parcels/$id" params={{ id: p.id }} className="haptic-tap block">
      <div className={cn("p-4 flex gap-3", !plain && "ios-card")}>
        <StorageIcon type={p.storageType} className="w-12 h-12" imgClassName="w-10 h-10" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <p className="font-semibold text-sm truncate">{name}</p>
            {direction === "incoming" ? <ArrowDownLeft className="w-4 h-4 text-primary shrink-0" /> : <ArrowUpRight className="w-4 h-4 text-secondary shrink-0" />}
          </div>
          <p className="text-xs text-muted-foreground truncate">{sub}</p>
          <div className="flex items-center justify-between mt-2">
            <span className={cn("text-[11px] font-semibold px-2 py-1 rounded-full flex items-center gap-1.5", c.bg, c.fg)}>
              <span className={cn("w-1.5 h-1.5 rounded-full", c.dot)} />
              {statusLabel ?? p.status}
            </span>
            <span className="text-[11px] text-muted-foreground">{formatWhen(p.updatedAt)}</span>
          </div>
        </div>
      </div>
    </Link>
  );
}

export function EmptyState({ icon: Icon = Package, title, subtitle }: { icon?: typeof Package; title: string; subtitle?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="w-20 h-20 rounded-3xl bg-[color:var(--primary-soft)] flex items-center justify-center animate-float mb-4">
        <Icon className="w-8 h-8 text-primary" />
      </div>
      <p className="font-semibold">{title}</p>
      {subtitle && <p className="text-sm text-muted-foreground mt-1 max-w-xs">{subtitle}</p>}
    </div>
  );
}

export function Shimmer({ className }: { className?: string }) {
  return <div className={cn("shimmer rounded-2xl", className)} />;
}

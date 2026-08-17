import { useEffect, useRef, useState } from "react";
import { ChevronDown, MapPin, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { useUserLocations, formatUserLocation } from "@/lib/user-locations";

export function LocationSwitcher({ phone, fallback = "" }: { phone?: string | null; fallback?: string }) {
  const { locations, selected, select } = useUserLocations(phone);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  const label = formatUserLocation(selected) || fallback;
  if (!label) return null;

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => locations.length > 1 && setOpen((v) => !v)}
        className="haptic-tap flex items-center gap-1 max-w-full text-left"
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <MapPin className="w-3 h-3 text-primary shrink-0" />
        <span className="text-[11px] text-muted-foreground truncate">{label}</span>
        {locations.length > 1 && (
          <ChevronDown className={cn("w-3 h-3 text-primary shrink-0 transition-transform", open && "rotate-180")} />
        )}
      </button>

      {open && (
        <div className="absolute left-0 top-full mt-2 z-50 w-[240px] rounded-2xl bg-white border border-border shadow-[0_18px_44px_-18px_rgba(53,28,117,0.4)] overflow-hidden">
          {locations.map((l) => {
            const active = selected?.location_id === l.location_id;
            return (
              <button
                key={l.location_id}
                onClick={() => {
                  select(l.location_id);
                  setOpen(false);
                }}
                className={cn(
                  "w-full text-left px-3.5 py-3 flex items-start gap-2 haptic-tap",
                  active && "bg-[color:var(--primary-soft)]",
                )}
              >
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold truncate">{l.location_name}</p>
                  <p className="text-[11px] text-muted-foreground truncate">{l.location_address}</p>
                </div>
                {active && <Check className="w-3.5 h-3.5 text-primary mt-0.5 shrink-0" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

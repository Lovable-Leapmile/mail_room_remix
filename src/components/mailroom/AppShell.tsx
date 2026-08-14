import { Link, useNavigate } from "@tanstack/react-router";
import {
  Package,
  Bell,
  ArrowLeft,
  PlusCircle,
  X,
  ShieldAlert,
  ChevronRight,
  LogOut,
  Settings,
  HelpCircle,
  ShieldCheck,
  History as HistoryIcon,
} from "lucide-react";
import { toast } from "sonner";
import { setState } from "@/lib/mailroom";
import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { useMailroom, markAllRead, formatWhen } from "@/lib/mailroom";
import { usePickupNotifications, formatPickupBody } from "@/lib/pickup-notifications";
import { useUserLocation, formatLocation } from "@/lib/locations";
import { cn } from "@/lib/utils";

function ProfileLocation() {
  const user = useMailroom((s) => s.user);
  const loc = useUserLocation(user?.regNo);
  const text = formatLocation(loc) || user?.org || "";
  if (!text) return null;
  return <p className="mt-2 text-xs text-muted-foreground">{text}</p>;
}

function NotificationsSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const pickups = usePickupNotifications();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (typeof document === "undefined") return null;
  return createPortal(
    <div
      className={cn(
        "fixed inset-0 z-[60] transition-opacity duration-300",
        open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none",
      )}
      onClick={onClose}
      aria-hidden={!open}
    >
      <div className="absolute inset-0 bg-black/30 backdrop-blur-[2px]" />
      <div
        className={cn(
          "absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-[480px] transition-transform duration-300 ease-[cubic-bezier(0.2,0.8,0.2,1)]",
          open ? "translate-y-0" : "-translate-y-full",
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-3 mt-3 rounded-[28px] bg-white shadow-[0_24px_60px_-20px_rgba(53,28,117,0.35)] overflow-hidden">
          <div className="flex items-center justify-between px-5 pt-4 pb-2">
            <div>
              <h2 className="text-lg font-semibold tracking-tight">Notifications</h2>
              <p className="text-[11px] text-muted-foreground">{pickups.length} ready for pickup</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={onClose}
                className="haptic-tap w-9 h-9 rounded-full bg-[color:var(--primary-soft)] flex items-center justify-center"
                aria-label="Close"
              >
                <X className="w-4 h-4 text-primary" />
              </button>
            </div>
          </div>
          <div className="mx-auto mt-1 h-1 w-10 rounded-full bg-black/10" />
          <div className="max-h-[70vh] overflow-y-auto px-3 pb-4 pt-3 space-y-2">
            {pickups.length === 0 ? (
              <div className="py-12 text-center">
                <div className="w-14 h-14 rounded-2xl bg-[color:var(--primary-soft)] mx-auto flex items-center justify-center">
                  <Bell className="w-6 h-6 text-primary" />
                </div>
                <p className="mt-3 text-sm font-semibold">You're all caught up</p>
                <p className="text-xs text-muted-foreground">No parcels ready for pickup right now.</p>
              </div>
            ) : (
              pickups.map((n) => (
                <Link
                  key={n.id}
                  to="/parcels/$id"
                  params={{ id: String(n.id) }}
                  onClick={onClose}
                  className="haptic-tap block rounded-2xl p-3.5 flex gap-3 bg-[color:var(--primary-soft)]/60"
                >
                  <div className="w-10 h-10 rounded-2xl bg-white flex items-center justify-center shrink-0">
                    <Package className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-semibold text-sm truncate">Parcel ready for pickup</p>
                      <span className="w-2 h-2 rounded-full bg-primary shrink-0" />
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">{formatPickupBody(n)}</p>
                    <p className="text-[11px] text-muted-foreground mt-1">{formatWhen(n.updated_at)}</p>
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}

export function ProfileSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const user = useMailroom((s) => s.user);
  const nav = useNavigate();
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  const go = (to: "/parcels" | "/history" | "/settings" | "/help") => {
    onClose();
    nav({ to });
  };
  const logout = () => {
    onClose();
    setState({ loggedIn: false });
    toast("Signed out");
    nav({ to: "/login" });
  };

  if (typeof document === "undefined") return null;
  return createPortal(
    <div
      className={cn(
        "fixed inset-0 z-[60] transition-opacity duration-300",
        open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none",
      )}
      onClick={onClose}
      aria-hidden={!open}
    >
      <div className="absolute inset-0 bg-black/30 backdrop-blur-[2px]" />
      <div
        className={cn(
          "absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-[480px] transition-transform duration-300 ease-[cubic-bezier(0.2,0.8,0.2,1)]",
          open ? "translate-y-0" : "-translate-y-full",
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-3 mt-3 rounded-[28px] bg-white shadow-[0_24px_60px_-20px_rgba(53,28,117,0.35)] overflow-hidden">
          <div className="flex items-center justify-between px-5 pt-4 pb-2">
            <h2 className="text-lg font-semibold tracking-tight">Profile</h2>
            <button
              onClick={onClose}
              className="haptic-tap w-9 h-9 rounded-full bg-[color:var(--primary-soft)] flex items-center justify-center"
              aria-label="Close"
            >
              <X className="w-4 h-4 text-primary" />
            </button>
          </div>
          <div className="mx-auto mt-1 h-1 w-10 rounded-full bg-black/10" />
          <div className="max-h-[80vh] overflow-y-auto hide-scrollbar px-4 pb-5 pt-3">
            <div className="ios-card p-5 text-center">
              <div className="mx-auto w-20 h-20 rounded-full brand-gradient flex items-center justify-center text-white text-2xl font-semibold shadow-[0_12px_30px_-10px_rgba(53,28,117,0.55)]">
                {user?.avatar}
              </div>
              <h3 className="mt-3 text-lg font-semibold">{user?.name}</h3>
              <p className="text-xs text-muted-foreground">{user?.email}</p>
              <div className="mt-3 inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[color:var(--primary-soft)] text-primary text-[11px] font-semibold">
                <ShieldCheck className="w-3.5 h-3.5" /> {user?.role} · Verified
              </div>
              <ProfileLocation />
            </div>

            <div className="mt-4 ios-card divide-y divide-border">
              <ProfileRow icon={Package} label="My Parcels" onClick={() => go("/parcels")} />
              <ProfileRow icon={HistoryIcon} label="Booking History" onClick={() => go("/history")} />
              <ProfileRow icon={Settings} label="Settings" onClick={() => go("/settings")} />
              <ProfileRow icon={HelpCircle} label="Help Center" onClick={() => go("/help")} />
            </div>

            <button
              onClick={logout}
              className="haptic-tap mt-4 w-full py-3.5 rounded-2xl bg-white border border-border text-red-600 font-semibold text-sm flex items-center justify-center gap-2"
            >
              <LogOut className="w-4 h-4" /> Sign out
            </button>
            <p className="text-center text-[11px] text-muted-foreground mt-3">Leapmile Mailroom · v1.0.0</p>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}

function ProfileRow({ icon: Icon, label, onClick }: { icon: typeof Package; label: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="w-full flex items-center justify-between p-4 haptic-tap text-left">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-[color:var(--primary-soft)] flex items-center justify-center">
          <Icon className="w-4 h-4 text-primary" />
        </div>
        <span className="text-sm font-medium">{label}</span>
      </div>
      <ChevronRight className="w-4 h-4 text-muted-foreground" />
    </button>
  );
}

function EmployeeBottomBar() {
  const unread = usePickupNotifications().length;
  const [openNotif, setOpenNotif] = useState(false);
  return (
    <>
      <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[480px] z-40 px-4 pb-4">
        <div className="flex items-stretch gap-3 p-2 rounded-[28px] bg-white/25 backdrop-blur-2xl border border-white/35 shadow-[0_8px_32px_-12px_rgba(53,28,117,0.18)]">
          <Link
            to="/book"
            className="haptic-tap flex-[0.8] rounded-[22px] brand-gradient text-white font-semibold text-sm flex items-center justify-center gap-2 py-3.5 shadow-[0_12px_28px_-10px_rgba(53,28,117,0.5)]"
          >
            <PlusCircle className="w-5 h-5" />
            Send Parcel
          </Link>
          <button
            onClick={() => setOpenNotif(true)}
            className="haptic-tap relative flex-[0.2] min-w-[56px] rounded-[22px] bg-white/70 flex items-center justify-center"
            aria-label="Alerts"
          >
            <Bell className="w-5 h-5 text-primary" />
            {unread > 0 && (
              <span className="absolute top-2.5 right-3 min-w-[16px] h-[16px] px-1 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center">
                {unread}
              </span>
            )}
          </button>
        </div>
      </nav>
      <NotificationsSheet open={openNotif} onClose={() => setOpenNotif(false)} />
    </>
  );
}

function CourierBottomBar() {
  return (
    <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[480px] z-40 px-4 pb-4">
      <div className="flex items-stretch p-2 rounded-[28px] bg-white/25 backdrop-blur-2xl border border-white/35 shadow-[0_8px_32px_-12px_rgba(53,28,117,0.18)]">
        <Link
          to="/drop-new"
          className="haptic-tap flex-1 rounded-[22px] brand-gradient text-white font-semibold text-sm flex items-center justify-center gap-2 py-3.5 shadow-[0_12px_28px_-10px_rgba(53,28,117,0.5)]"
          aria-label="Add Parcel to Drop"
        >
          <PlusCircle className="w-5 h-5" />
          Drop Parcel
        </Link>
      </div>
    </nav>
  );
}

export function BottomNav() {
  const role = useMailroom((s) => s.user?.role);
  if (role === "Courier") return <CourierBottomBar />;
  return <EmployeeBottomBar />;
}

export function TopBar({
  title,
  back = false,
  right,
  flat = false,
}: {
  title: string;
  back?: boolean;
  right?: ReactNode;
  flat?: boolean;
}) {
  return (
    <div className="sticky top-0 z-30 pt-safe">
      <div
        className={cn(
          "flex items-center justify-between px-4 py-3",
          flat
            ? "w-full bg-[color:var(--glass)] border-b border-[color:var(--border)] backdrop-blur-xl"
            : "glass-card mx-4 mt-3 rounded-3xl",
        )}
      >
        <div className="flex items-center gap-2">
          {back && (
            <button
              onClick={() => window.history.back()}
              className="haptic-tap w-9 h-9 rounded-full bg-[color:var(--primary-soft)] flex items-center justify-center"
            >
              <ArrowLeft className="w-4 h-4 text-primary" />
            </button>
          )}
          <h1 className="text-lg font-semibold tracking-tight">{title}</h1>
        </div>
        {right}
      </div>
    </div>
  );
}

export function Page({
  children,
  title,
  back,
  right,
  hideNav,
  fixedHeader,
  flatHeader,
}: {
  children: ReactNode;
  title?: string;
  back?: boolean;
  right?: ReactNode;
  hideNav?: boolean;
  fixedHeader?: ReactNode;
  flatHeader?: boolean;
}) {
  return (
    <div className="app-shell pb-32">
      {title && <TopBar title={title} back={back} right={right} flat={flatHeader} />}
      {fixedHeader && (
        <div className="sticky top-0 z-40 bg-[color:var(--background)]/80 backdrop-blur-xl px-4 pt-4 pb-2">
          {fixedHeader}
        </div>
      )}
      <div className={cn("px-4 animate-slide-up", fixedHeader ? "pt-2" : "pt-4")}>{children}</div>
      {!hideNav && <BottomNav />}
    </div>
  );
}

export function StatusPill({
  label,
  tone = "primary",
}: {
  label: string;
  tone?: "primary" | "green" | "amber" | "red";
}) {
  const tones = {
    primary: "bg-[color:var(--primary-soft)] text-primary",
    green: "bg-green-50 text-green-700",
    amber: "bg-amber-50 text-amber-700",
    red: "bg-red-50 text-red-700",
  } as const;
  return <span className={cn("text-[11px] font-semibold px-2.5 py-1 rounded-full", tones[tone])}>{label}</span>;
}

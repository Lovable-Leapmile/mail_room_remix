import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { Page } from "@/components/mailroom/AppShell";
import { useMailroom, setState } from "@/lib/mailroom";
import { ChevronRight, LogOut, Settings, HelpCircle, Bell, ShieldCheck, Package, History } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/profile")({
  head: () => ({ meta: [{ title: "Profile · Leapmile" }] }),
  component: Profile,
});

function Profile() {
  const user = useMailroom((s) => s.user);
  const nav = useNavigate();
  const logout = () => { setState({ loggedIn: false }); toast("Signed out"); nav({ to: "/login" }); };

  return (
    <Page title="Profile">
      <div className="mt-2 ios-card p-5 text-center">
        <div className="mx-auto w-20 h-20 rounded-full brand-gradient flex items-center justify-center text-white text-2xl font-semibold shadow-[0_12px_30px_-10px_rgba(53,28,117,0.55)]">
          {user?.avatar}
        </div>
        <h2 className="mt-3 text-lg font-semibold">{user?.name}</h2>
        <p className="text-xs text-muted-foreground">{user?.email}</p>
        <div className="mt-3 inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[color:var(--primary-soft)] text-primary text-[11px] font-semibold">
          <ShieldCheck className="w-3.5 h-3.5" /> {user?.role} · Verified
        </div>
        <p className="mt-2 text-xs text-muted-foreground">{user?.org}</p>
      </div>

      <div className="mt-4 ios-card divide-y divide-border">
        <Row to="/parcels" icon={Package} label="My Parcels" />
        <Row to="/history" icon={History} label="Booking History" />
        <Row to="/notifications" icon={Bell} label="Notifications" />
        <Row to="/settings" icon={Settings} label="Settings" />
        <Row to="/help" icon={HelpCircle} label="Help Center" />
      </div>

      <button onClick={logout} className="haptic-tap mt-4 w-full py-3.5 rounded-2xl bg-white border border-border text-red-600 font-semibold text-sm flex items-center justify-center gap-2">
        <LogOut className="w-4 h-4" /> Sign out
      </button>
      <p className="text-center text-[11px] text-muted-foreground mt-3">Leapmile Mailroom · v1.0.0</p>
    </Page>
  );
}

function Row({ to, icon: Icon, label }: { to: "/parcels" | "/history" | "/notifications" | "/settings" | "/help"; icon: typeof Package; label: string }) {
  return (
    <Link to={to} className="flex items-center justify-between p-4 haptic-tap">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-[color:var(--primary-soft)] flex items-center justify-center">
          <Icon className="w-4 h-4 text-primary" />
        </div>
        <span className="text-sm font-medium">{label}</span>
      </div>
      <ChevronRight className="w-4 h-4 text-muted-foreground" />
    </Link>
  );
}

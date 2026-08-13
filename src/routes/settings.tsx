import { createFileRoute } from "@tanstack/react-router";
import { Page } from "@/components/mailroom/AppShell";
import { useState } from "react";
import { Bell, Moon, Fingerprint, Globe, Trash2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/settings")({
  head: () => ({ meta: [{ title: "Settings · Leapmile" }] }),
  component: Settings,
});

function Settings() {
  const [notif, setNotif] = useState(true);
  const [bio, setBio] = useState(true);
  const [dark, setDark] = useState(false);

  return (
    <Page title="Settings" back>
      <div className="mt-2 ios-card divide-y divide-border">
        <Toggle icon={Bell} label="Push notifications" value={notif} onChange={setNotif} />
        <Toggle icon={Fingerprint} label="Biometric sign in" value={bio} onChange={setBio} />
        <Toggle icon={Moon} label="Dark mode" value={dark} onChange={setDark} />
      </div>

      <div className="mt-4 ios-card divide-y divide-border">
        <Row icon={Globe} label="Language" value="English (India)" />
        <Row icon={Bell} label="Notification sound" value="Chime" />
      </div>

      <button onClick={() => { localStorage.removeItem("leapmile.state.v1"); toast("Local data cleared. Reload the app."); }} className="haptic-tap mt-4 w-full py-3.5 rounded-2xl bg-white border border-border text-red-600 font-semibold text-sm flex items-center justify-center gap-2">
        <Trash2 className="w-4 h-4" /> Clear local prototype data
      </button>
    </Page>
  );
}

function Toggle({ icon: Icon, label, value, onChange }: { icon: typeof Bell; label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between p-4">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-[color:var(--primary-soft)] flex items-center justify-center">
          <Icon className="w-4 h-4 text-primary" />
        </div>
        <span className="text-sm font-medium">{label}</span>
      </div>
      <button onClick={() => onChange(!value)} className={`w-11 h-6 rounded-full transition ${value ? "brand-gradient" : "bg-muted"}`}>
        <span className={`block w-5 h-5 rounded-full bg-white shadow transition-transform ${value ? "translate-x-5" : "translate-x-0.5"}`} />
      </button>
    </div>
  );
}

function Row({ icon: Icon, label, value }: { icon: typeof Bell; label: string; value: string }) {
  return (
    <div className="flex items-center justify-between p-4">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-[color:var(--primary-soft)] flex items-center justify-center">
          <Icon className="w-4 h-4 text-primary" />
        </div>
        <span className="text-sm font-medium">{label}</span>
      </div>
      <span className="text-xs text-muted-foreground">{value}</span>
    </div>
  );
}

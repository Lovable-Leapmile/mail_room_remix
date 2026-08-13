import { createFileRoute } from "@tanstack/react-router";
import { Page } from "@/components/mailroom/AppShell";
import { Search, ChevronRight, MessageCircle, Phone, Mail } from "lucide-react";
import { useState } from "react";

export const Route = createFileRoute("/help")({
  head: () => ({ meta: [{ title: "Help · Leapmile" }] }),
  component: Help,
});

const FAQS = [
  { q: "How do I collect a parcel from a Smart Locker?", a: "Open the parcel detail, tap Scan QR or enter your 6-digit OTP. The locker opens automatically once verified." },
  { q: "What happens if I miss the pickup deadline?", a: "The parcel is marked Expired and returned to the courier. Admin can request an extension in special cases." },
  { q: "Can I choose between Locker and Cube Robot?", a: "Yes. When booking, choose your preferred storage. The system checks availability instantly." },
  { q: "Is my OTP valid across devices?", a: "Yes, the OTP is tied to the parcel and works on any authenticated Leapmile app or kiosk." },
];

function Help() {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState<number | null>(0);
  const filtered = FAQS.filter((f) => f.q.toLowerCase().includes(q.toLowerCase()));

  return (
    <Page title="Help Center" back>
      <div className="mt-2 relative">
        <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search help articles…" className="w-full pl-10 pr-4 py-3 rounded-2xl bg-white border border-border text-sm outline-none focus:border-primary" />
      </div>

      <div className="mt-4 grid grid-cols-3 gap-3">
        <Contact icon={MessageCircle} label="Chat" />
        <Contact icon={Phone} label="Call" />
        <Contact icon={Mail} label="Email" />
      </div>

      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mt-6 px-1">Frequently asked</p>
      <div className="mt-3 ios-card divide-y divide-border">
        {filtered.map((f, i) => (
          <div key={i}>
            <button onClick={() => setOpen(open === i ? null : i)} className="w-full flex items-center justify-between p-4 text-left">
              <span className="text-sm font-medium">{f.q}</span>
              <ChevronRight className={`w-4 h-4 text-muted-foreground transition ${open === i ? "rotate-90" : ""}`} />
            </button>
            {open === i && <p className="px-4 pb-4 text-xs text-muted-foreground">{f.a}</p>}
          </div>
        ))}
      </div>
    </Page>
  );
}

function Contact({ icon: Icon, label }: { icon: typeof Search; label: string }) {
  return (
    <button className="haptic-tap ios-card p-4 flex flex-col items-center gap-2">
      <div className="w-10 h-10 rounded-xl bg-[color:var(--primary-soft)] flex items-center justify-center">
        <Icon className="w-5 h-5 text-primary" />
      </div>
      <span className="text-xs font-medium">{label}</span>
    </button>
  );
}

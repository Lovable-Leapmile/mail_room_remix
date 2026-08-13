import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft, CheckCircle2, Clock } from "lucide-react";
import { toast } from "sonner";
import bgAsset from "@/assets/login_bg.png.asset.json";

export const Route = createFileRoute("/register")({
  head: () => ({ meta: [{ title: "Register · Leapmile" }] }),
  component: RegisterPage,
});

function RegisterPage() {
  const nav = useNavigate();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [form, setForm] = useState({ name: "", email: "", reg: "", org: "Leapmile HQ · Bengaluru", role: "Employee" });

  const next = () => {
    if (step === 1) {
      if (!form.name || !form.email) return toast.error("Please fill all fields");
      setStep(2);
    } else if (step === 2) {
      if (!form.reg) return toast.error("Mobile number required");
      setStep(3);
    } else {
      toast.success("Submitted for admin approval");
      setTimeout(() => nav({ to: "/login" }), 1200);
    }
  };

  return (
    <div
      className="app-shell min-h-dvh px-6 pt-10 pb-10"
      style={{
        backgroundImage: `url(${bgAsset.url})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
      }}
    >
      <Link to="/login" className="haptic-tap w-10 h-10 rounded-full bg-white border border-border flex items-center justify-center">
        <ArrowLeft className="w-4 h-4" />
      </Link>
      <h1 className="mt-6 text-3xl font-semibold tracking-tight">Create account</h1>
      <p className="text-muted-foreground mt-1">Join your organization's digital mailroom.</p>

      <div className="mt-6 flex items-center gap-2">
        {[1, 2, 3].map((n) => (
          <div key={n} className={`flex-1 h-1.5 rounded-full ${step >= n ? "brand-gradient" : "bg-muted"}`} />
        ))}
      </div>

      <div className="mt-8 space-y-4">
        {step === 1 && (
          <div className="animate-slide-up space-y-4">
            <Field label="Full name" value={form.name} onChange={(v) => setForm({ ...form, name: v })} placeholder="Arjun Malhotra" />
            <Field label="Work email" value={form.email} onChange={(v) => setForm({ ...form, email: v })} placeholder="you@company.com" />
          </div>
        )}
        {step === 2 && (
          <div className="animate-slide-up space-y-4">
            <Field label="Mobile number" value={form.reg} onChange={(v) => setForm({ ...form, reg: v })} placeholder="1234567890" />
            <Field label="Organization" value={form.org} onChange={(v) => setForm({ ...form, org: v })} />
            <div>
              <label className="text-xs font-medium text-muted-foreground ml-1">Role</label>
              <div className="mt-1.5 grid grid-cols-2 gap-2">
                {["Employee", "Courier"].map((r) => (
                  <button key={r} onClick={() => setForm({ ...form, role: r })} className={`py-3 rounded-2xl text-sm font-medium border ${form.role === r ? "bg-[color:var(--primary-soft)] border-primary text-primary" : "bg-white border-border"}`}>{r}</button>
                ))}
              </div>
            </div>
          </div>
        )}
        {step === 3 && (
          <div className="animate-slide-up ios-card p-6 text-center">
            <div className="w-16 h-16 rounded-full bg-amber-50 flex items-center justify-center mx-auto animate-float">
              <Clock className="w-7 h-7 text-amber-600" />
            </div>
            <h3 className="mt-4 font-semibold text-lg">Awaiting admin approval</h3>
            <p className="text-sm text-muted-foreground mt-2">Your organization admin will review and approve your account. You'll get an email once approved.</p>
            <div className="mt-4 flex items-center justify-center gap-2 text-xs text-muted-foreground">
              <CheckCircle2 className="w-4 h-4 text-green-600" /> Details submitted securely
            </div>
          </div>
        )}
      </div>

      <button onClick={next} className="haptic-tap mt-8 w-full py-4 rounded-2xl brand-gradient text-white font-semibold shadow-[0_18px_40px_-12px_rgba(53,28,117,0.55)]">
        {step === 3 ? "Back to sign in" : "Continue"}
      </button>
    </div>
  );
}

function Field({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div>
      <label className="text-xs font-medium text-muted-foreground ml-1">{label}</label>
      <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="mt-1.5 w-full px-4 py-3.5 rounded-2xl bg-white border border-border focus:border-primary focus:ring-2 focus:ring-[color:var(--primary-soft)] outline-none text-sm" />
    </div>
  );
}

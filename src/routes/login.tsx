import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { signIn, lookupUserType, type DetectedRole } from "@/lib/mailroom";
import { toast } from "sonner";
import logoAsset from "@/assets/leapmile_logo.png.asset.json";
import bgAsset from "@/assets/login_bg.png.asset.json";

export const Route = createFileRoute("/login")({
  head: () => ({ meta: [{ title: "Sign in · Leapmile Digital Mailroom" }] }),
  component: LoginPage,
});

function LoginPage() {
  const nav = useNavigate();
  const [reg, setReg] = useState("");
  const [pw, setPw] = useState("");
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [focused, setFocused] = useState<"reg" | "pw" | null>(null);
  const [detected, setDetected] = useState<DetectedRole | null>(null);
  const [detecting, setDetecting] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const lookupSeq = useRef(0);

  const trimmedReg = reg.trim();
  const canSubmit = trimmedReg.length === 10 && pw.length >= 4 && !loading;

  useEffect(() => {
    setDetected(null);
    setNotFound(false);
    if (trimmedReg.length !== 10 || pw.length < 4) return;
    const seq = ++lookupSeq.current;
    setDetecting(true);
    const t = setTimeout(() => {
      lookupUserType(trimmedReg).then((res) => {
        if (seq !== lookupSeq.current) return;
        setDetecting(false);
        if (res) setDetected(res.role);
        else setNotFound(true);
      });
    }, 300);
    return () => clearTimeout(t);
  }, [trimmedReg, pw]);

  const buttonLabel = loading
    ? "Logging in…"
    : detected === "courier"
    ? "Login as Courier"
    : detected === "employee"
    ? "Login as Employee"
    : "Login";

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setLoading(true);
    const result = await signIn(trimmedReg, pw);
    if (result) {
      toast.success(result === "courier" ? "Welcome, Courier" : "Welcome back");
      nav({ to: "/dashboard" });
    } else {
      toast.error("Invalid credentials");
      setLoading(false);
    }
  };


  return (
    <div
      className="app-shell flex flex-col min-h-dvh"
      style={{
        backgroundImage: `url(${bgAsset.url})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
      }}
    >
      {/* Compact top branding band */}
      <header
        className="relative w-full flex flex-col items-center justify-center pt-10 pb-6"
      >

        <img
          src={logoAsset.url}
          alt="Leapmile"
          className="w-32 h-auto object-contain"
        />
        <p
          className="mt-4 font-semibold tracking-wide"
          style={{ color: "#666680", fontSize: 22 }}
        >
          Digital Mailroom
        </p>
      </header>

      {/* Content */}
      <main className="flex-1 flex flex-col px-6 pt-8">
        <form onSubmit={submit} className="mt-4 flex flex-col w-full max-w-[340px] mx-auto">
          {/* Mobile number */}
          <label
            htmlFor="reg"
            className="text-[14px] font-medium"
            style={{ color: "#1F1F3A" }}
          >
            Registered Mobile Number
          </label>
          <div className="mt-3">
            <input
              id="reg"
              value={reg}
              onChange={(e) => setReg(e.target.value.replace(/\D/g, ""))}
              onFocus={() => setFocused("reg")}
              onBlur={() => setFocused(null)}
              inputMode="numeric"
              autoComplete="tel"
              maxLength={10}
              placeholder="Enter your mobile number"
              className="w-full bg-white outline-none transition-all duration-200"
              style={{
                height: 56,
                borderRadius: 16,
                paddingLeft: 18,
                paddingRight: 18,
                fontSize: 15,
                color: "#1F1F3A",
                border: `1px solid ${focused === "reg" ? "#351C75" : "#E5E7F0"}`,
                boxShadow:
                  focused === "reg"
                    ? "0 0 0 4px rgba(53, 28, 117, 0.10)"
                    : "0 1px 2px rgba(31, 31, 58, 0.03)",
              }}
            />
            {trimmedReg.length === 10 && detecting && (
              <p className="text-[12px] mt-2 ml-1">
                <span style={{ color: "#666680" }}>Checking…</span>
              </p>
            )}
          </div>

          {/* Password */}
          <label
            htmlFor="pw"
            className="text-[14px] font-medium mt-6"
            style={{ color: "#1F1F3A" }}
          >
            Password
          </label>
          <div className="mt-3 relative">
            <input
              id="pw"
              type={show ? "text" : "password"}
              value={pw}
              onChange={(e) => setPw(e.target.value)}
              onFocus={() => setFocused("pw")}
              onBlur={() => setFocused(null)}
              autoComplete="current-password"
              placeholder="Enter your password"
              className="w-full bg-white outline-none transition-all duration-200"
              style={{
                height: 56,
                borderRadius: 16,
                paddingLeft: 18,
                paddingRight: 52,
                fontSize: 15,
                color: "#1F1F3A",
                border: `1px solid ${focused === "pw" ? "#351C75" : "#E5E7F0"}`,
                boxShadow:
                  focused === "pw"
                    ? "0 0 0 4px rgba(53, 28, 117, 0.10)"
                    : "0 1px 2px rgba(31, 31, 58, 0.03)",
              }}
            />
            <button
              type="button"
              onClick={() => setShow((s) => !s)}
              aria-label={show ? "Hide password" : "Show password"}
              className="absolute right-3 top-1/2 -translate-y-1/2 w-11 h-11 flex items-center justify-center rounded-xl transition-colors"
              style={{ color: "#666680" }}
            >
              {show ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>

          {/* Forgot password */}
          <div className="mt-3 flex justify-end">
            <button
              type="button"
              onClick={() => toast("Password reset link will be sent to your mobile.")}
              className="text-[14px] font-medium"
              style={{ color: "#351C75" }}
            >
              Forgot Password?
            </button>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={!canSubmit}
            className="mt-8 w-full flex items-center justify-center gap-2 text-white transition-all duration-200 active:brightness-90 disabled:opacity-50"
            style={{
              height: 56,
              borderRadius: 16,
              fontSize: 18,
              fontWeight: 600,
              background: "linear-gradient(135deg, #351C75 0%, #6A55D8 100%)",
              boxShadow: "0 8px 20px -8px rgba(53, 28, 117, 0.45)",
            }}
          >
            {loading && <Loader2 className="w-5 h-5 animate-spin" />}
            {buttonLabel}
          </button>
        </form>

      </main>
    </div>
  );
}

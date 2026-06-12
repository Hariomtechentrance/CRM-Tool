import { useState, useRef, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Mail, Lock, Eye, EyeOff, TrendingUp, Users, Globe, ShieldCheck, ArrowLeft } from "lucide-react";
import {
  RecaptchaVerifier, signInWithPhoneNumber,
  GoogleAuthProvider, signInWithPopup,
} from "firebase/auth";
import type { ConfirmationResult } from "firebase/auth";
import { auth, isFirebaseReady } from "@/lib/firebase";
import { Input } from "@/components/ui/Input";
import { useAuthStore } from "@/stores/authStore";
import api from "@/lib/api";
import { getApiError } from "@/lib/utils";
import type { AuthResponse } from "@/types";

const schema = z.object({
  email:    z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});
type FormData = z.infer<typeof schema>;

const FEATURES = [
  { icon: TrendingUp, text: "Sales, finance & operations in one place" },
  { icon: Users,      text: "CRM, HR, inventory & more — all connected" },
  { icon: Globe,      text: "Works for any business type or industry" },
];

type Step = "credentials" | "phone-2fa";

export default function LoginPage() {
  const navigate = useNavigate();
  const setAuth  = useAuthStore((s) => s.setAuth);

  const [step,      setStep]      = useState<Step>("credentials");
  const [tempToken, setTempToken] = useState("");
  const [phone,     setPhone]     = useState("");     // full phone from server
  const [phoneHint, setPhoneHint] = useState("");     // masked hint for display
  const [otp,       setOtp]       = useState("");
  const [showPw,    setShowPw]    = useState(false);
  const [apiError,  setApiError]  = useState("");
  const [loading,   setLoading]   = useState(false);
  const [resendCountdown, setResendCountdown] = useState(0);

  const recaptchaRef     = useRef<HTMLDivElement>(null);
  const verifierRef      = useRef<RecaptchaVerifier | null>(null);
  const confirmResultRef = useRef<ConfirmationResult | null>(null);

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  // Countdown for OTP resend
  useEffect(() => {
    if (resendCountdown <= 0) return;
    const t = setTimeout(() => setResendCountdown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [resendCountdown]);

  useEffect(() => {
    return () => { verifierRef.current?.clear?.(); };
  }, []);

  // ── Send Firebase phone OTP ──────────────────────────────────
  async function sendPhoneOtp(phoneNumber: string) {
    if (!auth) { setApiError("Phone 2FA is not available (Firebase not configured)."); return; }
    try {
      if (!verifierRef.current) {
        verifierRef.current = new RecaptchaVerifier(auth, recaptchaRef.current!, { size: "invisible" });
      }
      confirmResultRef.current = await signInWithPhoneNumber(auth, phoneNumber, verifierRef.current);
      setResendCountdown(60);
    } catch (e: any) {
      setApiError("Could not send OTP: " + (e?.message || "unknown error"));
      verifierRef.current?.clear?.();
      verifierRef.current = null;
    }
  }

  // ── Step 1: email + password ─────────────────────────────────
  const onSubmit = async (data: FormData) => {
    setApiError("");
    try {
      const res = await api.post("/auth/login", data);
      const d   = res.data.data;
      if (d?.requiresPhone2FA) {
        setTempToken(d.tempToken);
        setPhone(d.phone);          // full phone, sent by backend after successful password check
        setPhoneHint(d.phoneHint);
        setStep("phone-2fa");
        await sendPhoneOtp(d.phone);
        return;
      }
      setAuth(d as AuthResponse);
      navigate("/dashboard");
    } catch (err) {
      setApiError(getApiError(err));
    }
  };

  // ── Step 2: verify phone OTP ─────────────────────────────────
  async function handleVerify2FA() {
    if (otp.length !== 6) { setApiError("Enter the 6-digit OTP"); return; }
    setLoading(true); setApiError("");
    try {
      const result     = await confirmResultRef.current!.confirm(otp);
      const firebaseIdToken = await result.user.getIdToken();
      await auth?.signOut(); // we use our own JWT session

      const res = await api.post("/auth/verify-phone-2fa", { tempToken, firebaseIdToken });
      setAuth(res.data.data as AuthResponse);
      navigate("/dashboard");
    } catch (e: any) {
      const msg = e?.code === "auth/invalid-verification-code" ? "Incorrect OTP. Please try again."
                : getApiError(e);
      setApiError(msg);
    }
    setLoading(false);
  }

  // ── Google OAuth ─────────────────────────────────────────────
  async function handleGoogleLogin() {
    if (!auth) { setApiError("Google login is not available in this environment."); return; }
    setApiError("");
    setLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      const result   = await signInWithPopup(auth, provider);
      const idToken  = await result.user.getIdToken();
      await auth.signOut(); // CRM uses its own JWT

      const res = await api.post("/auth/google-login", { idToken });
      setAuth(res.data.data as AuthResponse);
      navigate("/dashboard");
    } catch (e: any) {
      if (e?.code === "auth/popup-closed-by-user") { setLoading(false); return; }
      setApiError(getApiError(e));
    }
    setLoading(false);
  }

  async function resendOtp() {
    if (resendCountdown > 0 || !phone) return;
    setApiError("");
    setLoading(true);
    verifierRef.current?.clear?.();
    verifierRef.current = null;
    await sendPhoneOtp(phone);
    setLoading(false);
  }

  // ── Phone 2FA screen ─────────────────────────────────────────
  if (step === "phone-2fa") {
    return (
      <div style={{ minHeight: "100vh", background: "var(--bg-main)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
        <div style={{ width: "100%", maxWidth: 420 }}>
          <div style={{ textAlign: "center", marginBottom: 28 }}>
            <div style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 48, height: 48, borderRadius: 14, background: "linear-gradient(135deg,#6366f1,#8b5cf6)", marginBottom: 14, boxShadow: "0 8px 32px rgba(99,102,241,0.4)" }}>
              <ShieldCheck size={22} color="white" />
            </div>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: "var(--text-primary)", margin: "0 0 6px" }}>Two-Factor Verification</h1>
            <p style={{ fontSize: 14, color: "var(--text-faint)" }}>
              Enter the 6-digit code sent to <strong>{phoneHint}</strong>
            </p>
          </div>

          <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 16, padding: "28px 28px 24px" }}>
            {apiError && (
              <div style={{ marginBottom: 16, padding: "10px 14px", background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.22)", borderRadius: 8, fontSize: 13, color: "#f87171" }}>
                {apiError}
              </div>
            )}
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "var(--text-ghost)", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 6 }}>
                OTP Code
              </label>
              <input
                value={otp} onChange={e => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder="• • • • • •" maxLength={6}
                style={{ width: "100%", background: "var(--bg-hover)", border: "1px solid var(--border-input)", borderRadius: 9, padding: "10px 16px", color: "var(--text-primary)", fontSize: 22, letterSpacing: "0.4em", textAlign: "center", outline: "none", boxSizing: "border-box", fontFamily: "inherit" }}
              />
            </div>
            <button onClick={handleVerify2FA} disabled={loading || otp.length !== 6}
              style={{ width: "100%", height: 44, borderRadius: 10, border: "none", background: "linear-gradient(135deg,#6366f1,#8b5cf6)", color: "white", fontSize: 14, fontWeight: 600, cursor: loading || otp.length !== 6 ? "not-allowed" : "pointer", opacity: loading || otp.length !== 6 ? 0.6 : 1, boxShadow: "0 4px 20px rgba(99,102,241,0.4)" }}>
              {loading ? "Verifying…" : "Verify & Sign In →"}
            </button>
            <div style={{ textAlign: "center", marginTop: 14, fontSize: 13, color: "var(--text-ghost)" }}>
              Didn't receive it?{" "}
              <button onClick={resendOtp} disabled={resendCountdown > 0 || loading}
                style={{ background: "none", border: "none", color: resendCountdown > 0 ? "var(--text-ghost)" : "#818cf8", cursor: resendCountdown > 0 ? "default" : "pointer", fontWeight: 600, fontSize: 13, padding: 0 }}>
                {resendCountdown > 0 ? `Resend in ${resendCountdown}s` : "Resend OTP"}
              </button>
            </div>
            <button onClick={() => { setStep("credentials"); setOtp(""); setApiError(""); }}
              style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", color: "var(--text-ghost)", cursor: "pointer", fontSize: 12, margin: "14px auto 0", padding: 0 }}>
              <ArrowLeft size={12} /> Back to sign in
            </button>
          </div>
        </div>
        <div ref={recaptchaRef} />
      </div>
    );
  }

  // ── Credentials screen ───────────────────────────────────────
  return (
    <div style={{ minHeight: "100vh", background: "var(--bg-main)", display: "flex", alignItems: "center", justifyContent: "center", padding: "24px" }}>
      <div style={{ position: "fixed", top: "20%", left: "50%", transform: "translateX(-50%)", width: 600, height: 600, borderRadius: "50%", background: "radial-gradient(circle,rgba(99,102,241,0.08) 0%,transparent 70%)", pointerEvents: "none" }} />

      <div style={{ width: "100%", maxWidth: 440, position: "relative", zIndex: 1 }}>
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 48, height: 48, borderRadius: 14, background: "linear-gradient(135deg,#6366f1,#8b5cf6)", marginBottom: 16, boxShadow: "0 8px 32px rgba(99,102,241,0.4)" }}>
            <span style={{ color: "white", fontWeight: 800, fontSize: 16 }}>FC</span>
          </div>
          <h1 style={{ fontSize: 26, fontWeight: 700, color: "var(--text-primary)", margin: 0 }}>Welcome back</h1>
          <p style={{ fontSize: 14, color: "var(--text-faint)", marginTop: 6 }}>Sign in to your FlowCRM account</p>
        </div>

        <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 16, padding: "32px 36px", boxShadow: "0 24px 80px rgba(0,0,0,0.5)" }}>
          {apiError && (
            <div style={{ marginBottom: 20, padding: "12px 16px", background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.25)", borderRadius: 10, fontSize: 13, color: "#F87171", display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#EF4444", flexShrink: 0 }} />
              {apiError}
            </div>
          )}

          {/* Google OAuth — only shown when Firebase is configured */}
          {isFirebaseReady && (
            <>
              <button onClick={handleGoogleLogin} disabled={loading || isSubmitting}
                style={{ width: "100%", height: 42, borderRadius: 10, border: "1px solid var(--border-input)", background: "var(--bg-hover)", color: "var(--text-primary)", fontSize: 14, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 10, marginBottom: 18, transition: "opacity 0.15s", opacity: loading ? 0.6 : 1 }}>
                <svg width="18" height="18" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
                Continue with Google
              </button>

              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 18 }}>
                <div style={{ flex: 1, height: 1, background: "var(--border)" }} />
                <span style={{ fontSize: 12, color: "var(--text-ghost)", whiteSpace: "nowrap" }}>or sign in with email</span>
                <div style={{ flex: 1, height: 1, background: "var(--border)" }} />
              </div>
            </>
          )}

          <form onSubmit={handleSubmit(onSubmit)}>
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <Input label="Email address" type="email" placeholder="you@company.com"
                leftIcon={<Mail style={{ width: 16, height: 16 }} />}
                error={errors.email?.message} {...register("email")} />

              <Input label="Password" type={showPw ? "text" : "password"} placeholder="Enter your password"
                leftIcon={<Lock style={{ width: 16, height: 16 }} />}
                rightIcon={
                  <button type="button" onClick={() => setShowPw(!showPw)} style={{ cursor: "pointer", color: "inherit", background: "none", border: "none", padding: 0, display: "flex" }}>
                    {showPw ? <EyeOff style={{ width: 16, height: 16 }} /> : <Eye style={{ width: 16, height: 16 }} />}
                  </button>
                }
                error={errors.password?.message} {...register("password")} />

              <div style={{ display: "flex", justifyContent: "flex-end", marginTop: -4 }}>
                <Link to="/forgot-password" style={{ fontSize: 12, color: "#818cf8", textDecoration: "none", fontWeight: 500 }}>
                  Forgot password?
                </Link>
              </div>

              <button type="submit" disabled={isSubmitting || loading}
                style={{ width: "100%", height: 44, borderRadius: 10, border: "none", cursor: isSubmitting || loading ? "not-allowed" : "pointer", background: "linear-gradient(135deg,#6366f1,#8b5cf6)", color: "white", fontSize: 14, fontWeight: 600, opacity: isSubmitting || loading ? 0.7 : 1, boxShadow: "0 4px 20px rgba(99,102,241,0.4)", transition: "opacity 0.15s" }}>
                {isSubmitting ? "Signing in…" : "Sign In →"}
              </button>
            </div>
          </form>

          <p style={{ textAlign: "center", fontSize: 13, color: "var(--text-ghost)", marginTop: 24 }}>
            Don't have an account?{" "}
            <Link to="/register" style={{ color: "#818cf8", textDecoration: "none", fontWeight: 600 }}>Create account</Link>
          </p>
        </div>

        <div style={{ display: "flex", justifyContent: "center", gap: 20, marginTop: 28, flexWrap: "wrap" }}>
          {FEATURES.map((f, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 6, color: "var(--text-ghost)", fontSize: 12 }}>
              <f.icon style={{ width: 13, height: 13, color: "#6366f1" }} />
              {f.text}
            </div>
          ))}
        </div>
      </div>

      {/* Invisible reCAPTCHA for phone 2FA */}
      <div ref={recaptchaRef} style={{ position: "absolute", bottom: 0 }} />
    </div>
  );
}

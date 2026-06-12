import { useState, useRef, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  RecaptchaVerifier, signInWithPhoneNumber,
  createUserWithEmailAndPassword, sendEmailVerification, deleteUser,
} from "firebase/auth";
import type { ConfirmationResult } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { User, Mail, Lock, Eye, EyeOff, Phone, CheckCircle, ShieldCheck, ArrowLeft } from "lucide-react";
import api from "@/lib/api";
import { getApiError } from "@/lib/utils";

type Step = "details" | "phone-otp" | "email-verify" | "done";

interface FormData {
  name: string; email: string; phone: string;
  password: string; confirmPassword: string;
}

const LABEL: React.CSSProperties = {
  display: "block", fontSize: 11, fontWeight: 700,
  color: "var(--text-ghost)", textTransform: "uppercase",
  letterSpacing: "0.07em", marginBottom: 6,
};
const INPUT: React.CSSProperties = {
  width: "100%", background: "var(--bg-hover)", border: "1px solid var(--border-input)",
  borderRadius: 9, padding: "10px 12px 10px 38px", color: "var(--text-primary)",
  fontSize: 14, outline: "none", boxSizing: "border-box", fontFamily: "inherit",
};
const BTN_PRIMARY: React.CSSProperties = {
  width: "100%", height: 44, borderRadius: 10, border: "none",
  background: "linear-gradient(135deg,#6366f1,#8b5cf6)", color: "white",
  fontSize: 14, fontWeight: 600, cursor: "pointer",
  boxShadow: "0 4px 20px rgba(99,102,241,0.4)", transition: "opacity 0.15s",
};
const BTN_GHOST: React.CSSProperties = {
  width: "100%", height: 44, borderRadius: 10,
  border: "1px solid var(--border-input)", background: "transparent",
  color: "var(--text-sec)", fontSize: 14, fontWeight: 600, cursor: "pointer",
};

function FieldWrap({ label, icon, right, error, children }: {
  label: string; icon: React.ReactNode; right?: React.ReactNode;
  error?: string; children: React.ReactNode;
}) {
  return (
    <div>
      <label style={LABEL}>{label}</label>
      <div style={{ position: "relative" }}>
        <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--text-ghost)", display: "flex" }}>
          {icon}
        </span>
        {children}
        {right && (
          <span style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", display: "flex" }}>
            {right}
          </span>
        )}
      </div>
      {error && <p style={{ fontSize: 12, color: "#f87171", marginTop: 4 }}>{error}</p>}
    </div>
  );
}

export default function RegisterPage() {
  const navigate = useNavigate();
  const [step, setStep]   = useState<Step>("details");
  const [form, setForm]   = useState<FormData>({ name: "", email: "", phone: "", password: "", confirmPassword: "" });
  const [otp,  setOtp]    = useState("");
  const [showPw,  setShowPw]  = useState(false);
  const [showCPw, setShowCPw] = useState(false);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState("");
  const [fieldErr, setFieldErr] = useState<Partial<Record<keyof FormData, string>>>({});
  const [resendCountdown, setResendCountdown] = useState(0);
  const [emailPolling, setEmailPolling] = useState(false);

  const recaptchaRef       = useRef<HTMLDivElement>(null);
  const verifierRef        = useRef<RecaptchaVerifier | null>(null);
  const confirmResultRef   = useRef<ConfirmationResult | null>(null);
  const emailPollRef       = useRef<ReturnType<typeof setInterval> | null>(null);

  // Countdown timer for OTP resend
  useEffect(() => {
    if (resendCountdown <= 0) return;
    const t = setTimeout(() => setResendCountdown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [resendCountdown]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (emailPollRef.current) clearInterval(emailPollRef.current);
      verifierRef.current?.clear?.();
    };
  }, []);

  function validate(): boolean {
    const errs: Partial<Record<keyof FormData, string>> = {};
    if (!form.name.trim() || form.name.length < 2)    errs.name = "Name must be at least 2 characters";
    if (!/\S+@\S+\.\S+/.test(form.email))             errs.email = "Invalid email address";
    if (!/^\+?[0-9]{10,15}$/.test(form.phone.replace(/\s/g, ""))) errs.phone = "Enter a valid phone number (10–15 digits)";
    if (form.password.length < 8)                     errs.password = "Password must be at least 8 characters";
    if (!/[A-Z]/.test(form.password))                 errs.password = "Must contain an uppercase letter";
    if (!/[0-9]/.test(form.password))                 errs.password = "Must contain a number";
    if (!/[^A-Za-z0-9]/.test(form.password))          errs.password = "Must contain a special character";
    if (form.password !== form.confirmPassword)        errs.confirmPassword = "Passwords do not match";
    setFieldErr(errs);
    return Object.keys(errs).length === 0;
  }

  // ── Step 1 → send phone OTP ──────────────────────────────────
  async function handleDetails() {
    if (!validate()) return;
    if (!auth) { setError("Registration is unavailable: Firebase is not configured."); return; }
    setLoading(true); setError("");
    try {
      // Ensure phone has country code
      const phone = form.phone.startsWith("+") ? form.phone : `+91${form.phone}`;
      setForm(f => ({ ...f, phone }));

      if (!verifierRef.current) {
        verifierRef.current = new RecaptchaVerifier(auth!, recaptchaRef.current!, { size: "invisible" });
      }
      confirmResultRef.current = await signInWithPhoneNumber(auth!, phone, verifierRef.current);
      setStep("phone-otp");
      setResendCountdown(60);
    } catch (e: any) {
      setError(e?.message?.includes("invalid-phone") ? "Invalid phone number. Include country code (e.g. +919876543210)." : getApiError(e));
      verifierRef.current?.clear?.();
      verifierRef.current = null;
    }
    setLoading(false);
  }

  // ── Step 2 → verify OTP → create Firebase email user ────────
  async function handleVerifyOtp() {
    if (otp.length !== 6) { setError("Enter the 6-digit OTP"); return; }
    if (!auth) { setError("Registration unavailable: Firebase not configured."); return; }
    setLoading(true); setError("");
    try {
      await confirmResultRef.current!.confirm(otp);
      const cred = await createUserWithEmailAndPassword(auth!, form.email, form.password);
      await sendEmailVerification(cred.user);
      setStep("email-verify");
      startEmailPolling();
    } catch (e: any) {
      const msg = e?.code === "auth/invalid-verification-code" ? "Incorrect OTP. Try again."
                : e?.code === "auth/email-already-in-use"     ? "This email is already registered in Firebase."
                : getApiError(e);
      setError(msg);
    }
    setLoading(false);
  }

  // ── Poll Firebase every 4 s until email is verified ─────────
  function startEmailPolling() {
    setEmailPolling(true);
    emailPollRef.current = setInterval(async () => {
      await auth?.currentUser?.reload();
      if (auth?.currentUser?.emailVerified) {
        clearInterval(emailPollRef.current!);
        setEmailPolling(false);
        await completeRegistration();
      }
    }, 4000);
  }

  // ── Step 3 → call backend to create CRM account ─────────────
  async function completeRegistration() {
    setLoading(true); setError("");
    try {
      await api.post("/auth/register", {
        name:                 form.name,
        email:                form.email,
        password:             form.password,
        phone:                form.phone,
        firebaseEmailVerified: true,
      });
      await auth?.signOut();
      setStep("done");
    } catch (e: any) {
      if (auth?.currentUser) await deleteUser(auth.currentUser).catch(() => {});
      setError(getApiError(e));
    }
    setLoading(false);
  }

  async function resendOtp() {
    if (resendCountdown > 0 || !auth) return;
    setLoading(true); setError("");
    try {
      verifierRef.current?.clear?.();
      verifierRef.current = new RecaptchaVerifier(auth!, recaptchaRef.current!, { size: "invisible" });
      confirmResultRef.current = await signInWithPhoneNumber(auth!, form.phone, verifierRef.current);
      setResendCountdown(60);
    } catch (e: any) { setError(getApiError(e)); }
    setLoading(false);
  }

  async function resendVerificationEmail() {
    if (!auth?.currentUser) return;
    setLoading(true);
    try { await sendEmailVerification(auth.currentUser); } catch { /* ignore */ }
    setLoading(false);
  }

  const pageStyle: React.CSSProperties = {
    minHeight: "100vh", background: "var(--bg-main)",
    display: "flex", alignItems: "center", justifyContent: "center", padding: 24,
  };

  // ── Done ─────────────────────────────────────────────────────
  if (step === "done") {
    return (
      <div style={pageStyle}>
        <div style={{ width: "100%", maxWidth: 420, textAlign: "center" }}>
          <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 16, padding: "48px 36px" }}>
            <div style={{ width: 56, height: 56, borderRadius: "50%", background: "rgba(16,185,129,0.12)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px" }}>
              <CheckCircle size={28} color="#10b981" />
            </div>
            <h2 style={{ fontSize: 20, fontWeight: 700, color: "var(--text-primary)", margin: "0 0 10px" }}>Account Created!</h2>
            <p style={{ fontSize: 14, color: "var(--text-faint)", lineHeight: 1.6, marginBottom: 28 }}>
              Your phone and email have been verified. You can now sign in.
            </p>
            <button onClick={() => navigate("/login")} style={BTN_PRIMARY}>Go to Sign In →</button>
          </div>
        </div>
      </div>
    );
  }

  // ── Email verification waiting screen ────────────────────────
  if (step === "email-verify") {
    return (
      <div style={pageStyle}>
        <div style={{ width: "100%", maxWidth: 420 }}>
          <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 16, padding: "40px 32px" }}>
            <div style={{ width: 52, height: 52, borderRadius: 14, background: "rgba(99,102,241,0.1)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px" }}>
              <Mail size={24} color="#6366f1" />
            </div>
            <h2 style={{ fontSize: 20, fontWeight: 700, color: "var(--text-primary)", textAlign: "center", margin: "0 0 8px" }}>Verify your email</h2>
            <p style={{ fontSize: 14, color: "var(--text-faint)", textAlign: "center", lineHeight: 1.6, marginBottom: 28 }}>
              We sent a verification link to <strong style={{ color: "var(--text-sec)" }}>{form.email}</strong>.
              Click the link in the email — this page will automatically proceed.
            </p>
            {emailPolling && (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, color: "var(--text-ghost)", fontSize: 13, marginBottom: 20 }}>
                <span style={{ width: 14, height: 14, borderRadius: "50%", border: "2px solid var(--border)", borderTopColor: "#6366f1", animation: "spin 0.8s linear infinite", display: "inline-block" }} />
                Waiting for verification…
              </div>
            )}
            {error && <p style={{ fontSize: 13, color: "#f87171", textAlign: "center", marginBottom: 16 }}>{error}</p>}
            <button onClick={resendVerificationEmail} disabled={loading} style={{ ...BTN_GHOST, marginBottom: 12 }}>
              Resend verification email
            </button>
            <button onClick={() => { if (emailPollRef.current) clearInterval(emailPollRef.current); setStep("details"); }} style={{ ...BTN_GHOST, fontSize: 13, color: "var(--text-ghost)" }}>
              ← Start over
            </button>
          </div>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      </div>
    );
  }

  // ── Phone OTP step ───────────────────────────────────────────
  if (step === "phone-otp") {
    return (
      <div style={pageStyle}>
        <div style={{ width: "100%", maxWidth: 420 }}>
          <div style={{ textAlign: "center", marginBottom: 28 }}>
            <div style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 48, height: 48, borderRadius: 14, background: "linear-gradient(135deg,#6366f1,#8b5cf6)", marginBottom: 14, boxShadow: "0 8px 32px rgba(99,102,241,0.4)" }}>
              <ShieldCheck size={22} color="white" />
            </div>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: "var(--text-primary)", margin: "0 0 6px" }}>Verify your phone</h1>
            <p style={{ fontSize: 14, color: "var(--text-faint)" }}>
              Enter the 6-digit code sent to <strong>{form.phone}</strong>
            </p>
          </div>

          <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 16, padding: "28px 28px 24px" }}>
            {error && (
              <div style={{ marginBottom: 16, padding: "10px 14px", background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.22)", borderRadius: 8, fontSize: 13, color: "#f87171" }}>
                {error}
              </div>
            )}
            <div>
              <label style={LABEL}>OTP Code</label>
              <input
                value={otp} onChange={e => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder="• • • • • •"
                maxLength={6}
                style={{ ...INPUT, paddingLeft: 16, fontSize: 22, letterSpacing: "0.4em", textAlign: "center" }}
              />
            </div>
            <button onClick={handleVerifyOtp} disabled={loading || otp.length !== 6}
              style={{ ...BTN_PRIMARY, marginTop: 20, opacity: loading || otp.length !== 6 ? 0.6 : 1 }}>
              {loading ? "Verifying…" : "Verify Phone →"}
            </button>
            <div style={{ textAlign: "center", marginTop: 16, fontSize: 13, color: "var(--text-ghost)" }}>
              Didn't receive it?{" "}
              <button onClick={resendOtp} disabled={resendCountdown > 0 || loading}
                style={{ background: "none", border: "none", color: resendCountdown > 0 ? "var(--text-ghost)" : "#818cf8", cursor: resendCountdown > 0 ? "default" : "pointer", fontWeight: 600, fontSize: 13, padding: 0 }}>
                {resendCountdown > 0 ? `Resend in ${resendCountdown}s` : "Resend OTP"}
              </button>
            </div>
            <button onClick={() => setStep("details")} style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", color: "var(--text-ghost)", cursor: "pointer", fontSize: 12, margin: "16px auto 0", padding: 0 }}>
              <ArrowLeft size={12} /> Back to details
            </button>
          </div>
          {/* Invisible reCAPTCHA container */}
          <div ref={recaptchaRef} />
        </div>
      </div>
    );
  }

  // ── Step 1: Account details form ─────────────────────────────
  return (
    <div style={pageStyle}>
      <div style={{ position: "fixed", top: "20%", left: "50%", transform: "translateX(-50%)", width: 600, height: 600, borderRadius: "50%", background: "radial-gradient(circle,rgba(139,92,246,0.07) 0%,transparent 70%)", pointerEvents: "none" }} />

      <div style={{ width: "100%", maxWidth: 440, position: "relative", zIndex: 1 }}>
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <div style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 48, height: 48, borderRadius: 14, background: "linear-gradient(135deg,#6366f1,#8b5cf6)", marginBottom: 14, boxShadow: "0 8px 32px rgba(99,102,241,0.4)" }}>
            <span style={{ color: "white", fontWeight: 800, fontSize: 16 }}>FC</span>
          </div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: "var(--text-primary)", margin: "0 0 6px" }}>Create your account</h1>
          <p style={{ fontSize: 14, color: "var(--text-faint)" }}>Get started with FlowCRM for free</p>
        </div>

        {/* Step indicator */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginBottom: 24 }}>
          {(["details","phone-otp","email-verify"] as Step[]).map((s, i) => (
            <div key={s} style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ width: 26, height: 26, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, background: s === step ? "#6366f1" : "var(--bg-hover)", color: s === step ? "white" : "var(--text-ghost)", border: `2px solid ${s === step ? "#6366f1" : "var(--border)"}` }}>
                {i + 1}
              </div>
              {i < 2 && <div style={{ width: 28, height: 1, background: "var(--border)" }} />}
            </div>
          ))}
        </div>

        <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 16, padding: "28px 32px", boxShadow: "0 24px 80px rgba(0,0,0,0.5)" }}>
          {error && (
            <div style={{ marginBottom: 18, padding: "10px 14px", background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.22)", borderRadius: 8, fontSize: 13, color: "#f87171" }}>
              {error}
            </div>
          )}

          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {/* Name */}
            <FieldWrap label="Full Name" icon={<User size={15} />} error={fieldErr.name}>
              <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Rahul Sharma" style={INPUT} />
            </FieldWrap>

            {/* Email */}
            <FieldWrap label="Email Address" icon={<Mail size={15} />} error={fieldErr.email}>
              <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="you@company.com" style={INPUT} />
            </FieldWrap>

            {/* Phone */}
            <FieldWrap label="Mobile Number" icon={<Phone size={15} />} error={fieldErr.phone}>
              <input type="tel" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                placeholder="+91 98765 43210" style={INPUT} />
            </FieldWrap>

            {/* Password */}
            <FieldWrap label="Password" icon={<Lock size={15} />} error={fieldErr.password}
              right={<button type="button" onClick={() => setShowPw(!showPw)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-ghost)", display: "flex", padding: 0 }}>{showPw ? <EyeOff size={15} /> : <Eye size={15} />}</button>}>
              <input type={showPw ? "text" : "password"} value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                placeholder="Min 8 chars, uppercase, number, symbol" style={{ ...INPUT, paddingRight: 36 }} />
            </FieldWrap>

            {/* Confirm Password */}
            <FieldWrap label="Confirm Password" icon={<Lock size={15} />} error={fieldErr.confirmPassword}
              right={<button type="button" onClick={() => setShowCPw(!showCPw)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-ghost)", display: "flex", padding: 0 }}>{showCPw ? <EyeOff size={15} /> : <Eye size={15} />}</button>}>
              <input type={showCPw ? "text" : "password"} value={form.confirmPassword} onChange={e => setForm(f => ({ ...f, confirmPassword: e.target.value }))}
                placeholder="Re-enter your password" style={{ ...INPUT, paddingRight: 36 }} />
            </FieldWrap>

            <button onClick={handleDetails} disabled={loading}
              style={{ ...BTN_PRIMARY, marginTop: 6, opacity: loading ? 0.7 : 1 }}>
              {loading ? "Sending OTP…" : "Continue — Verify Phone →"}
            </button>
          </div>

          <p style={{ textAlign: "center", fontSize: 13, color: "var(--text-ghost)", marginTop: 20 }}>
            Already have an account?{" "}
            <Link to="/login" style={{ color: "#818cf8", textDecoration: "none", fontWeight: 600 }}>Sign in</Link>
          </p>
        </div>
      </div>

      {/* Invisible reCAPTCHA — must be in DOM before first OTP send */}
      <div ref={recaptchaRef} style={{ position: "absolute", bottom: 0 }} />
    </div>
  );
}

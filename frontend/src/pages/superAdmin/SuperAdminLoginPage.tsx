import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Shield, Mail, Lock, Eye, EyeOff, AlertTriangle } from "lucide-react";
import { useAuthStore } from "@/stores/authStore";
import api from "@/lib/api";
import type { AuthResponse } from "@/types";

export default function SuperAdminLoginPage() {
  const navigate = useNavigate();
  const { setAuth, logout, isAuthenticated, user } = useAuthStore();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Already logged in as super admin → go straight in
  if (isAuthenticated && user?.isSuperAdmin) {
    navigate("/super-admin/dashboard", { replace: true });
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) { setError("Email and password are required."); return; }
    setLoading(true); setError("");
    try {
      const res = await api.post<{ data: AuthResponse }>("/auth/login", { email, password });
      const authData = res.data.data;

      if (!authData.user.isSuperAdmin) {
        // Not a super admin — reject immediately
        await api.post("/auth/logout").catch(() => {});
        setError("Access denied. This portal is for platform administrators only.");
        setLoading(false);
        return;
      }

      setAuth(authData);
      navigate("/super-admin/dashboard", { replace: true });
    } catch (err: any) {
      setError(err?.response?.data?.message || "Invalid credentials.");
    }
    setLoading(false);
  };

  return (
    <div style={{
      minHeight: "100vh",
      background: "#030309",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: 24,
      position: "relative",
      overflow: "hidden",
    }}>
      {/* Background glow — red tint for platform admin */}
      <div style={{
        position: "fixed", top: "15%", left: "50%", transform: "translateX(-50%)",
        width: 700, height: 700, borderRadius: "50%",
        background: "radial-gradient(circle, rgba(239,68,68,0.06) 0%, transparent 65%)",
        pointerEvents: "none",
      }} />
      <div style={{
        position: "fixed", bottom: "-10%", right: "-10%",
        width: 500, height: 500, borderRadius: "50%",
        background: "radial-gradient(circle, rgba(239,68,68,0.04) 0%, transparent 65%)",
        pointerEvents: "none",
      }} />

      <div style={{ width: "100%", maxWidth: 420, position: "relative", zIndex: 1 }}>

        {/* Branding */}
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{
            display: "inline-flex", alignItems: "center", justifyContent: "center",
            width: 56, height: 56, borderRadius: 16,
            background: "linear-gradient(135deg, #dc2626, #991b1b)",
            marginBottom: 16,
            boxShadow: "0 8px 40px rgba(220,38,38,0.35)",
          }}>
            <Shield size={26} color="white" />
          </div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: "var(--text-primary)", margin: 0, letterSpacing: "-0.3px" }}>
            Platform Administration
          </h1>
          <p style={{ fontSize: 13, color: "var(--text-ghost)", marginTop: 6 }}>
            FlowCRM · Super Admin Portal
          </p>
        </div>

        {/* Warning banner */}
        <div style={{
          display: "flex", alignItems: "flex-start", gap: 10,
          background: "rgba(239,68,68,0.06)",
          border: "1px solid rgba(239,68,68,0.2)",
          borderRadius: 10, padding: "12px 14px", marginBottom: 20,
        }}>
          <AlertTriangle size={14} color="#f87171" style={{ flexShrink: 0, marginTop: 1 }} />
          <p style={{ fontSize: 12, color: "#9a3535", margin: 0, lineHeight: 1.5 }}>
            <strong style={{ color: "#f87171" }}>Restricted Access.</strong> This portal is exclusively for authorized platform administrators. Unauthorized access attempts are logged.
          </p>
        </div>

        {/* Login card */}
        <div style={{
          background: "#0A0A18",
          border: "1px solid #1e1420",
          borderRadius: 16, padding: "32px 32px",
          boxShadow: "0 24px 80px rgba(0,0,0,0.6)",
        }}>
          {error && (
            <div style={{
              marginBottom: 20, padding: "11px 14px",
              background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.25)",
              borderRadius: 9, fontSize: 13, color: "#f87171",
              display: "flex", alignItems: "center", gap: 8,
            }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#ef4444", flexShrink: 0 }} />
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

              {/* Email */}
              <div>
                <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "var(--text-ghost)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>
                  Admin Email
                </label>
                <div style={{ position: "relative" }}>
                  <Mail size={15} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--text-ghost)" }} />
                  <input
                    type="email"
                    autoComplete="username"
                    placeholder="admin@platform.com"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    style={{
                      width: "100%", background: "#131320", border: "1px solid var(--border-input)",
                      borderRadius: 9, padding: "10px 12px 10px 38px",
                      color: "var(--text-primary)", fontSize: 13, outline: "none", boxSizing: "border-box",
                    }}
                    onFocus={e => (e.target.style.borderColor = "#dc2626")}
                    onBlur={e => (e.target.style.borderColor = "#1E1E38")}
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "var(--text-ghost)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>
                  Password
                </label>
                <div style={{ position: "relative" }}>
                  <Lock size={15} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--text-ghost)" }} />
                  <input
                    type={showPw ? "text" : "password"}
                    autoComplete="current-password"
                    placeholder="••••••••••••"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    style={{
                      width: "100%", background: "#131320", border: "1px solid var(--border-input)",
                      borderRadius: 9, padding: "10px 38px 10px 38px",
                      color: "var(--text-primary)", fontSize: 13, outline: "none", boxSizing: "border-box",
                    }}
                    onFocus={e => (e.target.style.borderColor = "#dc2626")}
                    onBlur={e => (e.target.style.borderColor = "#1E1E38")}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw(!showPw)}
                    style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: "var(--text-ghost)", cursor: "pointer", padding: 0, display: "flex" }}
                  >
                    {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                style={{
                  width: "100%", height: 44, borderRadius: 10, border: "none",
                  cursor: loading ? "not-allowed" : "pointer",
                  background: loading ? "#3d1010" : "linear-gradient(135deg, #dc2626, #991b1b)",
                  color: "white", fontSize: 14, fontWeight: 600,
                  opacity: loading ? 0.8 : 1,
                  boxShadow: loading ? "none" : "0 4px 20px rgba(220,38,38,0.35)",
                  transition: "all 0.15s",
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                }}
              >
                <Shield size={15} />
                {loading ? "Verifying…" : "Access Platform Admin"}
              </button>
            </div>
          </form>
        </div>

        {/* Footer note */}
        <p style={{ textAlign: "center", fontSize: 11, color: "#2a2a40", marginTop: 20, lineHeight: 1.6 }}>
          Looking for your organization login?{" "}
          <a href="/login" style={{ color: "var(--text-ghost)", textDecoration: "none", fontWeight: 500 }}>Click here</a>
        </p>
      </div>
    </div>
  );
}

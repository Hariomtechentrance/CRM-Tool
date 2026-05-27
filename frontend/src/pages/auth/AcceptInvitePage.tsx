import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Building2, CheckCircle, XCircle, Loader } from "lucide-react";
import api from "@/lib/api";
import { useAuthStore } from "@/stores/authStore";

const S = {
  page: { minHeight: "100vh", background: "var(--bg-main)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 } as React.CSSProperties,
  card: { background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 16, padding: "36px 40px", maxWidth: 440, width: "100%", textAlign: "center" as const, boxShadow: "0 24px 80px rgba(0,0,0,0.5)" },
  btn: { width: "100%", height: 44, borderRadius: 10, border: "none", cursor: "pointer", background: "linear-gradient(135deg,#6366f1,#8b5cf6)", color: "white", fontSize: 14, fontWeight: 600, marginTop: 20 } as React.CSSProperties,
};

interface InviteInfo {
  orgName: string;
  inviterName: string;
  role: string;
  email: string;
}

export default function AcceptInvitePage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { isAuthenticated, addOrganization } = useAuthStore();

  const token = params.get("token");
  const [status, setStatus] = useState<"loading" | "ready" | "accepting" | "success" | "error">("loading");
  const [invite, setInvite] = useState<InviteInfo | null>(null);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    if (!token) { setStatus("error"); setErrorMsg("Invalid invite link — no token found."); return; }
    // Fetch invite details
    api.get(`/organizations/invite/info?token=${token}`)
      .then(r => { setInvite(r.data.data); setStatus("ready"); })
      .catch(e => { setStatus("error"); setErrorMsg(e?.response?.data?.message || "This invite link is invalid or has expired."); });
  }, [token]);

  const accept = async () => {
    if (!isAuthenticated) {
      // Save token and redirect to login
      sessionStorage.setItem("pendingInviteToken", token!);
      navigate(`/login?redirect=/accept-invite?token=${token}`);
      return;
    }
    setStatus("accepting");
    try {
      const r = await api.post("/organizations/invite/accept", { token });
      const org = r.data.data;
      addOrganization({ ...org.organization, role: org.role, enabledModules: org.organization?.enabledModules || [] });
      setStatus("success");
      setTimeout(() => navigate("/dashboard"), 2000);
    } catch (e: any) {
      setStatus("error");
      setErrorMsg(e?.response?.data?.message || "Failed to accept invite. It may have expired.");
    }
  };

  const ROLE_LABELS: Record<string, string> = {
    OWNER: "Owner", ADMIN: "Admin", MANAGER: "Manager",
    ACCOUNTANT: "Accountant", STAFF: "Staff", VIEWER: "Viewer",
  };

  return (
    <div style={S.page}>
      {/* Glow */}
      <div style={{ position: "fixed", top: "20%", left: "50%", transform: "translateX(-50%)", width: 600, height: 600, borderRadius: "50%", background: "radial-gradient(circle, rgba(99,102,241,0.06) 0%, transparent 70%)", pointerEvents: "none" }} />

      <div style={S.card}>
        {/* Logo */}
        <div style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 44, height: 44, borderRadius: 12, background: "linear-gradient(135deg,#6366f1,#8b5cf6)", marginBottom: 20, boxShadow: "0 8px 28px rgba(99,102,241,0.4)" }}>
          <span style={{ color: "white", fontWeight: 800, fontSize: 14 }}>FC</span>
        </div>

        {status === "loading" && (
          <>
            <Loader size={32} color="#6366f1" style={{ margin: "0 auto 16px", display: "block", animation: "spin 1s linear infinite" }} />
            <p style={{ color: "var(--text-ghost)", fontSize: 14 }}>Loading invite details...</p>
          </>
        )}

        {status === "ready" && invite && (
          <>
            <div style={{ width: 56, height: 56, borderRadius: 14, background: "linear-gradient(135deg,#6366f120,#8b5cf620)", border: "1px solid #6366f130", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
              <Building2 size={24} color="#818cf8" />
            </div>
            <h2 style={{ fontSize: 20, fontWeight: 700, color: "var(--text-primary)", margin: "0 0 8px" }}>You're Invited!</h2>
            <p style={{ fontSize: 14, color: "var(--text-ghost)", margin: "0 0 24px", lineHeight: 1.6 }}>
              <strong style={{ color: "var(--text-sec)" }}>{invite.inviterName}</strong> invited you to join
            </p>
            <div style={{ background: "var(--bg-hover)", border: "1px solid var(--border)", borderRadius: 12, padding: "16px 20px", marginBottom: 20 }}>
              <div style={{ fontSize: 18, fontWeight: 700, color: "var(--text-primary)", marginBottom: 4 }}>{invite.orgName}</div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                <span style={{ fontSize: 11, padding: "3px 10px", borderRadius: 20, background: "#6366f120", color: "#818cf8", fontWeight: 600 }}>
                  {ROLE_LABELS[invite.role] || invite.role}
                </span>
                <span style={{ fontSize: 12, color: "var(--text-ghost)" }}>on FlowCRM</span>
              </div>
            </div>
            {!isAuthenticated && (
              <p style={{ fontSize: 12, color: "var(--text-ghost)", marginBottom: 4 }}>You'll need to log in or register first.</p>
            )}
            <button onClick={accept} style={S.btn}>
              {isAuthenticated ? "Accept & Join Organization" : "Log in to Accept Invite"}
            </button>
            <button onClick={() => navigate("/dashboard")} style={{ background: "none", border: "none", color: "var(--text-ghost)", fontSize: 12, cursor: "pointer", marginTop: 12, width: "100%" }}>
              Decline
            </button>
          </>
        )}

        {status === "accepting" && (
          <>
            <Loader size={32} color="#6366f1" style={{ margin: "0 auto 16px", display: "block" }} />
            <p style={{ color: "var(--text-ghost)", fontSize: 14 }}>Joining organization...</p>
          </>
        )}

        {status === "success" && (
          <>
            <CheckCircle size={48} color="#10b981" style={{ margin: "0 auto 16px", display: "block" }} />
            <h2 style={{ fontSize: 20, fontWeight: 700, color: "var(--text-primary)", margin: "0 0 8px" }}>Welcome aboard!</h2>
            <p style={{ fontSize: 14, color: "var(--text-ghost)" }}>You've successfully joined <strong style={{ color: "var(--text-sec)" }}>{invite?.orgName}</strong>. Redirecting...</p>
          </>
        )}

        {status === "error" && (
          <>
            <XCircle size={48} color="#ef4444" style={{ margin: "0 auto 16px", display: "block" }} />
            <h2 style={{ fontSize: 20, fontWeight: 700, color: "var(--text-primary)", margin: "0 0 8px" }}>Invite Invalid</h2>
            <p style={{ fontSize: 14, color: "var(--text-ghost)", marginBottom: 20 }}>{errorMsg}</p>
            <button onClick={() => navigate("/login")} style={S.btn}>Go to Login</button>
          </>
        )}
      </div>

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

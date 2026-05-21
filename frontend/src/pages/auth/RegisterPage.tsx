import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { User, Mail, Lock, Eye, EyeOff, CheckCircle } from "lucide-react";
import { Input } from "@/components/ui/Input";
import api from "@/lib/api";
import { getApiError } from "@/lib/utils";

const schema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  password: z
    .string()
    .min(8, "Minimum 8 characters")
    .regex(/[A-Z]/, "Must contain an uppercase letter")
    .regex(/[0-9]/, "Must contain a number"),
});
type FormData = z.infer<typeof schema>;

export default function RegisterPage() {
  const navigate = useNavigate();
  const [showPw, setShowPw] = useState(false);
  const [apiError, setApiError] = useState("");
  const [success, setSuccess] = useState(false);

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: FormData) => {
    setApiError("");
    try {
      const res = await api.post<{ message: string }>("/auth/register", data);
      if (res.data.message.includes("immediately")) {
        navigate("/login");
      } else {
        setSuccess(true);
      }
    } catch (err) {
      setApiError(getApiError(err));
    }
  };

  const pageStyle: React.CSSProperties = {
    minHeight: "100vh", background: "#07071A",
    display: "flex", alignItems: "center", justifyContent: "center", padding: "24px",
  };

  if (success) {
    return (
      <div style={pageStyle}>
        <div style={{ width: "100%", maxWidth: 420, textAlign: "center" }}>
          <div style={{ background: "#0D0D1F", border: "1px solid #1C1C35", borderRadius: 16, padding: "48px 36px", boxShadow: "0 24px 80px rgba(0,0,0,0.5)" }}>
            <div style={{ width: 56, height: 56, borderRadius: 14, background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.2)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px" }}>
              <CheckCircle style={{ width: 26, height: 26, color: "#10B981" }} />
            </div>
            <h2 style={{ fontSize: 20, fontWeight: 700, color: "#EEEEF5", margin: "0 0 10px" }}>Check your inbox</h2>
            <p style={{ fontSize: 14, color: "#7070A0", lineHeight: 1.6, marginBottom: 28 }}>
              We sent a verification link to your email. Click it to activate your account.
            </p>
            <button
              onClick={() => navigate("/login")}
              style={{ width: "100%", height: 44, borderRadius: 10, border: "1px solid #252545", background: "transparent", color: "#CCCCEE", fontSize: 14, fontWeight: 600, cursor: "pointer" }}
            >
              Back to Sign In
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={pageStyle}>
      <div style={{ position: "fixed", top: "20%", left: "50%", transform: "translateX(-50%)", width: 600, height: 600, borderRadius: "50%", background: "radial-gradient(circle, rgba(139,92,246,0.07) 0%, transparent 70%)", pointerEvents: "none" }} />

      <div style={{ width: "100%", maxWidth: 440, position: "relative", zIndex: 1 }}>
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 48, height: 48, borderRadius: 14, background: "linear-gradient(135deg, #6366f1, #8b5cf6)", marginBottom: 16, boxShadow: "0 8px 32px rgba(99,102,241,0.4)" }}>
            <span style={{ color: "white", fontWeight: 800, fontSize: 16 }}>FC</span>
          </div>
          <h1 style={{ fontSize: 26, fontWeight: 700, color: "#EEEEF5", margin: 0 }}>Create your account</h1>
          <p style={{ fontSize: 14, color: "#7070A0", marginTop: 6 }}>Get started with FlowCRM for free</p>
        </div>

        {/* Card */}
        <div style={{ background: "#0D0D1F", border: "1px solid #1C1C35", borderRadius: 16, padding: "32px 36px", boxShadow: "0 24px 80px rgba(0,0,0,0.5)" }}>

          {apiError && (
            <div style={{ marginBottom: 20, padding: "12px 16px", background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.25)", borderRadius: 10, fontSize: 13, color: "#F87171", display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#EF4444", flexShrink: 0 }} />
              {apiError}
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)}>
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <Input
                label="Full name"
                type="text"
                placeholder="Rahul Sharma"
                leftIcon={<User style={{ width: 16, height: 16 }} />}
                error={errors.name?.message}
                {...register("name")}
              />

              <Input
                label="Email address"
                type="email"
                placeholder="you@company.com"
                leftIcon={<Mail style={{ width: 16, height: 16 }} />}
                error={errors.email?.message}
                {...register("email")}
              />

              <Input
                label="Password"
                type={showPw ? "text" : "password"}
                placeholder="Min 8 chars, 1 uppercase, 1 number"
                hint="Must be 8+ characters with one uppercase and one number"
                leftIcon={<Lock style={{ width: 16, height: 16 }} />}
                rightIcon={
                  <button type="button" onClick={() => setShowPw(!showPw)} style={{ cursor: "pointer", color: "inherit", background: "none", border: "none", padding: 0, display: "flex" }}>
                    {showPw ? <EyeOff style={{ width: 16, height: 16 }} /> : <Eye style={{ width: 16, height: 16 }} />}
                  </button>
                }
                error={errors.password?.message}
                {...register("password")}
              />

              <button
                type="submit"
                disabled={isSubmitting}
                style={{
                  width: "100%", height: 44, borderRadius: 10, border: "none", cursor: isSubmitting ? "not-allowed" : "pointer",
                  background: "linear-gradient(135deg, #6366f1, #8b5cf6)", color: "white",
                  fontSize: 14, fontWeight: 600, opacity: isSubmitting ? 0.7 : 1,
                  boxShadow: "0 4px 20px rgba(99,102,241,0.4)", transition: "opacity 0.15s",
                  marginTop: 4,
                }}
              >
                {isSubmitting ? "Creating account…" : "Create Account →"}
              </button>
            </div>
          </form>

          <p style={{ textAlign: "center", fontSize: 13, color: "#505070", marginTop: 24 }}>
            Already have an account?{" "}
            <Link to="/login" style={{ color: "#818cf8", textDecoration: "none", fontWeight: 600 }}>Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}

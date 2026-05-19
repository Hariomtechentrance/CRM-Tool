import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Mail, Lock, Eye, EyeOff, TrendingUp, Users, Globe } from "lucide-react";
import { Input } from "@/components/ui/Input";
import { useAuthStore } from "@/stores/authStore";
import api from "@/lib/api";
import { getApiError } from "@/lib/utils";
import type { AuthResponse } from "@/types";

const schema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});
type FormData = z.infer<typeof schema>;

const FEATURES = [
  { icon: TrendingUp, text: "Sales & purchase tracking" },
  { icon: Users,      text: "Customer & supplier management" },
  { icon: Globe,      text: "Built for import-export companies" },
];

export default function LoginPage() {
  const navigate = useNavigate();
  const setAuth = useAuthStore((s) => s.setAuth);
  const [showPw, setShowPw] = useState(false);
  const [apiError, setApiError] = useState("");

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: FormData) => {
    setApiError("");
    try {
      const res = await api.post<{ data: AuthResponse }>("/auth/login", data);
      setAuth(res.data.data);
      navigate("/dashboard");
    } catch (err) {
      setApiError(getApiError(err));
    }
  };

  return (
    <div style={{ minHeight: "100vh", background: "#07071A", display: "flex", alignItems: "center", justifyContent: "center", padding: "24px" }}>
      {/* Decorative glow */}
      <div style={{ position: "fixed", top: "20%", left: "50%", transform: "translateX(-50%)", width: 600, height: 600, borderRadius: "50%", background: "radial-gradient(circle, rgba(99,102,241,0.08) 0%, transparent 70%)", pointerEvents: "none" }} />

      <div style={{ width: "100%", maxWidth: 440, position: "relative", zIndex: 1 }}>
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 48, height: 48, borderRadius: 14, background: "linear-gradient(135deg, #6366f1, #8b5cf6)", marginBottom: 16, boxShadow: "0 8px 32px rgba(99,102,241,0.4)" }}>
            <span style={{ color: "white", fontWeight: 800, fontSize: 16 }}>BL</span>
          </div>
          <h1 style={{ fontSize: 26, fontWeight: 700, color: "#EEEEF5", margin: 0 }}>Welcome back</h1>
          <p style={{ fontSize: 14, color: "#7070A0", marginTop: 6 }}>Sign in to your BL-CRM account</p>
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
                placeholder="Enter your password"
                leftIcon={<Lock style={{ width: 16, height: 16 }} />}
                rightIcon={
                  <button type="button" onClick={() => setShowPw(!showPw)} style={{ cursor: "pointer", color: "inherit", background: "none", border: "none", padding: 0, display: "flex" }}>
                    {showPw
                      ? <EyeOff style={{ width: 16, height: 16 }} />
                      : <Eye style={{ width: 16, height: 16 }} />}
                  </button>
                }
                error={errors.password?.message}
                {...register("password")}
              />

              <div style={{ display: "flex", justifyContent: "flex-end", marginTop: -4 }}>
                <Link to="/forgot-password" style={{ fontSize: 12, color: "#818cf8", textDecoration: "none", fontWeight: 500 }}>
                  Forgot password?
                </Link>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                style={{
                  width: "100%", height: 44, borderRadius: 10, border: "none", cursor: isSubmitting ? "not-allowed" : "pointer",
                  background: "linear-gradient(135deg, #6366f1, #8b5cf6)", color: "white",
                  fontSize: 14, fontWeight: 600, opacity: isSubmitting ? 0.7 : 1,
                  boxShadow: "0 4px 20px rgba(99,102,241,0.4)", transition: "opacity 0.15s",
                }}
              >
                {isSubmitting ? "Signing in…" : "Sign In →"}
              </button>
            </div>
          </form>

          <p style={{ textAlign: "center", fontSize: 13, color: "#505070", marginTop: 24 }}>
            Don't have an account?{" "}
            <Link to="/register" style={{ color: "#818cf8", textDecoration: "none", fontWeight: 600 }}>Create account</Link>
          </p>
        </div>

        {/* Features row */}
        <div style={{ display: "flex", justifyContent: "center", gap: 20, marginTop: 28, flexWrap: "wrap" }}>
          {FEATURES.map((f, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 6, color: "#505070", fontSize: 12 }}>
              <f.icon style={{ width: 13, height: 13, color: "#6366f1" }} />
              {f.text}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

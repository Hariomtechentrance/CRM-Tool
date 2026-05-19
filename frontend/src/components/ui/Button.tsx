import React from "react";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "danger" | "outline";
  size?: "xs" | "sm" | "md" | "lg";
  loading?: boolean;
  icon?: React.ReactNode;
}

export function Button({
  children, variant = "primary", size = "md", loading = false,
  icon, className, disabled, ...props
}: ButtonProps) {
  const base = "inline-flex items-center justify-center gap-2 font-semibold rounded-lg transition-all duration-150 cursor-pointer select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-offset-[#07071A] disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap";

  const variants = {
    primary:   "bg-indigo-600 text-white hover:bg-indigo-500 active:bg-indigo-700 focus-visible:ring-indigo-500 shadow-lg shadow-indigo-900/40",
    secondary: "bg-[#1A1A33] text-[#CCCCEE] hover:bg-[#252545] active:bg-[#1A1A33] focus-visible:ring-[#2A2A48] border border-[#252545]",
    ghost:     "text-[#9090B0] hover:bg-[#131327] hover:text-[#EEEEF5] active:bg-[#1A1A33] focus-visible:ring-[#2A2A48]",
    danger:    "bg-red-600/20 text-red-400 hover:bg-red-600/30 border border-red-500/30 focus-visible:ring-red-500",
    outline:   "border border-[#252545] bg-transparent text-[#CCCCEE] hover:bg-[#131327] hover:border-[#353560] focus-visible:ring-[#2A2A48]",
  };

  const sizes = {
    xs: "px-2.5 py-1.5 text-xs",
    sm: "px-3 py-1.5 text-sm",
    md: "px-4 py-2 text-sm",
    lg: "px-5 py-2.5 text-sm",
  };

  return (
    <button className={cn(base, variants[variant], sizes[size], className)} disabled={disabled || loading} {...props}>
      {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : icon}
      {children}
    </button>
  );
}

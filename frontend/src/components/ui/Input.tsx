import React from "react";
import { cn } from "@/lib/utils";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export function Input({ label, error, hint, leftIcon, rightIcon, className, id, ...props }: InputProps) {
  const inputId = id || label?.toLowerCase().replace(/\s+/g, "-");
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={inputId} className="text-[12px] font-semibold text-[#7070A0] uppercase tracking-wider leading-none">
          {label}
        </label>
      )}
      <div className="relative">
        {leftIcon && (
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#505070] pointer-events-none">
            {leftIcon}
          </span>
        )}
        <input
          id={inputId}
          className={cn(
            "w-full h-11 rounded-lg border px-3 py-2 text-sm text-[#EEEEF5] placeholder:text-[#404060]",
            "bg-[#131327] border-[#1E1E38]",
            "transition-all duration-150",
            "hover:border-[#2A2A48]",
            "focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20",
            "disabled:opacity-50 disabled:cursor-not-allowed",
            error && "border-red-500/60 hover:border-red-500/80 focus:border-red-500 focus:ring-red-500/20",
            leftIcon && "pl-10",
            rightIcon && "pr-10",
            className
          )}
          {...props}
        />
        {rightIcon && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[#505070]">
            {rightIcon}
          </span>
        )}
      </div>
      {error && <p className="text-[12px] text-red-400">{error}</p>}
      {hint && !error && <p className="text-[12px] text-[#505070]">{hint}</p>}
    </div>
  );
}

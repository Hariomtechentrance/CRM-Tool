import React from "react";
import { cn } from "@/lib/utils";
import { ChevronDown } from "lucide-react";

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: { value: string; label: string }[];
  placeholder?: string;
}

export function Select({ label, error, options, placeholder, className, id, ...props }: SelectProps) {
  const selectId = id || label?.toLowerCase().replace(/\s+/g, "-");
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={selectId} className="text-[12px] font-semibold text-[#7070A0] uppercase tracking-wider leading-none">
          {label}
        </label>
      )}
      <div className="relative">
        <select
          id={selectId}
          className={cn(
            "w-full h-11 appearance-none rounded-lg border pl-3 pr-9 py-2 text-sm text-[#EEEEF5]",
            "bg-[#131327] border-[#1E1E38]",
            "transition-all duration-150",
            "hover:border-[#2A2A48]",
            "focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20",
            "disabled:opacity-50 disabled:cursor-not-allowed",
            error && "border-red-500/60 focus:border-red-500 focus:ring-red-500/20",
            className
          )}
          style={{ colorScheme: "dark" }}
          {...props}
        >
          {placeholder && <option value="" style={{ background: "#131327" }}>{placeholder}</option>}
          {options.map((opt) => (
            <option key={opt.value} value={opt.value} style={{ background: "#131327" }}>{opt.label}</option>
          ))}
        </select>
        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#505070] pointer-events-none" />
      </div>
      {error && <p className="text-[12px] text-red-400">{error}</p>}
    </div>
  );
}

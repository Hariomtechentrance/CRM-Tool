import React from "react";
import { cn } from "@/lib/utils";

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

export function Textarea({ label, error, className, id, ...props }: TextareaProps) {
  const textareaId = id || label?.toLowerCase().replace(/\s+/g, "-");
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={textareaId} className="text-[12px] font-semibold text-[#7070A0] uppercase tracking-wider leading-none">
          {label}
        </label>
      )}
      <textarea
        id={textareaId}
        rows={3}
        className={cn(
          "w-full rounded-lg border px-3 py-2.5 text-sm text-[#EEEEF5] placeholder:text-[#404060] resize-none",
          "bg-[#131327] border-[#1E1E38]",
          "transition-all duration-150",
          "hover:border-[#2A2A48]",
          "focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20",
          error && "border-red-500/60 focus:border-red-500 focus:ring-red-500/20",
          className
        )}
        {...props}
      />
      {error && <p className="text-[12px] text-red-400">{error}</p>}
    </div>
  );
}

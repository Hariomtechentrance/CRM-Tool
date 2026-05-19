import React from "react";
import { cn } from "@/lib/utils";

interface CardProps extends React.HTMLAttributes<HTMLDivElement> { children: React.ReactNode; }

export function Card({ children, className, ...props }: CardProps) {
  return (
    <div className={cn("bg-[#0D0D1F] rounded-xl border border-[#1C1C35]", className)} {...props}>
      {children}
    </div>
  );
}

export function CardHeader({ children, className, ...props }: CardProps) {
  return (
    <div className={cn("px-5 py-4 border-b border-[#1C1C35] flex items-center justify-between", className)} {...props}>
      {children}
    </div>
  );
}

export function CardBody({ children, className, ...props }: CardProps) {
  return (
    <div className={cn("px-5 py-4", className)} {...props}>
      {children}
    </div>
  );
}

import { cn } from "@/lib/utils";

type BadgeVariant = "blue" | "green" | "yellow" | "red" | "purple" | "orange" | "slate";

const styles: Record<BadgeVariant, string> = {
  blue:   "text-[#818CF8]",
  green:  "text-[#34D399]",
  yellow: "text-[#FCD34D]",
  red:    "text-[#F87171]",
  purple: "text-[#C084FC]",
  orange: "text-[#FBBF24]",
  slate:  "text-[var(--text-muted)]",
};

const bgs: Record<BadgeVariant, string> = {
  blue:   "rgba(99,102,241,0.12)",
  green:  "rgba(16,185,129,0.1)",
  yellow: "rgba(245,158,11,0.1)",
  red:    "rgba(239,68,68,0.1)",
  purple: "rgba(139,92,246,0.12)",
  orange: "rgba(245,158,11,0.1)",
  slate:  "rgba(144,144,176,0.1)",
};

const borders: Record<BadgeVariant, string> = {
  blue:   "rgba(99,102,241,0.25)",
  green:  "rgba(16,185,129,0.2)",
  yellow: "rgba(245,158,11,0.2)",
  red:    "rgba(239,68,68,0.2)",
  purple: "rgba(139,92,246,0.25)",
  orange: "rgba(245,158,11,0.2)",
  slate:  "rgba(144,144,176,0.15)",
};

interface BadgeProps { label: string; variant?: BadgeVariant; className?: string; }

export function Badge({ label, variant = "slate", className }: BadgeProps) {
  return (
    <span
      className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold", styles[variant], className)}
      style={{ background: bgs[variant], border: `1px solid ${borders[variant]}` }}
    >
      {label}
    </span>
  );
}

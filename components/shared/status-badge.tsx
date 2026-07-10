import { cn } from "@/lib/utils";

type StatusVariant =
  | "active"
  | "paused"
  | "disconnected"
  | "draft"
  | "approved"
  | "scheduled"
  | "publishing"
  | "posted"
  | "failed"
  | "pending"
  | "completed"
  | "cancelled"
  | "archived";

const variantStyles: Record<StatusVariant, string> = {
  active: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
  paused: "bg-amber-500/10 text-amber-500 border-amber-500/20",
  disconnected: "bg-red-400/10 text-red-400 border-red-400/20",
  draft: "bg-zinc-500/10 text-zinc-400 border-zinc-500/20",
  approved: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  scheduled: "bg-violet-500/10 text-violet-400 border-violet-500/20",
  publishing: "bg-cyan-500/10 text-cyan-400 border-cyan-500/20",
  posted: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
  failed: "bg-red-400/10 text-red-400 border-red-400/20",
  pending: "bg-amber-500/10 text-amber-500 border-amber-500/20",
  completed: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
  cancelled: "bg-zinc-500/10 text-zinc-400 border-zinc-500/20",
  archived: "bg-zinc-500/10 text-zinc-400 border-zinc-500/20",
};

interface StatusBadgeProps {
  status: StatusVariant;
  label?: string;
  className?: string;
}

export function StatusBadge({ status, label, className }: StatusBadgeProps) {
  const displayLabel = label ?? status.charAt(0).toUpperCase() + status.slice(1);

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-xs font-medium",
        variantStyles[status],
        className,
      )}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {displayLabel}
    </span>
  );
}

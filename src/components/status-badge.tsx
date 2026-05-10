import { cn } from "@/lib/utils";
import type { ProjectStatus } from "@/lib/types";

type StatusBadgeVariant = ProjectStatus | "demo";

type StatusBadgeProps = {
  status: StatusBadgeVariant;
  className?: string;
};

const labels: Record<StatusBadgeVariant, string> = {
  active: "Active",
  scanning: "Scanning",
  paused: "Paused",
  error: "Error",
  demo: "Demo Mode",
};

const styles: Record<StatusBadgeVariant, string> = {
  active: "border-cyan-400/40 bg-cyan-500/15 text-cyan-200",
  scanning: "border-blue-400/40 bg-blue-500/15 text-blue-200",
  paused: "border-amber-400/40 bg-amber-500/15 text-amber-200",
  error: "border-rose-400/40 bg-rose-500/15 text-rose-200",
  demo: "border-violet-400/40 bg-violet-500/15 text-violet-200",
};

export function StatusBadge({ status, className }: StatusBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium",
        styles[status],
        className,
      )}
    >
      {labels[status]}
    </span>
  );
}

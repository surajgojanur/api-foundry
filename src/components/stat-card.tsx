import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type StatVariant = "cyan" | "emerald" | "blue" | "violet";

type StatCardProps = {
  title: string;
  value: string;
  description: string;
  icon: LucideIcon;
  trend: string;
  variant?: StatVariant;
};

const variantStyles: Record<StatVariant, string> = {
  cyan: "text-cyan-200 border-cyan-400/35 bg-cyan-500/10",
  emerald: "text-emerald-200 border-emerald-400/35 bg-emerald-500/10",
  blue: "text-blue-200 border-blue-400/35 bg-blue-500/10",
  violet: "text-violet-200 border-violet-400/35 bg-violet-500/10",
};

export function StatCard({
  title,
  value,
  description,
  icon: Icon,
  trend,
  variant = "cyan",
}: StatCardProps) {
  return (
    <article className="glass-card rounded-2xl p-5 transition hover:-translate-y-0.5 hover:border-slate-500/70">
      <div className="mb-4 flex items-start justify-between">
        <p className="text-sm text-slate-400">{title}</p>
        <span className={cn("rounded-xl border p-2", variantStyles[variant])}>
          <Icon className="h-4 w-4" />
        </span>
      </div>
      <p className="text-3xl font-semibold tracking-tight text-slate-100">{value}</p>
      <div className="mt-3 flex items-center justify-between text-xs">
        <p className="text-slate-400">{description}</p>
        <span className="text-emerald-300">{trend}</span>
      </div>
    </article>
  );
}

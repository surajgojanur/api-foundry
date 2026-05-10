import type { InsightCard as InsightCardType } from "@/lib/types";
import { BrainCircuit } from "lucide-react";

type InsightCardProps = {
  insight: InsightCardType;
};

const severityClasses = {
  low: "border-emerald-400/35 bg-emerald-500/10 text-emerald-200",
  medium: "border-amber-400/35 bg-amber-500/10 text-amber-200",
  high: "border-rose-400/35 bg-rose-500/10 text-rose-200",
};

export function InsightCard({ insight }: InsightCardProps) {
  return (
    <article className="glass-card rounded-2xl p-4 transition hover:-translate-y-0.5 hover:border-violet-400/35">
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <BrainCircuit className="h-4 w-4 text-violet-300" />
          <h4 className="text-sm font-semibold text-slate-100">{insight.title}</h4>
        </div>
        <div className="flex items-center gap-2">
          <span className={`rounded-full border px-2 py-0.5 text-[11px] ${severityClasses[insight.severity]}`}>
            {insight.severity}
          </span>
          <span className="rounded-full border border-violet-400/35 bg-violet-500/10 px-2 py-0.5 text-[11px] text-violet-200">
            {insight.confidenceScore}%
          </span>
        </div>
      </div>
      <p className="text-sm text-slate-300">{insight.description}</p>
      <p className="mt-3 text-xs text-slate-400">{insight.recommendation}</p>
    </article>
  );
}

import type { ChangeEvent } from "@/lib/types";
import { AlertTriangle, ArrowRight, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

type ChangeEventCardProps = {
  event: ChangeEvent;
};

const severityStyles = {
  low: "text-emerald-200 border-emerald-400/30 bg-emerald-500/10",
  medium: "text-amber-200 border-amber-400/30 bg-amber-500/10",
  high: "text-rose-200 border-rose-400/30 bg-rose-500/10",
};

function valueLabel(value: ChangeEvent["oldValue"]) {
  if (value === null || value === undefined) return "n/a";
  if (typeof value === "boolean") return value ? "true" : "false";
  return String(value);
}

export function ChangeEventCard({ event }: ChangeEventCardProps) {
  return (
    <article className="glass-card rounded-2xl p-4 transition hover:border-cyan-400/35">
      <div className="mb-2 flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <Sparkles className="mt-0.5 h-4 w-4 text-cyan-300" />
          <p className="text-xs uppercase tracking-[0.18em] text-slate-400">{event.type.replaceAll("_", " ")}</p>
        </div>
        <span className={cn("rounded-full border px-2 py-0.5 text-[11px] font-medium", severityStyles[event.severity])}>
          {event.severity}
        </span>
      </div>
      <p className="text-sm font-medium text-slate-100">{event.title}</p>
      <p className="mt-1 text-xs text-slate-400">Entity: {event.entity}</p>
      <div className="mt-3 flex items-center gap-2 text-xs text-slate-400">
        <AlertTriangle className="h-3.5 w-3.5 text-slate-500" />
        <span>{valueLabel(event.oldValue)}</span>
        <ArrowRight className="h-3.5 w-3.5" />
        <span className="text-cyan-200">{valueLabel(event.newValue)}</span>
      </div>
      <p className="mt-2 text-xs text-slate-500">Detected {new Date(event.detectedAt).toLocaleString()}</p>
    </article>
  );
}

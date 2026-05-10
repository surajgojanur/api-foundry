import type { ReactNode } from "react";

export function SectionHeader({ title, subtitle, right }: { title: string; subtitle?: string; right?: ReactNode }) {
  return (
    <div className="mb-4 flex items-start justify-between gap-3">
      <div>
        <h2 className="text-xl font-semibold text-slate-100">{title}</h2>
        {subtitle ? <p className="mt-1 text-sm text-slate-400">{subtitle}</p> : null}
      </div>
      {right}
    </div>
  );
}

export function IntegrationBadge({ label, state }: { label: string; state: "ready" | "warning" | "neutral" }) {
  const tone = state === "ready"
    ? "border-emerald-400/35 bg-emerald-500/10 text-emerald-200"
    : state === "warning"
      ? "border-amber-400/35 bg-amber-500/10 text-amber-200"
      : "border-slate-600/60 bg-slate-900/70 text-slate-300";
  return <span className={`inline-flex rounded-full border px-3 py-1 text-xs ${tone}`}>{label}</span>;
}

export function AlertBadge({ severity }: { severity: "low" | "medium" | "high" | "critical" }) {
  const tone = severity === "critical"
    ? "border-rose-400/35 bg-rose-500/10 text-rose-200"
    : severity === "high"
      ? "border-amber-400/35 bg-amber-500/10 text-amber-200"
      : severity === "medium"
        ? "border-cyan-400/35 bg-cyan-500/10 text-cyan-200"
        : "border-slate-600/60 bg-slate-900/70 text-slate-300";
  return <span className={`inline-flex rounded-full border px-2 py-0.5 text-xs capitalize ${tone}`}>{severity}</span>;
}

export function CommandCard({ command }: { command: string }) {
  return <pre className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950/90 px-3 py-2 text-xs text-emerald-200">{command}</pre>;
}

export function EmptyState({ title, message }: { title: string; message: string }) {
  return (
    <div className="rounded-xl border border-slate-700/70 bg-slate-900/60 p-4">
      <p className="text-sm font-medium text-slate-100">{title}</p>
      <p className="mt-1 text-sm text-slate-400">{message}</p>
    </div>
  );
}

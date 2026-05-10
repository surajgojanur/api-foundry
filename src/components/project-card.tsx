import Link from "next/link";
import { AlertTriangle, Globe2, Timer } from "lucide-react";
import type { CompetitorProject } from "@/lib/types";

type ProjectCardProps = { project: CompetitorProject };

function relativeTimeLabel(iso: string) {
  const deltaMs = Date.now() - new Date(iso).getTime();
  const mins = Math.max(1, Math.round(deltaMs / 60000));
  if (mins < 60) return `${mins} mins ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours} hours ago`;
  const days = Math.round(hours / 24);
  return `${days} days ago`;
}

export function ProjectCard({ project }: ProjectCardProps) {
  const criticalChanges = project.changes.filter((item) => item.severity === "high").length;
  const alertCount = project.alertDeliveries?.length ?? 0;

  return (
    <article className="glass-card rounded-2xl p-5 transition hover:-translate-y-0.5 hover:border-cyan-400/35">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-slate-100">{project.name}</h3>
          <a href={project.companyUrl} target="_blank" rel="noreferrer" className="mt-1 inline-flex items-center gap-2 text-sm text-slate-400 transition hover:text-cyan-200">
            <Globe2 className="h-4 w-4" />
            {project.companyUrl}
          </a>
        </div>
        <span className={`rounded-full border px-2.5 py-1 text-xs ${project.telegramAlertsEnabled === false ? "border-amber-400/35 bg-amber-500/10 text-amber-200" : "border-emerald-400/35 bg-emerald-500/10 text-emerald-200"}`}>
          Telegram {project.telegramAlertsEnabled === false ? "disabled" : "enabled"}
        </span>
      </div>

      <div className="grid gap-2 text-sm sm:grid-cols-2">
        <div className="rounded-lg border border-slate-700/70 bg-slate-900/60 p-2 text-slate-300">Critical changes: <span className="text-rose-300">{criticalChanges}</span></div>
        <div className="rounded-lg border border-slate-700/70 bg-slate-900/60 p-2 text-slate-300">Alert history: <span className="text-cyan-200">{alertCount}</span></div>
        <div className="flex items-center gap-2 text-slate-300 sm:col-span-2">
          <Timer className="h-4 w-4 text-emerald-300" />
          Last checked {relativeTimeLabel(project.lastUpdated)}
        </div>
      </div>

      <div className="mt-4 flex items-center gap-2">
        <Link href={`/projects/${project.id}`} className="rounded-lg border border-cyan-400/40 bg-cyan-500/10 px-3 py-1.5 text-xs font-medium text-cyan-200 transition hover:bg-cyan-500/20">View Alerts</Link>
        <Link href={`/projects/${project.id}`} className="rounded-lg border border-slate-700 bg-slate-900/70 px-3 py-1.5 text-xs text-slate-300 transition hover:border-slate-500">Check Now</Link>
      </div>

      {criticalChanges > 0 ? (
        <p className="mt-3 inline-flex items-center gap-1 text-xs text-rose-300">
          <AlertTriangle className="h-3.5 w-3.5" />
          Immediate attention suggested
        </p>
      ) : null}
    </article>
  );
}

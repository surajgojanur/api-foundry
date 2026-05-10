import Link from "next/link";
import { SectionHeader, CommandCard, IntegrationBadge } from "@/components/ui-primitives";
import { getAnakinHealth } from "@/lib/anakin";
import { getLiveTrackingTargets } from "@/lib/live-targets";
import { getProject } from "@/lib/project-store";
import { getTelegramHealth } from "@/lib/telegram";

export const dynamic = "force-dynamic";

export default async function LiveTrackingPage() {
  const anakinHealth = await getAnakinHealth();
  const telegramHealth = getTelegramHealth();
  const anakinMode = typeof anakinHealth === "object" && anakinHealth !== null && "mode" in anakinHealth ? String(anakinHealth.mode) : "fallback";

  const cards = getLiveTrackingTargets().map((target) => {
    const id = target.projectId || "";
    const project = getProject(id);
    return { target, project, id };
  });

  const ranked = [...cards].sort((a, b) => (b.project?.changes.filter((c) => c.severity === "high").length ?? 0) - (a.project?.changes.filter((c) => c.severity === "high").length ?? 0));

  return (
    <div className="space-y-6">
      <section className="glass-card rounded-3xl p-6 sm:p-8">
        <h1 className="text-3xl font-bold text-slate-100">Live Competitor Tracking</h1>
        <p className="mt-2 text-slate-300">Track Zepto and Blinkit, detect changes, and send Telegram alerts.</p>
        <div className="mt-4 flex flex-wrap gap-2">
          <IntegrationBadge label={`Tracking mode: ${anakinMode === "live" ? "live" : "fallback"}`} state={anakinMode === "live" ? "ready" : "warning"} />
          <IntegrationBadge label={`Telegram: ${telegramHealth.configured ? "ready" : "setup needed"}`} state={telegramHealth.configured ? "ready" : "warning"} />
          <IntegrationBadge label="Demo-stable fallback keeps alerts available" state="neutral" />
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        {cards.map(({ target, project, id }) => {
          const criticalChanges = project?.changes.filter((item) => item.severity === "high").length ?? 0;
          return (
            <article key={id} className="glass-card rounded-2xl p-5">
              <div className="flex items-center gap-3">
                <div className="grid h-10 w-10 place-items-center rounded-xl border border-cyan-400/35 bg-cyan-500/10 text-sm font-semibold text-cyan-200">{target.name.slice(0, 2).toUpperCase()}</div>
                <div>
                  <h3 className="text-xl font-semibold text-slate-100">Live {target.name}</h3>
                  <a href={target.companyUrl} target="_blank" rel="noreferrer" className="text-sm text-slate-400 hover:text-cyan-200">{target.companyUrl}</a>
                </div>
              </div>

              <div className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
                <div className="rounded-lg border border-slate-700/70 bg-slate-900/60 p-2 text-slate-300">Tracking mode: <span className="text-cyan-200">{project?.trackingMode ?? "not-setup"}</span></div>
                <div className="rounded-lg border border-slate-700/70 bg-slate-900/60 p-2 text-slate-300">Extraction quality: <span className="text-cyan-200">{project?.extractionQuality ?? "n/a"}</span></div>
                <div className="rounded-lg border border-slate-700/70 bg-slate-900/60 p-2 text-slate-300">Critical changes: <span className="text-rose-300">{criticalChanges}</span></div>
                <div className="rounded-lg border border-slate-700/70 bg-slate-900/60 p-2 text-slate-300">Telegram alerts: <span className="text-emerald-200">{project?.telegramAlertsEnabled === false ? "disabled" : "enabled"}</span></div>
              </div>
              <p className="mt-2 text-xs text-slate-400">Last checked: {project ? new Date(project.lastUpdated).toLocaleString() : "Not yet"}</p>

              <div className="mt-3 flex flex-wrap gap-2 text-xs">
                <Link href={`/projects/${id}`} className="btn-primary">View Competitor</Link>
              </div>
              <div className="mt-3">
                <CommandCard command={`curl -X POST http://localhost:3000/api/v1/projects/${id}/refresh-and-alert`} />
              </div>
            </article>
          );
        })}
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <div className="glass-card rounded-2xl p-5">
          <SectionHeader title="Who Needs Attention Today?" subtitle="Quick Zepto vs Blinkit comparison." />
          <p className="text-sm text-slate-300">Highest attention: <span className="text-slate-100">{ranked[0]?.target.name ?? "n/a"}</span></p>
          <p className="mt-2 text-sm text-slate-300">Recommendation: Focus on the competitor with more critical changes and run a same-day stock/price response.</p>
          <Link href="/compare" className="mt-3 inline-flex btn-secondary">Open Compare</Link>
        </div>

        <div className="glass-card rounded-2xl p-5">
          <SectionHeader title="Fast Setup" subtitle="One command setup for live tracking targets." />
          <div className="space-y-2">
            <CommandCard command="curl -X POST http://localhost:3000/api/live/setup" />
            <CommandCard command="curl -X POST http://localhost:3000/api/live/refresh-all" />
          </div>
          <p className="mt-3 text-sm text-slate-400">Demo-stable fallback keeps alerts and insights available when live extraction is limited.</p>
        </div>
      </section>
    </div>
  );
}
